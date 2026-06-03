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

    const body = await req.json();
    const { attempt_id, reason } = body;

    if (!attempt_id) {
      return new Response(JSON.stringify({ success: false, error: "attempt_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get the attempt
    const { data: attempt, error: attemptError } = await adminClient
      .from("attempts")
      .select("*")
      .eq("id", attempt_id)
      .eq("student_id", user.id)
      .single();

    if (attemptError || !attempt) {
      return new Response(JSON.stringify({ success: false, error: "Attempt not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (attempt.status !== "in_progress") {
      return new Response(JSON.stringify({ success: false, error: "Attempt already submitted" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Update attempt status
    const finalStatus = reason === "timeout" ? "forced_end" : "submitted";
    const { error: updateError } = await adminClient
      .from("attempts")
      .update({ status: finalStatus })
      .eq("id", attempt_id);

    if (updateError) {
      console.error("Attempt update error:", updateError);
      return new Response(JSON.stringify({ success: false, error: "Failed to submit attempt" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── AUTO-GRADE ─────────────────────────────────────────────────
    // Get correct answers for this test
    const { data: questions } = await adminClient
      .from("questions")
      .select("id, question, answer, type")
      .eq("test_id", attempt.test_id);

    const studentAnswers = attempt.answers || {};
    let correctCount = 0;
    const answerDetails = {};

    if (questions) {
      for (const q of questions) {
        const studentAnswer = studentAnswers[q.id];
        let isCorrect = false;

        if (q.type === "mcq") {
          // For MCQ: exact match (case-insensitive trim)
          isCorrect = studentAnswer &&
            String(studentAnswer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
        } else {
          // For short/long answers: basic keyword match
          isCorrect = studentAnswer &&
            String(studentAnswer).trim().toLowerCase().includes(String(q.answer).trim().toLowerCase());
        }

        if (isCorrect) correctCount++;

        answerDetails[q.id] = {
          question_text: q.question,
          student_answer: studentAnswer || null,
          correct_answer: q.answer,
          is_correct: isCorrect,
        };
      }
    }

    const totalQuestions = questions ? questions.length : 1;
    const marks = correctCount;

    // Create result record
    const { data: result, error: resultError } = await adminClient
      .from("results")
      .insert({
        attempt_id: attempt.id,
        student_id: user.id,
        test_id: attempt.test_id,
        marks,
        answers: answerDetails,
        ai_feedback: {
          total_questions: totalQuestions,
          correct_answers: correctCount,
          percentage: Math.round((correctCount / totalQuestions) * 100),
          submitted_reason: reason || "completed",
        },
      })
      .select()
      .single();

    if (resultError) {
      console.error("Result creation error:", resultError);
      // Don't fail — attempt is already submitted
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        attempt_id: attempt.id,
        status: finalStatus,
        marks,
        total: totalQuestions,
        percentage: Math.round((correctCount / totalQuestions) * 100),
        result: result || null,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("submit-attempt error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
