---
name: Auth Architecture
description: How authentication works — Supabase Auth replaces custom hashPassword system
---

App uses Supabase Auth (`supabase.auth.signInWithPassword` / `signOut` / `onAuthStateChange`) instead of custom password hash stored in `profiles` table.

**Registration flow:** Client calls `register-user` Edge Function (POST body: {email, password}). Edge Function uses service role to call `auth.admin.createUser({email_confirm: true})`, then inserts a row in `profiles` with id = auth.users UUID, role/status based on whether it's the first user.

**Login flow:** Direct `supabase.auth.signInWithPassword()` from client. After success, fetch profile by `auth.uid()` and check `status`/`role`. If pending/rejected, call `supabase.auth.signOut()` and throw error.

**Session:** `supabase.auth.getSession()` on app start + `onAuthStateChange` listener. Supabase client handles token refresh via AsyncStorage.

**Why:** Custom hash (FNV-like with global salt) was trivially brute-forceable. PostgREST exposed `password_hash` column via anon key. Supabase Auth stores passwords as bcrypt server-side, never exposed via REST.

**How to apply:** `profiles.id` is `UUID REFERENCES auth.users(id) ON DELETE CASCADE`. Never store passwords in DB columns.
