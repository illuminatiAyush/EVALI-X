/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  TEST ROUTES — Assessment Lifecycle Management                  ║
 * ║  Hardened: Zod Validation on all inputs                         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const TestService = require('../services/testService');
const { authenticate } = require('../utils/authMiddleware');
const { validateBody, createTestSchema, testStatusSchema } = require('../utils/validators');

async function testRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /api/create-test
   * Creates a new assessment with validated payload.
   */
  fastify.post('/create-test', {
    preHandler: [validateBody(createTestSchema)],
    handler: async (request, reply) => {
      try {
        const data = request.body; // Already validated & coerced by Zod
        const token = request.headers.authorization.replace('Bearer ', '');
        const userId = request.user.id;

        request.log.info({ userId, title: data.title }, 'Creating new assessment');
        
        const test = await TestService.createTest(token, userId, data);

        // If batch_ids are provided, assign the test to those batches
        if (data.batch_ids && Array.isArray(data.batch_ids) && data.batch_ids.length > 0) {
          await TestService.assignTestToBatch(token, test.id, data.batch_ids);
        }

        return reply.send({
          success: true,
          data: test,
        });
      } catch (error) {
        request.log.error({ err: error }, 'Failed to create test');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to create test',
        });
      }
    },
  });

  /**
   * POST /api/test-status/:id
   * Manages test lifecycle: publish, start, end
   */
  fastify.post('/test-status/:id', {
    preHandler: [validateBody(testStatusSchema)],
    handler: async (request, reply) => {
      try {
        const { id } = request.params;
        const { action } = request.body;
        const token = request.headers.authorization.replace('Bearer ', '');
        const userId = request.user.id;

        // Validate UUID format for param
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          return reply.status(400).send({ success: false, error: 'Invalid test ID format' });
        }

        request.log.info({ userId, testId: id, action }, 'Test status change');

        const test = await TestService.updateTestStatus(token, userId, id, action);

        return reply.send({
          success: true,
          data: test,
        });
      } catch (error) {
        request.log.error({ err: error }, 'Failed to update test status');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to update test status',
        });
      }
    },
  });
}

module.exports = testRoutes;
