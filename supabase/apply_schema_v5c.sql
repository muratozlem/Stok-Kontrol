-- ============================================================
-- Stok Kontrol — Schema v5c: Transaction Quantity Integrity Fix
-- Applies on top of apply_schema_v5b.sql
--
-- Fixes: staff can forge stock increases by inserting type='OUT'
-- transactions with a negative quantity. The trigger computes
-- GREATEST(0, quantity - NEW.quantity), so a negative OUT
-- quantity increases inventory (quantity - (-x) = quantity + x).
--
-- Three layers of defence added:
--   1. CHECK constraint on transactions.quantity > 0 at the
--      table level — rejected by the DB for all callers.
--   2. quantity > 0 guard added to the transaction INSERT
--      RLS policy WITH CHECK.
--   3. Explicit RAISE EXCEPTION in the trigger for quantity <= 0
--      as a defensive backstop (belt-and-suspenders).
--
-- Run in Supabase Dashboard > SQL Editor:
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
-- ============================================================


-- ============================================================
-- FIX 1: CHECK constraint — transactions.quantity must be > 0.
--
-- This is the primary DB-level enforcement. Any INSERT or UPDATE
-- that supplies a non-positive quantity is rejected by the
-- constraint before RLS or trigger logic even runs.
-- ============================================================
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_quantity_positive;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_quantity_positive CHECK (quantity > 0);


-- ============================================================
-- FIX 2: Add quantity > 0 guard to transactions INSERT policy.
--
-- Belt-and-suspenders: the RLS WITH CHECK now explicitly
-- rejects non-positive quantities in addition to the CHECK
-- constraint above and the trigger below.
-- ============================================================
DROP POLICY IF EXISTS "transactions_write_location" ON transactions;

CREATE POLICY "transactions_write_location"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_user()
    AND quantity > 0
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = transactions.warehouse_id
          AND w.location_id = get_user_location_id()
      )
    )
    AND (
      is_admin_or_chef()
      OR type = 'OUT'
    )
  );


-- ============================================================
-- FIX 3: Harden trigger with explicit quantity > 0 guard.
--
-- The trigger function now raises an exception for any
-- non-positive quantity before touching inventory, providing
-- a third layer of defence in case the constraint or policy
-- is ever relaxed without updating the others.
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_inventory_on_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Transaction quantity must be greater than zero'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.inventory
  SET quantity = CASE
      WHEN NEW.type = 'IN' THEN quantity + NEW.quantity
      ELSE GREATEST(0, quantity - NEW.quantity)
    END
  WHERE product_id = NEW.product_id
    AND warehouse_id = NEW.warehouse_id;

  IF NOT FOUND THEN
    INSERT INTO public.inventory (product_id, warehouse_id, quantity)
    VALUES (
      NEW.product_id,
      NEW.warehouse_id,
      CASE WHEN NEW.type = 'IN' THEN NEW.quantity ELSE 0 END
    );
  END IF;

  RETURN NEW;
END;
$$;
