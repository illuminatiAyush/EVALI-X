// ==============================================================================
// REQUIREMENT 1: ANALYTICS ENGINE (services/analyticsService.js)
// ==============================================================================

const { supabaseAdmin } = require('../utils/supabaseClient');

class AnalyticsService {
  async getAssessmentAnalytics(assessmentId) {
    try {
      // 1. Fetch raw data from Supabase
      const [attemptsResponse, questionsResponse] = await Promise.all([
        supabaseAdmin
          .from('attempts')
          .select(`
            *,
            student_id
          `)
          .eq('test_id', assessmentId)
          .in('status', ['completed', 'forced_end']), // Only analyze completed attempts
        supabaseAdmin
          .from('questions')
          .select('id, question, answer')
          .eq('test_id', assessmentId) // Map to actual questions foreign key
      ]);

      if (attemptsResponse.error) throw attemptsResponse.error;
      if (questionsResponse.error) throw questionsResponse.error;

      const attempts = attemptsResponse.data || [];
      const questions = questionsResponse.data || [];

      // Short-circuit if no data
      if (attempts.length === 0) {
        return {
          overview: { average: 0, highest: 0, lowest: 0, medianTimeMinutes: 0 },
          antiCheatLog: [],
          itemAnalysis: [],
          rawRoster: []
        };
      }

      // 2. High-Performance Processing Engine
      let totalScore = 0;
      let highestScore = -1;
      let lowestScore = Infinity;
      const completionTimes = [];
      const antiCheatLog = [];
      const rawRoster = [];

      // Maps to track question correct/incorrect counts
      const questionStats = new Map(
        questions.map(q => [q.id, { id: q.id, text: q.question, correct: 0, wrong: 0 }])
      );

      // Map correct answers for quick O(1) lookup
      const answerKey = new Map(questions.map(q => [q.id, q.answer]));

      // 3. Main Aggregation Loop (Optimized for large arrays)
      for (const attempt of attempts) {
        let studentScore = 0;
        const studentAnswers = attempt.answers || {};
        const tabSwitches = studentAnswers._violations || 0;

        // Grade the attempt & build Item Analysis
        for (const [qId, studentAns] of Object.entries(studentAnswers)) {
          if (qId === '_violations') continue;
          
          const correctAns = answerKey.get(qId);
          const qStat = questionStats.get(qId);
          
          if (correctAns && studentAns === correctAns) {
            studentScore += 1;
            if (qStat) qStat.correct += 1;
          } else {
            if (qStat) qStat.wrong += 1;
          }
        }

        const maxScore = questions.length;
        const percentage = maxScore > 0 ? (studentScore / maxScore) * 100 : 0;

        // Metrics Tracking
        totalScore += percentage;
        if (percentage > highestScore) highestScore = percentage;
        if (percentage < lowestScore) lowestScore = percentage;

        // Time Tracking
        if (attempt.created_at && attempt.updated_at) {
          const timeMs = new Date(attempt.updated_at) - new Date(attempt.created_at);
          const timeMins = timeMs / 1000 / 60;
          completionTimes.push(timeMins);
        }

        // Anti-Cheat Logging
        if (tabSwitches > 0) {
          antiCheatLog.push({
            studentId: attempt.student_id,
            switches: tabSwitches,
            score: percentage,
            timeMins: completionTimes[completionTimes.length - 1] || 0
          });
        }

        // Save raw roster data for exports/grids
        rawRoster.push({
          studentId: attempt.student_id,
          score: percentage,
          rawScore: studentScore,
          maxScore: maxScore,
          tabSwitches: tabSwitches,
          timeTakenMins: completionTimes[completionTimes.length - 1] || 0,
          submittedAt: attempt.updated_at
        });
      }

      // 4. Compute Final Aggregations
      const average = totalScore / attempts.length;
      
      // Calculate Median Time
      completionTimes.sort((a, b) => a - b);
      let medianTime = 0;
      if (completionTimes.length > 0) {
        const mid = Math.floor(completionTimes.length / 2);
        medianTime = completionTimes.length % 2 !== 0 
          ? completionTimes[mid] 
          : (completionTimes[mid - 1] + completionTimes[mid]) / 2;
      }

      // Format Item Analysis (Accuracy %)
      const itemAnalysis = Array.from(questionStats.values()).map(stat => {
        const totalAttempts = stat.correct + stat.wrong;
        const accuracy = totalAttempts > 0 ? (stat.correct / totalAttempts) * 100 : 0;
        return {
          id: stat.id,
          questionSnippet: stat.text?.substring(0, 50) + '...',
          accuracy: Number(accuracy.toFixed(1)),
          correct: stat.correct,
          wrong: stat.wrong
        };
      });

      // Sort Anti-Cheat logs severity (descending)
      antiCheatLog.sort((a, b) => b.switches - a.switches);

      return {
        overview: {
          average: Number(average.toFixed(1)),
          highest: Number(highestScore.toFixed(1)),
          lowest: Number(lowestScore === Infinity ? 0 : lowestScore.toFixed(1)),
          medianTimeMinutes: Number(medianTime.toFixed(1)),
          totalSubmissions: attempts.length
        },
        antiCheatLog,
        itemAnalysis,
        rawRoster
      };

    } catch (error) {
      console.error('[AnalyticsEngine] Aggregation failed:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();
