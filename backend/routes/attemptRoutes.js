/**
 * Attempt Routes
 * Endpoints for managing student test attempts.
 */

const { authenticate } = require('../utils/authMiddleware');

async function attemptRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /api/start-attempt
   */
  fastify.post('/start-attempt', async (request, reply) => {
    return reply.send({ success: true, message: 'Not fully migrated from Supabase JS yet' });
  });

  /**
   * POST /api/submit-attempt
   */
  fastify.post('/submit-attempt', async (request, reply) => {
    return reply.send({ success: true, message: 'Not fully migrated from Supabase JS yet' });
  });

}

module.exports = attemptRoutes;
