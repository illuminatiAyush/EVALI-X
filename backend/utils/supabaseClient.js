/**
 * Supabase Client — Backend (Service Role)
 * 
 * Uses the SERVICE_ROLE_KEY for privileged database access.
 * This bypasses RLS — the backend is responsible for authorization.
 * 
 * Also exports a function to create a user-scoped client from a JWT,
 * which respects RLS policies.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Admin client — bypasses RLS. Use for server-side operations.
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Creates a user-scoped Supabase client from a JWT token.
 * This client RESPECTS RLS policies — use for user-facing queries.
 */
function createUserClient(accessToken) {
  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Extracts and validates a user from a JWT token.
 * Returns { user, error }.
 */
async function getUserFromToken(token) {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return { user: null, error: error?.message || 'Invalid token' };
    }
    return { user, error: null };
  } catch (err) {
    return { user: null, error: err.message };
  }
}

module.exports = { supabaseAdmin, createUserClient, getUserFromToken };
