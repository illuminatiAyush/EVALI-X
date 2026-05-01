import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase credentials missing!');
}

// Ensure singleton pattern during Vite HMR to prevent overlapping lock requests
export const supabase = globalThis.__SUPABASE_CLIENT__ || createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'evalix-auth-token', // 🚨 Custom key forces a clean cache boundary
    storage: window.localStorage,
  },
});

if (import.meta.env.DEV) {
  globalThis.__SUPABASE_CLIENT__ = supabase;
}

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
  signIn: (email, password) => {
    // Wrap the entire flow in a timeout so we NEVER hang forever
    const loginFlow = async () => {
      // Clear stale/corrupted session to prevent silent refresh hangs
      try { await supabase.auth.signOut(); } catch (_) {}
      return supabase.auth.signInWithPassword({ email, password });
    };
    
    return withTimeout(loginFlow(), "Login timed out. Please check your internet connection.");
  },
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