-- Stok Kontrol — Schema v10: Security hardening fixes
-- Applied: 2026-06-29
--
-- Fix 1: Transaction immutability — drop UPDATE policy (unused, tamper risk)
--         + BEFORE UPDATE trigger as belt-and-suspenders
-- Fix 2: stock_alerts RLS — extend to is_admin_or_chef() so chef stock
--         movements correctly obey the 24-hour alert cooldown
-- Fix 3: password_reset_tokens — ensure RLS is enabled (service-role only)

-- ============================================================
-- FIX 1: Make transactions immutable after INSERT
-- ============================================================
-- The transactions_update_location RLS policy allowed admin/chef to UPDATE
-- historical transaction rows. No UPDATE trigger existed, so changes would
-- corrupt the audit trail (inventory trigger only fires on INSERT).
-- The app never needs to UPDATE a transaction; corrections are made via new
-- transactions. Dropping the policy + adding a trigger closes both paths.

DROP POLICY IF EXISTS "transactions_update_location" ON transactions;

-- Belt-and-suspenders: BEFORE UPDATE trigger raises an exception so that
-- even if the policy is accidentally re-created, direct updates are blocked.
CREATE OR REPLACE FUNCTION public.prevent_transaction_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'İşlem kayıtları değiştirilemez. Düzeltme için yeni bir işlem oluşturun.';
END;
$$;

DROP TRIGGER IF EXISTS transactions_are_immutable ON public.transactions;
CREATE TRIGGER transactions_are_immutable
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_transaction_update();

-- ============================================================
-- FIX 2: stock_alerts — extend access to is_admin_or_chef()
-- ============================================================
-- Old policy restricted ALL operations to is_admin() only.
-- Chef-triggered transactions could not read or write the last_sent_at
-- timestamp, causing the 24-hour cooldown to be silently bypassed:
--   SELECT returns null → assume never alerted → send every time
--   upsert fails silently → timestamp never saved → always resends
-- Extending to is_admin_or_chef() restores correct cooldown behaviour
-- for chef-triggered critical stock alerts.

DROP POLICY IF EXISTS "stock_alerts_admin" ON stock_alerts;

CREATE POLICY "stock_alerts_admin_or_chef"
  ON stock_alerts FOR ALL TO authenticated
  USING (is_admin_or_chef())
  WITH CHECK (is_admin_or_chef());

-- ============================================================
-- FIX 3: password_reset_tokens — enforce RLS (service-role only)
-- ============================================================
-- The table is accessed exclusively via adminClient (service-role key)
-- inside the password-reset edge function. Enabling RLS with no
-- client-facing policies ensures anonymous/authenticated clients
-- cannot read hashed OTP tokens even if they know the table name.

ALTER TABLE IF EXISTS public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
