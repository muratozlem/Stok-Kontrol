-- ============================================================
-- Stok Kontrol — Schema v3: RLS Authorization Hardening
-- Applies on top of apply_schema.sql + apply_schema_v2.sql
-- Run in Supabase Dashboard > SQL Editor:
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
-- ============================================================

-- ============================================================
-- Ensure products has location_id (may already exist)
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- ============================================================
-- FIX 1: profiles SELECT — users can only see their own row;
--         is_admin() (admin + super_admin) can see all rows.
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;

CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

-- ============================================================
-- FIX 2: profiles UPDATE — super_admin has global access;
--         admin can only update profiles assigned to their
--         own location AND cannot escalate role to super_admin.
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
      AND role != 'super_admin'
    )
  );

-- ============================================================
-- FIX 3: profiles DELETE — super_admin has global access;
--         admin can only delete profiles in their own location.
-- ============================================================
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (is_admin() AND location_id = get_user_location_id())
  );

-- ============================================================
-- FIX 5: warehouses — approved users restricted to their
--         location; super_admin has global access.
-- ============================================================
DROP POLICY IF EXISTS "warehouses_approved_users" ON warehouses;

CREATE POLICY "warehouses_approved_users"
  ON warehouses FOR SELECT TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
      OR location_id IS NULL
    )
  );

CREATE POLICY "warehouses_write_location"
  ON warehouses FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id = get_user_location_id()
    )
  );

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
-- FIX 6: products — approved users restricted to their
--         location (null location_id = visible to all);
--         writes are restricted to own location or super_admin.
-- ============================================================
DROP POLICY IF EXISTS "products_approved_users" ON products;

CREATE POLICY "products_select_location"
  ON products FOR SELECT TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id IS NULL
      OR location_id = get_user_location_id()
    )
  );

CREATE POLICY "products_write_location"
  ON products FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id IS NULL
      OR location_id = get_user_location_id()
    )
  );

CREATE POLICY "products_update_location"
  ON products FOR UPDATE TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id IS NULL
      OR location_id = get_user_location_id()
    )
  )
  WITH CHECK (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id IS NULL
      OR location_id = get_user_location_id()
    )
  );

CREATE POLICY "products_delete_location"
  ON products FOR DELETE TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR location_id IS NULL
      OR location_id = get_user_location_id()
    )
  );

-- ============================================================
-- FIX 7: inventory — rows are scoped through their warehouse;
--         approved users only see inventory for warehouses
--         in their own location; super_admin sees all.
-- ============================================================
DROP POLICY IF EXISTS "inventory_approved_users" ON inventory;

CREATE POLICY "inventory_select_location"
  ON inventory FOR SELECT TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = inventory.warehouse_id
          AND (w.location_id = get_user_location_id() OR w.location_id IS NULL)
      )
    )
  );

CREATE POLICY "inventory_write_location"
  ON inventory FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = inventory.warehouse_id
          AND (w.location_id = get_user_location_id() OR w.location_id IS NULL)
      )
    )
  );

CREATE POLICY "inventory_update_location"
  ON inventory FOR UPDATE TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = inventory.warehouse_id
          AND (w.location_id = get_user_location_id() OR w.location_id IS NULL)
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
          AND (w.location_id = get_user_location_id() OR w.location_id IS NULL)
      )
    )
  );

CREATE POLICY "inventory_delete_location"
  ON inventory FOR DELETE TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = inventory.warehouse_id
          AND (w.location_id = get_user_location_id() OR w.location_id IS NULL)
      )
    )
  );

-- ============================================================
-- FIX 8: transactions — scoped through warehouse location;
--         same logic as inventory above.
-- ============================================================
DROP POLICY IF EXISTS "transactions_approved_users" ON transactions;

CREATE POLICY "transactions_select_location"
  ON transactions FOR SELECT TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = transactions.warehouse_id
          AND (w.location_id = get_user_location_id() OR w.location_id IS NULL)
      )
    )
  );

CREATE POLICY "transactions_write_location"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = transactions.warehouse_id
          AND (w.location_id = get_user_location_id() OR w.location_id IS NULL)
      )
    )
  );

CREATE POLICY "transactions_update_location"
  ON transactions FOR UPDATE TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = transactions.warehouse_id
          AND (w.location_id = get_user_location_id() OR w.location_id IS NULL)
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
          AND (w.location_id = get_user_location_id() OR w.location_id IS NULL)
      )
    )
  );

CREATE POLICY "transactions_delete_location"
  ON transactions FOR DELETE TO authenticated
  USING (
    is_approved_user()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.warehouses w
        WHERE w.id = transactions.warehouse_id
          AND (w.location_id = get_user_location_id() OR w.location_id IS NULL)
      )
    )
  );
