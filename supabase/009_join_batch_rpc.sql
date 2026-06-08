-- 009_join_batch_rpc.sql
-- Create a secure RPC function for joining batches by code

CREATE OR REPLACE FUNCTION public.join_batch_by_code(p_join_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial: Executes with creator privileges, bypassing RLS to lookup the batch
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_batch_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_is_member BOOLEAN;
BEGIN
  -- 1. Get the calling user's ID securely from Supabase Auth context
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- 2. Lookup batch by join_code
  SELECT id, expires_at INTO v_batch_id, v_expires_at
  FROM public.batches
  WHERE upper(join_code) = upper(p_join_code);

  -- 3. Validate batch exists
  IF v_batch_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid join code or class not found');
  END IF;

  -- 4. Validate not expired
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'This join code has expired');
  END IF;

  -- 5. Validate user not already joined
  SELECT EXISTS (
    SELECT 1 FROM public.student_batches
    WHERE batch_id = v_batch_id AND student_id = v_user_id
  ) INTO v_is_member;

  IF v_is_member THEN
    RETURN json_build_object('success', false, 'error', 'You are already in this class');
  END IF;

  -- 6. Insert into student_batches
  INSERT INTO public.student_batches (student_id, batch_id)
  VALUES (v_user_id, v_batch_id);

  -- Return successful response
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    -- Return any underlying SQL errors gracefully
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
