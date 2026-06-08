-- ==============================================================================
-- EVALIX PHASE 2: PRODUCT HARDENING & OBSERVABILITY LAYER
-- Adds notifications, real-time command center metrics, and aggregated analytics
-- ==============================================================================

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'submission', 'violation', 'system', 'batch_join'
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 2. Teacher Dashboard Stats RPC
-- Returns global metrics for the teacher Command Center
CREATE OR REPLACE FUNCTION public.get_teacher_dashboard_stats(p_teacher_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_assessments INT;
  v_total_students INT;
  v_pending_submissions INT;
  v_recent_violations INT;
BEGIN
  -- Active Assessments
  SELECT count(*) INTO v_active_assessments 
  FROM public.tests 
  WHERE created_by = p_teacher_id AND status = 'active';

  -- Total Enrolled Students across all their batches
  SELECT count(DISTINCT sb.student_id) INTO v_total_students
  FROM public.student_batches sb
  JOIN public.batches b ON b.id = sb.batch_id
  WHERE b.created_by = p_teacher_id;

  -- Pending Submissions (In progress attempts)
  SELECT count(*) INTO v_pending_submissions
  FROM public.attempts a
  JOIN public.tests t ON t.id = a.test_id
  WHERE t.created_by = p_teacher_id AND a.status = 'in_progress';

  -- Recent Violations (last 24 hours)
  SELECT COALESCE(sum(violation_count), 0) INTO v_recent_violations
  FROM public.attempts a
  JOIN public.tests t ON t.id = a.test_id
  WHERE t.created_by = p_teacher_id AND a.updated_at > now() - interval '24 hours';

  RETURN json_build_object(
    'activeAssessments', v_active_assessments,
    'totalStudents', v_total_students,
    'pendingSubmissions', v_pending_submissions,
    'recentViolations', v_recent_violations
  );
END;
$$;

-- 3. Batch Overview RPC
-- Returns aggregated metrics for a specific batch
CREATE OR REPLACE FUNCTION public.get_batch_overview(p_batch_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_count INT;
  v_assessment_count INT;
  v_active_assessments INT;
  v_avg_score NUMERIC;
  v_total_violations INT;
  v_total_submissions INT;
  v_total_expected_submissions INT;
BEGIN
  SELECT count(*) INTO v_student_count FROM public.student_batches WHERE batch_id = p_batch_id;
  
  SELECT count(*), count(CASE WHEN t.status = 'active' THEN 1 END) 
  INTO v_assessment_count, v_active_assessments
  FROM public.test_batches tb
  JOIN public.tests t ON t.id = tb.test_id
  WHERE tb.batch_id = p_batch_id;

  -- Calculate average score percentage and total violations
  SELECT 
    ROUND(AVG(CASE WHEN t.total_questions > 0 THEN (COALESCE(r.marks, 0)::numeric / t.total_questions) * 100 ELSE 0 END), 2), 
    COALESCE(SUM(a.violation_count), 0),
    count(*) 
  INTO v_avg_score, v_total_violations, v_total_submissions
  FROM public.attempts a
  JOIN public.test_batches tb ON tb.test_id = a.test_id
  JOIN public.tests t ON t.id = a.test_id
  LEFT JOIN public.results r ON r.attempt_id = a.id
  WHERE tb.batch_id = p_batch_id AND a.status IN ('submitted', 'evaluated', 'forced_end');

  v_total_expected_submissions := v_student_count * v_assessment_count;

  RETURN json_build_object(
    'studentCount', v_student_count,
    'assessmentCount', v_assessment_count,
    'activeAssessments', v_active_assessments,
    'averageScore', COALESCE(v_avg_score, 0),
    'totalViolations', COALESCE(v_total_violations, 0),
    'submissionRate', CASE WHEN v_total_expected_submissions > 0 THEN ROUND((v_total_submissions::numeric / v_total_expected_submissions) * 100, 2) ELSE 0 END
  );
END;
$$;

-- 4. Batch Students Stats RPC
-- Returns a list of students with their individual aggregated performance within a batch
CREATE OR REPLACE FUNCTION public.get_batch_students_stats(p_batch_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'email', p.email,
      'joined_at', sb.joined_at,
      'assessments_attempted', COALESCE(stats.attempt_count, 0),
      'average_score', COALESCE(stats.avg_score, 0),
      'violation_count', COALESCE(stats.total_violations, 0)
    )
  ) INTO v_result
  FROM public.student_batches sb
  JOIN public.profiles p ON p.id = sb.student_id
  LEFT JOIN (
    SELECT 
      a.student_id, 
      count(*) as attempt_count, 
      ROUND(AVG(CASE WHEN t.total_questions > 0 THEN (COALESCE(r.marks, 0)::numeric / t.total_questions) * 100 ELSE 0 END), 2) as avg_score,
      SUM(COALESCE(a.violation_count, 0)) as total_violations
    FROM public.attempts a
    JOIN public.test_batches tb ON tb.test_id = a.test_id
    JOIN public.tests t ON t.id = a.test_id
    LEFT JOIN public.results r ON r.attempt_id = a.id
    WHERE tb.batch_id = p_batch_id AND a.status IN ('submitted', 'evaluated', 'forced_end')
    GROUP BY a.student_id
  ) stats ON stats.student_id = sb.student_id
  WHERE sb.batch_id = p_batch_id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 5. Trigger: Auto-Notification on Submission
CREATE OR REPLACE FUNCTION public.notify_teacher_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_test_title TEXT;
  v_student_name TEXT;
BEGIN
  -- Only trigger on new submissions or state changes to submitted
  IF NEW.status IN ('submitted', 'evaluated') AND (OLD.status = 'in_progress' OR OLD.status IS NULL) THEN
    -- Get test details
    SELECT created_by, title INTO v_teacher_id, v_test_title FROM public.tests WHERE id = NEW.test_id;
    -- Get student details
    SELECT name INTO v_student_name FROM public.profiles WHERE id = NEW.student_id;
    
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      v_teacher_id, 
      'New Submission', 
      v_student_name || ' has submitted ' || v_test_title, 
      'submission', 
      json_build_object('test_id', NEW.test_id, 'student_id', NEW.student_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_teacher_submission ON public.attempts;
CREATE TRIGGER trigger_notify_teacher_submission
AFTER UPDATE OR INSERT ON public.attempts
FOR EACH ROW
EXECUTE FUNCTION public.notify_teacher_on_submission();

-- 6. Trigger: Auto-Notification on Severe Violation (Optional, e.g. >= 3)
CREATE OR REPLACE FUNCTION public.notify_teacher_on_violation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_test_title TEXT;
  v_student_name TEXT;
BEGIN
  IF NEW.violation_count >= 3 AND OLD.violation_count < 3 THEN
    SELECT created_by, title INTO v_teacher_id, v_test_title FROM public.tests WHERE id = NEW.test_id;
    SELECT name INTO v_student_name FROM public.profiles WHERE id = NEW.student_id;
    
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      v_teacher_id, 
      'High Violations Alert', 
      v_student_name || ' has reached ' || NEW.violation_count || ' violations in ' || v_test_title, 
      'violation', 
      json_build_object('test_id', NEW.test_id, 'student_id', NEW.student_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_teacher_violation ON public.attempts;
CREATE TRIGGER trigger_notify_teacher_violation
AFTER UPDATE ON public.attempts
FOR EACH ROW
EXECUTE FUNCTION public.notify_teacher_on_violation();
