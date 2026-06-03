import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { log, safeErrorMessage, getClientIP } from "../shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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
      log("ERROR", "get-batches", "Missing Authorization header", {}, requestId, { ip_address: clientIP });
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: "Unauthorized" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      log("ERROR", "get-batches", "Unauthorized user", { error: userError }, requestId, { ip_address: clientIP });
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: "Unauthorized" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get user role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "student";
    const ctx = { user_id: user.id, role: userRole, ip_address: clientIP };

    // Parse pagination params from body
    let limit = DEFAULT_LIMIT;
    let offset = 0;
    try {
      const body = await req.json();
      if (body.limit && typeof body.limit === "number") {
        limit = Math.min(Math.max(1, Math.floor(body.limit)), MAX_LIMIT);
      }
      if (body.offset && typeof body.offset === "number") {
        offset = Math.max(0, Math.floor(body.offset));
      }
    } catch {
      // No body or invalid JSON — use defaults
    }

    // Fetch one extra row to determine has_more
    const { data: batches, error } = await supabase
      .from("batches")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    if (error) {
      log("ERROR", "get-batches", "DB failure", { error }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "DB_ERROR", message: "Failed to fetch batches" } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fetchedRows = batches || [];
    const hasMore = fetchedRows.length > limit;
    const pageData = hasMore ? fetchedRows.slice(0, limit) : fetchedRows;

    // For teachers, enrich with student count per batch
    let enrichedBatches = pageData;
    if (userRole === "teacher" && enrichedBatches.length > 0) {
      const batchIds = enrichedBatches.map(b => b.id);
      const { data: studentCounts } = await adminClient
        .from("student_batches")
        .select("batch_id")
        .in("batch_id", batchIds);

      const countMap: Record<string, number> = {};
      (studentCounts || []).forEach((sc: { batch_id: string }) => {
        countMap[sc.batch_id] = (countMap[sc.batch_id] || 0) + 1;
      });

      enrichedBatches = enrichedBatches.map(b => ({
        ...b,
        student_count: countMap[b.id] || 0,
      }));
    }

    log("INFO", "get-batches", "Fetched batches", { count: enrichedBatches.length, limit, offset, hasMore }, requestId, ctx);
    return new Response(JSON.stringify({
      success: true,
      data: enrichedBatches,
      pagination: { limit, offset, has_more: hasMore }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("ERROR", "get-batches", "Internal Server Error", { error }, requestId, { ip_address: clientIP });
    return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: safeErrorMessage(error) } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
