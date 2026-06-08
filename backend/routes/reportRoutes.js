/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REPORT ROUTES — Analytics, CSV Export, PDF Reports             ║
 * ║  Auth: JWT-based authentication required on all endpoints       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const analyticsService = require('../services/analyticsService');
const pdfReportService = require('../services/pdfReportService');
const { authenticate } = require('../utils/authMiddleware');
const { supabaseAdmin } = require('../utils/supabaseClient');
const { logger } = require('../utils/logger');

module.exports = async function (fastify, opts) {
  // All report routes require authentication
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/reports/assessment/:id/analytics
   * Returns enriched analytics data for the teacher dashboard.
   */
  fastify.get('/reports/assessment/:id/analytics', async (request, reply) => {
    try {
      logger.info({ testId: request.params.id }, '[ANALYTICS] Fetching analytics');
      const data = await analyticsService.getAssessmentAnalytics(request.params.id);
      return reply.send({ success: true, data });
    } catch (error) {
      logger.error({ err: error }, '[ANALYTICS] Fetch failed');
      return reply.code(500).send({ success: false, error: 'Failed to generate analytics' });
    }
  });

  /**
   * GET /api/reports/assessment/:id/export
   * Exports assessment results as CSV download.
   */
  fastify.get('/reports/assessment/:id/export', async (request, reply) => {
    try {
      const data = await analyticsService.getAssessmentAnalytics(request.params.id);
      const roster = data.rawRoster;

      if (!roster || roster.length === 0) {
        return reply.code(404).send({ success: false, error: 'No completed attempts found to export.' });
      }

      const headers = [
        'Rank', 'Student_Name', 'Student_Email', 'Score', 'Max_Score',
        'Percentage', 'Questions_Attempted', 'Questions_Skipped',
        'Correct', 'Incorrect', 'Accuracy',
        'Duration_Mins', 'Violations', 'Violation_Severity',
        'Started_At', 'Submitted_At', 'Status'
      ];

      const csvRows = [headers.join(',')];
      for (const row of roster) {
        const severity = `LOW:${row.violationSeverity?.LOW || 0} MED:${row.violationSeverity?.MEDIUM || 0} HIGH:${row.violationSeverity?.HIGH || 0}`;
        const rowData = [
          row.rank,
          `"${row.studentName}"`,
          `"${row.studentEmail}"`,
          row.score,
          row.maxScore,
          `${row.percentage}%`,
          row.questionsAttempted,
          row.questionsSkipped,
          row.correctAnswers,
          row.incorrectAnswers,
          `${row.accuracy}%`,
          row.durationMinutes.toFixed(1),
          row.violationCount,
          `"${severity}"`,
          `"${row.startedAt ? new Date(row.startedAt).toISOString() : ''}"`,
          `"${row.submittedAt ? new Date(row.submittedAt).toISOString() : ''}"`,
          row.attemptStatus,
        ];
        csvRows.push(rowData.join(','));
      }

      const csvString = csvRows.join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="evalix_assessment_${request.params.id}_export.csv"`);
      
      logger.info({ testId: request.params.id, rows: roster.length }, '[REPORT] CSV export generated');
      return reply.send(csvString);
    } catch (error) {
      logger.error({ err: error }, '[REPORT] CSV export failed');
      return reply.code(500).send({ success: false, error: 'Failed to generate export' });
    }
  });

  /**
   * GET /api/reports/assessment/:id/pdf/summary
   * Generates and downloads the Assessment Summary PDF report.
   */
  fastify.get('/reports/assessment/:id/pdf/summary', async (request, reply) => {
    try {
      logger.info({ testId: request.params.id }, '[REPORT] Generating summary PDF');
      const data = await analyticsService.getAssessmentAnalytics(request.params.id);

      const pdfBuffer = await pdfReportService.generateSummaryReport(data);

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="evalix_summary_${request.params.id}.pdf"`);
      
      logger.info({ testId: request.params.id }, '[REPORT] Summary PDF sent');
      return reply.send(pdfBuffer);
    } catch (error) {
      logger.error({ err: error }, '[REPORT] Summary PDF generation failed');
      return reply.code(500).send({ success: false, error: 'Failed to generate PDF report' });
    }
  });

  /**
   * GET /api/reports/assessment/:id/pdf/student/:studentId
   * Generates and downloads an Individual Student PDF report.
   */
  fastify.get('/reports/assessment/:id/pdf/student/:studentId', async (request, reply) => {
    try {
      const { id: testId, studentId } = request.params;
      logger.info({ testId, studentId }, '[REPORT] Generating student PDF');

      const data = await analyticsService.getAssessmentAnalytics(testId);

      // Find the specific student entry
      const studentEntry = data.rawRoster.find(r => r.studentId === studentId);
      if (!studentEntry) {
        return reply.code(404).send({ success: false, error: 'Student result not found for this assessment' });
      }

      // Fetch questions with answer key
      const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('id, question, answer, type, sort_order')
        .eq('test_id', testId)
        .order('sort_order');

      // Fetch student's answers from their attempt
      const { data: attempt } = await supabaseAdmin
        .from('attempts')
        .select('answers')
        .eq('test_id', testId)
        .eq('student_id', studentId)
        .eq('test_version', data.test?.test_version || 1)
        .in('status', ['submitted', 'evaluated', 'forced_end'])
        .single();

      const pdfBuffer = await pdfReportService.generateStudentReport(
        data.test,
        studentEntry,
        questions || [],
        attempt?.answers || {}
      );

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="evalix_student_${studentId}_${testId}.pdf"`);

      logger.info({ testId, studentId }, '[REPORT] Student PDF sent');
      return reply.send(pdfBuffer);
    } catch (error) {
      logger.error({ err: error }, '[REPORT] Student PDF generation failed');
      return reply.code(500).send({ success: false, error: 'Failed to generate student report' });
    }
  });
};
