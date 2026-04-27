import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ⚠️ VALIDATE CREDENTIALS ON STARTUP
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase credentials missing!');
  console.error('📋 Required environment variables:');
  console.error('   - VITE_SUPABASE_URL (your Supabase project URL)');
  console.error('   - VITE_SUPABASE_ANON_KEY (your Supabase anonymous key)');
  console.error('📖 Instructions:');
  console.error('   1. Copy .env.local.example to .env.local');
  console.error('   2. Visit https://supabase.com and create a project');
  console.error('   3. Get your Project URL and Anonymous Key from Project Settings');
  console.error('   4. Paste them into .env.local');
  console.error('   5. Restart the dev server (npm run dev)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Wrapper function with timeout to prevent hanging
 */
export const createAuthClient = () => {
  return {
    signInWithPassword: async (email, password) => {
      return Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Auth request timeout (>10s). Check Supabase credentials.')),
            10000 // 10 second timeout
          )
        ),
      ]);
    },
    signUp: async (email, password, options) => {
      return Promise.race([
        supabase.auth.signUp({ email, password, options }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Auth request timeout (>10s). Check Supabase credentials.')),
            10000 // 10 second timeout
          )
        ),
      ]);
    },
  };
};
