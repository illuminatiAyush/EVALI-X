/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  AuthContext — Singleton Auth Provider                          ║
 * ║  Pattern: "Initialization Ref Guard" for React 18 Strict Mode   ║
 * ║                                                                  ║
 * ║  ARCHITECTURE:                                                   ║
 * ║  1. useRef(false) prevents double-mount from firing getSession  ║
 * ║     or creating duplicate onAuthStateChange listeners.           ║
 * ║  2. The Provider ALWAYS renders {children}. Loading state is    ║
 * ║     consumed downstream by ProtectedRoute.                      ║
 * ║  3. Role resolution is instant via JWT metadata, with a silent  ║
 * ║     background DB sync that never blocks the UI.                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, auth } from '../lib/supabase';
import { debug } from '../lib/debug';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STRICT MODE GUARD: This ref ensures initialization runs EXACTLY
  // once, even when React 18 Strict Mode double-mounts the component.
  // Without this, two onAuthStateChange listeners get created, and
  // both race to set state, causing ghost updates after unmount.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const initRef = useRef(false);

  // Background role resolver — extracted so it can be called from
  // both the initial session hydration and the listener callback.
  const resolveRole = useCallback(async (sessionUser, mounted) => {
    // STEP 1: Instant metadata fallback (never blocks UI)
    const metadataRole = sessionUser.user_metadata?.role || 'student';
    setRole(metadataRole);

    // STEP 2: Silent DB sync (upgrades role if DB disagrees with metadata)
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionUser.id)
        .single();

      if (!error && profile?.role && mounted.current) {
        setRole(profile.role);
      }
    } catch (err) {
      debug.auth.warn('Background profile sync failed (non-critical)', { error: err.message });
      // No-op: metadata fallback is already applied
    }
  }, []);

  useEffect(() => {
    // ━━━ STRICT MODE GATE ━━━
    // In development, React 18 mounts → unmounts → remounts.
    // The first mount sets initRef.current = true.
    // The cleanup sets it back to false.
    // The second mount sees false and proceeds normally.
    // In production, this fires exactly once.
    if (initRef.current) return;
    initRef.current = true;

    const mounted = { current: true }; // Object ref so async callbacks can read latest value
    let subscription = null;

    const bootstrap = async () => {
      debug.auth.info('Auth bootstrap starting (guarded)...');

      // ━━━ PHASE 1: Hydrate from existing session ━━━
      // This resolves the "reload loses state" problem. On page load,
      // Supabase checks localStorage for a persisted JWT and returns it.
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!error && session?.user && mounted.current) {
          setUser(session.user);
          await resolveRole(session.user, mounted);
        }
      } catch (err) {
        debug.auth.warn('Session hydration failed', { error: err.message });
      }

      // ━━━ ALWAYS clear loading after session check ━━━
      if (mounted.current) {
        setLoading(false);
      }

      // ━━━ PHASE 2: Subscribe to future auth events ━━━
      // This handles: login, logout, token refresh, tab focus recovery.
      // It does NOT re-fire for the initial session (we handled that above).
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted.current) return;
        debug.auth.info(`Auth Event: ${event}`);

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setRole(null);
          return;
        }

        if (session?.user) {
          setUser(session.user);

          // Only do full role resolution on meaningful events
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            await resolveRole(session.user, mounted);
          }
          // TOKEN_REFRESHED: user/role unchanged, no action needed
        }

        // Always ensure loading is cleared on any event
        if (mounted.current) setLoading(false);
      });

      subscription = data.subscription;
    };

    bootstrap();

    // ━━━ CLEANUP ━━━
    // Fires on unmount (Strict Mode first pass, or actual unmount).
    // Kills the listener and prevents state updates on dead components.
    return () => {
      mounted.current = false;
      initRef.current = false; // Allow re-init on Strict Mode remount
      if (subscription) {
        subscription.unsubscribe();
        debug.auth.info('Auth subscription cleaned up');
      }
    };
  }, [resolveRole]);

  // ━━━ ACTION HANDLERS ━━━
  // These are imperative flows triggered by user interaction (login/signup buttons).
  // They set state directly and return the result to the calling component.

  const login = async (email, password) => {
    debug.auth.info('Login attempt', { email });
    try {
      const { data, error } = await auth.signIn(email, password);

      if (error) {
        debug.auth.error('Login failed', { error: error.message, status: error.status });
        return { success: false, error: error.message };
      }

      debug.auth.info('Login successful', { userId: data.user.id });

      if (data.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            debug.db.warn('Profile fetch after login failed', { error: profileError.message });
          }

          const userRole = profile?.role || data.user.user_metadata?.role || 'student';
          debug.auth.info('Login role resolved', { role: userRole, source: profile?.role ? 'db' : 'metadata' });
          setUser(data.user);
          setRole(userRole);
          return { success: true, user: data.user, role: userRole };
        } catch (err) {
          const userRole = data.user.user_metadata?.role || 'student';
          debug.auth.warn('Profile fetch threw — using fallback', { role: userRole });
          setUser(data.user);
          setRole(userRole);
          return { success: true, user: data.user, role: userRole };
        }
      }

      return { success: true, user: data.user };
    } catch (err) {
      debug.auth.error('Login threw unexpected error', { error: err.message });
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const signup = async (email, password, userRole = 'student') => {
    debug.auth.info('Signup attempt', { email, role: userRole });
    try {
      const { data, error } = await auth.signUp(email, password, { data: { role: userRole } });

      if (error) {
        debug.auth.error('Signup failed', { error: error.message, status: error.status });
        return { success: false, error: error.message };
      }

      debug.auth.info('Signup successful', { userId: data.user?.id, emailConfirmation: !data.session });

      if (data.user) {
        // Try to create the profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            name: email.split('@')[0],
            role: userRole,
          });

        if (profileError) {
          debug.db.error('Profile creation failed!', {
            error: profileError.message,
            code: profileError.code,
            fix: 'RUN SQL: CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);'
          });
          // Rollback: sign out the user if their profile couldn't be created
          await auth.signOut();
          return { success: false, error: 'Database policy missing: Please run the INSERT SQL policy in Supabase to allow profile creation.' };
        } else {
          debug.db.info('Profile created successfully', { role: userRole });
        }

        // Update local state immediately
        setUser(data.user);
        setRole(userRole);
      }

      return { success: true, user: data.user, role: userRole };
    } catch (err) {
      debug.auth.error('Signup threw unexpected error', { error: err.message, stack: err.stack });
      return { success: false, error: err.message || 'Signup failed' };
    }
  };

  const logout = async () => {
    debug.auth.info('Logging out...');
    try {
      await auth.signOut();
      debug.auth.info('Logout successful');
    } catch (err) {
      debug.auth.warn('Logout error (non-critical)', { error: err.message });
    }

    // ── 1. NUKE ALL COOKIES ──
    try {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        // Expire cookie instantly across all path levels
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname.split('.').slice(-2).join('.')};`;
      }
      debug.auth.info('All cookies purged successfully.');
    } catch (cookieErr) {
      debug.auth.warn('Failed to clear cookies', { error: cookieErr.message });
    }

    // ── 2. NUKE LOCAL & SESSION STORAGES ──
    try {
      localStorage.clear();
      sessionStorage.clear();
      debug.auth.info('Session and local storages cleared.');
    } catch (storageErr) {
      debug.auth.warn('Failed to clear local storage', { error: storageErr.message });
    }

    setUser(null);
    setRole(null);
    window.location.href = '/';
  };

  // ━━━ PROVIDER ━━━
  // ALWAYS renders children. Never conditionally hides them.
  // Loading state is consumed by ProtectedRoute downstream.
  return (
    <AuthContext.Provider value={{ user, role, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
