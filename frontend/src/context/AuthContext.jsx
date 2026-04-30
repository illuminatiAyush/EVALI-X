import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, auth } from '../lib/supabase';
import { debug } from '../lib/debug';
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const roleOverrideRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    // Detect corrupted state
    if (window.location.pathname.includes('/null/')) {
      window.location.href = '/login';
      return;
    }

    debug.auth.info('Subscribing to auth state...');

    let timeoutId;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      debug.auth.info(`Auth event: ${event}`);

      if (event === 'SIGNED_IN' && roleOverrideRef.current) {
        debug.auth.info('Using role override from signup');
        setUser(session?.user || null);
        setRole(roleOverrideRef.current);
        roleOverrideRef.current = null;
        if (timeoutId) clearTimeout(timeoutId);
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          // DETACH the async fetch so we don't hold the gotrue-js lock!
          (async () => {
            try {
              debug.auth.info('Fetching profile for session...');

              const controller = new AbortController();
              const fetchTimeout = setTimeout(() => controller.abort(), 1500);

              const { data: profile, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .abortSignal(controller.signal)
                .single();

              clearTimeout(fetchTimeout);

              if (error) debug.db.warn('Profile fetch failed', { error: error.message });

              if (mounted) {
                setRole(profile?.role || session.user.user_metadata?.role || 'student');
              }
            } catch (err) {
              debug.auth.warn('Profile fetch threw or timed out', { error: err.message });
              if (mounted) setRole(session.user.user_metadata?.role || 'student');
            } finally {
              if (timeoutId) clearTimeout(timeoutId);
              if (mounted) setLoading(false);
            }
          })();
        } else {
          // Token refresh or other events
          if (timeoutId) clearTimeout(timeoutId);
          if (mounted) setLoading(false);
        }
      } else {
        setUser(null);
        setRole(null);
        if (timeoutId) clearTimeout(timeoutId);
        if (mounted) setLoading(false);
      }
    });

    // Extremely rare fallback: if Supabase fails to fire INITIAL_SESSION or hangs forever
    timeoutId = setTimeout(() => {
      if (mounted) {
        debug.auth.warn('Auth flow timed out. Forcing load completion.');

        // If user exists but role is somehow null due to a hang, use metadata fallback
        setUser((prevUser) => {
          if (prevUser) {
            setRole(prevUser.user_metadata?.role || 'student');
          }
          return prevUser;
        });

        setLoading(false);
      }
    }, 2500);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    debug.auth.info('Login attempt', { email });
    try {
      const { data, error } = await auth.signIn(email, password);

      if (error) {
        debug.auth.error('Login failed', { error: error.message, status: error.status });
        return { success: false, error: error.message };
      }

      debug.auth.info('Login successful', { userId: data.user.id });

      // Immediately fetch profile role for the redirect
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
      // Set override BEFORE signUp because auto-confirm fires SIGNED_IN event immediately
      // before the signUp promise even resolves!
      roleOverrideRef.current = userRole;

      const { data, error } = await auth.signUp(email, password, { data: { role: userRole } });

      if (error) {
        roleOverrideRef.current = null; // Clear on failure
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
      roleOverrideRef.current = null;
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
    setUser(null);
    setRole(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
