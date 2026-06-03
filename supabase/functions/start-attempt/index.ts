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

    // Verify student role
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "student") {
      return new Response(JSON.stringify({ success: false, error: "Only students can attempt tests" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { action } = body;

    // ─── START ATTEMPT ─────────────────────────────────────────────
    if (action === "start") {
      const { test_id } = body;

      if (!test_id) {
        return new Response(JSON.stringify({ success: false, error: "test_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get the test details
      const { data: test, error: testError } = await adminClient
        .from("tests")
        .select("*")
        .eq("id", test_id)
        .single();

      if (testError || !test) {
        return new Response(JSON.stringify({ success: false, error: "Test not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (test.status !== "active") {
        return new Response(JSON.stringify({ success: false, error: "This test is not currently active" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Check for existing attempt
      const { data: existingAttempt } = await adminClient
        .from("attempts")
        .select("*")
        .eq("student_id", user.id)
        .eq("test_id", test_id)
        .single();

      if (existingAttempt) {
        // Return existing attempt + questions
        const { data: questions } = await adminClient
          .from("questions")
          .select("id, question, options, type, sort_order")
          .eq("test_id", test_id)
          .order("sort_order");

        return new Response(JSON.stringify({
          success: true,
          data: {
            attempt: existingAttempt,
            questions: questions || [],
            remaining_seconds: Math.max(0, Math.floor((new Date(existingAttempt.ends_at) - new Date()) / 1000)),
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Create new attempt
      const durationMs = (test.duration_minutes || 30) * 60 * 1000;
      const endsAt = new Date(Date.now() + durationMs).toISOString();

      const { data: attempt, error: attemptError } = await adminClient
        .from("attempts")
        .insert({
          student_id: user.id,
          test_id: test_id,
          status: "in_progress",
          answers: {},
          ends_at: endsAt,
        })
        .select()
        .single();

      if (attemptError) {
        console.error("Attempt creation error:", attemptError);
        return new Response(JSON.stringify({ success: false, error: "Failed to start attempt" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get questions (without answers for students)
      const { data: questions } = await adminClient
        .from("questions")
        .select("id, question, options, type, sort_order")
        .eq("test_id", test_id)
        .order("sort_order");

      return new Response(JSON.stringify({
        success: true,
        data: {
          attempt,
          questions: questions || [],
          remaining_seconds: Math.floor(durationMs / 1000),
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ─── SAVE ANSWER ───────────────────────────────────────────────
    if (action === "answer") {
      const { attempt_id, question_id, answer } = body;

      if (!attempt_id || !question_id) {
        return new Response(JSON.stringify({ success: false, error: "attempt_id and question_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get current attempt
      const { data: attempt } = await adminClient
        .from("attempts")
        .select("*")
        .eq("id", attempt_id)
        .eq("student_id", user.id)
        .single();

      if (!attempt) {
        return new Response(JSON.stringify({ success: false, error: "Attempt not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (attempt.status !== "in_progress") {
        return new Response(JSON.stringify({ success: false, error: "Attempt already submitted" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Check if time expired
      if (new Date(attempt.ends_at) < new Date()) {
        return new Response(JSON.stringify({ success: false, error: "Time expired" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Update answers JSONB
      const updatedAnswers = { ...attempt.answers, [question_id]: answer };

      const { data: updated, error } = await adminClient
        .from("attempts")
        .update({ answers: updatedAnswers })
        .eq("id", attempt_id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to save answer" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, data: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ─── RECORD VIOLATION ──────────────────────────────────────────
    if (action === "violation") {
      const { attempt_id } = body;

      if (!attempt_id) {
        return new Response(JSON.stringify({ success: false, error: "attempt_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: attempt } = await adminClient
        .from("attempts")
        .select("*")
        .eq("id", attempt_id)
        .eq("student_id", user.id)
        .single();

      if (!attempt) {
        return new Response(JSON.stringify({ success: false, error: "Attempt not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const violations = (attempt.answers?._violations || 0) + 1;
      const updatedAnswers = { ...attempt.answers, _violations: violations };

      const { data: updated } = await adminClient
        .from("attempts")
        .update({ answers: updatedAnswers })
        .eq("id", attempt_id)
        .select()
        .single();

      return new Response(JSON.stringify({ success: true, data: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("start-attempt error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
