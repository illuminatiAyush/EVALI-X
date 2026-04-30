import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, difficulty = 'medium', numQuestions = 10 } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI API keys not configured in Edge Function' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Helper for AI Calls ---
    async function callAI(systemPrompt: string, userPrompt: string, options = {}) {
      if (GROQ_API_KEY) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              model: 'llama-3.3-70b-versatile',
              temperature: options.temperature || 0.3,
              max_tokens: options.max_tokens || 4000,
              response_format: { type: 'json_object' },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            return data.choices?.[0]?.message?.content || '{}';
          }
        } catch (err) {
          console.warn('Groq failed, falling back to Gemini...', err);
        }
      }

      if (GEMINI_API_KEY) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: {
              temperature: options.temperature || 0.3,
              maxOutputTokens: options.max_tokens || 4000,
              responseMimeType: 'application/json',
            },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        }
      }

      throw new Error('All AI providers failed');
    }

    // --- Stage 1: Analysis ---
    const context = text.substring(0, 6000);
    const analysisPrompt = `Analyze text and extract JSON: { topics: [], concepts: [{name, definition}], keywords: [], summary: "" }. Context: ${context}`;
    const analysisRaw = await callAI('You are a JSON extractor.', analysisPrompt, { temperature: 0.1, max_tokens: 2000 });
    const analysis = JSON.parse(analysisRaw);

    // --- Stage 2: Generation ---
    const genPrompt = `Generate ${numQuestions} questions (${difficulty}). Context: ${text.substring(0, 8000)}. Summary: ${analysis.summary}. Return JSON: { mcqs: [{question, options, answer}], shortAnswers: [{question, answer}] }`;
    const genRaw = await callAI('You are an expert teacher. JSON only.', genPrompt, { temperature: 0.7, max_tokens: 8000 });
    const testContent = JSON.parse(genRaw);

    return new Response(JSON.stringify({ success: true, result: testContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
