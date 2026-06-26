-- ============================================================
-- Stok Kontrol — Schema v5: RLS Authorization Gap Fixes
-- Applies on top of apply_schema_v4.sql
--
-- Fixes two high-severity RLS authorization gaps:
--
-- 1. [High] Staff bypass of inventory write controls:
--    All write policies used is_approved_user() which passes
--    for any approved role including 'staff'. Staff could
--    directly mutate products, warehouses, and transaction
--    records via the Supabase API, bypassing UI-only checks.
--
-- 2. [High] Profile RLS allows revoked admins to self-reactivate
--    and lets admins promote peers to admin role directly:
--    - is_admin() did not check status='approved', so a user
--      whose status was set to 'rejected' or 'pending' but
--      whose role column still said 'admin' could update their
--      own profile to restore status='approved'.
--    - profiles_update_admin WITH CHECK only blocked role='super_admin',
--      meaning any admin could set another user to role='admin'
--      directly, bypassing the update-user-role edge function
--      which restricts admins to assigning only chef/staff.
--
-- Run in Supabase Dashboard > SQL Editor:
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
-- ============================================================


-- ============================================================
-- FIX 1: Harden is_admin() to require approved status.
--
-- Previously is_admin() only checked the role column. A user
-- whose status was changed to 'pending' or 'rejected' but
-- whose role column remained 'admin' would still pass is_admin()
-- and could update their own profile or others in the same
-- location. Now approved status is required (super_admin is
-- always active regardless of status).
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND (status = 'approved' OR role = 'super_admin')
  );
$$;


-- ============================================================
-- FIX 2: New helper — is_admin_or_chef()
--
-- Returns true when the calling user has role super_admin,
-- admin, or chef AND is approved (or is super_admin). Used to
-- gate write operations that the UI correctly restricts from
-- staff-role users.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_or_chef()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'chef')
      AND (status = 'approved' OR role = 'super_admin')
  );
$$;


-- ============================================================
-- FIX 3: profiles UPDATE — tighten role-hierarchy enforcement.
--
-- Before: admins could set any role except 'super_admin', so
--   an admin could promote peers to 'admin' directly through
--   the API, bypassing the update-user-role edge function.
-- After:  admins may only assign 'chef' or 'staff', matching
--   the hierarchy the edge function already enforces. The
--   hardened is_admin() from Fix 1 additionally ensures that
--   revoked/pending admins cannot satisfy the USING clause.
-- ============================================================
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin() AND location_id = get_user_location_id())
  )
  WITH CHECK (
    is_super_admin()
    OR (
      is_admin()
      AND location_id = get_user_location_id()
      AND role IN ('chef', 'staff')
    )
  );


-- ============================================================
-- FIX 4: products write policies — restrict to admin_or_chef.
--
-- Staff users must not be able to create, modify, or delete
-- products. The UI enforces this via redirects/hidden buttons,
-- but the database must enforce it independently of the client.
-- ============================================================
DROP POLICY IF EXISTS "products_write_location" ON products;

CREATE POLICY "products_write_location"
  ON products FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

DROP POLICY IF EXISTS "products_update_location" ON products;

CREATE POLICY "products_update_location"
  ON products FOR UPDATE TO authenticated
  USING (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  )
  WITH CHECK (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

DROP POLICY IF EXISTS "products_delete_location" ON products;

CREATE POLICY "products_delete_location"
  ON products FOR DELETE TO authenticated
  USING (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );


-- ============================================================
-- FIX 5: warehouses write policies — restrict to admin_or_chef.
--
-- Staff users must not be able to create, modify, or delete
-- warehouses. The UI only shows these controls to admin/chef,
-- but RLS must enforce the same boundary at the database level.
-- ============================================================
DROP POLICY IF EXISTS "warehouses_write_location" ON warehouses;

CREATE POLICY "warehouses_write_location"
  ON warehouses FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

DROP POLICY IF EXISTS "warehouses_update_location" ON warehouses;

CREATE POLICY "warehouses_update_location"
  ON warehouses FOR UPDATE TO authenticated
  USING (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  )
  WITH CHECK (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

DROP POLICY IF EXISTS "warehouses_delete_location" ON warehouses;

CREATE POLICY "warehouses_delete_location"
  ON warehouses FOR DELETE TO authenticated
  USING (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );


-- ============================================================
-- FIX 6: transactions INSERT — enforce type='OUT' for staff.
--
-- Staff users may only create OUT-type stock transactions (the
-- stock-transaction screen forces this in the UI). Admin and
-- chef users may create both IN and OUT transactions.
--
-- The INSERT policy now adds the gate:
--   is_admin_or_chef() OR type = 'OUT'
-- so a direct API call by a staff user inserting type='IN'
-- is rejected at the database level.
-- ============================================================
DROP POLICY IF EXISTS "transactions_write_location" ON transactions;

CREATE POLICY "transactions_write_location"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_user()
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
-- FIX 7: transactions UPDATE and DELETE — restrict to admin_or_chef.
--
-- Staff must not be able to modify or delete transaction history.
-- This also prevents staff from invoking the clearAllData
-- sequence (which deletes all transactions) via the API.
-- ============================================================
DROP POLICY IF EXISTS "transactions_update_location" ON transactions;

CREATE POLICY "transactions_update_location"
  ON transactions FOR UPDATE TO authenticated
  USING (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = transactions.warehouse_id
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
        WHERE w.id = transactions.warehouse_id
          AND w.location_id = get_user_location_id()
      )
    )
  );

DROP POLICY IF EXISTS "transactions_delete_location" ON transactions;

CREATE POLICY "transactions_delete_location"
  ON transactions FOR DELETE TO authenticated
  USING (
    is_admin_or_chef()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = transactions.warehouse_id
          AND w.location_id = get_user_location_id()
      )
    )
  );


-- ============================================================
-- FIX 8: inventory DELETE — restrict to admin_or_chef.
--
-- inventory INSERT and UPDATE remain open to is_approved_user()
-- so that the addStockTransactionMutation flow works for staff
-- performing OUT transactions (the mutation inserts a transaction
-- then upserts the inventory quantity). Staff legitimately need
-- to trigger inventory quantity changes via the OUT flow.
--
-- DELETE is restricted to admin_or_chef to prevent staff from
-- wiping inventory rows directly (e.g. via the clearAllData
-- sequence which the UI restricts to super_admin only).
-- ============================================================
DROP POLICY IF EXISTS "inventory_delete_location" ON inventory;

CREATE POLICY "inventory_delete_location"
  ON inventory FOR DELETE TO authenticated
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
  );
