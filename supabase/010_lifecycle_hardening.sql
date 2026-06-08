-- ============================================================================
-- 010_lifecycle_hardening.sql
-- Assessment Lifecycle Hardening Migration
-- Run this in Supabase SQL Editor BEFORE deploying backend/frontend changes.
-- ============================================================================

-- ─── TESTS TABLE: Versioned Assessments ─────────────────────────────────────
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS test_version INTEGER DEFAULT 1;

-- ─── ATTEMPTS TABLE: Lifecycle Columns ──────────────────────────────────────

-- Violation tracking (replaces answers._violations hack)
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS violation_count INTEGER DEFAULT 0;
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS violations JSONB DEFAULT '[]'::jsonb;

-- Accurate duration tracking
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Link attempt to assessment version
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS test_version INTEGER DEFAULT 1;

-- Update status CHECK to support 4-stage submission pipeline
ALTER TABLE public.attempts DROP CONSTRAINT IF EXISTS attempts_status_check;
ALTER TABLE public.attempts ADD CONSTRAINT attempts_status_check
  CHECK (status IN ('in_progress', 'submitted', 'processing', 'evaluated', 'forced_end'));

-- Replace old unique constraint with versioned one
-- This allows the same student to attempt a new version after restart
ALTER TABLE public.attempts DROP CONSTRAINT IF EXISTS attempts_student_id_test_id_key;
ALTER TABLE public.attempts ADD CONSTRAINT attempts_student_id_test_id_version_key
  UNIQUE (student_id, test_id, test_version);

-- ─── INDEXES FOR QUERY PERFORMANCE ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attempts_test_status ON public.attempts(test_id, status);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON public.attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_version ON public.attempts(test_id, test_version);
CREATE INDEX IF NOT EXISTS idx_results_test ON public.results(test_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON public.results(student_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON public.tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON public.tests(created_at);

-- ─── RPC: Record Violation (SECURITY DEFINER) ──────────────────────────────
-- High-frequency function called on every anti-cheat event during a test.
-- Bypasses RLS for performance. Validates ownership internally.
CREATE OR REPLACE FUNCTION public.record_violation(
  p_attempt_id UUID,
  p_violation_type TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
  v_severity TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Determine severity based on violation type
  IF p_violation_type IN ('devtools_attempt') THEN
    v_severity := 'HIGH';
  ELSIF p_violation_type IN ('fullscreen_exit', 'copy_attempt', 'paste_attempt', 'print_attempt') THEN
    v_severity := 'MEDIUM';
  ELSE
    v_severity := 'LOW';
  END IF;

  -- Atomically increment count and append violation entry
  UPDATE public.attempts
  SET
    violation_count = violation_count + 1,
    violations = violations || jsonb_build_array(jsonb_build_object(
      'type', p_violation_type,
      'severity', v_severity,
      'timestamp', now()
    ))
  WHERE id = p_attempt_id
    AND student_id = v_user_id
    AND status = 'in_progress'
  RETURNING violation_count INTO v_count;

  IF v_count IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Attempt not found or already submitted');
  END IF;

  -- Auto-escalate repeated tab switches to HIGH
  IF p_violation_type = 'tab_switch' AND v_count >= 3 THEN
    v_severity := 'HIGH';
  END IF;

  RETURN json_build_object('success', true, 'violation_count', v_count, 'severity', v_severity);
END;
$$;
