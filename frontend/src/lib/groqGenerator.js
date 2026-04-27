/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  AI TEST GENERATOR — Client-side, multi-provider               ║
 * ║  Primary: Groq (fast) → Fallback: Gemini (reliable)            ║
 * ║  No edge function dependency. Runs entirely in the browser.    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Output shape (identical to the old edge function response):
 *   { success: true, data: { mcqs: [], shortAnswers: [], longAnswers: [] } }
 */

// ─── Provider Config ─────────────────────────────────────────────
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ─── Groq Provider ───────────────────────────────────────────────
async function callGroq(messages, { temperature = 0.3, max_tokens = 4000 } = {}) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      model: GROQ_MODEL,
      temperature,
      max_tokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    const err = new Error(`Groq API error (${res.status}): ${errorBody}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '{}';
}

// ─── Gemini Provider ─────────────────────────────────────────────
async function callGemini(userPrompt, { temperature = 0.3, max_tokens = 4000 } = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    const err = new Error(`Gemini API error (${res.status}): ${errorBody}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}

// ─── Unified AI Call (Groq → Gemini fallback) ────────────────────
async function callAI(systemPrompt, userPrompt, options = {}) {
  // Try Groq first (faster)
  if (GROQ_API_KEY) {
    try {
      return await callGroq(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options
      );
    } catch (err) {
      // Fall back on rate limit (429), content too large (413), or server errors (5xx)
      if (err.status === 429 || err.status === 413 || err.status >= 500) {
        console.warn(`[AI] Groq returned ${err.status}, falling back to Gemini...`);
      } else {
        throw err; // Re-throw auth errors, bad requests, etc.
      }
    }
  }

  // Fallback to Gemini
  if (GEMINI_API_KEY) {
    console.info('[AI] Using Gemini as fallback provider.');
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    return await callGemini(combinedPrompt, options);
  }

  throw new Error('No AI provider available. Set VITE_GROQ_API_KEY or VITE_GEMINI_API_KEY in your .env file.');
}

// ─── Main Entry Point ────────────────────────────────────────────
/**
 * Generates a test from extracted PDF text.
 * Drop-in replacement for the old edge function.
 *
 * @param {string} text - Extracted PDF text
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @param {number} numQuestions - Number of questions to generate
 * @returns {{ success: boolean, data: object }}
 */
export async function generateTestFromText(text, difficulty = 'medium', numQuestions = 10) {
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    throw new Error('No AI API key configured. Set VITE_GROQ_API_KEY or VITE_GEMINI_API_KEY in .env.');
  }

  if (!text || text.length < 50) {
    throw new Error('Insufficient text content. Please provide more text from the PDF.');
  }

  // ── Stage 1: Content Analysis ──────────────────────────────────
  // Use smaller context for Groq compatibility (free tier: 12k TPM)
  // Gemini can handle larger contexts, but we start small for the analysis stage
  const context = text.substring(0, 6000);
  const analysisPrompt = `You are a high-level academic research assistant.
Deeply analyze the following text and extract its core knowledge structure.

CONTEXT:
${context}

OUTPUT RULES:
- Identify primary topics
- Extract key concepts and their definitions (briefly)
- List important keywords
- Provide a 3-sentence summary that captures the essence of the text

Return ONLY a JSON object:
{
  "topics": [],
  "concepts": [{"name": "", "definition": ""}],
  "keywords": [],
  "summary": ""
}`;

  const analysisRaw = await callAI(
    'You are a JSON extractor. Output valid JSON objects only.',
    analysisPrompt,
    { temperature: 0.1, max_tokens: 2000 }
  );

  let analysis;
  try {
    analysis = JSON.parse(analysisRaw);
  } catch {
    analysis = { topics: [], concepts: [], keywords: [], summary: '' };
  }

  // ── Stage 2: Question Generation ───────────────────────────────
  const summary = analysis.summary || '';
  const concepts = (analysis.concepts || [])
    .map(c => `${c.name}: ${c.definition}`)
    .join('\n');

  const genPrompt = `You are an expert academic teacher.

You are given a document and a pre-analyzed structure of its contents.
CORE SUMMARY: ${summary}
KEY CONCEPTS:
${concepts}

FULL CONTEXT (Snippet):
${text.substring(0, 8000)}

Your task:
1. Understand the concepts deeply.
2. Generate exactly ${numQuestions} questions total.
3. Ensure questions are non-trivial and test actual understanding, not just word matching.

STRICT RULES:
- DO NOT create generic or placeholder questions.
- Use ONLY the provided content.
- Avoid repeating phrases from the document verbatim.
- Difficulty: ${difficulty.toUpperCase()}
- EASY: Direct factual recall.
- MEDIUM: Conceptual understanding and linking ideas.
- HARD: Analytical, application-based, or complex scenarios.

Return STRICT JSON:
{
  "mcqs": [
    {
      "question": "Meaningful question?",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct Option"
    }
  ],
  "shortAnswers": [
    {
      "question": "Deep question?",
      "answer": "Expected key points"
    }
  ],
  "longAnswers": []
}`;

  const genRaw = await callAI(
    'You are a JSON-only response bot. Output valid JSON. No markdown.',
    genPrompt,
    { temperature: 0.7, max_tokens: 8000 }
  );

  let testContent;
  try {
    testContent = JSON.parse(genRaw);
  } catch {
    throw new Error('AI returned invalid JSON. Please try again.');
  }

  // ── Stage 3: Validation & Deduplication ────────────────────────
  const seen = new Set();
  const filterUnique = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(q => {
      if (!q.question) return false;
      const key = q.question.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const validateMCQs = (mcqs) =>
    filterUnique(mcqs)
      .filter(q => q.question && Array.isArray(q.options) && q.options.length === 4 && q.answer)
      .map((q, i) => ({ ...q, sort_order: i }));

  const validateText = (qs) =>
    filterUnique(qs)
      .filter(q => q.question && q.answer)
      .map((q, i) => ({ ...q, sort_order: i }));

  const result = {
    mcqs: validateMCQs(testContent.mcqs || []),
    shortAnswers: validateText(testContent.shortAnswers || []),
    longAnswers: validateText(testContent.longAnswers || []),
    _engine: GROQ_API_KEY ? 'groq-with-gemini-fallback' : 'gemini-direct',
  };

  return { success: true, data: result };
}
