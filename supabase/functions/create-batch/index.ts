import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { log, generateShortCode, safeErrorMessage, getClientIP, logAuditEvent } from "../shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const clientIP = getClientIP(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      log("ERROR", "create-batch", "Missing Authorization header", {}, requestId, { ip_address: clientIP });
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: "Unauthorized" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      log("ERROR", "create-batch", "Unauthorized user", { error: userError }, requestId, { ip_address: clientIP });
      return new Response(JSON.stringify({ 
        success: false, 
        error: { 
          code: "AUTH_ERROR", 
          message: "Unauthorized", 
          details: userError,
          url: supabaseUrl,
          hasAnonKey: !!supabaseAnonKey
        } 
      }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Role validation — only teachers may create batches
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "student";
    const ctx = { user_id: user.id, role: userRole, ip_address: clientIP };

    if (profileError || !profile || userRole !== "teacher") {
      log("ERROR", "create-batch", "Forbidden: only teachers can create batches", { role: userRole }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: "Only teachers can create batches" } }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let body: { name?: unknown; expires_at?: unknown };
    try {
      body = await req.json();
    } catch {
      log("ERROR", "create-batch", "Invalid JSON body", {}, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { name, expires_at } = body;

    // Input sanitization
    if (!name || typeof name !== "string") {
      log("ERROR", "create-batch", "Missing or invalid batch name", {}, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Batch name is required" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sanitizedName = name.trim().substring(0, 100);
    if (sanitizedName.length < 2) {
      log("ERROR", "create-batch", "Batch name too short", { name: sanitizedName }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Batch name must be at least 2 characters" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate expires_at
    let parsedExpiresAt: string | null = null;
    if (expires_at) {
      if (typeof expires_at !== "string") {
        return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "expires_at must be a valid ISO date string" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const date = new Date(expires_at);
      if (isNaN(date.getTime()) || date < new Date()) {
        return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "expires_at must be a valid future date" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      parsedExpiresAt = date.toISOString();
    }

    // Generate join_code with collision retry using crypto-safe random
    let joinCode = "";
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      const prefix = sanitizedName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "") || "BTCH";
      const shortCode = generateShortCode(4);
      joinCode = `${prefix}-${shortCode}`;

      // Check uniqueness via admin client (bypasses RLS)
      const { data: existing } = await adminClient
        .from("batches")
        .select("id")
        .eq("join_code", joinCode)
        .maybeSingle();

      if (!existing) break;
      retries++;
    }

    if (retries >= maxRetries) {
      log("ERROR", "create-batch", "Failed to generate unique join code after retries", { retries }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to generate unique join code. Please try again." } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await supabase
      .from("batches")
      .insert({ 
        name: sanitizedName, 
        join_code: joinCode, 
        created_by: user.id,
        expires_at: parsedExpiresAt 
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        log("ERROR", "create-batch", "Join code collision on insert", { join_code: joinCode }, requestId, ctx);
        return new Response(JSON.stringify({ success: false, error: { code: "DB_ERROR", message: "Join code collision. Please try again." } }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      log("ERROR", "create-batch", "DB failure", { error }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "DB_ERROR", message: "Failed to create batch" } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PHASE 5: AUDIT LOG
    await logAuditEvent(adminClient, "CREATE_BATCH", user.id, {
      batch_id: data.id,
      name: data.name,
      join_code: data.join_code,
      expires_at: parsedExpiresAt
    });

    // Enrich with student_count = 0 for immediate UI consistency
    const enrichedData = { ...data, student_count: 0 };

    log("INFO", "create-batch", "Batch created successfully", { batch_id: data.id, join_code: data.join_code }, requestId, ctx);
    return new Response(JSON.stringify({ success: true, data: enrichedData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("ERROR", "create-batch", "Internal Server Error", { error }, requestId);
    return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: safeErrorMessage(error) } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
