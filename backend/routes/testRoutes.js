/**
 * Test Routes
 * Endpoints for managing assessments.
 */

const TestService = require('../services/testService');
const { authenticate } = require('../utils/authMiddleware');

async function testRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /api/create-test
   * Creates a new assessment and its associated questions.
   */
  fastify.post('/create-test', async (request, reply) => {
    try {
      const data = request.body;
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
  });

}

module.exports = testRoutes;
