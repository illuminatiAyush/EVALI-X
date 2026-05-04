/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  AI ROUTES — PDF Upload & Test Generation Pipeline              ║
 * ║  Hardened: Zod Validation + Strict Rate Limit (3/min)           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { extractTextFromPDF } = require('../services/pdfService');
const { generateTestQuestions } = require('../services/aiService');
const { authenticate } = require('../utils/authMiddleware');
const { generateTestSchema } = require('../utils/validators');
const { testQueue } = require('../services/queueService');

async function aiRoutes(fastify, options) {
  // Protect all routes in this plugin
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /api/generate-test
   * Accepts multipart/form-data with a 'file' (PDF), 'difficulty', 'numQuestions'
   * 
   * Rate Limit: 3 requests per minute (AI is expensive)
   */
  fastify.route({
    method: 'POST',
    url: '/generate-test',
    config: {
      rateLimit: {
        max: 30, // Increased for development testing to prevent 'Failed to fetch' stream abortions
        timeWindow: '1 minute',
        keyGenerator: (request) => request.user?.id || request.ip,
        errorResponseBuilder: () => ({
          success: false,
          error: 'AI generation rate limit exceeded. Maximum 3 assessments per minute. Please wait.',
        }),
      },
    },
    handler: async (request, reply) => {
      // 1. Process multipart request
      const parts = request.parts();
      let fileBuffer = null;
      let rawFields = {};

      for await (const part of parts) {
        if (part.file) {
          fileBuffer = await part.toBuffer();
        } else {
          rawFields[part.fieldname] = part.value;
        }
      }

      // 2. Validate extracted fields with Zod
      const validation = generateTestSchema.safeParse(rawFields);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid parameters',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const { difficulty, numQuestions } = validation.data;

      // 3. Validate file presence
      if (!fileBuffer) {
        return reply.status(400).send({
          success: false,
          error: 'PDF file is required in the "file" field.',
        });
      }

      // 4. Validate file size (double-check beyond multipart limits)
      if (fileBuffer.length > 20 * 1024 * 1024) {
        return reply.status(400).send({
          success: false,
          error: 'File exceeds 20MB limit.',
        });
      }

      try {
        request.log.info({ userId: request.user.id, difficulty, numQuestions }, 'Dispatching AI generation job to queue');

        // Convert Buffer to Array so it survives Redis serialization
        const fileBufferArray = Array.from(fileBuffer);

        // Add job to background queue (Fix 7)
        const job = await testQueue.add('generate-test', {
          fileBufferArray,
          difficulty,
          numQuestions,
          userId: request.user.id
        });

        return reply.send({
          success: true,
          message: 'Job queued successfully',
          jobId: job.id,
        });
      } catch (error) {
        request.log.error({ err: error, userId: request.user.id }, 'Failed to queue generation job');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to queue job',
        });
      }
    },
  });

  /**
   * GET /api/generate-test/status/:jobId
   * Polling endpoint for the frontend to check job progress and retrieve the final result.
   */
  fastify.route({
    method: 'GET',
    url: '/generate-test/status/:jobId',
    handler: async (request, reply) => {
      const { jobId } = request.params;
      const job = await testQueue.getJob(jobId);

      if (!job) {
        return reply.status(404).send({ success: false, error: 'Job not found' });
      }

      const state = await job.getState();
      const progress = job.progress;

      if (state === 'completed') {
        return reply.send({
          success: true,
          status: 'completed',
          data: job.returnvalue, // This contains { questions } from the worker
        });
      } else if (state === 'failed') {
        return reply.send({
          success: false,
          status: 'failed',
          error: job.failedReason || 'AI Generation failed',
        });
      }

      return reply.send({
        success: true,
        status: state,
        progress: progress,
      });
    }
  });

}

module.exports = aiRoutes;
