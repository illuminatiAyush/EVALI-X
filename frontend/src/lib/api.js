/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  API SERVICE — Supabase Edge Functions (Serverless)            ║
 * ║  Zero backend server. All calls go through Supabase.          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { supabase } from './supabase';
import { debug } from './debug';

/**
 * Executes a Supabase Edge Function with automatic retries for transient errors.
 * Max 2 retries (3 attempts total) with exponential backoff.
 */
async function invokeWithRetry(functionName, options, maxRetries = 2) {
  let lastError;
  const start = performance.now();
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (i > 0) {
        debug.api.warn(`Retry ${i}/${maxRetries} for ${functionName}`);
      } else {
        debug.api.info(`Calling edge function: ${functionName}`, options?.body ? { body: options.body } : undefined);
      }

      // 🛡️ CRITICAL: Ensure we actually have a session before invoking!
      // If gotrue-js hasn't synced yet, invoke() will send an empty Authorization header, resulting in 401.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || sessionError) {
        throw new Error('Authentication session missing. Please log in again.');
      }

      // Wrap in a Promise.race to guarantee we NEVER hang indefinitely
      const timeoutMs = 15000;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Edge function invocation timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const response = await Promise.race([
        supabase.functions.invoke(functionName, options),
        timeoutPromise
      ]);
      
      // If we got a network error or 5xx, we might want to retry
      if (response.error) {
        let statusCode = response.error.status;
        let responseBody = null;
        
        // If it's a FunctionsHttpError, the actual response is in error.context
        if (response.error.context instanceof Response) {
          statusCode = response.error.context.status;
          try {
            responseBody = await response.error.context.clone().json();
          } catch (e) {
            try {
              responseBody = await response.error.context.clone().text();
            } catch (e2) {}
          }
        }

        const isRetryable = response.error.message?.includes('fetch') || statusCode >= 500;
        
        if (isRetryable) {
          debug.api.error(`${functionName} returned error (retryable)`, { 
            error: response.error.message, 
            status: statusCode,
            responseBodyString: JSON.stringify(responseBody),
            retryable: true,
          });
          throw response.error;
        } else {
          debug.api.error(`${functionName} failed without retry`, {
            error: response.error.message,
            status: statusCode,
            responseBodyString: JSON.stringify(responseBody),
            name: response.error.name,
          });
          
          // Throw the error so the caller can handle it
          // We attach the extracted status and body to the error for the caller
          const err = new Error(response.error.message);
          err.status = statusCode;
          err.body = responseBody;
          throw err;
        }
      }
      
      const ms = (performance.now() - start).toFixed(0);
      debug.api.info(`${functionName} responded in ${ms}ms`, {
        success: response.data?.success,
      });
      
      return response;
    } catch (err) {
      lastError = err;
      if (i < maxRetries) {
        const delay = 500 * Math.pow(2, i);
        debug.api.warn(`${functionName} failed, retrying in ${delay}ms`, { error: err.message });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  const ms = (performance.now() - start).toFixed(0);
  debug.api.error(`${functionName} failed after ${maxRetries + 1} attempts (${ms}ms total)`, { 
    error: lastError?.message,
    hint: lastError?.message?.includes('fetch') 
      ? 'Network error — check if the edge function is deployed: npx supabase functions deploy'
      : 'Check function logs in Supabase Dashboard → Edge Functions',
  });
  
  return { error: lastError };
}

export const apiService = {
  /**
   * Generates a new test using AI from extracted PDF text.
   * Calls Groq API directly from the client — no edge function dependency.
   */
  async generateTest(text, difficulty = 'medium', numQuestions = 10) {
    const { generateTestFromText } = await import('./groqGenerator');
    const result = await generateTestFromText(text, difficulty, numQuestions);

    if (!result.success) throw new Error(result.error || 'Generation failed');
    return result;
  },

  /**
   * Creates a test with questions in the database.
   */
  async createTest({ title, difficulty, duration_minutes, total_marks, batch_id, content, is_ai_generated, start_time, end_time, status }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // 1. Insert test
    const { data: test, error: testError } = await supabase
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
        created_by: user.id
      })
      .select()
      .single();

    if (testError) throw new Error(testError.message || 'Failed to create test');

    // 2. Insert questions
    if (content?.questions && Array.isArray(content.questions)) {
      const questionsToInsert = content.questions.map((q, i) => ({
        test_id: test.id,
        question: q.question || q.text || '',
        options: q.options || [],
        answer: q.answer || q.correct_answer || '',
        type: q.type || 'mcq',
        sort_order: i
      }));

      const { error: qError } = await supabase
        .from('questions')
        .insert(questionsToInsert);
      
      if (qError) console.error('Failed to insert questions:', qError);
    }

    return test;
  },

  /**
   * Fetches all tests for the current user.
   */
  async getMyTests() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'teacher') {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          test_batches ( batch_id )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw new Error(error.message);
      
      return data.map(test => ({
        ...test,
        batch_ids: test.test_batches?.map(tb => tb.batch_id) || []
      }));
    } else {
      // Student view - get assigned active/scheduled tests
      const { data: batchIds } = await supabase
        .from('student_batches')
        .select('batch_id')
        .eq('student_id', user.id);
        
      const myBatchIds = batchIds?.map(b => b.batch_id) || [];
      if (myBatchIds.length === 0) return [];

      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          test_batches!inner ( batch_id )
        `)
        .in('status', ['active', 'scheduled'])
        .in('test_batches.batch_id', myBatchIds)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return data.map(test => ({
        ...test,
        batch_ids: test.test_batches?.map(tb => tb.batch_id) || []
      }));
    }
  },

  /**
   * Fetches a specific test by ID.
   */
  async getTestById(id) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select(`
        *,
        test_batches ( batch_id )
      `)
      .eq('id', id)
      .single();

    if (testError || !test) throw new Error('Test not found');

    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', id)
      .order('sort_order', { ascending: true });

    return {
      ...test,
      batch_ids: test.test_batches?.map(tb => tb.batch_id) || [],
      content: { questions: questions || [] }
    };
  },

  // ─── Attempt Lifecycle ─────────────────────────────────────────

  /**
   * Starts a test attempt.
   */
  async startAttempt(testId) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Get test details
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError || !test) throw new Error('Test not found');
    if (test.status !== 'active') throw new Error('This test is not currently active');

    // Check for existing attempt
    const { data: existingAttempt } = await supabase
      .from('attempts')
      .select('*')
      .eq('student_id', user.id)
      .eq('test_id', testId)
      .single();

    if (existingAttempt) {
      const { data: questions } = await supabase
        .from('questions')
        .select('id, question, options, type, sort_order')
        .eq('test_id', testId)
        .order('sort_order');

      return {
        attempt: existingAttempt,
        questions: questions || [],
        remaining_seconds: Math.max(0, Math.floor((new Date(existingAttempt.ends_at) - new Date()) / 1000))
      };
    }

    // Create new attempt
    const durationMs = (test.duration_minutes || 30) * 60 * 1000;
    const endsAt = new Date(Date.now() + durationMs).toISOString();

    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .insert({
        student_id: user.id,
        test_id: testId,
        status: 'in_progress',
        answers: {},
        ends_at: endsAt
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Attempt creation error:', attemptError);
      throw new Error(attemptError.message || 'Failed to start attempt');
    }

    // Get questions
    const { data: questions } = await supabase
      .from('questions')
      .select('id, question, options, type, sort_order')
      .eq('test_id', testId)
      .order('sort_order');

    return {
      attempt,
      questions: questions || [],
      remaining_seconds: Math.floor(durationMs / 1000)
    };
  },

  /**
   * Saves an answer.
   */
  async saveAnswer(attemptId, questionId, answerValue) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get current attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('answers, status, ends_at')
      .eq('id', attemptId)
      .eq('student_id', user.id)
      .single();

    if (attemptError || !attempt) throw new Error('Attempt not found');
    if (attempt.status !== 'in_progress') throw new Error('Attempt already submitted');
    if (new Date(attempt.ends_at) < new Date()) throw new Error('Time expired');

    // Update answers
    const updatedAnswers = { ...attempt.answers, [questionId]: answerValue };
    
    const { data: updated, error: updateError } = await supabase
      .from('attempts')
      .update({ answers: updatedAnswers })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateError) throw new Error('Failed to save answer');
    return updated;
  },

  /**
   * Records a violation (e.g., tab switch).
   */
  async recordViolation(attemptId) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('answers')
      .eq('id', attemptId)
      .eq('student_id', user.id)
      .single();

    if (attemptError || !attempt) throw new Error('Attempt not found');

    const violations = (attempt.answers?._violations || 0) + 1;
    const updatedAnswers = { ...attempt.answers, _violations: violations };

    const { data: updated, error: updateError } = await supabase
      .from('attempts')
      .update({ answers: updatedAnswers })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateError) throw new Error('Failed to record violation');
    return updated;
  },

  /**
   * Submits an attempt for grading.
   */
  async submitAttempt(attemptId, reason = 'completed') {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Set attempt to submitted
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .update({ status: reason === 'time_up' ? 'submitted' : reason })
      .eq('id', attemptId)
      .eq('student_id', user.id)
      .select()
      .single();

    if (attemptError || !attempt) throw new Error('Failed to submit attempt');

    // Get the questions for grading
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', attempt.test_id);

    // Auto grade MCQs
    let marks = 0;
    const answers = attempt.answers || {};
    
    questions?.forEach(q => {
      if (q.type === 'mcq' && answers[q.id] === q.answer) {
        marks += 1;
      }
    });

    // Create result
    const { data: result, error: resultError } = await supabase
      .from('results')
      .insert({
        attempt_id: attempt.id,
        student_id: user.id,
        test_id: attempt.test_id,
        marks: marks,
        answers: answers
      })
      .select()
      .single();

    if (resultError) {
      console.error('Failed to create result:', resultError);
      return { attempt, result: null };
    }

    return { attempt, result };
  },

  /**
   * Updates a test.
   */
  async updateTest(id, updates) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: test, error } = await supabase
      .from('tests')
      .update(updates)
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) throw new Error(error.message || 'Failed to update test');
    return test;
  },

  /**
   * Starts or ends a test.
   */
  async setTestStatus(id, action) {
    const { data: { user } } = await supabase.auth.getUser();

    const updates = {};
    if (action === 'start') {
      updates.status = 'active';
      updates.start_time = new Date().toISOString();
    } else if (action === 'end') {
      updates.status = 'ended';
      updates.end_time = new Date().toISOString();
      // Also automatically submit any active attempts
      const { error: attemptsError } = await supabase
        .from('attempts')
        .update({ status: 'forced_end' })
        .eq('test_id', id)
        .eq('status', 'in_progress');
      if (attemptsError) console.error('Failed to force end attempts:', attemptsError);
    } else {
      throw new Error('Invalid action');
    }

    const { data: test, error } = await supabase
      .from('tests')
      .update(updates)
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) throw new Error(error.message || `Failed to ${action} test`);
    return test;
  },

  /**
   * Gets test results for teacher.
   */
  async getTestResults(id) {
    const { data, error } = await invokeWithRetry('get-results', {
      body: { test_id: id },
    });

    if (error) throw new Error(error.message || 'Failed to fetch results');
    if (!data.success) throw new Error(data.error || 'Failed to fetch results');
    return data.data;
  },

  /**
   * Gets all results for the logged-in student.
   */
  async getStudentResults() {
    const { data, error } = await invokeWithRetry('get-results', {
      body: {},
    });

    if (error) throw new Error(error.message || 'Failed to fetch student results');
    if (!data.success) throw new Error(data.error || 'Failed to fetch student results');
    return data.data;
  },

  /**
   * Fetches aggregate stats for the Teacher Dashboard using direct DB queries (RLS protected)
   */
  async getTeacherDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { totalAttempts: 0, classAvg: 0 };

    // Get teacher's tests
    const { data: tests } = await supabase
      .from('tests')
      .select('id')
      .eq('created_by', user.id);

    if (!tests || tests.length === 0) return { totalAttempts: 0, classAvg: 0 };
    
    const testIds = tests.map(t => t.id);

    // Get all results for these tests
    const { data: results } = await supabase
      .from('results')
      .select('marks, test_id')
      .in('test_id', testIds);

    const totalAttempts = results ? results.length : 0;
    
    // We need total_marks from the tests to calculate percentage accurately
    // Alternatively, we just do a rough average if results.marks is total, wait, marks is the score.
    // Let's get total_marks from tests
    const { data: testsFull } = await supabase
      .from('tests')
      .select('id, total_marks')
      .in('id', testIds);
      
    const testMarksMap = {};
    if (testsFull) {
      testsFull.forEach(t => testMarksMap[t.id] = t.total_marks || 100);
    }

    let sumPercentage = 0;
    if (results && results.length > 0) {
      results.forEach(r => {
        const total = testMarksMap[r.test_id] || 100;
        sumPercentage += (r.marks / total) * 100;
      });
    }
    
    const classAvg = totalAttempts > 0 ? Math.round(sumPercentage / totalAttempts) : 0;
    
    return { totalAttempts, classAvg };
  },

  /**
   * Fetches aggregate stats for the Student Dashboard using direct DB queries (RLS protected)
   */
  async getStudentDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { totalAttempts: 0, avgAccuracy: 0, learningPoints: 0 };

    const { data: results } = await supabase
      .from('results')
      .select('marks, test_id')
      .eq('student_id', user.id);

    const totalAttempts = results ? results.length : 0;
    
    if (totalAttempts === 0) return { totalAttempts: 0, avgAccuracy: 0, learningPoints: 0 };

    const testIds = results.map(r => r.test_id);
    const { data: testsFull } = await supabase
      .from('tests')
      .select('id, total_marks')
      .in('id', testIds);
      
    const testMarksMap = {};
    if (testsFull) {
      testsFull.forEach(t => testMarksMap[t.id] = t.total_marks || 100);
    }

    let sumPercentage = 0;
    results.forEach(r => {
      const total = testMarksMap[r.test_id] || 100;
      sumPercentage += (r.marks / total) * 100;
    });

    const avgAccuracy = Math.round(sumPercentage / totalAttempts);
    const learningPoints = (totalAttempts * 50) + Math.round(sumPercentage);

    return { totalAttempts, avgAccuracy, learningPoints };
  },

  /**
   * Fetches the number of attempts for a list of test IDs
   */
  async getTestAttemptCounts(testIds) {
    if (!testIds || testIds.length === 0) return {};
    
    const { data: attempts } = await supabase
      .from('attempts')
      .select('test_id')
      .in('test_id', testIds);
      
    const counts = {};
    if (attempts) {
      attempts.forEach(a => {
        counts[a.test_id] = (counts[a.test_id] || 0) + 1;
      });
    }
    return counts;
  },

  // ─── Batch System ──────────────────────────────────────────────
  
  async createBatch(name, expiresAt = null) {
    const { data, error } = await invokeWithRetry('create-batch', {
      body: { name, expires_at: expiresAt },
    });
    if (error) throw new Error(error.message || 'Failed to create batch');
    if (!data.success) throw new Error(data.error?.message || 'Failed to create batch');
    return data.data;
  },

  async joinBatch(joinCode) {
    const { data, error } = await invokeWithRetry('join-batch', {
      body: { join_code: joinCode },
    });
    if (error) throw new Error(error.message || 'Failed to join batch');
    if (!data.success) throw new Error(data.error?.message || 'Failed to join batch');
    return data.data;
  },

  async getBatches(limit = 20, offset = 0) {
    const { data, error } = await invokeWithRetry('get-batches', {
      body: { limit, offset },
    });
    if (error) throw new Error(error.message || 'Failed to fetch batches');
    if (!data.success) throw new Error(data.error?.message || 'Failed to fetch batches');
    return data; // Returns { data, pagination }
  },

  async assignTestToBatch(testId, batchIds) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // First verify user owns the test
    const { data: test } = await supabase
      .from('tests')
      .select('id')
      .eq('id', testId)
      .eq('created_by', user.id)
      .single();
      
    if (!test) throw new Error('Test not found or unauthorized');

    // Insert batch assignments
    const mappings = batchIds.map(batchId => ({
      test_id: testId,
      batch_id: batchId
    }));

    const { error } = await supabase
      .from('test_batches')
      .insert(mappings);

    if (error) throw new Error(error.message || 'Failed to assign test to batches');
    return { success: true };
  },
};
