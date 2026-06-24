---
name: Edge Functions
description: Supabase Edge Functions deployed for privileged operations
---

**Deployed functions:**
- `register-user` — Creates auth.users entry + profile row using service role. Validates email (blocks `%`, `_`, `\`). First user gets admin+approved, others get user+pending.
- `admin-reset-password` — Verifies caller is admin via JWT, then calls `auth.admin.updateUserById(userId, {password})`. Takes `{requestId, targetUserId, newPassword}`. Looks up request email and cross-checks targetUserId to prevent mass reset.
- `delete-user` — Verifies caller is admin, calls `auth.admin.deleteUser(targetUserId)`. Deleting auth.users cascades to profiles row.
- `password-reset` — Legacy email-based reset (unused since admin-approval flow replaced it).

**Security pattern:** All admin functions: (1) check Authorization header, (2) call `anonClient.auth.getUser()` to get caller identity, (3) use adminClient (service role) to verify caller's profile.role='admin', (4) then perform privileged operation with adminClient.

**Why:** Admin operations (delete user, reset password) require service role key which must never be in client-side code. Edge Functions are the only place service role is used.

**Deployment:** Use `curl -X PUT/POST https://api.supabase.com/v1/projects/{ref}/functions[/{slug}]` with `SUPABASE_ACCESS_TOKEN` and `{name, body, verify_jwt: false}`.
