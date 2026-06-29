-- ============================================================
-- Stok Kontrol — Schema v6: password_reset_requests Cleanup
-- Applies on top of apply_schema_v5c.sql
--
-- The admin-approval password-reset flow has been removed.
-- Previously, a user submitted a reset request (status='pending'),
-- an admin would review it and set a new password via the
-- admin-reset-password edge function (status → 'approved'), or
-- reject it (status → 'rejected').
--
-- The new self-service OTP flow bypasses admin approval entirely:
-- the request-password-reset edge function rate-limits the caller,
-- verifies the email exists as an approved user, and triggers an
-- OTP directly. The password_reset_requests table is still written
-- to by that function (for the partial unique index that enforces
-- one pending request per email as a spam guard), but no admin
-- ever reads or acts on these rows through the application.
--
-- Changes:
--   1. Purge all existing rows — stale from the old admin flow.
--   2. Drop the reset_req_admin_all RLS policy — admins no longer
--      need authenticated access to this table.
--   3. Narrow the status CHECK constraint to only 'pending' —
--      'approved' and 'rejected' values are never written any more.
--
-- Run in Supabase Dashboard > SQL Editor:
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
-- ============================================================


-- ============================================================
-- STEP 1: Purge all existing rows.
--
-- All rows pre-dating the OTP migration are stale. The old
-- admin-approval flow that processed these rows no longer exists,
-- so any 'pending' rows will never be acted on, and 'approved'/
-- 'rejected' rows are historical noise. Service role bypasses RLS,
-- so this delete runs unconditionally.
-- ============================================================
DELETE FROM public.password_reset_requests;


-- ============================================================
-- STEP 2: Drop all client-facing RLS policies.
--
-- Three policies are removed:
--
-- a) reset_req_admin_all — allowed authenticated admins and super_admins
--    to SELECT, INSERT, UPDATE, and DELETE rows. Was required for the
--    old admin-review UI. Since both the admin-reset-password edge
--    function and the dashboard admin UI are removed, no authenticated
--    user needs access to these rows.
--
-- b) reset_req_anon_insert — allowed anonymous callers to INSERT rows
--    if can_request_password_reset(email) returned true. The new flow
--    sends all inserts through the request-password-reset edge function
--    using the service-role key, which bypasses RLS. Anon INSERT is
--    therefore unnecessary and exposes a direct-write attack surface.
--
-- c) reset_req_authenticated_insert — WITH CHECK (true), meaning any
--    authenticated user could freely insert any row via the API.
--    Same reasoning as (b): service-role handles all writes.
--
-- With no authenticated or anon policies remaining, any direct API
-- call from a browser client is silently denied by RLS. The edge
-- function is unaffected because service-role bypasses RLS.
-- ============================================================
DROP POLICY IF EXISTS "reset_req_admin_all"            ON public.password_reset_requests;
DROP POLICY IF EXISTS "reset_req_anon_insert"          ON public.password_reset_requests;
DROP POLICY IF EXISTS "reset_req_authenticated_insert" ON public.password_reset_requests;


-- ============================================================
-- STEP 3: Narrow the status CHECK constraint.
--
-- The original constraint allowed 'pending', 'approved', and
-- 'rejected'. Now that only the request-password-reset edge
-- function writes to this table (always inserting status='pending'),
-- the 'approved' and 'rejected' values serve no purpose and
-- represent dead code. Removing them makes it impossible to
-- accidentally re-introduce the old flow by inserting an
-- 'approved' row.
--
-- We find the existing inline CHECK constraint by inspecting
-- pg_constraint rather than hard-coding its auto-generated name,
-- then replace it with a named constraint for easier future
-- management.
-- ============================================================
DO $$
DECLARE
  v_cname text;
BEGIN
  SELECT conname INTO v_cname
  FROM pg_constraint
  WHERE conrelid = 'public.password_reset_requests'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%approved%';

  IF v_cname IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.password_reset_requests DROP CONSTRAINT %I',
      v_cname
    );
  END IF;
END $$;

-- Drop by well-known name in case it was applied idempotently before.
ALTER TABLE public.password_reset_requests
  DROP CONSTRAINT IF EXISTS password_reset_requests_status_otp_only;

ALTER TABLE public.password_reset_requests
  ADD CONSTRAINT password_reset_requests_status_otp_only
  CHECK (status IN ('pending'));
