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
    const groqApiKey = Deno.env.get("GROQ_API_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Unauthorized",
        details_message: userError?.message || 'No message',
        details_name: userError?.name || 'No name',
        details_status: userError?.status || 'No status',
        url: supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { text, difficulty = "medium", numQuestions = 10 } = body;

    if (!text || text.trim().length < 50) {
      return new Response(JSON.stringify({ success: false, error: "Insufficient text content. Please provide more text from your PDF." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!groqApiKey) {
      return new Response(JSON.stringify({ success: false, error: "GROQ_API_KEY not configured. Please set it via: npx supabase secrets set GROQ_API_KEY=your-key" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Truncate text to avoid token limits (roughly 4000 words)
    const truncatedText = text.slice(0, 16000);

    const systemPrompt = `You are an expert test generator for educational assessments. Generate exactly ${numQuestions} questions from the given content.

Rules:
- Difficulty level: ${difficulty}
- Generate a mix of MCQ and short answer questions
- Each MCQ must have exactly 4 options labeled A, B, C, D
- Provide the correct answer for each question
- Questions should test understanding, not just recall

Return a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question": "The question text",
      "type": "mcq",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "answer": "A"
    },
    {
      "question": "Short answer question text",
      "type": "short",
      "options": [],
      "answer": "The correct short answer"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${numQuestions} ${difficulty} questions from this content:\n\n${truncatedText}` },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", groqResponse.status, errorText);
      return new Response(JSON.stringify({ success: false, error: `AI generation failed (${groqResponse.status}): ${errorText.slice(0, 200)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ success: false, error: "AI returned empty response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse the JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseErr) {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Failed to parse Groq response:", content);
        return new Response(JSON.stringify({ success: false, error: "AI returned invalid format. Please try again." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Validate structure
    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      return new Response(JSON.stringify({ success: false, error: "AI response missing questions array" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Generated ${parsedContent.questions.length} questions for user ${user.id}`);

    return new Response(JSON.stringify({ success: true, data: parsedContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("generate-test error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
