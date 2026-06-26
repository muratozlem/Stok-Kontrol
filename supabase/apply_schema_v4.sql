-- ============================================================
-- Stok Kontrol — Schema v4: Privileged Account Visibility Fix
-- Applies on top of apply_schema_v3b.sql
-- Prevents regular admins from seeing super_admin profiles
-- through the NULL location_id bypass.
-- Run in Supabase Dashboard > SQL Editor:
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
-- ============================================================

-- ============================================================
-- FIX: profiles SELECT
-- The previous policy allowed admins to see any profile with
-- location_id IS NULL, which includes the bootstrap super_admin
-- account (which has no location). This tightens the rule so
-- that only pending/unassigned non-privileged users (role IN
-- ('admin','chef','staff')) with NULL location are visible to
-- admins. super_admin profiles are never exposed to lower roles.
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;

CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR is_super_admin()
    OR (
      is_admin()
      AND (
        location_id = get_user_location_id()
        OR (
          location_id IS NULL
          AND role IN ('admin', 'chef', 'staff')
        )
      )
    )
  );
