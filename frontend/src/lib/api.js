/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  API SERVICE — Hybrid Architecture                             ║
 * ║  AI + PDF → Backend (Fastify)  |  CRUD → Supabase Direct      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { supabase } from './supabase';
import { debug } from './debug';



const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

import { withTimeout } from './withTimeout';

const _apiService = {
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

    // Use JWT metadata to determine role — no extra DB round-trip needed
    const userRole = user.user_metadata?.role || 'student';

    if (userRole === 'teacher') {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          test_batches ( batch_id )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw new Error(error.message);
      
      return (data || []).map(test => ({
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

      return (data || []).map(test => ({
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
    
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select(`
        *,
        test_batches ( batch_id )
      `)
      .eq('id', id)
      .single();

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
   * Now calls the backend endpoint to persist severity and timestamp.
   */
  async recordViolation(attemptId, violationType) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/record-violation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ attemptId, violationType }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to record violation');
    }

    return result;
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
   * Updates a test via backend (avoids direct Supabase hangs).
   */
  async updateTest(id, updates) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${BACKEND_URL}/update-test/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update test');
      }
      return result.data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      throw err;
    }
  },

  /**
   * Changes test status via backend (handles force-ending attempts server-side).
   */
  updateTestStatus: async (id, action) => {
    console.log(`[API SERVICE] updateTestStatus called for id: ${id}, action: ${action}`);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');
    
    const response = await fetch(`${BACKEND_URL}/test-status/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[API SERVICE] Error response:`, errorData);
      throw new Error(errorData.error || 'Failed to update test status');
    }

    const json = await response.json();
    console.log(`[API SERVICE] Success response:`, json);
    return json.data;
  },

  /**
   * Gets test results for teacher.
   */
  async getTestResults(id) {
    const { data, error } = await supabase
      .from('results')
      .select('*, student:profiles(name, email), attempt:attempts(answers)')
      .eq('test_id', id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || 'Failed to fetch results');
    return data;
  },

  /**
   * Gets enriched analytics data from the backend.
   */
  async getTestAnalytics(id) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/reports/assessment/${id}/analytics`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Failed to fetch analytics');
    return result.data;
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
  // Removed duplicate getTeacherDashboardStats

  async getBatchOverview(batchId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const res = await fetch(`${BACKEND_URL}/batches/${batchId}/overview`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch batch overview');
    const json = await res.json();
    return json.data;
  },

  async getBatchStudents(batchId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const res = await fetch(`${BACKEND_URL}/batches/${batchId}/students`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch batch students');
    const json = await res.json();
    return json.data;
  },

  async getStudentDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: attempts, error } = await supabase
      .from('attempts')
      .select('id, status, violation_count, results (score, max_score)')
      .eq('student_id', user.id)
      .in('status', ['submitted', 'evaluated', 'forced_end']);
      
    if (error) {
      console.error('Failed to fetch student dashboard stats:', error);
      return { totalAttempts: 0, avgAccuracy: 0, learningPoints: 0 };
    }

    if (!attempts || attempts.length === 0) {
      return { totalAttempts: 0, avgAccuracy: 0, learningPoints: 0 };
    }

    let totalScore = 0;
    let totalMaxScore = 0;

    attempts.forEach(a => {
      if (a.results && a.results.length > 0) {
        totalScore += (a.results[0].score || 0);
        totalMaxScore += (a.results[0].max_score || 0);
      }
    });

    const avgAccuracy = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    const learningPoints = totalScore * 10; // simple formula

    return {
      totalAttempts: attempts.length,
      avgAccuracy,
      learningPoints
    };
  },

  async getBatchAssessments(batchId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const res = await fetch(`${BACKEND_URL}/batches/${batchId}/assessments`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch batch assessments');
    const json = await res.json();
    return json.data;
  },

  async getBatchNotices(batchId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const res = await fetch(`${BACKEND_URL}/batches/${batchId}/notices`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch batch notices');
    const json = await res.json();
    return json.data;
  },

  async createBatchNotice(batchId, { title, content }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const res = await fetch(`${BACKEND_URL}/batches/${batchId}/notices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create notice');
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * ─── NOTIFICATIONS ────────────────────────────────────────────────────────
   */

  async getNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Direct Supabase call � no backend hop, no cold-boot timeout
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message || 'Failed to fetch notifications');
    return data;
  },

  async markNotificationsRead(ids = []) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Direct Supabase call � no backend hop, no cold-boot timeout
    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (ids && ids.length > 0) {
      query = query.in('id', ids);
    }

    const { data, error } = await query.select();
    if (error) throw new Error(error.message || 'Failed to mark notifications read');
    return data;
  },

  // AI Usage & Analytics
  getAIUsage: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/usage`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    return response.json();
  },

  // ─── Reporting & Hardening ──────────────────────────────────────────────

  async getRestartInfo(testId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/restart-info/${testId}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error);
    return result.data;
  },

  async downloadStudentReport(testId, studentId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/reports/assessment/${testId}/pdf/student/${studentId}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (!response.ok) throw new Error('Failed to download PDF');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evalix_student_${studentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadSummaryReport(testId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/reports/assessment/${testId}/pdf/summary`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (!response.ok) throw new Error('Failed to download PDF');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evalix_summary_${testId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadCSV(testId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/reports/assessment/${testId}/export`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (!response.ok) throw new Error('Failed to download CSV');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evalix_export_${testId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async getTestAnalytics(testId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const res = await fetch(`${BACKEND_URL}/reports/assessment/${testId}/analytics`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch test analytics');
    const json = await res.json();
    return json.data;
  },

  async downloadSummaryReport(testId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/reports/assessment/${testId}/pdf/summary`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (!response.ok) throw new Error('Failed to download Summary PDF');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evalix_summary_${testId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadStudentReport(testId, studentId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    const response = await fetch(`${BACKEND_URL}/reports/assessment/${testId}/pdf/student/${studentId}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (!response.ok) throw new Error('Failed to download Student PDF');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evalix_student_report_${studentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

export const apiService = Object.fromEntries(
  Object.entries(_apiService).map(([key, fn]) => {
    if (typeof fn === 'function') {
      // Background AI generation requires much more time than normal requests
      const isLongTask = ['generateTest', 'getGenerationStatus'].includes(key);
      const timeoutMs = isLongTask ? 60000 : 15000;
      
      return [
        key,
        (...args) => withTimeout(fn(...args), timeoutMs, `API:${key}`)
      ];
    }
    return [key, fn];
  })
);
