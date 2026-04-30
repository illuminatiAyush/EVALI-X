import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase credentials missing!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Enhanced Auth Wrapper with timeouts
 */
const AUTH_TIMEOUT = 30000; // 30 seconds — generous for slow networks

export const withTimeout = (promise, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT)
    )
  ]);

export const auth = {
  signIn: (email, password) =>
    withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      "Login timed out. Please check your internet connection."
    ),
  signUp: (email, password, options) =>
    withTimeout(
      supabase.auth.signUp({ email, password, options }),
      "Sign up timed out. Please try again."
    ),
  signOut: () =>
    withTimeout(
      supabase.auth.signOut(),
      "Logout timed out."
    )
};