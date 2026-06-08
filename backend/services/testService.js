/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  TEST SERVICE — Assessment Lifecycle State Machine               ║
 * ║  Hardened: Strict transitions, versioned restarts, observability ║
 * ║  DATABASE = SOURCE OF TRUTH. FRONTEND = DISPLAY ONLY.           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { createUserClient, supabaseAdmin } = require('../utils/supabaseClient');
const { logger } = require('../utils/logger');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRICT STATE MACHINE — Only these transitions are allowed.
// Any other transition is a hard rejection (400 Bad Request).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ALLOWED_TRANSITIONS = {
  'scheduled': ['active', 'ended'],
  'active': ['ended'],
  'ended': ['active'],
};

const ACTION_TO_TARGET = {
  'publish': 'scheduled',
  'start': 'active',
  'end': 'ended',
  'restart': 'active',
};

class TestService {
  /**
   * Helper to execute a query with a timeout to prevent hanging.
   */
  static async withTimeout(promise, timeoutMs = 15000) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Database operation timed out')), timeoutMs);
    });

    return Promise.race([
      Promise.resolve(promise).finally(() => clearTimeout(timeoutId)),
      timeoutPromise
    ]);
  }

  /**
   * Creates a test and its questions.
   */
  static async createTest(token, userId, data) {
    const supabase = createUserClient(token);
    const { title, difficulty, duration_minutes, total_marks, content, is_ai_generated, start_time, end_time, status } = data;

    logger.info({ userId, title }, '[ASSESSMENT] Creating new assessment');

    // 1. Insert test
    const { data: test, error: testError } = await this.withTimeout(
      supabase
        .from('tests')
        .insert({
          title,
          difficulty: difficulty || 'medium',
          duration_minutes: duration_minutes || 30,
          total_questions: content?.questions?.length || total_marks || 0,
          status: status || 'draft',
          start_time: start_time || null,
          end_time: end_time || null,
          test_version: 1,
          source_document: is_ai_generated ? { ai_generated: true } : null,
          created_by: userId,
        })
        .select()
        .single()
    );

    if (testError) {
      logger.error({ err: testError }, '[ASSESSMENT] Failed to create test record');
      throw new Error(testError.message || 'Failed to create test');
    }

    // 2. Insert questions
    if (content?.questions && Array.isArray(content.questions)) {
      const questionsToInsert = content.questions.map((q, i) => ({
        test_id: test.id,
        question: q.question || q.text || '',
        options: q.options || [],
        answer: q.answer || q.correct_answer || '',
        type: q.type || 'mcq',
        sort_order: i,
      }));

      const { error: qError } = await this.withTimeout(
        supabase.from('questions').insert(questionsToInsert)
      );

      if (qError) {
        logger.error({ err: qError, testId: test.id }, '[ASSESSMENT] Failed to insert questions');
      }
    }

    logger.info({ testId: test.id, questionCount: content?.questions?.length }, '[ASSESSMENT] Assessment created successfully');
    return test;
  }

  /**
   * Assigns a test to one or more batches.
   */
  static async assignTestToBatch(token, testId, batchIds) {
    const supabase = createUserClient(token);
    
    const mappings = batchIds.map(batchId => ({
      test_id: testId,
      batch_id: batchId,
    }));

    const { error } = await this.withTimeout(
      supabase.from('test_batches').insert(mappings)
    );

    if (error) {
      logger.error({ err: error, testId }, '[ASSESSMENT] Failed to assign test to batches');
      throw new Error(error.message || 'Failed to assign test to batches');
    }

    return { success: true };
  }

  /**
   * Fetches restart metadata (submission/evaluation counts) for confirmation modal.
   */
  static async getRestartInfo(token, userId, testId) {
    const supabase = createUserClient(token);

    // Get current test version
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('test_version, status')
      .eq('id', testId)
      .eq('created_by', userId)
      .single();

    if (testError || !test) throw new Error('Test not found');

    // Count attempts for current version
    const { count: submissionCount } = await supabaseAdmin
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('test_id', testId)
      .eq('test_version', test.test_version)
      .in('status', ['submitted', 'evaluated', 'forced_end']);

    const { count: evaluatedCount } = await supabaseAdmin
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('test_id', testId)
      .eq('test_version', test.test_version)
      .eq('status', 'evaluated');

    const { count: activeCount } = await supabaseAdmin
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('test_id', testId)
      .eq('test_version', test.test_version)
      .eq('status', 'in_progress');

    return {
      currentVersion: test.test_version,
      status: test.status,
      submissions: submissionCount || 0,
      evaluated: evaluatedCount || 0,
      activeStudents: activeCount || 0,
    };
  }

  /**
   * Updates test status using the atomic RPC function.
   * Broadcasts real-time events globally upon success.
   */
  static async updateTestStatus(token, userId, testId, action) {
    const supabase = createUserClient(token);

    logger.info({ testId, userId, action }, '[ASSESSMENT STATE] Attempting transition');

    // 1. Call atomic RPC
    const { data: result, error } = await this.withTimeout(
      supabase.rpc('update_assessment_state', {
        p_test_id: testId,
        p_action: action
      })
    );

    if (error) {
      logger.error({ err: error, testId, action }, '[ASSESSMENT STATE] RPC execution failed');
      throw new Error(error.message || `Failed to ${action} assessment`);
    }

    if (!result.success) {
      logger.error({ result, testId, action }, '[ASSESSMENT STATE] Transition rejected by RPC');
      throw new Error(result.error || `Transition rejected`);
    }

    logger.info({
      testId,
      action,
      previousState: result.previous_status,
      newState: result.status,
      version: result.test_version,
    }, '[STATE TRANSITION] Successful atomic update');

    // Return the updated state
    return {
      id: testId,
      status: result.status,
      test_version: result.test_version
    };
  }
}

module.exports = TestService;
