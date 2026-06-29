-- Stok Kontrol — Schema v11: stock_alerts per-location cooldown
-- Applied: 2026-06-29
--
-- Problem: stock_alerts used product_id alone as the unique key.
-- If the same product went critical in Location A and Location B,
-- whichever alert fired first blocked the other for 24 hours.
-- Admins in Location B never received their alert.
--
-- Fix: add location_id column and make the unique constraint
-- (product_id, location_id) with NULLS NOT DISTINCT so that
-- each (product, location) pair has an independent 24-hour cooldown.

-- ============================================================
-- 1. Add location_id column (nullable FK → locations)
-- ============================================================
ALTER TABLE public.stock_alerts
  ADD COLUMN IF NOT EXISTS location_id UUID
    REFERENCES public.locations(id) ON DELETE SET NULL;

-- ============================================================
-- 2. Drop old single-column unique constraint on product_id
-- ============================================================
ALTER TABLE public.stock_alerts
  DROP CONSTRAINT IF EXISTS stock_alerts_product_id_key;

-- ============================================================
-- 3. New unique constraint on (product_id, location_id)
--    NULLS NOT DISTINCT: two NULL location_ids are treated as
--    equal, so a product with no location still gets one row.
-- ============================================================
ALTER TABLE public.stock_alerts
  ADD CONSTRAINT stock_alerts_product_location_unique
  UNIQUE NULLS NOT DISTINCT (product_id, location_id);

-- ============================================================
-- 4. Replace old single-column index with a composite one
-- ============================================================
DROP INDEX IF EXISTS public.idx_stock_alerts_product;

CREATE INDEX IF NOT EXISTS idx_stock_alerts_product_location
  ON public.stock_alerts(product_id, location_id);
