/**
 * AI Service — Orchestrates LLM calls
 * 
 * Migrated from Edge Functions. Handles the prompt construction and
 * API calls to Groq and Gemini to generate test questions.
 */

const { logger } = require('../utils/logger');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Helper to make API calls to AI providers with fallback.
 */
async function callAI(systemPrompt, userPrompt, options = {}) {
  // 1. Try Groq (Llama 3.3) first for speed and json mode
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
      } else {
        const errBody = await res.text();
        logger.warn({ status: res.status, body: errBody }, 'Groq API call failed');
      }
    } catch (err) {
      logger.warn({ err }, 'Groq network error, falling back to Gemini...');
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
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      } else {
        const errBody = await res.text();
        logger.error({ status: res.status, body: errBody }, 'Gemini API call failed');
      }
    } catch (err) {
      logger.error({ err }, 'Gemini network error');
    }
  }

  throw new Error('All AI providers failed');
}

/**
 * Generates test questions based on extracted text.
 * @param {string} text - The extracted text from the PDF.
 * @param {string} difficulty - e.g., 'easy', 'medium', 'hard'.
 * @param {number} numQuestions - Total number of questions to generate.
 */
async function generateTestQuestions(text, difficulty = 'medium', numQuestions = 10) {
  // Stage 1: Analysis (Truncated to fit context window safely)
  const contextLimit = 15000; // Allow more context since we are not restricted by Edge memory
  const context = text.substring(0, contextLimit);
  
  const analysisPrompt = `Analyze text and extract JSON: { topics: [], concepts: [{name, definition}], keywords: [], summary: "" }. Context: ${context}`;
  const analysisRaw = await callAI('You are a JSON extractor. Output valid JSON only.', analysisPrompt, { temperature: 0.1, max_tokens: 2000 });
  
  let analysis;
  try {
    analysis = JSON.parse(analysisRaw);
  } catch (e) {
    logger.error({ raw: analysisRaw }, 'Failed to parse Analysis JSON');
    throw new Error('AI produced invalid analysis format.');
  }

  // Stage 2: Generation
  const genPrompt = `Generate ${numQuestions} questions (${difficulty}). Context: ${context}. Summary: ${analysis.summary || ''}. Return valid JSON strictly in this format: { mcqs: [{question, options, answer}], shortAnswers: [{question, answer}] }`;
  const genRaw = await callAI('You are an expert teacher. Output valid JSON only.', genPrompt, { temperature: 0.7, max_tokens: 8000 });
  
  let testContent;
  try {
    testContent = JSON.parse(genRaw);
  } catch (e) {
    logger.error({ raw: genRaw }, 'Failed to parse Generation JSON');
    throw new Error('AI produced invalid questions format.');
  }

  // Flatten the response
  const questions = [
    ...(testContent.mcqs || []).map(q => ({ ...q, type: 'mcq' })),
    ...(testContent.shortAnswers || []).map(q => ({ ...q, type: 'short' })),
    ...(testContent.longAnswers || []).map(q => ({ ...q, type: 'long' })),
  ];

  return questions;
}

module.exports = { generateTestQuestions };
