/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ANALYTICS SERVICE — Enriched Assessment Analytics              ║
 * ║  Joins profiles for names/emails, reads violation columns,      ║
 * ║  computes per-question metrics, duration, accuracy, ranking     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { supabaseAdmin } = require('../utils/supabaseClient');
const { logger } = require('../utils/logger');

class AnalyticsService {
  async getAssessmentAnalytics(assessmentId, version = null) {
    try {
      logger.info({ assessmentId, version }, '[ANALYTICS] Generating analytics');

      // 1. Fetch test metadata
      const { data: testData, error: testError } = await supabaseAdmin
        .from('tests')
        .select('id, title, total_questions, duration_minutes, test_version, status, start_time, end_time')
        .eq('id', assessmentId)
        .single();

      if (testError || !testData) throw new Error('Assessment not found');

      const targetVersion = version || testData.test_version;

      // 2. Fetch attempts with student profiles (version-scoped)
      const { data: attempts, error: attemptsError } = await supabaseAdmin
        .from('attempts')
        .select(`
          *,
          student:profiles!attempts_student_id_fkey(id, name, email)
        `)
        .eq('test_id', assessmentId)
        .eq('test_version', targetVersion)
        .in('status', ['submitted', 'evaluated', 'forced_end']);

      if (attemptsError) throw attemptsError;

      // 3. Fetch questions (answer key)
      const { data: questions, error: questionsError } = await supabaseAdmin
        .from('questions')
        .select('id, question, answer, type, sort_order')
        .eq('test_id', assessmentId)
        .order('sort_order');

      if (questionsError) throw questionsError;

      // Short-circuit if no data
      if (!attempts || attempts.length === 0) {
        logger.info({ assessmentId }, '[ANALYTICS] No completed attempts found');
        return {
          test: testData,
          overview: {
            average: 0, highest: 0, lowest: 0,
            medianTimeMinutes: 0, totalSubmissions: 0,
            completionRate: 0, participationRate: 0,
          },
          violationSummary: { low: 0, medium: 0, high: 0 },
          itemAnalysis: [],
          rawRoster: [],
        };
      }

      // 4. Build answer key map for O(1) lookup
      const answerKey = new Map(questions.map(q => [q.id, q.answer]));
      const totalQuestions = questions.length;

      // Per-question tracking
      const questionStats = new Map(
        questions.map(q => [q.id, {
          id: q.id,
          text: q.question,
          correct: 0,
          wrong: 0,
          skipped: 0,
        }])
      );

      // 5. Main aggregation loop
      let totalScore = 0;
      let highestScore = -1;
      let lowestScore = Infinity;
      const completionTimes = [];
      const rawRoster = [];

      // Violation summary
      let violationLow = 0;
      let violationMedium = 0;
      let violationHigh = 0;

      for (const attempt of attempts) {
        const studentAnswers = attempt.answers || {};
        let correctCount = 0;
        let attemptedCount = 0;

        // Grade each question
        for (const q of questions) {
          const studentAns = studentAnswers[q.id];
          const qStat = questionStats.get(q.id);

          if (studentAns && studentAns.trim() !== '') {
            attemptedCount++;
            if (studentAns.trim().toLowerCase() === answerKey.get(q.id)?.trim()?.toLowerCase()) {
              correctCount++;
              if (qStat) qStat.correct++;
            } else {
              if (qStat) qStat.wrong++;
            }
          } else {
            if (qStat) qStat.skipped++;
          }
        }

        const skippedCount = totalQuestions - attemptedCount;
        const incorrectCount = attemptedCount - correctCount;
        const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
        const accuracy = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;

        // Duration calculation
        let durationMinutes = 0;
        if (attempt.created_at && attempt.completed_at) {
          durationMinutes = (new Date(attempt.completed_at) - new Date(attempt.created_at)) / 1000 / 60;
        } else if (attempt.created_at && attempt.updated_at) {
          durationMinutes = (new Date(attempt.updated_at) - new Date(attempt.created_at)) / 1000 / 60;
        }
        const avgTimePerQuestion = attemptedCount > 0 ? durationMinutes / attemptedCount : 0;

        if (durationMinutes > 0) completionTimes.push(durationMinutes);

        // Aggregate scores
        totalScore += percentage;
        if (percentage > highestScore) highestScore = percentage;
        if (percentage < lowestScore) lowestScore = percentage;

        // Violation severity breakdown
        const violationEntries = attempt.violations || [];
        const severityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        for (const v of violationEntries) {
          const sev = (v.severity || 'LOW').toUpperCase();
          if (severityCounts[sev] !== undefined) severityCounts[sev]++;
        }
        violationLow += severityCounts.LOW;
        violationMedium += severityCounts.MEDIUM;
        violationHigh += severityCounts.HIGH;

        // Build roster entry
        rawRoster.push({
          studentId: attempt.student_id,
          studentName: attempt.student?.name || 'Unknown',
          studentEmail: attempt.student?.email || 'N/A',
          score: correctCount,
          maxScore: totalQuestions,
          percentage: Number(percentage.toFixed(1)),
          questionsAttempted: attemptedCount,
          questionsSkipped: skippedCount,
          correctAnswers: correctCount,
          incorrectAnswers: incorrectCount,
          accuracy: Number(accuracy.toFixed(1)),
          startedAt: attempt.created_at,
          submittedAt: attempt.completed_at || attempt.updated_at,
          durationMinutes: Number(durationMinutes.toFixed(1)),
          avgTimePerQuestion: Number(avgTimePerQuestion.toFixed(2)),
          violationCount: attempt.violation_count || 0,
          violationSeverity: severityCounts,
          violations: violationEntries,
          attemptStatus: attempt.status,
          rank: 0, // computed after sorting
        });
      }

      // 6. Compute rankings (by percentage descending)
      rawRoster.sort((a, b) => b.percentage - a.percentage);
      rawRoster.forEach((entry, idx) => { entry.rank = idx + 1; });

      // 7. Compute aggregates
      const average = totalScore / attempts.length;

      completionTimes.sort((a, b) => a - b);
      let medianTime = 0;
      if (completionTimes.length > 0) {
        const mid = Math.floor(completionTimes.length / 2);
        medianTime = completionTimes.length % 2 !== 0
          ? completionTimes[mid]
          : (completionTimes[mid - 1] + completionTimes[mid]) / 2;
      }

      // Item analysis
      const itemAnalysis = Array.from(questionStats.values()).map(stat => {
        const totalAttempts = stat.correct + stat.wrong;
        const accuracy = totalAttempts > 0 ? (stat.correct / totalAttempts) * 100 : 0;
        return {
          id: stat.id,
          questionSnippet: (stat.text || '').substring(0, 80) + (stat.text?.length > 80 ? '...' : ''),
          accuracy: Number(accuracy.toFixed(1)),
          correct: stat.correct,
          wrong: stat.wrong,
          skipped: stat.skipped,
        };
      });

      const result = {
        test: testData,
        overview: {
          average: Number(average.toFixed(1)),
          highest: Number(highestScore === -1 ? 0 : highestScore.toFixed(1)),
          lowest: Number(lowestScore === Infinity ? 0 : lowestScore.toFixed(1)),
          medianTimeMinutes: Number(medianTime.toFixed(1)),
          totalSubmissions: attempts.length,
          completionRate: Number(((attempts.length / attempts.length) * 100).toFixed(1)),
        },
        violationSummary: { low: violationLow, medium: violationMedium, high: violationHigh },
        itemAnalysis,
        rawRoster,
      };

      logger.info({
        assessmentId,
        version: targetVersion,
        students: attempts.length,
        average: result.overview.average,
      }, '[ANALYTICS] Generation complete');

      return result;

    } catch (error) {
      logger.error({ err: error, assessmentId }, '[ANALYTICS] Aggregation failed');
      throw error;
    }
  }
}

module.exports = new AnalyticsService();
