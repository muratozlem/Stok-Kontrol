-- ============================================================
-- Stok Kontrol — Supabase Schema (Supabase Auth versiyonu)
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın:
-- https://supabase.com/dashboard/project/estefjjfccejhbskevvm/sql
-- ============================================================

-- ============================================================
-- Ana tablolar
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT DEFAULT '',
  description TEXT DEFAULT '',
  unit TEXT DEFAULT 'adet',
  image_url TEXT DEFAULT '',
  critical_stock_level INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  UNIQUE(product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- profiles: Supabase Auth ile entegre kullanıcı profilleri
-- NOT: id, auth.users.id ile eşleşmelidir (UUID).
-- password_hash artık bu tabloda tutulmaz — Supabase Auth yönetir.
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  registered_from_ip TEXT
);
-- Mevcut tablolara registered_from_ip eklenmesini sağlar (idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registered_from_ip TEXT;

-- ============================================================
-- stock_alerts: Kritik stok mail cooldown takibi (24 saat)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_alerts (
  id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL UNIQUE,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id);

-- ============================================================
-- password_reset_requests: Şifre sıfırlama talepleri (admin onaylı)
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL CHECK (email NOT LIKE '%\%%' AND email NOT LIKE '%_%' ESCAPE '\'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Yardımcı güvenlik fonksiyonları
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (status = 'approved' OR role = 'admin')
  );
$$;

-- ============================================================
-- RLS Etkinleştirme
-- ============================================================
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Eski anon politikalarını temizle
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "anon_all_products"                  ON products;
  DROP POLICY IF EXISTS "anon_all_warehouses"                ON warehouses;
  DROP POLICY IF EXISTS "anon_all_inventory"                 ON inventory;
  DROP POLICY IF EXISTS "anon_all_transactions"              ON transactions;
  DROP POLICY IF EXISTS "anon_all_profiles"                  ON profiles;
  DROP POLICY IF EXISTS "anon_all_stock_alerts"              ON stock_alerts;
  DROP POLICY IF EXISTS "anon_all_password_reset_requests"   ON password_reset_requests;
END $$;

-- ============================================================
-- profiles politikaları
-- INSERT/DELETE yalnızca Edge Function (service role) yapar — burada tanımlanmaz.
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select_authenticated') THEN
    CREATE POLICY "profiles_select_authenticated"
      ON profiles FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_update_admin') THEN
    CREATE POLICY "profiles_update_admin"
      ON profiles FOR UPDATE TO authenticated USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_delete_admin') THEN
    CREATE POLICY "profiles_delete_admin"
      ON profiles FOR DELETE TO authenticated USING (is_admin());
  END IF;
END $$;

-- ============================================================
-- Ürün / Depo / Stok / İşlem politikaları
-- Yalnızca onaylı kullanıcılar veya admin erişebilir.
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='products_approved_users') THEN
    CREATE POLICY "products_approved_users"
      ON products FOR ALL TO authenticated
      USING (is_approved_user()) WITH CHECK (is_approved_user());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='warehouses' AND policyname='warehouses_approved_users') THEN
    CREATE POLICY "warehouses_approved_users"
      ON warehouses FOR ALL TO authenticated
      USING (is_approved_user()) WITH CHECK (is_approved_user());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory' AND policyname='inventory_approved_users') THEN
    CREATE POLICY "inventory_approved_users"
      ON inventory FOR ALL TO authenticated
      USING (is_approved_user()) WITH CHECK (is_approved_user());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='transactions_approved_users') THEN
    CREATE POLICY "transactions_approved_users"
      ON transactions FOR ALL TO authenticated
      USING (is_approved_user()) WITH CHECK (is_approved_user());
  END IF;
END $$;

-- ============================================================
-- stock_alerts politikaları (Edge Function service role kullanır)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_alerts' AND policyname='stock_alerts_admin') THEN
    CREATE POLICY "stock_alerts_admin"
      ON stock_alerts FOR ALL TO authenticated USING (is_admin());
  END IF;
END $$;

-- ============================================================
-- password_reset_requests politikaları
-- Anon INSERT: yalnızca approved profili olan e-postalar için.
-- Admin onaylayıp reddedebilir.
-- ============================================================

-- Güvenlik fonksiyonu: e-postanın approved profile sahip olup olmadığını kontrol eder.
CREATE OR REPLACE FUNCTION public.can_request_password_reset(request_email TEXT)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = request_email AND status = 'approved'
  );
$$;

-- Her e-posta için en fazla bir adet pending talep: spam engeli
CREATE UNIQUE INDEX IF NOT EXISTS password_reset_requests_pending_email_unique
  ON public.password_reset_requests (email)
  WHERE status = 'pending';

-- Mevcut anon insert politikasını kaldır ve güvenli sürümüyle yeniden oluştur.
-- DROP + CREATE kullanarak mevcut WITH CHECK (true) politikasının üzerine yazılır.
DROP POLICY IF EXISTS reset_req_anon_insert ON public.password_reset_requests;
CREATE POLICY "reset_req_anon_insert"
  ON password_reset_requests FOR INSERT TO anon
  WITH CHECK (can_request_password_reset(email));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='password_reset_requests' AND policyname='reset_req_admin_all') THEN
    CREATE POLICY "reset_req_admin_all"
      ON password_reset_requests FOR ALL TO authenticated USING (is_admin());
  END IF;
END $$;
