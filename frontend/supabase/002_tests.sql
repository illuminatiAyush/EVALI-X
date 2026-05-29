-- Evalix AI: Tests Table Migration
-- Run this in your Supabase SQL editor AFTER 001_profiles.sql

CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  question_types TEXT[] DEFAULT ARRAY['mcq'],
  num_questions INTEGER DEFAULT 10,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_tests_user_id ON public.tests(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON public.tests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- Teachers can read their own tests
CREATE POLICY "Users can read own tests"
  ON public.tests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Teachers can insert their own tests
CREATE POLICY "Users can insert own tests"
  ON public.tests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Teachers can delete their own tests
CREATE POLICY "Users can delete own tests"
  ON public.tests
  FOR DELETE
  USING (auth.uid() = user_id);
