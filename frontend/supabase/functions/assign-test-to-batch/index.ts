import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { log, safeErrorMessage, getClientIP, logAuditEvent } from "../shared/logger.ts";

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
      log("ERROR", "assign-test-to-batch", "Missing Authorization header", {}, requestId, { ip_address: clientIP });
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: "Unauthorized" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      log("ERROR", "assign-test-to-batch", "Unauthorized user", { error: userError }, requestId, { ip_address: clientIP });
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: "Unauthorized" } }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Role validation — only teachers may assign tests
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "student";
    const ctx = { user_id: user.id, role: userRole, ip_address: clientIP };

    if (profileError || !profile || userRole !== "teacher") {
      log("ERROR", "assign-test-to-batch", "Forbidden: only teachers can assign tests", {}, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: "Only teachers can assign tests to batches" } }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let body: { test_id?: unknown; batch_ids?: unknown };
    try {
      body = await req.json();
    } catch {
      log("ERROR", "assign-test-to-batch", "Invalid JSON body", {}, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { test_id, batch_ids } = body;

    // Input validation
    if (!test_id || typeof test_id !== "string") {
      log("ERROR", "assign-test-to-batch", "Missing or invalid test_id", {}, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "test_id is required" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!batch_ids || !Array.isArray(batch_ids) || batch_ids.length === 0) {
      log("ERROR", "assign-test-to-batch", "Missing or empty batch_ids", { test_id }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "At least one batch_id is required" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate each batch_id is a string
    const validBatchIds = batch_ids.filter((id): id is string => typeof id === "string" && id.length > 0);
    if (validBatchIds.length !== batch_ids.length) {
      log("ERROR", "assign-test-to-batch", "Invalid batch_id types in array", { raw_count: batch_ids.length, valid_count: validBatchIds.length }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "All batch_ids must be valid strings" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cap batch assignment at 50 to prevent abuse
    if (validBatchIds.length > 50) {
      log("ERROR", "assign-test-to-batch", "Too many batch_ids", { count: validBatchIds.length }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Cannot assign to more than 50 batches at once" } }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate ownership: teacher must own the test
    const { data: testData, error: testError } = await adminClient
      .from("tests")
      .select("id")
      .eq("id", test_id)
      .eq("created_by", user.id)
      .single();

    if (testError || !testData) {
      log("ERROR", "assign-test-to-batch", "Unauthorized test access or test not found", { error: testError, test_id }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: "You do not have permission to modify this test" } }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate that each batch_id belongs to this teacher
    const { data: ownedBatches, error: batchCheckError } = await adminClient
      .from("batches")
      .select("id")
      .eq("created_by", user.id)
      .in("id", validBatchIds);

    if (batchCheckError) {
      log("ERROR", "assign-test-to-batch", "Failed to validate batch ownership", { error: batchCheckError }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "DB_ERROR", message: "Failed to validate batches" } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ownedBatchIds = new Set((ownedBatches || []).map(b => b.id));
    const unauthorizedBatches = validBatchIds.filter(id => !ownedBatchIds.has(id));

    if (unauthorizedBatches.length > 0) {
      log("ERROR", "assign-test-to-batch", "Teacher does not own some batches", { unauthorized: unauthorizedBatches }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: `You do not own ${unauthorizedBatches.length} of the specified batches` } }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert into test_batches via admin client
    const insertions = validBatchIds.map(batch_id => ({ test_id, batch_id }));
    const { error: insertError } = await adminClient
      .from("test_batches")
      .upsert(insertions, { onConflict: "test_id,batch_id", ignoreDuplicates: true });

    if (insertError) {
      log("ERROR", "assign-test-to-batch", "DB failure", { error: insertError }, requestId, ctx);
      return new Response(JSON.stringify({ success: false, error: { code: "DB_ERROR", message: "Failed to assign test to batches" } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PHASE 5: AUDIT LOG
    await logAuditEvent(adminClient, "ASSIGN_TEST", user.id, {
      test_id,
      batch_ids: validBatchIds
    });

    log("INFO", "assign-test-to-batch", "Test assigned to batches successfully", { test_id, batch_count: validBatchIds.length }, requestId, ctx);
    return new Response(JSON.stringify({ success: true, data: { test_id, batch_ids: validBatchIds } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("ERROR", "assign-test-to-batch", "Internal Server Error", { error }, requestId, { ip_address: clientIP });
    return new Response(JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: safeErrorMessage(error) } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
