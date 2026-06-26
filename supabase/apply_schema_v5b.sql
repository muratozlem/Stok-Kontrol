-- ============================================================
-- Stok Kontrol — Schema v5b: RLS Gap Fixes Addendum
-- Applies on top of apply_schema_v5.sql
--
-- Fixes two remaining authorization gaps identified in review:
--
-- 1. inventory INSERT/UPDATE still open to staff:
--    A trigger now updates inventory automatically when a
--    transaction is inserted, so client code no longer needs
--    to touch the inventory table. inventory INSERT/UPDATE
--    policies are tightened to is_admin_or_chef().
--
-- 2. Admins could change user status directly via profiles update:
--    A BEFORE UPDATE trigger blocks non-super_admin callers
--    from changing the status column on profiles rows via
--    direct API calls. Service-role callers (edge functions)
--    are unaffected (auth.uid() IS NULL for service role).
--
-- Run in Supabase Dashboard > SQL Editor:
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
-- ============================================================


-- ============================================================
-- FIX 1a: Trigger to maintain inventory on transaction INSERT.
--
-- When a stock transaction row is inserted, this trigger
-- automatically upserts the corresponding inventory row:
--   - type='IN':  inventory.quantity += transaction.quantity
--   - type='OUT': inventory.quantity  = MAX(0, qty - transaction.quantity)
--
-- The function uses SECURITY DEFINER so it runs as the postgres
-- role, which bypasses RLS on the inventory table. This is safe
-- because the trigger is gated on the transaction INSERT policy
-- (which already enforces is_approved_user() + location scope +
-- the staff-only-OUT restriction from apply_schema_v5.sql).
--
-- Client code (DataProvider.addStockTransactionMutation) must
-- no longer manually touch the inventory table after inserting
-- a transaction — the trigger handles it.
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_inventory_on_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trg_update_inventory_on_transaction ON transactions;

CREATE TRIGGER trg_update_inventory_on_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_on_transaction();


-- ============================================================
-- FIX 1b: Tighten inventory INSERT and UPDATE to admin_or_chef.
--
-- Now that the trigger (SECURITY DEFINER, bypasses RLS) handles
-- all inventory changes driven by transaction inserts, there is
-- no legitimate reason for a staff user to directly INSERT or
-- UPDATE an inventory row via the Supabase client. Restricting
-- these operations to is_admin_or_chef() closes the last
-- server-side path by which staff could forge inventory values.
-- ============================================================
DROP POLICY IF EXISTS "inventory_write_location" ON inventory;

CREATE POLICY "inventory_write_location"
  ON inventory FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = inventory.warehouse_id
          AND w.location_id = get_user_location_id()
      )
    )
  );

DROP POLICY IF EXISTS "inventory_update_location" ON inventory;

CREATE POLICY "inventory_update_location"
  ON inventory FOR UPDATE TO authenticated
  USING (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = inventory.warehouse_id
          AND w.location_id = get_user_location_id()
      )
    )
  )
  WITH CHECK (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = inventory.warehouse_id
          AND w.location_id = get_user_location_id()
      )
    )
  );


-- ============================================================
-- FIX 2: Profiles status guard trigger.
--
-- The profiles_update_admin RLS policy already prevents
-- non-admin callers from updating profiles, and the v5 fix
-- restricts admins to setting role IN ('chef', 'staff').
-- However, the WITH CHECK left the status column unconstrained,
-- meaning an admin could directly set status='approved' (or
-- any other value) without going through the update-user-role
-- edge function. That edge function is the intended approval
-- path and carries its own authorization checks.
--
-- This BEFORE UPDATE trigger enforces that only:
--   a) Service-role callers (auth.uid() IS NULL) — used by all
--      edge functions including update-user-role — can change
--      the status column.
--   b) super_admin users can change status directly (dashboard
--      emergency access).
--
-- Regular admin users who need to approve a user must go
-- through the update-user-role edge function, which will call
-- Supabase with the service role key and thereby satisfy (a).
-- ============================================================
CREATE OR REPLACE FUNCTION public.profiles_update_status_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Service role (auth.uid() IS NULL): always allowed.
  -- Edge functions (update-user-role, register-user, etc.)
  -- all use the service role key and go through this path.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- super_admin: unrestricted direct access.
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN NEW;
  END IF;

  -- All other authenticated callers: block status changes.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Kullanıcı durumu doğrudan değiştirilemez. Lütfen yönetim arayüzünü kullanın.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_status_guard ON profiles;

CREATE TRIGGER trg_profiles_status_guard
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_update_status_guard();
