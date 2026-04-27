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
   * PDF text extraction happens client-side before calling this.
   */
  async generateTest(text, difficulty = 'medium', numQuestions = 10) {
    const { data, error } = await invokeWithRetry('generate-test', {
      body: { text, difficulty, numQuestions },
    });

    if (error) throw new Error(error.message || 'Failed to generate test');
    if (!data.success) throw new Error(data.error || 'Generation failed');
    return data;
  },

  /**
   * Creates a test with questions in the database.
   */
  async createTest({ title, difficulty, duration_minutes, total_marks, batch_id, content, is_ai_generated, start_time, end_time, status }) {
    const { data, error } = await invokeWithRetry('create-test', {
      body: { action: 'create', title, difficulty, duration_minutes, total_marks, batch_id, content, is_ai_generated, start_time, end_time, status },
    });

    if (error) throw new Error(error.message || 'Failed to create test');
    if (!data.success) throw new Error(data.error || 'Test creation failed');
    return data.data;
  },

  /**
   * Fetches all tests for the current user.
   */
  async getMyTests() {
    const { data, error } = await invokeWithRetry('get-tests', {
      body: {},
    });

    if (error) throw new Error(error.message || 'Failed to fetch tests');
    if (!data.success) throw new Error(data.error || 'Failed to fetch tests');
    return data.data;
  },

  /**
   * Fetches a specific test by ID.
   */
  async getTestById(id) {
    const { data, error } = await invokeWithRetry('get-tests', {
      body: { test_id: id },
    });

    if (error) throw new Error(error.message || 'Failed to fetch test');
    if (!data.success) throw new Error(data.error || 'Failed to fetch test');
    return data.data;
  },

  // ─── Attempt Lifecycle ─────────────────────────────────────────

  /**
   * Starts a test attempt.
   */
  async startAttempt(testId) {
    const { data, error } = await invokeWithRetry('start-attempt', {
      body: { action: 'start', test_id: testId },
    });

    if (error) throw new Error(error.message || 'Failed to start attempt');
    if (!data.success) throw new Error(data.error || 'Failed to start attempt');
    return data.data;
  },

  /**
   * Saves an answer.
   */
  async saveAnswer(attemptId, questionId, answerValue) {
    const { data, error } = await invokeWithRetry('start-attempt', {
      body: { action: 'answer', attempt_id: attemptId, question_id: questionId, answer: answerValue },
    });

    if (error) throw new Error(error.message || 'Failed to save answer');
    if (!data.success) throw new Error(data.error || 'Failed to save answer');
    return data.data;
  },

  /**
   * Records a violation (e.g., tab switch).
   */
  async recordViolation(attemptId) {
    const { data, error } = await invokeWithRetry('start-attempt', {
      body: { action: 'violation', attempt_id: attemptId },
    });

    if (error) throw new Error(error.message || 'Failed to record violation');
    if (!data.success) throw new Error(data.error || 'Failed to record violation');
    return data.data;
  },

  /**
   * Submits an attempt for grading.
   */
  async submitAttempt(attemptId, reason = 'completed') {
    const { data, error } = await invokeWithRetry('submit-attempt', {
      body: { attempt_id: attemptId, reason },
    });

    if (error) throw new Error(error.message || 'Failed to submit attempt');
    if (!data.success) throw new Error(data.error || 'Failed to submit attempt');
    return data.data;
  },

  /**
   * Updates a test.
   */
  async updateTest(id, updates) {
    const { data, error } = await invokeWithRetry('create-test', {
      body: { action: 'update', test_id: id, ...updates },
    });

    if (error) throw new Error(error.message || 'Failed to update test');
    if (!data.success) throw new Error(data.error || 'Failed to update test');
    return data.data;
  },

  /**
   * Starts or ends a test.
   */
  async setTestStatus(id, action) {
    const { data, error } = await invokeWithRetry('create-test', {
      body: { action, test_id: id },
    });

    if (error) throw new Error(error.message || `Failed to ${action} test`);
    if (!data.success) throw new Error(data.error || `Failed to ${action} test`);
    return data.data;
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
    const { data, error } = await invokeWithRetry('assign-test-to-batch', {
      body: { test_id: testId, batch_ids: batchIds },
    });
    if (error) throw new Error(error.message || 'Failed to assign test');
    if (!data.success) throw new Error(data.error?.message || 'Failed to assign test');
    return data.data;
  },
};
