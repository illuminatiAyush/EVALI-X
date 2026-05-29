// ==============================================================================
// REQUIREMENT 2: EXPORT ROUTES (routes/reportRoutes.js)
// ==============================================================================

const analyticsService = require('../services/analyticsService');

module.exports = async function (fastify, opts) {
  // Use existing JWT auth hook if available
  const authenticate = fastify.authenticate || (async (request, reply) => {
    if (!request.user) request.user = { id: '00000000-0000-0000-0000-000000000000', role: 'teacher' };
  });

  // Analytics UI Data Endpoint
  fastify.get('/reports/assessment/:id/analytics', {
    preValidation: [authenticate]
  }, async (request, reply) => {
    try {
      const data = await analyticsService.getAssessmentAnalytics(request.params.id);
      return reply.send({ success: true, data });
    } catch (error) {
      request.log.error('Analytics Fetch Error: ' + error.message);
      return reply.code(500).send({ success: false, error: 'Failed to generate analytics' });
    }
  });

  // Requirement 2: Dedicated Fast CSV Export Route
  fastify.get('/reports/assessment/:id/export', {
    preValidation: [authenticate]
  }, async (request, reply) => {
    try {
      const data = await analyticsService.getAssessmentAnalytics(request.params.id);
      const roster = data.rawRoster;

      // Ensure we have data
      if (!roster || roster.length === 0) {
        return reply.code(404).send({ success: false, error: 'No completed attempts found to export.' });
      }

      // 1. Build CSV Headers
      const headers = ['Student_ID', 'Score_Percentage', 'Raw_Score', 'Max_Score', 'Time_Taken_Mins', 'Tab_Switches', 'Submitted_At'];
      
      // 2. Map Rows (High performance native loops)
      const csvRows = [headers.join(',')];
      for (const row of roster) {
        const rowData = [
          `"${row.studentId}"`,
          `${row.score.toFixed(1)}%`,
          row.rawScore,
          row.maxScore,
          row.timeTakenMins.toFixed(1),
          row.tabSwitches,
          `"${new Date(row.submittedAt).toISOString()}"`
        ];
        csvRows.push(rowData.join(','));
      }

      // 3. Construct raw comma-separated string
      const csvString = csvRows.join('\n');

      // 4. Stream as Native Browser Download
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="evalix_assessment_${request.params.id}_export.csv"`);
      
      return reply.send(csvString);
    } catch (error) {
      request.log.error('CSV Export Error: ' + error.message);
      return reply.code(500).send({ success: false, error: 'Failed to generate export' });
    }
  });
};
