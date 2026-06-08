/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ATTEMPT ROUTES — Hardened Assessment Lifecycle                  ║
 * ║  4-Stage Pipeline: in_progress → submitted → processing → eval  ║
 * ║  Backend Timer Authority + Violation Tracking + Observability    ║
 * ║  BACKEND = SOURCE OF TRUTH. FRONTEND = DISPLAY ONLY.           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { authenticate } = require('../utils/authMiddleware');
const { validateBody, startAttemptSchema, submitAttemptSchema } = require('../utils/validators');
const { supabaseAdmin, createUserClient } = require('../utils/supabaseClient');
const { logger } = require('../utils/logger');

async function attemptRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /api/start-attempt
   * 
   * Creates or resumes an attempt with server-calculated ends_at.
   * Returns questions (without answers) and remaining_seconds.
   * 
   * STRICT: Only allows starting when test.status === 'active'
   * Uses test_version to scope uniqueness.
   */
  fastify.post('/start-attempt', {
    preHandler: [validateBody(startAttemptSchema)],
    handler: async (request, reply) => {
      const { testId } = request.body;
      const userId = request.user.id;

      try {
        logger.info({ testId, userId }, '[ATTEMPT] Start attempt requested');

        // --- REDIS CACHING LOGIC ---
        const redis = request.server.redis;
        const cacheKey = `test:${testId}`;
        let test = null;
        let questions = null;

        if (redis) {
          try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              test = parsed.test;
              questions = parsed.questions;
              logger.info({ testId }, '[ATTEMPT] Redis Cache Hit');
            }
          } catch (redisErr) {
            logger.warn({ err: redisErr }, '[ATTEMPT] Redis get error, falling back to DB');
          }
        }

        // Cache Miss: Fetch Test
        if (!test) {
          const { data: dbTest, error: testError } = await supabaseAdmin
            .from('tests')
            .select('id, status, duration_minutes, total_questions, end_time, start_time, created_at, test_version')
            .eq('id', testId)
            .single();

          if (testError || !dbTest) {
            logger.error({ testId }, '[ATTEMPT] Assessment not found');
            return reply.status(404).send({ success: false, error: 'Assessment not found' });
          }
          test = dbTest;
        }

        // ━━━ STRICT STATUS CHECK: Only 'active' is allowed ━━━
        if (test.status !== 'active') {
          logger.warn({ testId, status: test.status }, '[ATTEMPT] Rejected: assessment not active');
          return reply.status(403).send({
            success: false,
            error: test.status === 'scheduled'
              ? 'Assessment has not started yet. Please wait for your instructor.'
              : 'This assessment is not currently available.',
          });
        }

        // ━━━ BACKEND TIMER AUTHORITY: Server-side time validation ━━━
        const now = new Date();
        if (test.end_time && now > new Date(test.end_time)) {
          logger.warn({ testId }, '[ATTEMPT] Rejected: assessment time window expired');
          return reply.status(403).send({
            success: false,
            error: 'This assessment has ended and is no longer accepting attempts.',
          });
        }

        // Fetch questions AFTER validation passes
        if (!questions) {
          const { data: dbQuestions, error: qError } = await supabaseAdmin
            .from('questions')
            .select('id, question, options, type, sort_order')
            .eq('test_id', testId)
            .order('sort_order');

          if (qError) {
            logger.error({ err: qError }, '[ATTEMPT] Failed to fetch questions');
            throw qError;
          }
          questions = dbQuestions || [];

          // Cache with TTL
          if (redis) {
            try {
              await redis.set(cacheKey, JSON.stringify({ test, questions }), 'EX', 3600);
            } catch (redisErr) {
              logger.warn({ err: redisErr }, '[ATTEMPT] Redis cache write failed');
            }
          }
        }

        // ━━━ CHECK FOR EXISTING ATTEMPT (version-scoped) ━━━
        const { data: existingAttempt } = await supabaseAdmin
          .from('attempts')
          .select('*')
          .eq('student_id', userId)
          .eq('test_id', testId)
          .eq('test_version', test.test_version)
          .single();

        let attempt;
        let remainingSeconds;

        if (existingAttempt) {
          attempt = existingAttempt;

          // Block re-entry for completed attempts
          if (['submitted', 'evaluated', 'forced_end'].includes(attempt.status)) {
            logger.info({ attemptId: attempt.id }, '[ATTEMPT] Blocked: already completed');
            return reply.status(403).send({
              success: false,
              error: 'You have already submitted this assessment.',
            });
          }

          // ━━━ BACKEND TIMER AUTHORITY: Check expiration ━━━
          const endsAt = new Date(attempt.ends_at);
          remainingSeconds = Math.max(0, Math.floor((endsAt - now) / 1000));

          if (remainingSeconds <= 0) {
            // Auto-submit expired attempt
            await supabaseAdmin
              .from('attempts')
              .update({ status: 'submitted', completed_at: now.toISOString() })
              .eq('id', attempt.id);

            logger.info({ attemptId: attempt.id }, '[ATTEMPT] Auto-submitted: time expired');
            return reply.status(403).send({
              success: false,
              error: 'Time expired. Your attempt has been auto-submitted.',
            });
          }

          logger.info({ attemptId: attempt.id, remainingSeconds }, '[ATTEMPT] Resuming existing attempt');
        } else {
          // ━━━ CREATE NEW ATTEMPT ━━━
          const durationMs = (test.duration_minutes || 30) * 60 * 1000;
          const endsAt = new Date(now.getTime() + durationMs);

          const { data: newAttempt, error: createError } = await supabaseAdmin
            .from('attempts')
            .insert({
              student_id: userId,
              test_id: testId,
              test_version: test.test_version,
              status: 'in_progress',
              answers: {},
              ends_at: endsAt.toISOString(),
              violation_count: 0,
              violations: [],
            })
            .select()
            .single();

          if (createError) {
            if (createError.code === '23505') {
              logger.warn({ testId, userId }, '[ATTEMPT] Duplicate constraint hit');
              return reply.status(409).send({
                success: false,
                error: 'An attempt already exists for this assessment version.',
              });
            }
            logger.error({ err: createError }, '[ATTEMPT] Failed to create attempt');
            throw createError;
          }

          attempt = newAttempt;
          remainingSeconds = Math.floor(durationMs / 1000);
          logger.info({ attemptId: attempt.id, endsAt: endsAt.toISOString(), version: test.test_version }, '[ATTEMPT] New attempt created');
        }

        return reply.send({
          success: true,
          data: {
            attempt: {
              id: attempt.id,
              status: attempt.status,
              answers: attempt.answers || {},
              ends_at: attempt.ends_at,
            },
            questions: questions || [],
            remaining_seconds: remainingSeconds,
          },
        });

      } catch (error) {
        logger.error({ err: error, testId, userId }, '[ATTEMPT] Start attempt failed');
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
   * 4-Stage Submission Pipeline:
   * 1. Save answers + mark 'submitted' + set completed_at
   * 2. Score MCQs against answer key
   * 3. Insert result
   * 4. Mark 'evaluated'
   * 
   * Idempotent: if already submitted, returns existing result.
   * 15-second timeout protection.
   */
  fastify.post('/submit-attempt', {
    preHandler: [validateBody(submitAttemptSchema)],
    handler: async (request, reply) => {
      const { attemptId, answers } = request.body;
      const userId = request.user.id;

      try {
        logger.info({ attemptId, userId }, '[SUBMISSION] Submit attempt received');

        // Wrap entire submission in timeout protection
        const result = await Promise.race([
          (async () => {
            // ━━━ STAGE 1: Fetch attempt (verify ownership) ━━━
            const { data: attempt, error: attemptError } = await supabaseAdmin
              .from('attempts')
              .select('*, tests(id, total_questions, duration_minutes)')
              .eq('id', attemptId)
              .eq('student_id', userId)
              .single();

            if (attemptError || !attempt) {
              logger.error({ attemptId }, '[SUBMISSION] Attempt not found');
              return { status: 404, body: { success: false, error: 'Attempt not found' } };
            }

            // ━━━ IDEMPOTENCY: Already submitted? Return existing result ━━━
            if (['submitted', 'evaluated', 'forced_end'].includes(attempt.status)) {
              logger.info({ attemptId, status: attempt.status }, '[SUBMISSION] Already submitted — returning existing result');
              
              const { data: existingResult } = await supabaseAdmin
                .from('results')
                .select('*')
                .eq('attempt_id', attemptId)
                .single();

              if (existingResult) {
                return {
                  status: 200,
                  body: {
                    success: true,
                    data: { result: existingResult, marks: existingResult.marks, total: attempt.tests?.total_questions || 0 },
                  },
                };
              }
              return { status: 200, body: { success: true, data: { result: null, marks: 0, total: 0 } } };
            }

            // ━━━ BACKEND TIMER AUTHORITY: Validate time ━━━
            const now = new Date();
            const endsAt = new Date(attempt.ends_at);
            const gracePeriodMs = 30 * 1000;

            if (now > new Date(endsAt.getTime() + gracePeriodMs)) {
              logger.warn({ attemptId }, '[SUBMISSION] Late submission (past grace period)');
            }

            // ━━━ STAGE 2: Mark as submitted + save answers ━━━
            logger.info({ attemptId }, '[SUBMISSION] Saving answers and marking submitted');
            await supabaseAdmin
              .from('attempts')
              .update({
                status: 'submitted',
                answers,
                completed_at: now.toISOString(),
              })
              .eq('id', attemptId);

            // ━━━ STAGE 3: Server-side MCQ scoring ━━━
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

            logger.info({ attemptId, marks, total: answerKey?.length }, '[SUBMISSION] Scoring complete');

            // ━━━ STAGE 4: Save result (idempotent with ON CONFLICT) ━━━
            const { data: savedResult, error: resultError } = await supabaseAdmin
              .from('results')
              .upsert({
                attempt_id: attemptId,
                student_id: userId,
                test_id: attempt.test_id,
                marks,
                feedback: 'Auto-graded by server',
              }, { onConflict: 'attempt_id' })
              .select()
              .single();

            if (resultError) {
              logger.error({ err: resultError }, '[SUBMISSION] Failed to save result');
              throw resultError;
            }

            // ━━━ STAGE 5: Mark as evaluated ━━━
            await supabaseAdmin
              .from('attempts')
              .update({ status: 'evaluated' })
              .eq('id', attemptId);

            logger.info({ attemptId, marks, total: answerKey?.length }, '[SUBMISSION] Pipeline complete: evaluated');

            return {
              status: 200,
              body: {
                success: true,
                data: {
                  result: savedResult,
                  marks,
                  total: answerKey?.length || 0,
                },
              },
            };
          })(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Submission timed out after 15 seconds')), 15000)
          ),
        ]);

        return reply.status(result.status).send(result.body);

      } catch (error) {
        logger.error({ err: error, attemptId, userId }, '[SUBMISSION] Submit attempt failed');
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
   * Returns current remaining_seconds computed from server-side ends_at.
   * Auto-submits if expired.
   */
  fastify.get('/attempt-status/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;

    try {
      const { data: attempt, error } = await supabaseAdmin
        .from('attempts')
        .select('id, status, ends_at')
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
          .update({ status: 'submitted', completed_at: now.toISOString() })
          .eq('id', id);

        logger.info({ attemptId: id }, '[ATTEMPT] Auto-submitted via status check');
        return reply.send({
          success: true,
          data: { status: 'submitted', remaining_seconds: 0 },
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
      logger.error({ err: error }, '[ATTEMPT] Status check failed');
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

      // ━━━ BACKEND TIMER AUTHORITY ━━━
      if (new Date(attempt.ends_at) < new Date()) {
        return reply.status(403).send({ success: false, error: 'Time expired' });
      }

      const updatedAnswers = { ...(attempt.answers || {}), [questionId]: answer };
      
      await supabaseAdmin
        .from('attempts')
        .update({ answers: updatedAnswers })
        .eq('id', attemptId);

      return reply.send({ success: true });

    } catch (error) {
      logger.error({ err: error }, '[ATTEMPT] Save answer failed');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to save answer',
      });
    }
  });

  /**
   * POST /api/record-violation
   * 
   * Records a student violation via the secure RPC function.
   * Fire-and-forget from frontend — should never block the UI.
   */
  fastify.post('/record-violation', async (request, reply) => {
    const { attemptId, violationType } = request.body || {};
    const userId = request.user.id;

    if (!attemptId || !violationType) {
      return reply.status(400).send({
        success: false,
        error: 'attemptId and violationType are required',
      });
    }

    try {
      logger.info({ attemptId, violationType, userId }, '[VIOLATION] Recording violation');

      // Call the SECURITY DEFINER RPC function as the actual user
      const token = request.headers.authorization.replace('Bearer ', '');
      const supabase = createUserClient(token);

      const { data, error } = await supabase.rpc('record_violation', {
        p_attempt_id: attemptId,
        p_violation_type: violationType,
      });

      if (error) {
        logger.error({ err: error }, '[VIOLATION] RPC failed');
        return reply.status(500).send({ success: false, error: error.message });
      }

      if (data && !data.success) {
        return reply.status(400).send(data);
      }

      logger.info({
        attemptId,
        violationType,
        result: data,
      }, '[VIOLATION] Recorded successfully');

      return reply.send({ success: true, data });

    } catch (error) {
      logger.error({ err: error, attemptId, violationType }, '[VIOLATION] Recording failed');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to record violation',
      });
    }
  });
}

module.exports = attemptRoutes;
