/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  BATCH ROUTES — Batch Workspace & Command Center aggregations    ║
 * ║  Auth: JWT-based authentication required on all endpoints        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { authenticate } = require('../utils/authMiddleware');
const { createUserClient } = require('../utils/supabaseClient');
const { logger } = require('../utils/logger');

module.exports = async function (fastify, opts) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/teacher/dashboard-stats
   * Returns aggregated stats for the Command Center
   */
  fastify.get('/teacher/dashboard-stats', async (request, reply) => {
    try {
      const token = request.headers.authorization.replace('Bearer ', '');
      const userId = request.user.id;
      const supabase = createUserClient(token);

      const { data, error } = await supabase.rpc('get_teacher_dashboard_stats', {
        p_teacher_id: userId
      });

      if (error) throw error;

      return reply.send({ success: true, data });
    } catch (error) {
      logger.error({ err: error }, '[DASHBOARD] Fetch failed');
      return reply.code(500).send({ success: false, error: 'Failed to fetch dashboard stats' });
    }
  });

  /**
   * GET /api/batches/:id/overview
   * Returns overview stats for a specific batch
   */
  fastify.get('/batches/:id/overview', async (request, reply) => {
    try {
      const token = request.headers.authorization.replace('Bearer ', '');
      const supabase = createUserClient(token);
      const { id } = request.params;

      const { data, error } = await supabase.rpc('get_batch_overview', {
        p_batch_id: id
      });

      if (error) throw error;

      return reply.send({ success: true, data });
    } catch (error) {
      logger.error({ err: error }, '[BATCH] Overview fetch failed');
      return reply.code(500).send({ success: false, error: 'Failed to fetch batch overview' });
    }
  });

  /**
   * GET /api/batches/:id/students
   * Returns a list of students with their aggregated stats
   */
  fastify.get('/batches/:id/students', async (request, reply) => {
    try {
      const token = request.headers.authorization.replace('Bearer ', '');
      const supabase = createUserClient(token);
      const { id } = request.params;

      const { data, error } = await supabase.rpc('get_batch_students_stats', {
        p_batch_id: id
      });

      if (error) throw error;

      return reply.send({ success: true, data });
    } catch (error) {
      logger.error({ err: error }, '[BATCH] Students fetch failed');
      return reply.code(500).send({ success: false, error: 'Failed to fetch batch students' });
    }
  });

  /**
   * GET /api/batches/:id/assessments
   * Returns a list of assessments assigned to the batch
   */
  fastify.get('/batches/:id/assessments', async (request, reply) => {
    try {
      const token = request.headers.authorization.replace('Bearer ', '');
      const supabase = createUserClient(token);
      const { id } = request.params;

      const { data, error } = await supabase
        .from('test_batches')
        .select(`
          test_id,
          tests (
            id,
            title,
            status,
            created_at,
            start_time,
            end_time
          )
        `)
        .eq('batch_id', id);

      if (error) throw error;

      const mappedData = data.map(d => d.tests);

      return reply.send({ success: true, data: mappedData });
    } catch (error) {
      logger.error({ err: error }, '[BATCH] Assessments fetch failed');
      return reply.code(500).send({ success: false, error: 'Failed to fetch batch assessments' });
    }
  });

  /**
   * POST /api/batches/:id/notices
   * Creates a new notice for the batch
   */
  fastify.post('/batches/:id/notices', async (request, reply) => {
    try {
      const token = request.headers.authorization.replace('Bearer ', '');
      const supabase = createUserClient(token);
      const { id } = request.params;
      const { title, content } = request.body || {};
      const userId = request.user.id;

      if (!title || !content) {
        return reply.code(400).send({ success: false, error: 'Title and content are required' });
      }

      const { data, error } = await supabase
        .from('batch_notices')
        .insert({
          batch_id: id,
          title,
          content,
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      return reply.send({ success: true, data });
    } catch (error) {
      logger.error({ err: error }, '[BATCH NOTICES] Create failed');
      return reply.code(500).send({ success: false, error: error.message || 'Failed to create notice' });
    }
  });

  /**
   * GET /api/batches/:id/notices
   * Returns notices for the batch
   */
  fastify.get('/batches/:id/notices', async (request, reply) => {
    try {
      const token = request.headers.authorization.replace('Bearer ', '');
      const supabase = createUserClient(token);
      const { id } = request.params;

      const { data, error } = await supabase
        .from('batch_notices')
        .select(`
          *,
          teacher:profiles(name)
        `)
        .eq('batch_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return reply.send({ success: true, data });
    } catch (error) {
      logger.error({ err: error }, '[BATCH NOTICES] Fetch failed');
      return reply.code(500).send({ success: false, error: error.message || 'Failed to fetch notices' });
    }
  });
};
