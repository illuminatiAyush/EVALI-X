/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  NOTIFICATION ROUTES — Realtime Activity Feed alerts             ║
 * ║  Auth: JWT-based authentication required on all endpoints        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { authenticate } = require('../utils/authMiddleware');
const { createUserClient } = require('../utils/supabaseClient');
const { logger } = require('../utils/logger');

module.exports = async function (fastify, opts) {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/notifications
   * Returns recent notifications for the logged-in user
   */
  fastify.get('/notifications', async (request, reply) => {
    try {
      const token = request.headers.authorization.replace('Bearer ', '');
      const supabase = createUserClient(token);
      const userId = request.user.id;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return reply.send({ success: true, data });
    } catch (error) {
      logger.error({ err: error }, '[NOTIFICATIONS] Fetch failed');
      return reply.code(500).send({ success: false, error: 'Failed to fetch notifications' });
    }
  });

  /**
   * PUT /api/notifications/read
   * Marks specific notifications (or all) as read
   */
  fastify.put('/notifications/read', async (request, reply) => {
    try {
      const token = request.headers.authorization.replace('Bearer ', '');
      const supabase = createUserClient(token);
      const userId = request.user.id;
      const { ids } = request.body || {};

      let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (ids && Array.isArray(ids) && ids.length > 0) {
        query = query.in('id', ids);
      }

      const { data, error } = await query.select();

      if (error) throw error;

      return reply.send({ success: true, data });
    } catch (error) {
      logger.error({ err: error }, '[NOTIFICATIONS] Mark read failed');
      return reply.code(500).send({ success: false, error: 'Failed to mark notifications as read' });
    }
  });
};
