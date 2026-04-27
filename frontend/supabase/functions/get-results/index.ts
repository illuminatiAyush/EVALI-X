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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Fetch role
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "student";
    const body = await req.json().catch(() => ({}));
    const { test_id } = body;

    // ─── TEACHER: Get results for a specific test ──────────────────
    if (role === "teacher" && test_id) {
      // Verify the teacher owns this test
      const { data: test } = await adminClient
        .from("tests")
        .select("id")
        .eq("id", test_id)
        .eq("created_by", user.id)
        .single();

      if (!test) {
        return new Response(JSON.stringify({ success: false, error: "Test not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: results, error } = await adminClient
        .from("results")
        .select(`
          *,
          attempts!inner(student_id, status, created_at, answers),
          profiles:student_id(email, name)
        `)
        .eq("test_id", test_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Results fetch error:", error);
        return new Response(JSON.stringify({ success: false, error: "Failed to fetch results" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, data: results || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ─── STUDENT: Get own results ──────────────────────────────────
    if (role === "student") {
      const { data: results, error } = await adminClient
        .from("results")
        .select(`
          *,
          tests:test_id(title, difficulty, total_questions, duration_minutes)
        `)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Student results fetch error:", error);
        return new Response(JSON.stringify({ success: false, error: "Failed to fetch results" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, data: results || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── Teacher without test_id: return all results across all their tests ──
    const { data: teacherTests } = await adminClient
      .from("tests")
      .select("id")
      .eq("created_by", user.id);

    if (!teacherTests || teacherTests.length === 0) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const testIds = teacherTests.map(t => t.id);
    const { data: results } = await adminClient
      .from("results")
      .select("*")
      .in("test_id", testIds)
      .order("created_at", { ascending: false });

    return new Response(JSON.stringify({ success: true, data: results || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("get-results error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
