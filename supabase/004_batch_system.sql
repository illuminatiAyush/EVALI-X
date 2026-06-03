-- 004_batch_system.sql
-- Add Join Code to Batches
ALTER TABLE public.batches
ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE NOT NULL;

-- Add joined_at timestamp for audit trail
ALTER TABLE public.student_batches
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_batches_join_code ON public.batches(join_code);
CREATE INDEX IF NOT EXISTS idx_student_batches_student ON public.student_batches(student_id);
CREATE INDEX IF NOT EXISTS idx_test_batches_test ON public.test_batches(test_id);

-- RLS Updates for student_batches
DROP POLICY IF EXISTS "Students can join batch" ON public.student_batches;
CREATE POLICY "Students can join batch" ON public.student_batches FOR INSERT 
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can view own batches" ON public.student_batches;
CREATE POLICY "Students can view own batches" ON public.student_batches FOR SELECT 
USING (student_id = auth.uid());

-- RLS Updates for batches
DROP POLICY IF EXISTS "Teachers manage own batches" ON public.batches;
CREATE POLICY "Teachers manage own batches" ON public.batches
USING (created_by = auth.uid());

-- Students should be able to view batches they are part of
DROP POLICY IF EXISTS "Students view joined batches" ON public.batches;
CREATE POLICY "Students view joined batches" ON public.batches FOR SELECT
USING (id IN (SELECT batch_id FROM public.student_batches WHERE student_id = auth.uid()));

-- RLS for test_batches (CRITICAL: was missing — blocks assign-test-to-batch)
DROP POLICY IF EXISTS "Teachers manage test batch assignments" ON public.test_batches;
CREATE POLICY "Teachers manage test batch assignments" ON public.test_batches
USING (
  test_id IN (SELECT id FROM public.tests WHERE created_by = auth.uid())
);

DROP POLICY IF EXISTS "Students view test batch links" ON public.test_batches;
CREATE POLICY "Students view test batch links" ON public.test_batches FOR SELECT
USING (
  batch_id IN (SELECT batch_id FROM public.student_batches WHERE student_id = auth.uid())
);
