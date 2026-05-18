-- ============================================================
-- Torbalı GF Stok Kontrol — Supabase Schema
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın:
-- https://supabase.com/dashboard/project/bobitrbxiojvwkzeuxgi/sql
-- ============================================================

-- Ana tablolar (zaten varsa atla)
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

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- alert_logs: Her ürün için son mail gönderim zamanını takip eder
-- Bu tablo 24 saatlik spam koruması için kritik!
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_logs (
  id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient TEXT
);

CREATE INDEX IF NOT EXISTS idx_alert_logs_product_sent ON alert_logs(product_id, sent_at DESC);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;

-- Politikalar (varsa hata vermesin diye DO BLOCK kullan)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='anon_all_products') THEN
    CREATE POLICY "anon_all_products" ON products FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='warehouses' AND policyname='anon_all_warehouses') THEN
    CREATE POLICY "anon_all_warehouses" ON warehouses FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory' AND policyname='anon_all_inventory') THEN
    CREATE POLICY "anon_all_inventory" ON inventory FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='anon_all_transactions') THEN
    CREATE POLICY "anon_all_transactions" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='anon_all_users') THEN
    CREATE POLICY "anon_all_users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='alert_logs' AND policyname='service_all_alert_logs') THEN
    CREATE POLICY "service_all_alert_logs" ON alert_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- Edge Function Tetikleyici (SQL ile)
-- NOT: Bu kısım opsiyonel - uygulama zaten anlık tetikliyor
-- pg_net extension aktifse kullanılabilir
-- ============================================================
-- SELECT net.http_post(
--   url := 'https://bobitrbxiojvwkzeuxgi.supabase.co/functions/v1/send-critical-stock-alert',
--   headers := '{"Content-Type":"application/json","Authorization":"Bearer SERVICE_KEY"}'::jsonb,
--   body := '{"product_id":"URUN_ID"}'::jsonb
-- );
