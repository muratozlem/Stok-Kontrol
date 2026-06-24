-- ============================================================
-- Stok Kontrol — Schema v2: Lokasyon + Rol Sistemi
-- Supabase Dashboard > SQL Editor'de çalıştırın:
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
-- ============================================================

-- 1. Lokasyonlar tablosu
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Depolara location_id ekle
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- 3. Profillere location_id ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- 4. Rol kısıtlamasını güncelle (önce sil, sonra yeniden ekle)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'chef', 'staff'));

-- 5. Mevcut rolleri yeni sisteme geçir
UPDATE profiles SET role = 'super_admin' WHERE role = 'admin';
UPDATE profiles SET role = 'staff'       WHERE role = 'user';

-- ============================================================
-- Yardımcı güvenlik fonksiyonları (güncellenmiş)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (status = 'approved' OR role = 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_location_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT location_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- RLS: locations tablosu
-- ============================================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "locations_select_approved"     ON locations;
  DROP POLICY IF EXISTS "locations_insert_super_admin"  ON locations;
  DROP POLICY IF EXISTS "locations_update_super_admin"  ON locations;
  DROP POLICY IF EXISTS "locations_delete_super_admin"  ON locations;
END $$;

CREATE POLICY "locations_select_approved"
  ON locations FOR SELECT TO authenticated USING (is_approved_user());

CREATE POLICY "locations_insert_super_admin"
  ON locations FOR INSERT TO authenticated WITH CHECK (is_super_admin());

CREATE POLICY "locations_update_super_admin"
  ON locations FOR UPDATE TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "locations_delete_super_admin"
  ON locations FOR DELETE TO authenticated USING (is_super_admin());

-- ============================================================
-- profiles: is_admin() artık super_admin + admin'i kapsıyor
-- Mevcut "profiles_update_admin" / "profiles_delete_admin"
-- politikaları otomatik olarak güncellenmiş is_admin()'i kullanır.
-- Ek yok.
-- ============================================================

-- ============================================================
-- password_reset_requests: is_admin() ile örtüşüyor, değişiklik yok
-- ============================================================
