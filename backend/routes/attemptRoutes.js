/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ATTEMPT ROUTES — Backend-Driven Timer & Scoring                ║
 * ║  Hardened: Zod Validation + Server-Side Time Authority          ║
 * ║  BACKEND = SOURCE OF TRUTH. FRONTEND = DISPLAY ONLY.           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { authenticate } = require('../utils/authMiddleware');
const { validateBody, startAttemptSchema, submitAttemptSchema } = require('../utils/validators');
const { supabaseAdmin } = require('../utils/supabaseClient');
const { logger } = require('../utils/logger');

async function attemptRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /api/start-attempt
   * 
   * Creates or resumes an attempt with server-calculated ends_at.
   * Returns questions (without answers) and remaining_seconds.
   * 
   * Duplicate prevention: If attempt already exists, resume it.
   */
  fastify.post('/start-attempt', {
    preHandler: [validateBody(startAttemptSchema)],
    handler: async (request, reply) => {
      const { testId } = request.body;
      const userId = request.user.id;

      try {
        // 1. Fetch the test (use admin to bypass RLS for reading test metadata)
        const { data: test, error: testError } = await supabaseAdmin
          .from('tests')
          .select('id, status, duration_minutes, total_questions')
          .eq('id', testId)
          .single();

        if (testError || !test) {
          return reply.status(404).send({ success: false, error: 'Assessment not found' });
        }

        if (test.status !== 'active') {
          return reply.status(403).send({ success: false, error: 'This assessment is not currently active' });
        }

        // 2. Check for existing attempt (duplicate prevention)
        const { data: existingAttempt } = await supabaseAdmin
          .from('attempts')
          .select('*')
          .eq('student_id', userId)
          .eq('test_id', testId)
          .single();

        let attempt;
        let remainingSeconds;

        if (existingAttempt) {
          attempt = existingAttempt;

          // If already completed, block re-entry
          if (attempt.status === 'completed' || attempt.status === 'forced_end') {
            return reply.status(403).send({
              success: false,
              error: 'You have already submitted this assessment',
            });
          }

          // Check if time has expired (server-side enforcement)
          const now = new Date();
          const endsAt = new Date(attempt.ends_at);
          remainingSeconds = Math.max(0, Math.floor((endsAt - now) / 1000));

          if (remainingSeconds <= 0) {
            // Auto-submit expired attempt
            await supabaseAdmin
              .from('attempts')
              .update({ status: 'completed', submitted_at: now.toISOString() })
              .eq('id', attempt.id);

            return reply.status(403).send({
              success: false,
              error: 'Time expired. Your attempt has been auto-submitted.',
            });
          }

          request.log.info({ attemptId: attempt.id, remainingSeconds }, 'Resuming existing attempt');
        } else {
          // 3. Create new attempt with server-calculated deadline
          const durationMs = (test.duration_minutes || 30) * 60 * 1000;
          const now = new Date();
          const endsAt = new Date(now.getTime() + durationMs);

          const { data: newAttempt, error: createError } = await supabaseAdmin
            .from('attempts')
            .insert({
              student_id: userId,
              test_id: testId,
              status: 'in_progress',
              answers: {},
              started_at: now.toISOString(),
              ends_at: endsAt.toISOString(),
            })
            .select()
            .single();

          if (createError) {
            // Duplicate constraint violation
            if (createError.code === '23505') {
              return reply.status(409).send({
                success: false,
                error: 'An attempt already exists for this assessment',
              });
            }
            logger.error({ err: createError }, 'Failed to create attempt');
            throw createError;
          }

          attempt = newAttempt;
          remainingSeconds = Math.floor(durationMs / 1000);

          request.log.info({ attemptId: attempt.id, endsAt: endsAt.toISOString() }, 'New attempt created');
        }

        // 4. Fetch questions (WITHOUT answers — security critical)
        const { data: questions, error: qError } = await supabaseAdmin
          .from('questions')
          .select('id, question, options, type, sort_order')
          .eq('test_id', testId)
          .order('sort_order');

        if (qError) {
          logger.error({ err: qError }, 'Failed to fetch questions');
          throw qError;
        }

        return reply.send({
          success: true,
          data: {
            attempt: {
              id: attempt.id,
              status: attempt.status,
              answers: attempt.answers || {},
              started_at: attempt.started_at,
              ends_at: attempt.ends_at,
            },
            questions: questions || [],
            remaining_seconds: remainingSeconds,
          },
        });

      } catch (error) {
        request.log.error({ err: error, testId, userId }, 'Start attempt failed');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to start attempt',
        });
      }
    },
  });

  /**
   * POST /api/submit-attempt
   * 
   * Server-side scoring. Validates time hasn't expired.
   * Calculates marks by comparing against answer key.
   */
  fastify.post('/submit-attempt', {
    preHandler: [validateBody(submitAttemptSchema)],
    handler: async (request, reply) => {
      const { attemptId, answers } = request.body;
      const userId = request.user.id;

      try {
        // 1. Fetch the attempt (verify ownership)
        const { data: attempt, error: attemptError } = await supabaseAdmin
          .from('attempts')
          .select('*, tests(id, total_questions, duration_minutes)')
          .eq('id', attemptId)
          .eq('student_id', userId)
          .single();

        if (attemptError || !attempt) {
          return reply.status(404).send({ success: false, error: 'Attempt not found' });
        }

        if (attempt.status === 'completed' || attempt.status === 'forced_end') {
          return reply.status(403).send({ success: false, error: 'This attempt is already submitted' });
        }

        // 2. Check server time (allow 30s grace period for network lag)
        const now = new Date();
        const endsAt = new Date(attempt.ends_at);
        const gracePeriodMs = 30 * 1000;

        if (now > new Date(endsAt.getTime() + gracePeriodMs)) {
          // Mark as auto-submitted if way past deadline
          await supabaseAdmin
            .from('attempts')
            .update({ status: 'completed', answers, submitted_at: endsAt.toISOString() })
            .eq('id', attemptId);

          request.log.warn({ attemptId, userId }, 'Late submission detected — auto-marked at deadline');
        }

        // 3. Server-side scoring (MCQs)
        const { data: answerKey } = await supabaseAdmin
          .from('questions')
          .select('id, answer, type')
          .eq('test_id', attempt.test_id);

        let marks = 0;
        if (answerKey) {
          answerKey.forEach(q => {
            const studentAnswer = answers[q.id];
            if (studentAnswer && studentAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
              marks++;
            }
          });
        }

        // 4. Update attempt
        await supabaseAdmin
          .from('attempts')
          .update({
            status: 'completed',
            answers,
            submitted_at: now.toISOString(),
          })
          .eq('id', attemptId);

        // 5. Save result
        const { data: result, error: resultError } = await supabaseAdmin
          .from('results')
          .insert({
            attempt_id: attemptId,
            student_id: userId,
            test_id: attempt.test_id,
            marks,
            feedback: 'Auto-graded by server',
          })
          .select()
          .single();

        if (resultError) {
          logger.error({ err: resultError }, 'Failed to save result');
          throw resultError;
        }

        request.log.info({ attemptId, marks, totalQuestions: answerKey?.length }, 'Attempt submitted and scored');

        return reply.send({
          success: true,
          data: {
            result,
            marks,
            total: answerKey?.length || 0,
          },
        });

      } catch (error) {
        request.log.error({ err: error, attemptId, userId }, 'Submit attempt failed');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to submit attempt',
        });
      }
    },
  });

  /**
   * GET /api/attempt-status/:id
   * 
   * Returns current remaining_seconds for frontend timer sync.
   * This is the single source of truth for time.
   */
  fastify.get('/attempt-status/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;

    try {
      const { data: attempt, error } = await supabaseAdmin
        .from('attempts')
        .select('id, status, ends_at, started_at')
        .eq('id', id)
        .eq('student_id', userId)
        .single();

      if (error || !attempt) {
        return reply.status(404).send({ success: false, error: 'Attempt not found' });
      }

      const now = new Date();
      const endsAt = new Date(attempt.ends_at);
      const remainingSeconds = Math.max(0, Math.floor((endsAt - now) / 1000));

      // Auto-expire if time is up
      if (remainingSeconds <= 0 && attempt.status === 'in_progress') {
        await supabaseAdmin
          .from('attempts')
          .update({ status: 'completed', submitted_at: now.toISOString() })
          .eq('id', id);

        return reply.send({
          success: true,
          data: { status: 'completed', remaining_seconds: 0 },
        });
      }

      return reply.send({
        success: true,
        data: {
          status: attempt.status,
          remaining_seconds: remainingSeconds,
          ends_at: attempt.ends_at,
        },
      });

    } catch (error) {
      request.log.error({ err: error }, 'Attempt status check failed');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to check attempt status',
      });
    }
  });

  /**
   * POST /api/save-answer
   * 
   * Saves a single answer with server-side time validation.
   */
  fastify.post('/save-answer', async (request, reply) => {
    const { attemptId, questionId, answer } = request.body || {};
    const userId = request.user.id;

    if (!attemptId || !questionId || answer === undefined) {
      return reply.status(400).send({
        success: false,
        error: 'attemptId, questionId, and answer are required',
      });
    }

    try {
      // Verify ownership and check time
      const { data: attempt, error: attemptError } = await supabaseAdmin
        .from('attempts')
        .select('id, answers, status, ends_at')
        .eq('id', attemptId)
        .eq('student_id', userId)
        .single();

      if (attemptError || !attempt) {
        return reply.status(404).send({ success: false, error: 'Attempt not found' });
      }

      if (attempt.status !== 'in_progress') {
        return reply.status(403).send({ success: false, error: 'Attempt already submitted' });
      }

      // Server-side time check
      if (new Date(attempt.ends_at) < new Date()) {
        return reply.status(403).send({ success: false, error: 'Time expired' });
      }

      // Update answer
      const updatedAnswers = { ...(attempt.answers || {}), [questionId]: answer };
      
      await supabaseAdmin
        .from('attempts')
        .update({ answers: updatedAnswers })
        .eq('id', attemptId);

      return reply.send({ success: true });

    } catch (error) {
      request.log.error({ err: error }, 'Save answer failed');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to save answer',
      });
    }
  });
}

module.exports = attemptRoutes;
