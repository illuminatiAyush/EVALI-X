/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  API SERVICE — Hybrid Architecture                             ║
 * ║  AI + PDF → Backend (Fastify)  |  CRUD → Supabase Direct      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { supabase, withTimeout } from './supabase';
import { debug } from './debug';



const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

export const apiService = {
  /**
   * Generates a new test using AI.
   * Sends the PDF file directly to the backend for processing.
   */
  async generateTest(file, difficulty = 'medium', numQuestions = 10) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('difficulty', difficulty);
    formData.append('numQuestions', numQuestions);

    const response = await fetch(`${BACKEND_URL}/generate-test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Generation failed');
    }

    return { success: true, jobId: data.jobId };
  },

  /**
   * Polls the background job status.
   */
  async getGenerationStatus(jobId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/generate-test/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get status');
    }

    return data;
  },

  /**
   * Creates a test with questions in the database.
   * Calls the backend to ensure consistency.
   */
  async createTest({ title, difficulty, duration_minutes, total_marks, batch_ids, content, is_ai_generated, start_time, end_time, status }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/create-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        title,
        difficulty,
        duration_minutes,
        total_marks,
        batch_ids,
        content,
        is_ai_generated,
        start_time,
        end_time,
        status
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create test');
    }

    return data.data;
  },

  /**
   * Fetches all tests for the current user.
   */
  async getMyTests() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await withTimeout(
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      "Failed to verify user role."
    );

    if (profile?.role === 'teacher') {
      const { data, error } = await withTimeout(
        supabase
          .from('tests')
          .select(`
            *,
            test_batches ( batch_id )
          `)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false }),
        "Timed out fetching your assessments."
      );
        
      if (error) throw new Error(error.message);
      
      return data.map(test => ({
        ...test,
        batch_ids: test.test_batches?.map(tb => tb.batch_id) || []
      }));
    } else {
      // Student view - get assigned active/scheduled tests
      const { data: batchIds } = await withTimeout(
        supabase.from('student_batches').select('batch_id').eq('student_id', user.id),
        "Timed out fetching assigned classes."
      );
        
      const myBatchIds = batchIds?.map(b => b.batch_id) || [];
      if (myBatchIds.length === 0) return [];

      const { data, error } = await withTimeout(
        supabase
          .from('tests')
          .select(`
            *,
            test_batches!inner ( batch_id )
          `)
          .in('status', ['active', 'scheduled'])
          .in('test_batches.batch_id', myBatchIds)
          .order('created_at', { ascending: false }),
        "Timed out fetching assigned tests."
      );

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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    const { data: test, error: testError } = await withTimeout(
      supabase
        .from('tests')
        .select(`
          *,
          test_batches ( batch_id )
        `)
        .eq('id', id)
        .single(),
      "Assessment retrieval timed out."
    );

    if (testError || !test) throw new Error('Test not found');

    const testData = {
      ...test,
      batch_ids: test.test_batches?.map(tb => tb.batch_id) || []
    };

    // If teacher, return full test
    if (user && test.created_by === user.id) {
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', id)
        .order('sort_order');
      testData.questions = questions || [];
    }

    return testData;
  },

  // ─── Attempt Lifecycle (Backend-Driven) ──────────────────────────

  /**
   * Starts or resumes a test attempt via backend.
   * Backend calculates ends_at and returns questions WITHOUT answers.
   */
  async startAttempt(testId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/start-attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ testId }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to start attempt');
    }

    return result.data;
  },

  /**
   * Saves a single answer via backend (server-side time validation).
   */
  async saveAnswer(attemptId, questionId, answerValue) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/save-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ attemptId, questionId, answer: answerValue }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to save answer');
    }

    return result;
  },

  /**
   * Records a violation (e.g., tab switch).
   * Still uses Supabase directly — lightweight RLS-protected operation.
   */
  async recordViolation(attemptId) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('answers')
      .eq('id', attemptId)
      .eq('student_id', user.id)
      .single();

    if (attemptError || !attempt) throw new Error('Attempt not found');

    const violations = (attempt.answers?._violations || 0) + 1;
    const updatedAnswers = { ...attempt.answers, _violations: violations };

    // Auto-submit on 3+ violations
    if (violations >= 3) {
      const { data: updated } = await supabase
        .from('attempts')
        .update({ answers: updatedAnswers, status: 'completed', submitted_at: new Date().toISOString() })
        .eq('id', attemptId)
        .select()
        .single();

      return { ...updated, auto_submitted: true, violation_count: violations };
    }

    const { data: updated, error: updateError } = await supabase
      .from('attempts')
      .update({ answers: updatedAnswers })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateError) throw new Error('Failed to record violation');
    return { ...updated, auto_submitted: false, violation_count: violations };
  },

  /**
   * Submits an attempt via backend (server-side scoring).
   * Backend calculates marks — frontend NEVER sees answer keys.
   */
  async submitAttempt(attemptId, answers) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/submit-attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ attemptId, answers }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to submit attempt');
    }

    return result.data.result;
  },

  /**
   * Updates a test (direct Supabase — teacher only, RLS protected).
   */
  async updateTest(id, updates) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

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
   * Changes test status via backend (handles force-ending attempts server-side).
   */
  async updateTestStatus(id, action) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/test-status/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || `Failed to ${action} test`);
    }

    return result.data;
  },

  /**
   * Gets test results for teacher.
   */
  async getTestResults(id) {
    const { data, error } = await supabase
      .from('results')
      .select('*, student:profiles(name, email)')
      .eq('test_id', id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || 'Failed to fetch results');
    return data;
  },

  /**
   * Gets all results for the logged-in student.
   */
  async getStudentResults() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('results')
      .select('*, test:tests(title, difficulty, total_questions)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || 'Failed to fetch student results');
    return data;
  },

  /**
   * Fetches aggregate stats for the Teacher Dashboard using direct DB queries (RLS protected)
   */
  async getTeacherDashboardStats() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { totalAttempts: 0, classAvg: 0 };

    // Get teacher's tests
    const { data: tests } = await withTimeout(
      supabase.from('tests').select('id').eq('created_by', user.id),
      "Dashboard stats timed out."
    );

    if (!tests || tests.length === 0) return { totalAttempts: 0, classAvg: 0 };
    
    const testIds = tests.map(t => t.id);

    // Get all results for these tests
    const { data: results } = await withTimeout(
      supabase.from('results').select('marks, test_id').in('test_id', testIds),
      "Dashboard analytics timed out."
    );

    const totalAttempts = results ? results.length : 0;
    
    // We need total_marks from the tests to calculate percentage accurately
    // Alternatively, we just do a rough average if results.marks is total, wait, marks is the score.
    // Let's get total_marks from tests
    const { data: testsFull } = await supabase
      .from('tests')
      .select('id, total_questions')
      .in('id', testIds);
      
    const testMarksMap = {};
    if (testsFull) {
      testsFull.forEach(t => testMarksMap[t.id] = t.total_questions || 100);
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
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
      .select('id, total_questions')
      .in('id', testIds);
      
    const testMarksMap = {};
    if (testsFull) {
      testsFull.forEach(t => testMarksMap[t.id] = t.total_questions || 100);
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
    
    const { data: attempts } = await withTimeout(
      supabase.from('attempts').select('test_id').in('test_id', testIds),
      "Attempt data retrieval timed out."
    );
      
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Generate a random 6-character alphanumeric join code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('batches')
      .insert({
        name,
        teacher_id: user.id,
        join_code: joinCode,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) throw new Error(error.message || 'Failed to create batch');
    return data;
  },

  async joinBatch(joinCode) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Find the batch by code
    const { data: batch, error: searchError } = await supabase
      .from('batches')
      .select('id, expires_at')
      .eq('join_code', joinCode.toUpperCase())
      .single();

    if (searchError || !batch) throw new Error('Invalid join code or class not found');
    if (batch.expires_at && new Date(batch.expires_at) < new Date()) throw new Error('This join code has expired');

    // Add student to batch
    const { error: joinError } = await supabase
      .from('student_batches')
      .insert({
        student_id: user.id,
        batch_id: batch.id
      });

    if (joinError) {
      if (joinError.code === '23505') throw new Error('You are already in this class');
      throw new Error(joinError.message || 'Failed to join class');
    }
    return { success: true };
  },

  async getBatches(limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('batches')
      .select('*, teacher:profiles(name)')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || 'Failed to fetch batches');
    return { success: true, data };
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
