-- Evalix AI: Production Hardened Schema (Supabase)
-- Apply this schema to upgrade Evalix to a fully persistent, secure, and production-ready backend.

-- 1. FIX PROFILES (Auth Integration)
-- This ensures profiles are tightly coupled with Supabase Auth
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ADD BATCH SYSTEM (Access Control)
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.student_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  UNIQUE(student_id, batch_id)
);

CREATE TABLE public.test_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL, -- Will reference tests below
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  UNIQUE(test_id, batch_id)
);

-- 3. UPGRADE TESTS TABLE
DROP TABLE IF EXISTS public.tests CASCADE;
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prompt TEXT,
  source_document JSONB,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  duration_minutes INTEGER DEFAULT 30,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'active', 'ended')) DEFAULT 'draft',
  total_questions INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key now that tests table exists
ALTER TABLE public.test_batches 
  ADD CONSTRAINT fk_test_batches_test FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;

-- 4. ADD QUESTIONS TABLE
DROP TABLE IF EXISTS public.questions CASCADE;
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'short', 'long')) DEFAULT 'mcq',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraint for MCQ to have 4 options exactly (or at least 2)
ALTER TABLE public.questions 
  ADD CONSTRAINT chk_mcq_options CHECK (
    type != 'mcq' OR jsonb_array_length(options) >= 2
  );

-- 5. ATTEMPTS TABLE
DROP TABLE IF EXISTS public.attempts CASCADE;
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'submitted', 'forced_end')) DEFAULT 'in_progress',
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, test_id)
);

-- 6. RESULTS TABLE
DROP TABLE IF EXISTS public.results CASCADE;
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  marks NUMERIC NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_feedback JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attempt_id)
);

-- 7. ENABLE ROW LEVEL SECURITY (MANDATORY)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Tests (Teacher sees own, Student sees assigned active tests)
CREATE POLICY "Teachers can manage own tests" ON public.tests 
  USING (created_by = auth.uid());
  
CREATE POLICY "Students can view assigned active tests" ON public.tests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student'
    )
    AND status IN ('scheduled', 'active')
    AND id IN (
      SELECT tb.test_id FROM public.test_batches tb
      JOIN public.student_batches sb ON tb.batch_id = sb.batch_id
      WHERE sb.student_id = auth.uid()
    )
  );

-- Questions (Teacher sees own test questions, student sees questions of active tests)
CREATE POLICY "Teachers manage questions of own tests" ON public.questions 
  USING (test_id IN (SELECT id FROM public.tests WHERE created_by = auth.uid()));

CREATE POLICY "Students see questions of accessible tests" ON public.questions FOR SELECT
  USING (
    test_id IN (
      SELECT id FROM public.tests WHERE status = 'active'
    )
  );

-- Attempts
CREATE POLICY "Students manage own attempts" ON public.attempts
  USING (student_id = auth.uid());

CREATE POLICY "Teachers view attempts for own tests" ON public.attempts FOR SELECT
  USING (test_id IN (SELECT id FROM public.tests WHERE created_by = auth.uid()));

-- Results
CREATE POLICY "Students view own results" ON public.results FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers view results for own tests" ON public.results FOR SELECT
  USING (test_id IN (SELECT id FROM public.tests WHERE created_by = auth.uid()));

-- Batches
CREATE POLICY "Teachers manage own batches" ON public.batches
  USING (created_by = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_tests_modtime BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_attempts_modtime BEFORE UPDATE ON public.attempts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
