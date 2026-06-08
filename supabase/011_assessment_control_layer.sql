-- ============================================================================
-- 011_assessment_control_layer.sql
-- Assessment Control Layer Refactor
-- Run this in Supabase SQL Editor BEFORE testing the new control layer.
-- ============================================================================

-- ─── RPC: Update Assessment State (SECURITY DEFINER) ────────────────────────
-- Implements an atomic state machine for assessment lifecycle.
-- Guarantees atomicity of state transitions (Start, End, Restart) 
-- and auto-submits active attempts when terminating.
CREATE OR REPLACE FUNCTION public.update_assessment_state(
  p_test_id UUID,
  p_action TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_current_version INTEGER;
  v_duration INTEGER;
  v_target_status TEXT;
  v_new_version INTEGER;
  v_end_time TIMESTAMPTZ;
  v_start_time TIMESTAMPTZ;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- 1. Lock the test row for atomic update (prevents race conditions)
  SELECT status, test_version, duration_minutes 
  INTO v_current_status, v_current_version, v_duration
  FROM public.tests
  WHERE id = p_test_id AND created_by = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Test not found or unauthorized');
  END IF;

  -- 2. Validate strict state transitions
  IF p_action = 'publish' THEN
    v_target_status := 'scheduled';
    IF v_current_status != 'draft' THEN
      RETURN json_build_object('success', false, 'error', 'Can only publish drafts');
    END IF;
  ELSIF p_action = 'start' THEN
    v_target_status := 'active';
    IF v_current_status != 'scheduled' THEN
      RETURN json_build_object('success', false, 'error', 'Can only start scheduled assessments');
    END IF;
  ELSIF p_action = 'end' OR p_action = 'terminate' THEN
    v_target_status := 'ended';
    IF v_current_status != 'active' THEN
      RETURN json_build_object('success', false, 'error', 'Can only terminate active assessments');
    END IF;
  ELSIF p_action = 'restart' THEN
    v_target_status := 'active';
    IF v_current_status != 'ended' THEN
      RETURN json_build_object('success', false, 'error', 'Can only restart ended assessments');
    END IF;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;

  -- 3. Execute transactional updates
  IF v_target_status = 'scheduled' THEN
    UPDATE public.tests
    SET status = 'scheduled'
    WHERE id = p_test_id;

  ELSIF v_target_status = 'active' THEN
    v_start_time := now();
    
    IF p_action = 'restart' THEN
      -- Versioned restart
      v_new_version := v_current_version + 1;
      v_end_time := v_start_time + (v_duration * interval '1 minute');
      UPDATE public.tests
      SET status = 'active', start_time = v_start_time, end_time = v_end_time, test_version = v_new_version
      WHERE id = p_test_id;
      v_current_version := v_new_version;
    ELSE
      UPDATE public.tests
      SET status = 'active', start_time = v_start_time
      WHERE id = p_test_id;
    END IF;

  ELSIF v_target_status = 'ended' THEN
    v_end_time := now();
    UPDATE public.tests
    SET status = 'ended', end_time = v_end_time
    WHERE id = p_test_id;

    -- Force-submit active attempts automatically
    UPDATE public.attempts
    SET status = 'submitted', completed_at = v_end_time
    WHERE test_id = p_test_id AND test_version = v_current_version AND status = 'in_progress';
  END IF;

  -- Return successfully committed state
  RETURN json_build_object(
    'success', true, 
    'status', v_target_status, 
    'test_version', v_current_version,
    'previous_status', v_current_status
  );
END;
$$;
