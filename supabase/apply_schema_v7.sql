-- Stok Kontrol — Schema v7: Drop dead password_reset_requests table
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
--
-- The password_reset_requests table and its partial unique index were
-- made permanently obsolete when the OTP-based reset flow was adopted.
-- The edge function no longer writes to this table. This migration
-- removes the table (and its index, which drops automatically) to
-- eliminate dead schema and reduce confusion.

-- Drop all RLS policies first (they reference the table)
DROP POLICY IF EXISTS "reset_req_admin_all"             ON public.password_reset_requests;
DROP POLICY IF EXISTS "reset_req_anon_insert"           ON public.password_reset_requests;
DROP POLICY IF EXISTS "reset_req_authenticated_insert"  ON public.password_reset_requests;
DROP POLICY IF EXISTS "anon_all_password_reset_requests" ON public.password_reset_requests;

-- Drop the partial unique index explicitly (also dropped by CASCADE, but explicit is clearer)
DROP INDEX IF EXISTS public.password_reset_requests_pending_email_unique;

-- Drop the table (CASCADE handles any remaining dependent objects)
DROP TABLE IF EXISTS public.password_reset_requests CASCADE;
