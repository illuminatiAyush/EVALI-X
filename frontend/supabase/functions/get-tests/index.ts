import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Auth client — only used to verify the user's identity
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Admin client — bypasses RLS to avoid infinite recursion
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const { test_id } = body;

    // Fetch role
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    const role = profile?.role || "student";

    if (test_id) {
      // ── Single test fetch ──
      let query = adminClient
        .from("tests")
        .select("*, questions(*)")
        .eq("id", test_id);

      // Teachers see their own tests only
      if (role === "teacher") {
        query = query.eq("created_by", user.id);
      } else {
        // Students: only active/scheduled tests they have batch access to (or global tests)
        query = query.in("status", ["scheduled", "active"]);
      }

      const { data: test, error } = await query.single();
      if (error) {
        console.error("get-tests single error:", error);
        return new Response(JSON.stringify({ success: false, error: `Test not found: ${error.message}` }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // For students, verify batch access manually
      if (role === "student") {
        // Check if test has batch assignments
        const { data: testBatches } = await adminClient
          .from("test_batches")
          .select("batch_id")
          .eq("test_id", test_id);

        if (testBatches && testBatches.length > 0) {
          // Test is batch-restricted — check if student is in one of those batches
          const batchIds = testBatches.map(tb => tb.batch_id);
          const { data: membership } = await adminClient
            .from("student_batches")
            .select("id")
            .eq("student_id", user.id)
            .in("batch_id", batchIds)
            .limit(1);

          if (!membership || membership.length === 0) {
            return new Response(JSON.stringify({ success: false, error: "Access denied" }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }
        // If no batch assignments → global test → allow access
      }

      // Sort questions by sort_order
      if (test.questions) {
        test.questions.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      }

      return new Response(JSON.stringify({ success: true, data: test }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── List all tests ──
    let query = adminClient
      .from("tests")
      .select("*")
      .order("created_at", { ascending: false });

    if (role === "teacher") {
      query = query.eq("created_by", user.id);
    } else {
      // Students: only active/scheduled tests
      query = query.in("status", ["scheduled", "active"]);
    }

    const { data: tests, error } = await query;
    if (error) {
      console.error("Error fetching tests:", error);
      return new Response(JSON.stringify({ success: false, error: "Failed to fetch tests" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // For students listing all tests, filter by batch access
    let visibleTests = tests || [];
    if (role === "student" && visibleTests.length > 0) {
      const testIds = visibleTests.map(t => t.id);

      // Get all batch assignments for these tests
      const { data: allTestBatches } = await adminClient
        .from("test_batches")
        .select("test_id, batch_id")
        .in("test_id", testIds);

      // Get student's batch memberships
      const { data: studentBatches } = await adminClient
        .from("student_batches")
        .select("batch_id")
        .eq("student_id", user.id);

      const studentBatchIds = new Set((studentBatches || []).map(sb => sb.batch_id));
      const testBatchMap = new Map();
      for (const tb of (allTestBatches || [])) {
        if (!testBatchMap.has(tb.test_id)) testBatchMap.set(tb.test_id, []);
        testBatchMap.get(tb.test_id).push(tb.batch_id);
      }

      visibleTests = visibleTests.map(test => {
        const batches = testBatchMap.get(test.id) || [];
        return { ...test, batch_ids: batches };
      }).filter(test => {
        if (test.batch_ids.length === 0) return true; // Global test
        return test.batch_ids.some(bId => studentBatchIds.has(bId)); // Batch member
      });
    } else if (role === "teacher") {
      // For teachers, also fetch their test_batches so they know which tests are in which batches
      const testIds = visibleTests.map(t => t.id);
      const { data: allTestBatches } = await adminClient
        .from("test_batches")
        .select("test_id, batch_id")
        .in("test_id", testIds);
        
      const testBatchMap = new Map();
      for (const tb of (allTestBatches || [])) {
        if (!testBatchMap.has(tb.test_id)) testBatchMap.set(tb.test_id, []);
        testBatchMap.get(tb.test_id).push(tb.batch_id);
      }
      
      visibleTests = visibleTests.map(test => ({
        ...test,
        batch_ids: testBatchMap.get(test.id) || []
      }));
    }

    return new Response(JSON.stringify({ success: true, data: visibleTests }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("get-tests error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
