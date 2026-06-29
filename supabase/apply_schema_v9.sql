-- ============================================================
-- Stok Kontrol — Schema v9: TTL cleanup for password_reset_ip_log
-- Applies on top of apply_schema_v8.sql
--
-- The password_reset_ip_log table stores one row per reset request
-- per IP address. The edge function counts rows within a rolling
-- 10-minute window (IP_WINDOW_MINUTES) and enforces a max of 5
-- requests per window. Inline cleanup in the edge function deletes
-- rows older than 1 hour, but only fires when a new request arrives.
-- During quiet periods rows accumulate indefinitely.
--
-- This migration adds a pg_cron job that deletes all rows older than
-- 1 hour every 15 minutes, keeping the table lean regardless of
-- traffic. The inline edge-function cleanup is left as belt-and-
-- suspenders — it does no harm and covers the window between cron
-- runs.
--
-- Run in Supabase Dashboard > SQL Editor:
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
-- ============================================================


-- ============================================================
-- STEP 1: Enable pg_cron extension.
--
-- pg_cron is bundled with every Supabase project; this is a
-- no-op if already enabled (also done in v8).
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- ============================================================
-- STEP 2: Create the cleanup function.
--
-- Deletes all rows from password_reset_ip_log that are older
-- than 1 hour — matching the retention window used by the
-- edge function's inline cleanup.
--
-- SECURITY DEFINER lets the function run with the permissions
-- of its owner (the role that runs this migration, typically
-- postgres/service role) so it can delete rows without relying
-- on RLS.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_password_reset_ip_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.password_reset_ip_log
  WHERE requested_at < now() - interval '1 hour';
$$;


-- ============================================================
-- STEP 3: Schedule the cleanup job.
--
-- Unschedule any existing job with the same name first so this
-- migration is safely idempotent (re-runnable without errors or
-- duplicate jobs).
--
-- The job runs every 15 minutes. Rows are retained for 1 hour,
-- so the maximum age of a stale entry after cleanup is ~75
-- minutes — well within acceptable tolerance for rate-limit
-- bookkeeping.
-- ============================================================
SELECT cron.unschedule('cleanup-old-password-reset-ip-log')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-password-reset-ip-log'
);

SELECT cron.schedule(
  'cleanup-old-password-reset-ip-log',
  '*/15 * * * *',
  'SELECT public.cleanup_old_password_reset_ip_log()'
);
