# 🚨 CRITICAL FIX: Missing Supabase Credentials

## Problem
The Evalix frontend cannot authenticate users because **Supabase credentials are missing**.

The auth flow was hanging because:
- `VITE_SUPABASE_URL` was empty
- `VITE_SUPABASE_ANON_KEY` was empty
- All API calls hung indefinitely with no error

## Solution: 3 Steps

### Step 1: Get Supabase Credentials
1. Go to https://supabase.com and sign in
2. Click **"New Project"** (or select existing project)
3. Go to **Project Settings** → **API**
4. Copy the following values:
   - **Project URL** (looks like `https://xyzabc.supabase.co`)
   - **Anonymous Key** (long string starting with `eyJ...`)

### Step 2: Configure .env.local
1. Open `evalix/frontend/.env.local`
2. Replace these values:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Paste your actual values from Step 1
4. Save the file

### Step 3: Restart Dev Server
```bash
cd evalix/frontend
npm run dev
```

Press `Ctrl+C` to stop the server, then run `npm run dev` again.

---

## What Changed in the Code

### 1. `src/lib/supabase.js`
- ✅ Added validation to check if credentials are present
- ✅ Added helpful error messages to console
- ✅ Added timeout wrapper (10s) to prevent hanging

### 2. `src/context/AuthContext.jsx`
- ✅ Checks if Supabase is configured on app load
- ✅ Shows configuration error dialog if missing
- ✅ Login/signup check configuration before calling API
- ✅ Increased timeout from 5s → 8s

### 3. Created Files
- ✅ `.env.local` - Template for credentials
- ✅ `.env.local.example` - Example configuration

---

## Testing After Setup

1. **Check Console** - Should NOT show red ❌ errors about missing config
2. **Try Login** - Should call Supabase API (check browser Network tab)
3. **Check Logs** - Should show:
   ```
   [AUTH] LOGIN START
   [AUTH] LOGIN SUCCESS
   ```
   Or:
   ```
   [AUTH] LOGIN FAILED: [error message from Supabase]
   ```

---

## Troubleshooting

### Still hanging after adding credentials?
- Make sure credentials are exact copy/paste (no extra spaces)
- Restart dev server (`npm run dev`)
- Check browser console for error messages

### "Auth timeout" message?
- Check if Supabase URL is reachable
- Verify credentials are correct
- Check your Supabase project is active

### Wrong credentials?
- The error will show: `"Invalid credentials"` or similar
- Go back to Supabase dashboard and re-copy the correct values

---

## Next Steps

Once credentials are set:
1. ✅ User can login with email/password
2. ✅ User role (teacher/student) is fetched from Supabase
3. ✅ Redirect to appropriate dashboard
4. ✅ Test anti-cheat in test-taking flows

