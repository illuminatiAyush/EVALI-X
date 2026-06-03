-- Evalix AI: Profiles Table Migration
-- Run this in your Supabase SQL editor or as a migration

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')) DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);
