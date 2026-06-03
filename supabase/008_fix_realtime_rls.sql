-- ═══════════════════════════════════════════════════════════════════
-- 008: Realtime RLS & Publication Fixes
-- Run this in your Supabase SQL editor to ensure Realtime works.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Ensure `tests` is in the realtime publication (often missed)
BEGIN;
  -- Add table to publication safely
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'tests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE tests;
    END IF;
  END
  $$;
COMMIT;

-- Ensure replica identity is full
ALTER TABLE public.tests REPLICA IDENTITY FULL;

-- 2. FIX STUDENT RLS FOR REALTIME TERMINATION
-- When a test status changes to 'ended', it previously failed the student's
-- SELECT policy, causing Supabase to SILENTLY drop the realtime broadcast!
-- We must allow students to SELECT ended tests assigned to them.

DROP POLICY IF EXISTS "Students can view assigned active tests" ON public.tests;

CREATE POLICY "Students can view assigned active tests" ON public.tests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student'
    )
    AND status IN ('scheduled', 'active', 'ended') -- <-- ADDED 'ended' HERE
    AND id IN (
      SELECT tb.test_id FROM public.test_batches tb
      JOIN public.student_batches sb ON tb.batch_id = sb.batch_id
      WHERE sb.student_id = auth.uid()
    )
  );

-- Done.
