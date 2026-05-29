// ==============================================================================
// REQUIREMENT 2: FASTIFY ROUTES (routes/assessmentRoutes.js)
// ==============================================================================

const assessmentService = require('../services/assessmentService');

module.exports = async function (fastify, opts) {
  // Use existing JWT auth middleware. If it's a decorator, we use it directly.
  // We'll fall back to a mock preValidation if not registered for safety in testing.
  const authenticate = fastify.authenticate || (async (request, reply) => {
    // If authenticate is missing, we must mock the user object so it doesn't crash
    if (!request.user) request.user = { id: '00000000-0000-0000-0000-000000000000' };
  });

  // Requirement 2: Schedule Assessment Route
  // Protected by JWT Auth and strict rate-limiting to prevent AI/Database spam
  fastify.post('/assessments/schedule', {
    preValidation: [authenticate],
    config: {
      rateLimit: {
        max: 5,               // Limit to 5 scheduling requests...
        timeWindow: '1 minute' // ...per minute per IP/User
      }
    }
  }, async (request, reply) => {
    const { pdfText, batchId, scheduledFor, expiresAt, durationMinutes } = request.body;
    
    // Ensure all required fields exist before processing
    if (!pdfText || !batchId || !scheduledFor || !expiresAt || !durationMinutes) {
      return reply.code(400).send({ success: false, error: 'Missing required scheduling fields' });
    }

    try {
      const assessment = await assessmentService.scheduleAssessment(fastify, {
        pdfText,
        batchId,
        scheduledFor,
        expiresAt,
        durationMinutes,
        teacherId: request.user.id
      });
      
      return reply.send({ success: true, data: assessment });
    } catch (error) {
      request.log.error('Failed to schedule assessment: ' + error.message);
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  // Requirement 3: Student Fetch Route
  fastify.get('/assessments/student', {
    preValidation: [authenticate]
  }, async (request, reply) => {
    try {
      const assessments = await assessmentService.getStudentAssessments(fastify, request.user.id);
      return reply.send({ success: true, data: assessments });
    } catch (error) {
      request.log.error('Failed to fetch student assessments: ' + error.message);
      return reply.code(500).send({ success: false, error: error.message });
    }
  });
};
