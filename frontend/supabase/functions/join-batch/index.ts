import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { log, safeErrorMessage, getClientIP, checkRateLimit, logAuditEvent } from "../shared/logger.ts";

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
      log("ERROR", "join-batch", "Missing Authorization header", {}, requestId, { ip_address: clientIP });
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: "Unauthorized" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      log("ERROR", "join-batch", "Unauthorized user", { error: userError }, requestId, { ip_address: clientIP });
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: "Unauthorized" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Role validation — only students may join batches
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "student";
    const ctx = { user_id: user.id, role: userRole, ip_address: clientIP };

    if (profileError || !profile || userRole !== "student") {
      log("ERROR", "join-batch", "Forbidden: only students can join batches", { role: userRole }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: "Only students can join batches" } }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PHASE 2: RATE LIMITING
    const rateLimit = await checkRateLimit(adminClient, user.id, "JOIN_BATCH", 10, 1);
    if (!rateLimit.allowed) {
      log("ERROR", "join-batch", "Rate limit exceeded", { attempts: rateLimit.count }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "RATE_LIMIT", message: "Too many attempts. Try again later." } }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let body: { join_code?: unknown };
    try {
      body = await req.json();
    } catch {
      log("ERROR", "join-batch", "Invalid JSON body", {}, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { join_code } = body;

    // Input sanitization
    if (!join_code || typeof join_code !== "string") {
      log("ERROR", "join-batch", "Missing or invalid join code", {}, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Join code is required" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sanitizedCode = join_code.trim().toUpperCase().substring(0, 20);

    // Validate join code format: 1-4 letters, dash, exactly 4 alphanumeric
    if (!/^[A-Z]{1,4}-[A-Z0-9]{4}$/.test(sanitizedCode)) {
      log("ERROR", "join-batch", "Invalid join code format", { join_code: sanitizedCode }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid join code format. Expected format: ABCD-1234" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use service role to find the batch
    const { data: batchData, error: batchError } = await adminClient
      .from("batches")
      .select("id, name, expires_at")
      .eq("join_code", sanitizedCode)
      .maybeSingle();

    if (batchError || !batchData) {
      log("ERROR", "join-batch", "Invalid join code — batch not found", { join_code: sanitizedCode, error: batchError }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Invalid join code. Please check with your teacher." } }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PHASE 4: EXPIRY VALIDATION
    if (batchData.expires_at && new Date() > new Date(batchData.expires_at)) {
      log("ERROR", "join-batch", "Batch enrollment expired", { batch_id: batchData.id, expires_at: batchData.expires_at }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "This batch is no longer accepting students" } }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check for duplicate join before inserting
    const { data: existingJoin } = await adminClient
      .from("student_batches")
      .select("id")
      .eq("student_id", user.id)
      .eq("batch_id", batchData.id)
      .maybeSingle();

    if (existingJoin) {
      log("INFO", "join-batch", "Student already in batch", { batch_id: batchData.id }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: `You have already joined "${batchData.name}"` } }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert via user's client
    const { error: insertError } = await supabase
      .from("student_batches")
      .insert({ student_id: user.id, batch_id: batchData.id });

    if (insertError) {
      if (insertError.code === "23505") {
        log("INFO", "join-batch", "Race condition duplicate caught", { batch_id: batchData.id }, requestId, ctx);
        return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Already joined this batch" } }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      log("ERROR", "join-batch", "DB failure", { error: insertError }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "DB_ERROR", message: "Failed to join batch" } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PHASE 5: AUDIT LOG
    await logAuditEvent(adminClient, "JOIN_BATCH", user.id, {
      batch_id: batchData.id,
      join_code: sanitizedCode
    });

    log("INFO", "join-batch", "Joined batch successfully", { batch_id: batchData.id, batch_name: batchData.name }, requestId, ctx);
    return new Response(JSON.stringify({ success: true, data: { batch_id: batchData.id, batch_name: batchData.name } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("ERROR", "join-batch", "Internal Server Error", { error }, requestId);
    return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: safeErrorMessage(error) } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
