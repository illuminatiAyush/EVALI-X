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

    // Verify teacher role
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (profile?.role !== "teacher") {
      return new Response(JSON.stringify({ success: false, error: "Only teachers can manage tests" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { action, test_id } = body;

    // ─── CREATE ────────────────────────────────────────────────────
    if (action === "create") {
      const { title, difficulty, duration_minutes, total_marks, content, is_ai_generated, start_time, end_time, status } = body;

      if (!title) {
        return new Response(JSON.stringify({ success: false, error: "Title is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Insert test record
      const { data: test, error: testError } = await adminClient
        .from("tests")
        .insert({
          title,
          difficulty: difficulty || "medium",
          duration_minutes: duration_minutes || 30,
          total_questions: content?.questions?.length || total_marks || 0,
          status: status || "draft",
          start_time: start_time || null,
          end_time: end_time || null,
          source_document: is_ai_generated ? { ai_generated: true } : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (testError) {
        console.error("Test insert error:", testError);
        return new Response(JSON.stringify({ success: false, error: "Failed to create test" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Insert questions if provided
      if (content?.questions && Array.isArray(content.questions)) {
        const questions = content.questions.map((q, i) => ({
          test_id: test.id,
          question: q.question || q.text || "",
          options: q.options || [],
          answer: q.answer || q.correct_answer || "",
          type: q.type || "mcq",
          sort_order: i,
        }));

        const { error: qError } = await adminClient
          .from("questions")
          .insert(questions);

        if (qError) {
          console.error("Questions insert error:", qError);
          // Don't fail the whole operation — test was created
        } else {
          console.log(`Inserted ${questions.length} questions for test ${test.id}`);
        }
      }

      return new Response(JSON.stringify({ success: true, data: test }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ─── UPDATE ────────────────────────────────────────────────────
    if (action === "update") {
      if (!test_id) {
        return new Response(JSON.stringify({ success: false, error: "test_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { title, difficulty, duration_minutes, status, start_time, end_time } = body;
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (difficulty !== undefined) updates.difficulty = difficulty;
      if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;
      if (status !== undefined) updates.status = status;
      if (start_time !== undefined) updates.start_time = start_time;
      if (end_time !== undefined) updates.end_time = end_time;

      const { data: test, error } = await adminClient
        .from("tests")
        .update(updates)
        .eq("id", test_id)
        .eq("created_by", user.id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to update test" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, data: test }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ─── START (Activate) ──────────────────────────────────────────
    if (action === "start") {
      if (!test_id) {
        return new Response(JSON.stringify({ success: false, error: "test_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: test, error } = await adminClient
        .from("tests")
        .update({ status: "active", start_time: new Date().toISOString() })
        .eq("id", test_id)
        .eq("created_by", user.id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to start test" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, data: test }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ─── END (Force-end) ───────────────────────────────────────────
    if (action === "end") {
      if (!test_id) {
        return new Response(JSON.stringify({ success: false, error: "test_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: test, error } = await adminClient
        .from("tests")
        .update({ status: "ended", end_time: new Date().toISOString() })
        .eq("id", test_id)
        .eq("created_by", user.id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to end test" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Force-submit all active attempts for this test
      await adminClient
        .from("attempts")
        .update({ status: "forced_end" })
        .eq("test_id", test_id)
        .eq("status", "in_progress");

      return new Response(JSON.stringify({ success: true, data: test }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("create-test error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
