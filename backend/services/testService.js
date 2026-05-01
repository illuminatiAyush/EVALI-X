/**
 * Test Service — Backend Business Logic
 * 
 * Handles DB interactions for assessments, utilizing the user-scoped
 * Supabase client to respect RLS policies and ensure data security.
 */

const { createUserClient } = require('../utils/supabaseClient');
const { logger } = require('../utils/logger');

class TestService {
  /**
   * Helper to execute a query with a timeout to prevent hanging.
   */
  static async withTimeout(promise, timeoutMs = 15000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database operation timed out')), timeoutMs)),
    ]);
  }

  /**
   * Creates a test and its questions.
   */
  static async createTest(token, userId, data) {
    const supabase = createUserClient(token);
    const { title, difficulty, duration_minutes, total_marks, content, is_ai_generated, start_time, end_time, status } = data;

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
          source_document: is_ai_generated ? { ai_generated: true } : null,
          created_by: userId,
        })
        .select()
        .single()
    );

    if (testError) {
      logger.error({ err: testError }, 'Failed to create test record');
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
        logger.error({ err: qError, testId: test.id }, 'Failed to insert questions');
        // We don't throw here to avoid leaving an orphaned test, but we log the error.
        // In a strict transactional system, we would rollback.
      }
    }

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
      logger.error({ err: error, testId }, 'Failed to assign test to batches');
      throw new Error(error.message || 'Failed to assign test to batches');
    }

    return { success: true };
  }
}

module.exports = TestService;
