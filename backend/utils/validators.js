/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  VALIDATORS — Zod-Based Request & AI Output Validation          ║
 * ║  TRUST NOTHING. VALIDATE EVERYTHING.                            ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { z } = require('zod');

// ─── REQUEST SCHEMAS ──────────────────────────────────────────────

/**
 * POST /api/generate-test (multipart — validated after extraction)
 */
const generateTestSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  numQuestions: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * POST /api/create-test
 */
const createTestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  duration_minutes: z.coerce.number().int().min(1).max(300).default(30),
  total_marks: z.coerce.number().int().min(0).optional(),
  batch_ids: z.array(z.string().uuid()).optional().nullable(),
  content: z.object({
    questions: z.array(z.object({
      question: z.string().min(1),
      options: z.array(z.string()).optional(),
      answer: z.string().min(1),
      type: z.enum(['mcq', 'short', 'long']).default('mcq'),
    })).min(1),
  }),
  is_ai_generated: z.boolean().optional(),
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'active', 'ended']).default('draft'),
});

/**
 * POST /api/start-attempt
 */
const startAttemptSchema = z.object({
  testId: z.string().uuid('Invalid test ID format'),
});

/**
 * POST /api/submit-attempt
 */
const submitAttemptSchema = z.object({
  attemptId: z.string().uuid('Invalid attempt ID format'),
  answers: z.record(z.string(), z.string()),
});

/**
 * POST /api/test-status/:id
 */
const testStatusSchema = z.object({
  action: z.enum(['publish', 'start', 'end']),
});

// ─── AI OUTPUT SCHEMAS ────────────────────────────────────────────

const mcqQuestionSchema = z.object({
  question: z.string().min(5, 'Question too short'),
  options: z.array(z.string().min(1)).length(4, 'MCQ must have exactly 4 options'),
  answer: z.string().min(1, 'Answer is required'),
});

const shortAnswerSchema = z.object({
  question: z.string().min(5, 'Question too short'),
  answer: z.string().min(1, 'Answer is required'),
});

const aiAnalysisSchema = z.object({
  topics: z.array(z.string()).optional().default([]),
  concepts: z.array(z.object({
    name: z.string(),
    definition: z.string().optional(),
  })).optional().default([]),
  keywords: z.array(z.string()).optional().default([]),
  summary: z.string().optional().default(''),
});

const aiGenerationSchema = z.object({
  mcqs: z.array(mcqQuestionSchema).optional().default([]),
  shortAnswers: z.array(shortAnswerSchema).optional().default([]),
  longAnswers: z.array(shortAnswerSchema).optional().default([]),
});

// ─── VALIDATION HELPERS ───────────────────────────────────────────

/**
 * Validates data against a schema. Returns { success, data, error }.
 */
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, error: null };
  }
  return {
    success: false,
    data: null,
    error: result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  };
}

/**
 * Validates and throws on failure. Use in service layers.
 */
function validateOrThrow(schema, data, context = 'Validation') {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`${context} failed — ${details}`);
  }
  return result.data;
}

/**
 * Fastify preHandler hook factory for route-level validation.
 */
function validateBody(schema) {
  return async (request, reply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request payload',
        details: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    // Replace body with validated + coerced data
    request.body = result.data;
  };
}

/**
 * Deep-validates AI-generated MCQ questions.
 * Ensures answer exists in options, removes duplicates.
 */
function validateAIQuestions(questions) {
  const seen = new Set();
  const validated = [];

  for (const q of questions) {
    // Skip duplicates
    const key = q.question.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // For MCQs, ensure answer is in options
    if (q.type === 'mcq' && q.options && Array.isArray(q.options)) {
      const answerInOptions = q.options.some(
        opt => opt.trim().toLowerCase() === q.answer.trim().toLowerCase()
      );
      if (!answerInOptions) {
        // Auto-fix: replace the last option with the answer
        q.options[3] = q.answer;
      }
    }

    validated.push(q);
  }

  return validated;
}

module.exports = {
  generateTestSchema,
  createTestSchema,
  startAttemptSchema,
  submitAttemptSchema,
  testStatusSchema,
  mcqQuestionSchema,
  shortAnswerSchema,
  aiAnalysisSchema,
  aiGenerationSchema,
  validate,
  validateOrThrow,
  validateBody,
  validateAIQuestions,
};
