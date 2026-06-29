-- ============================================================
-- Stok Kontrol — Schema v8: TTL cleanup for password_reset_tokens
-- Applies on top of apply_schema_v7.sql
--
-- The password_reset_tokens table stores a hashed OTP per email
-- with a 10-minute TTL (expires_at). If a user requests a reset
-- but never completes it, the row stays until they request again
-- (upsert) or until the confirm action detects the expiry.
-- Abandoned rows accumulate indefinitely without periodic cleanup.
--
-- This migration adds a pg_cron job that deletes all expired rows
-- every 5 minutes, keeping the table clean regardless of whether
-- users complete the reset flow.
--
-- Run in Supabase Dashboard > SQL Editor:
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
-- ============================================================


-- ============================================================
-- STEP 1: Enable pg_cron extension.
--
-- pg_cron is bundled with every Supabase project; this is a
-- no-op if already enabled.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- ============================================================
-- STEP 2: Create the cleanup function.
--
-- SECURITY DEFINER lets the function run with the permissions
-- of its owner (the role that runs this migration, typically
-- postgres/service role) so it can delete rows without relying
-- on RLS. The function itself contains no secrets and performs
-- only the single targeted DELETE.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_reset_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now();
$$;


-- ============================================================
-- STEP 3: Schedule the cleanup job.
--
-- Unschedule any existing job with the same name first so this
-- migration is safely idempotent (re-runnable without errors or
-- duplicate jobs).
--
-- The job runs every 5 minutes. OTPs expire after 10 minutes,
-- so the maximum age of an abandoned token after cleanup is
-- ~15 minutes — well within acceptable tolerance.
-- ============================================================
SELECT cron.unschedule('cleanup-expired-password-reset-tokens')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-password-reset-tokens'
);

SELECT cron.schedule(
  'cleanup-expired-password-reset-tokens',
  '*/5 * * * *',
  'SELECT public.cleanup_expired_password_reset_tokens()'
);
