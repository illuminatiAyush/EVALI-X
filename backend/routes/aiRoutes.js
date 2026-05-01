/**
 * AI Routes
 * Handles the PDF upload and test generation pipeline.
 */

const { extractTextFromPDF } = require('../services/pdfService');
const { generateTestQuestions } = require('../services/aiService');
const { authenticate } = require('../utils/authMiddleware');

async function aiRoutes(fastify, options) {
  // Protect all routes in this plugin
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /api/generate-test
   * Accepts multipart/form-data with a 'file' (PDF) and 'difficulty'
   */
  fastify.post('/generate-test', async (request, reply) => {
    // 1. Process multipart request
    const parts = request.parts();
    let fileBuffer = null;
    let difficulty = 'medium';
    let numQuestions = 10;

    for await (const part of parts) {
      if (part.file) {
        // Collect the file buffer
        fileBuffer = await part.toBuffer();
      } else {
        // Collect other fields
        if (part.fieldname === 'difficulty') {
          difficulty = part.value;
        } else if (part.fieldname === 'numQuestions') {
          numQuestions = parseInt(part.value, 10);
        }
      }
    }

    if (!fileBuffer) {
      return reply.status(400).send({
        success: false,
        error: 'PDF file is required in the "file" field.',
      });
    }

    try {
      request.log.info('Extracting text from PDF...');
      const extractedText = await extractTextFromPDF(fileBuffer);

      request.log.info({ difficulty, numQuestions }, 'Generating AI questions...');
      const questions = await generateTestQuestions(extractedText, difficulty, numQuestions);

      return reply.send({
        success: true,
        data: { questions },
      });
    } catch (error) {
      request.log.error({ err: error }, 'Test generation failed');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to generate test',
      });
    }
  });
}

module.exports = aiRoutes;
