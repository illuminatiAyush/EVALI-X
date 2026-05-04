/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  AI SERVICE — LLM Orchestration Engine                          ║
 * ║  Hardened: Deep Zod Validation + Answer Integrity Checks        ║
 * ║  Providers: Groq (primary) → Gemini (fallback)                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { logger } = require('../utils/logger');
const { aiAnalysisSchema, aiGenerationSchema, validateAIQuestions } = require('../utils/validators');
const { supabaseAdmin } = require('../utils/supabaseClient');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Track token usage in DB
async function trackTokenUsage(userId, tokens, model) {
  if (!userId || !tokens) return;
  try {
    await supabaseAdmin.from('api_usage').insert({
      user_id: userId,
      tokens_used: tokens,
      model: model
    });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to track token usage');
  }
}

/**
 * Makes API calls to AI providers with automatic fallback.
 */
async function callAI(systemPrompt, userPrompt, options = {}) {
  const errors = [];

  // 1. Try Groq (Llama 3.3) — fast, supports json_object mode
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
        
        // Track token usage
        if (data.usage?.total_tokens && options.userId) {
          await trackTokenUsage(options.userId, data.usage.total_tokens, 'llama-3.3-70b-versatile');
        }

        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
        logger.warn('Groq 70B returned empty content');
      } else {
        const errBody = await res.text();
        errors.push(`Groq 70B ${res.status}: ${errBody.substring(0, 100)}`);
        logger.warn({ status: res.status, body: errBody.substring(0, 100) }, 'Groq 70B failed, falling back to 8B-instant...');
        
        // Internal Fallback to 8B model (100k TPM limit)
        const res8b = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            model: 'llama-3.1-8b-instant',
            temperature: options.temperature || 0.3,
            max_tokens: options.max_tokens || 4000,
            response_format: { type: 'json_object' },
          }),
        });
        
        if (res8b.ok) {
          const data8b = await res8b.json();

          if (data8b.usage?.total_tokens && options.userId) {
            await trackTokenUsage(options.userId, data8b.usage.total_tokens, 'llama-3.1-8b-instant');
          }

          const content8b = data8b.choices?.[0]?.message?.content;
          if (content8b) return content8b;
        } else {
          const err8b = await res8b.text();
          errors.push(`Groq 8B ${res8b.status}: ${err8b.substring(0, 100)}`);
        }
      }
    } catch (err) {
      errors.push(`Groq network: ${err.message}`);
      logger.warn({ err: err.message }, 'Groq network error, falling back to Gemini...');
    }
  }

  // 2. Fallback to Gemini 2.0 Flash
  if (GEMINI_API_KEY) {
    try {
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
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) return content;
        logger.warn('Gemini returned empty content');
      } else {
        const errBody = await res.text();
        errors.push(`Gemini ${res.status}: ${errBody.substring(0, 200)}`);
        logger.error({ status: res.status, body: errBody.substring(0, 200) }, 'Gemini API call failed');
      }
    } catch (err) {
      errors.push(`Gemini network: ${err.message}`);
      logger.error({ err: err.message }, 'Gemini network error');
    }
  }

  throw new Error(`All AI providers failed. Details: ${errors.join(' | ')}`);
}

/**
 * Safely parses JSON from AI output, stripping markdown fences.
 */
function safeParseJSON(raw, context = 'AI') {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    logger.error({ raw: cleaned.substring(0, 500) }, `Failed to parse ${context} JSON`);
    throw new Error(`${context} produced invalid JSON structure`);
  }
}


async function generateTestQuestions(documentText, difficulty, numQuestions, userId = null) {
  // ── Stage 1: Assessment Generation ──────────────────────────────
  const genPrompt = `
    Based on the following extracted text, generate an assessment with EXACTLY ${numQuestions} questions.
    Difficulty level: ${difficulty.toUpperCase()}.

    TEXT SOURCE:
    ${documentText}

    OUTPUT FORMAT:
    {
      "mcqs": [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "Exact option text"}],
      "shortAnswers": [{"question": "...", "answer": "..."}]
    }
    
    RULES:
    - Each MCQ MUST have exactly 4 options.
    - Questions must be unique.
    - Return ONLY valid JSON. No conversational text.
  `;
  
  const genRaw = await callAI(
    'You are a professional assessment engine. Output valid JSON strictly. No markdown fences.',
    genPrompt,
    { temperature: 0.7, max_tokens: 4000, userId }
  );
  
  const genParsed = safeParseJSON(genRaw, 'Generation');

  // Validate generation structure with Zod
  const genResult = aiGenerationSchema.safeParse(genParsed);
  if (!genResult.success) {
    logger.error({ errors: genResult.error.errors, raw: JSON.stringify(genParsed).substring(0, 500) }, 'Generation schema validation FAILED');
    throw new Error('AI produced questions with invalid structure. Please retry.');
  }

  const testContent = genResult.data;

  // ── Stage 2: Flatten + Deep Validate ───────────────────────────
  const rawQuestions = [
    ...(testContent.mcqs || []).map(q => ({ ...q, type: 'mcq' })),
    ...(testContent.shortAnswers || []).map(q => ({ ...q, type: 'short' })),
    ...(testContent.longAnswers || []).map(q => ({ ...q, type: 'long' })),
  ];

  // Deep validation: answer-in-options check, deduplication
  const validatedQuestions = validateAIQuestions(rawQuestions);

  if (validatedQuestions.length === 0) {
    throw new Error('AI generated zero valid questions after validation. Please retry with different content.');
  }

  logger.info({
    requested: numQuestions,
    generated: rawQuestions.length,
    afterValidation: validatedQuestions.length,
  }, 'AI question generation pipeline complete');

  return validatedQuestions;
}

/**
 * Generates an evaluation analysis for a student's test attempt.
 */
async function analyzeTestResults(testData, studentResponses, userId = null) {
  const prompt = `
    Analyze the following test attempt and provide a detailed JSON report.
    
    Test Data: ${JSON.stringify(testData)}
    Student Responses: ${JSON.stringify(studentResponses)}

    OUTPUT FORMAT:
    {
      "strengths": ["...", "..."],
      "weaknesses": ["...", "..."],
      "improvement_plan": "...",
      "score_percentage": 85,
      "estimated_understanding_level": "Advanced"
    }
  `;

  const rawOut = await callAI(
    'You are an expert AI grader. Provide strict JSON only. Do not output markdown code blocks.',
    prompt,
    { temperature: 0.2, max_tokens: 2000, userId }
  );

  const parsedOut = safeParseJSON(rawOut, 'Analysis');

  const result = aiAnalysisSchema.safeParse(parsedOut);
  if (!result.success) {
    throw new Error('Invalid analysis output from AI');
  }

  return result.data;
}

module.exports = {
  generateTestQuestions,
  analyzeTestResults,
};
