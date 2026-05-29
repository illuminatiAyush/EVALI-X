-- 005_production_hardening.sql
-- Production Hardening V2: Pagination, Rate Limiting, Expiry, Audit

-- ═══════════════════════════════════════════════════════════════
-- PHASE 1: PAGINATION — Index for teacher batch listing
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_batches_created_by ON public.batches(created_by);

-- ═══════════════════════════════════════════════════════════════
-- PHASE 2: RATE LIMITING — Track attempts per user per action
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INT DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits(identifier, action, window_start);

-- RLS: Only service role should access this table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — accessed exclusively via service role key

-- ═══════════════════════════════════════════════════════════════
-- PHASE 4: JOIN CODE EXPIRY — Control enrollment window
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.batches
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- ═══════════════════════════════════════════════════════════════
-- PHASE 5: AUDIT LOG — Track important batch system events
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.batch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_events_type ON public.batch_events(type);
CREATE INDEX IF NOT EXISTS idx_batch_events_actor ON public.batch_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_batch_events_created ON public.batch_events(created_at DESC);

-- RLS: Teachers can read events for their own actions
ALTER TABLE public.batch_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own events" ON public.batch_events;
CREATE POLICY "Users view own events" ON public.batch_events FOR SELECT
USING (actor_id = auth.uid());

-- Service role inserts events (no INSERT policy for regular users)

-- ═══════════════════════════════════════════════════════════════
-- PHASE 6: TEST VISIBILITY — Global access for non-batch tests
-- ═══════════════════════════════════════════════════════════════
-- Replace the existing student test visibility policy to support
-- both batch-restricted AND global (non-batch) tests.
DROP POLICY IF EXISTS "Students can view assigned active tests" ON public.tests;
CREATE POLICY "Students can view assigned active tests" ON public.tests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student'
  )
  AND status IN ('scheduled', 'active')
  AND (
    -- Batch-restricted: student must be in an assigned batch
    id IN (
      SELECT tb.test_id FROM public.test_batches tb
      JOIN public.student_batches sb ON tb.batch_id = sb.batch_id
      WHERE sb.student_id = auth.uid()
    )
    -- Global: test has no batch assignments → visible to all students
    OR NOT EXISTS (
      SELECT 1 FROM public.test_batches WHERE test_id = public.tests.id
    )
  )
);
