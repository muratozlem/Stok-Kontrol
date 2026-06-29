---
name: Password Reset — OTP Only
description: The only password reset flow is self-service OTP. Admin-approval flow is permanently removed. Never re-introduce admin routing.
---

## Rule

The password reset mechanism is **exclusively** self-service OTP sent directly to the user's email via Supabase Auth (`supabase.auth.resetPasswordForEmail`).

The admin-approval flow — where a user submitted a request that an admin reviewed and then set a password — is **permanently dead and removed**:
- `admin-reset-password` edge function: deleted and undeployed
- `password_reset_requests` table: dropped (schema v7)
- Admin panel "Şifre" tab: removed from `expo/app/admin.tsx`
- `canManageUsers` no longer includes chef (only super_admin + admin)

**Why:** Confirmed by the user as a hard architectural rule. The admin-mediated flow was a security risk (admin could silently change any user's password) and created unnecessary coupling.

**How to apply:**
- If a password reset feature is needed, always use `supabase.auth.resetPasswordForEmail` + OTP confirm, never a server-side password setter called by an admin.
- Do not re-create `password_reset_requests` table, `admin-reset-password` edge function, or any admin UI for password management.
- Rate limiting is enforced via `password_reset_ip_log` (5 req / 10 min per IP), checked in the `password-reset` edge function before the client calls Supabase Auth.
- The `password-reset` edge function (`supabase/functions/request-password-reset/index.ts`) is fail-closed: DB errors on count or insert return HTTP 500, never silently allow bypass.
