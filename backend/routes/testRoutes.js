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
        console.log(`[BACKEND ROUTE] /test-status/${id} called with action: ${action}`);
        const token = request.headers.authorization.replace('Bearer ', '');
        const userId = request.user.id;

        // Validate UUID format for param
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          return reply.status(400).send({ success: false, error: 'Invalid test ID format' });
        }

        request.log.info({ userId, testId: id, action }, 'Test status change');
        console.log(`[BACKEND ROUTE] Calling TestService.updateTestStatus`);
        
        const test = await TestService.updateTestStatus(token, userId, id, action);
        
        console.log(`[BACKEND ROUTE] Success. Returning test data:`, test?.id);
        return reply.send({
          success: true,
          data: test,
        });
      } catch (error) {
        console.error(`[BACKEND ROUTE] Error:`, error);
        request.log.error({ err: error }, 'Failed to update test status');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to update test status',
        });
      }
    },
  });

  /**
   * PUT /api/update-test/:id
   * General-purpose test update (schedule, edit metadata, etc.)
   */
  fastify.put('/update-test/:id', {
    handler: async (request, reply) => {
      try {
        const { id } = request.params;
        const updates = request.body;
        const token = request.headers.authorization.replace('Bearer ', '');
        const userId = request.user.id;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          return reply.status(400).send({ success: false, error: 'Invalid test ID format' });
        }

        // Whitelist allowed fields to prevent injection
        const allowed = ['title', 'difficulty', 'duration_minutes', 'start_time', 'end_time', 'status'];
        const safeUpdates = {};
        for (const key of allowed) {
          if (updates[key] !== undefined) {
            safeUpdates[key] = updates[key];
          }
        }

        if (Object.keys(safeUpdates).length === 0) {
          return reply.status(400).send({ success: false, error: 'No valid fields to update' });
        }

        // Coerce duration_minutes to integer
        if (safeUpdates.duration_minutes) {
          safeUpdates.duration_minutes = parseInt(safeUpdates.duration_minutes, 10);
        }

        request.log.info({ userId, testId: id, updates: safeUpdates }, 'Updating test');

        const { createUserClient } = require('../utils/supabaseClient');
        const supabase = createUserClient(token);

        const { data, error } = await TestService.withTimeout(
          supabase
            .from('tests')
            .update(safeUpdates)
            .eq('id', id)
            .eq('created_by', userId)
            .select()
        );

        if (error) {
          request.log.error({ err: error }, 'Supabase update failed');
          return reply.status(500).send({ success: false, error: error.message });
        }

        if (!data || data.length === 0) {
          return reply.status(404).send({ success: false, error: 'Test not found or no permission to update.' });
        }

        return reply.send({ success: true, data: data[0] });
      } catch (error) {
        request.log.error({ err: error }, 'Failed to update test');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to update test',
        });
      }
    },
  });
  /**
   * GET /api/restart-info/:id
   * Returns submission/evaluation counts for the restart confirmation modal.
   */
  fastify.get('/restart-info/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const token = request.headers.authorization.replace('Bearer ', '');
      const userId = request.user.id;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return reply.status(400).send({ success: false, error: 'Invalid test ID format' });
      }

      const info = await TestService.getRestartInfo(token, userId, id);
      return reply.send({ success: true, data: info });
    } catch (error) {
      request.log.error({ err: error }, 'Failed to get restart info');
      return reply.status(500).send({ success: false, error: error.message || 'Failed to get restart info' });
    }
  });
}

module.exports = testRoutes;
