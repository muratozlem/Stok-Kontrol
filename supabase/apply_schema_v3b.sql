-- ============================================================
-- Stok Kontrol — Schema v3b: RLS Location Isolation Fix
-- Applies on top of apply_schema_v3.sql
-- Removes NULL location_id bypass; tightens admin profile visibility.
-- Run in Supabase Dashboard > SQL Editor:
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
-- ============================================================

-- ============================================================
-- FIX A: profiles SELECT
-- Regular admin now sees only profiles in their own location
-- PLUS profiles with NULL location_id (pending/unassigned users
-- who haven't been approved+located yet), so the approval
-- workflow remains functional.
-- super_admin sees all rows.
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;

CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR is_super_admin()
    OR (
      is_admin()
      AND (location_id = get_user_location_id() OR location_id IS NULL)
    )
  );

-- ============================================================
-- FIX B: warehouses — remove NULL-location bypass for non-super-admin
-- Only super_admin may access warehouses with no location assigned.
-- ============================================================
DROP POLICY IF EXISTS "warehouses_approved_users" ON warehouses;

CREATE POLICY "warehouses_approved_users"
  ON warehouses FOR SELECT TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

DROP POLICY IF EXISTS "warehouses_write_location" ON warehouses;

CREATE POLICY "warehouses_write_location"
  ON warehouses FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

DROP POLICY IF EXISTS "warehouses_update_location" ON warehouses;

CREATE POLICY "warehouses_update_location"
  ON warehouses FOR UPDATE TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  )
  WITH CHECK (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

DROP POLICY IF EXISTS "warehouses_delete_location" ON warehouses;

CREATE POLICY "warehouses_delete_location"
  ON warehouses FOR DELETE TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

-- ============================================================
-- FIX C: products — remove NULL-location bypass for non-super-admin.
-- Only super_admin may access products not assigned to any location.
-- ============================================================
DROP POLICY IF EXISTS "products_select_location" ON products;

CREATE POLICY "products_select_location"
  ON products FOR SELECT TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

DROP POLICY IF EXISTS "products_write_location" ON products;

CREATE POLICY "products_write_location"
  ON products FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

DROP POLICY IF EXISTS "products_update_location" ON products;

CREATE POLICY "products_update_location"
  ON products FOR UPDATE TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  )
  WITH CHECK (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

DROP POLICY IF EXISTS "products_delete_location" ON products;

CREATE POLICY "products_delete_location"
  ON products FOR DELETE TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

-- ============================================================
-- FIX D: inventory — remove NULL warehouse-location bypass.
-- Location-scoped users can only access inventory for warehouses
-- explicitly assigned to their location.
-- ============================================================
DROP POLICY IF EXISTS "inventory_select_location" ON inventory;

CREATE POLICY "inventory_select_location"
  ON inventory FOR SELECT TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = inventory.warehouse_id
          AND w.location_id = get_user_location_id()
      )
    )
  );

DROP POLICY IF EXISTS "inventory_write_location" ON inventory;

CREATE POLICY "inventory_write_location"
  ON inventory FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_user()
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
    is_approved_user()
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
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = inventory.warehouse_id
          AND w.location_id = get_user_location_id()
      )
    )
  );

DROP POLICY IF EXISTS "inventory_delete_location" ON inventory;

CREATE POLICY "inventory_delete_location"
  ON inventory FOR DELETE TO authenticated
  USING (
    is_approved_user()
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
-- FIX E: transactions — remove NULL warehouse-location bypass.
-- Same logic as inventory above.
-- ============================================================
DROP POLICY IF EXISTS "transactions_select_location" ON transactions;

CREATE POLICY "transactions_select_location"
  ON transactions FOR SELECT TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = transactions.warehouse_id
          AND w.location_id = get_user_location_id()
      )
    )
  );

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
  );

DROP POLICY IF EXISTS "transactions_update_location" ON transactions;

CREATE POLICY "transactions_update_location"
  ON transactions FOR UPDATE TO authenticated
  USING (
    is_approved_user()
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
    is_approved_user()
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
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = transactions.warehouse_id
          AND w.location_id = get_user_location_id()
      )
    )
  );
