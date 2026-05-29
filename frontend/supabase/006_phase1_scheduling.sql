-- ==============================================================================
-- REQUIREMENT 1: SUPABASE SQL SCHEMA & REQUIREMENT 3: COMPUTED VIEW
-- ==============================================================================

-- 1. Batches Table
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Student Batches Mapping
CREATE TABLE IF NOT EXISTS public.student_batches (
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (student_id, batch_id)
);

-- 3. Assessments Table
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Scheduled Assessment',
    scheduled_for TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Test Attempts Table
CREATE TABLE IF NOT EXISTS public.test_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    tab_switches INTEGER DEFAULT 0,
    answers JSONB DEFAULT '{}',
    UNIQUE (assessment_id, student_id)
);

-- Indices for fast querying on heavily joined columns
CREATE INDEX IF NOT EXISTS idx_student_batches_student ON public.student_batches(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_batch ON public.assessments(batch_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student ON public.test_attempts(student_id);

-- 5. Link Questions table to new Assessments
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE;

-- REQUIREMENT 3: "Student Fetch" Computed Status View
-- This offloads the time-comparison logic to the database layer for maximum efficiency.
CREATE OR REPLACE VIEW public.student_assessments_view AS
SELECT 
    a.id AS assessment_id,
    a.title,
    a.duration_minutes,
    a.scheduled_for,
    a.expires_at,
    sb.student_id,
    a.batch_id,
    ta.id AS attempt_id,
    ta.started_at,
    ta.submitted_at,
    ta.tab_switches,
    -- Time-comparison logic for computed status:
    -- 1. If an attempt is submitted, it's COMPLETED.
    -- 2. If current time (NOW()) is strictly before scheduled_for, it's LOCKED.
    -- 3. If current time falls within scheduled_for and expires_at, it is ACTIVE.
    -- 4. If current time has passed expires_at and no attempt was ever created, it is MISSED.
    CASE 
        WHEN ta.submitted_at IS NOT NULL THEN 'COMPLETED'
        WHEN ta.started_at IS NOT NULL AND ta.submitted_at IS NULL THEN 'IN_PROGRESS'
        WHEN NOW() < a.scheduled_for THEN 'LOCKED'
        WHEN NOW() >= a.scheduled_for AND NOW() <= a.expires_at THEN 'ACTIVE'
        WHEN NOW() > a.expires_at AND ta.id IS NULL THEN 'MISSED'
        ELSE 'UNKNOWN'
    END AS computed_status
FROM public.assessments a
JOIN public.student_batches sb ON a.batch_id = sb.batch_id
LEFT JOIN public.test_attempts ta ON ta.assessment_id = a.id AND ta.student_id = sb.student_id;
