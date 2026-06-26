---
name: Bootstrap & Rate-limit Security
description: How the first-admin bootstrap and IP rate-limiting are secured in the register-user edge function and RLS policies.
---

## Bootstrap Protection (register-user edge function)

**Rule:** When `profiles` table count is 0, the `register-user` Edge Function requires a `BOOTSTRAP_SECRET` env var to be set in Supabase Edge Function secrets. The caller must supply `bootstrap_token` in the request body matching that secret (compared with `timingSafeEqual`).

**Why:** Any unauthenticated internet user could claim super_admin on a fresh deployment before the real operator. Requiring a server-only secret eliminates the "first one wins" race.

**How to apply:**
- Set `BOOTSTRAP_SECRET` via the Supabase Dashboard → Edge Functions → Secrets (or Management API POST `/v1/projects/{ref}/secrets`).
- Value is also stored as a Replit env var `BOOTSTRAP_SECRET` for operator reference.
- Client (`register.tsx`) hides the "Kurulum Tokeni" field unless the server returns `bootstrap_required: true`.
- For existing deployments (profiles count > 0) this check is never reached.

## IP Rate-Limiting (profiles.registered_from_ip)

**Rule:** The `registered_from_ip TEXT` column must exist on `profiles` and the profile INSERT must include it. The rate-limit query `.eq('registered_from_ip', clientIP)` silently returns 0 if the column is absent or never populated.

**Why:** The rate-limit code looked correct but was a no-op because the column didn't exist; the Supabase select returned null count, which defaulted to 0, allowing unlimited registrations.

**How to apply:** Always include `registered_from_ip` in the profile INSERT when `clientIP !== 'unknown'`. Column was added via `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registered_from_ip TEXT`.

## Password Reset RLS

**Rule:** The `reset_req_anon_insert` policy uses `can_request_password_reset(email)` SECURITY DEFINER function, not `WITH CHECK (true)`. A partial unique index on `(email) WHERE status = 'pending'` enforces one pending request per email.

**Why:** Unrestricted anon INSERT let anyone flood the admin queue with arbitrary/fake emails.

**How to apply:** If the policy is ever re-created, use the security definer function pattern. The function and index are idempotent (`CREATE OR REPLACE` / `CREATE UNIQUE INDEX IF NOT EXISTS`).
