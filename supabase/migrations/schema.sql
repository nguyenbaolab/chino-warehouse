-- ============================================================
-- Chino's Warehouse — Full Database Schema
-- Phiên bản: 3.4 | Tháng 5/2026
-- Chạy file này trên một database trắng để tạo lại toàn bộ cấu trúc
-- ============================================================
-- Thay đổi so với v3.3:
--   - F08: Storage bucket product-images (public read),
--     RLS authenticated insert/update/delete trên storage.objects
-- Thay đổi so với v3.2:
--   - A5 fix: thêm BEFORE UPDATE trigger auto-update updated_at
--     cho inventory_entries và zones
-- Thay đổi so với v3.1:
--   - A5: thêm updated_at + BEFORE UPDATE trigger cho products
--     (optimistic locking conflict detection)
-- Thay đổi so với v3.0:
--   - C1: thêm zones vào supabase_realtime publication
--     (MapScreen realtime multi-user update)
-- Thay đổi so với v2.4 (Phase 2 kết thúc) → v3.0 (Phase 3 bắt đầu):
--   - SEC-11 v2: audit_trigger_fn() nhúng _product_name,
--     _zone_name, _location_name vào JSONB (prefix _ = metadata display,
--     không phải data gốc); xử lý riêng old_zone_name khi UPDATE đổi zone
-- Thay đổi so với v2.3:
--   - SEC-11: thêm bảng audit_logs, trigger function, và trigger
--     trên inventory_entries và products
-- Thay đổi so với v2.2:
--   - Realtime RLS (SEC-08): thêm policy cho realtime.messages
--     chỉ user authenticated mới được subscribe/publish qua Realtime
-- Thay đổi so với v2.1:
--   - RLS policies: đổi từ `anon` sang `authenticated` (sau khi thêm auth)
-- Thay đổi so với v2.0:
--   - product_categories_l1, product_categories_l2: thêm mới (F30)
--   - products: thêm category_level1_id, category_level2_id (F30)
-- Thay đổi so với v1.4:
--   - locations: thêm grid_rows, grid_cols (Phase 2 — multi-kho)
-- ============================================================


-- ============================================================
-- BẢNG CHÍNH
-- ============================================================

-- 1. Locations (kho/khu vực)
CREATE TABLE locations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  grid_rows   INTEGER     NOT NULL DEFAULT 6,
  grid_cols   INTEGER     NOT NULL DEFAULT 6,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Zones (ô trong kho)
CREATE TABLE zones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID        REFERENCES locations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  cells       JSONB       DEFAULT '[]',         -- mảng {row, col} 1-based
  color       TEXT        DEFAULT '#22C55E',
  has_tiers   BOOLEAN     DEFAULT false,
  tier_count  INTEGER     DEFAULT 1,
  notes       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Product categories (phân loại sản phẩm — F30)
CREATE TABLE product_categories_l1 (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_categories_l2 (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level1_id  UUID        NOT NULL REFERENCES product_categories_l1(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Products (sản phẩm)
-- barcode đã chuyển sang inventory_entries (per lô)
-- is_deferred: không còn dùng trong UI (bỏ tab Để sau), giữ trong DB
-- is_price_reduced đã chuyển sang inventory_entries (per lô)
CREATE TABLE products (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  image_url           TEXT,
  notes               TEXT,
  is_archived         BOOLEAN     NOT NULL DEFAULT false,
  is_deferred         BOOLEAN     NOT NULL DEFAULT false,
  is_discontinued     BOOLEAN     NOT NULL DEFAULT false,
  warning_days        INTEGER     NOT NULL DEFAULT 30,
  low_warning_boxes   INTEGER     NOT NULL DEFAULT 3,
  low_critical_boxes  INTEGER     NOT NULL DEFAULT 1,
  category_level1_id  UUID        REFERENCES product_categories_l1(id) ON DELETE SET NULL,
  category_level2_id  UUID        REFERENCES product_categories_l2(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- 5. Inventory entries (lô hàng)
CREATE TABLE inventory_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID        REFERENCES products(id) ON DELETE CASCADE,
  zone_id          UUID        REFERENCES zones(id) ON DELETE CASCADE,
  tier             INTEGER     DEFAULT 1,
  quantity_boxes   INTEGER     NOT NULL DEFAULT 0,
  barcode          TEXT,
  expiry_date      DATE,
  is_price_reduced BOOLEAN     NOT NULL DEFAULT false,
  notes            TEXT,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 6. Order lists (danh sách đặt hàng)
CREATE TABLE order_lists (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'confirmed', 'placed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Order items (sản phẩm trong danh sách đặt hàng)
-- is_manual = true → ⭐ sản phẩm tự thêm tay
CREATE TABLE order_items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_list_id  UUID        NOT NULL REFERENCES order_lists(id) ON DELETE CASCADE,
  product_id     UUID        REFERENCES products(id) ON DELETE SET NULL,
  product_name   TEXT        NOT NULL,
  quantity_boxes INTEGER     NOT NULL DEFAULT 1,
  notes          TEXT,
  is_manual      BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Audit logs (SEC-11)
CREATE TABLE audit_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name     TEXT        NOT NULL CHECK (table_name IN ('inventory_entries', 'products')),
  action         TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id      UUID,
  location_id    UUID        REFERENCES locations(id) ON DELETE SET NULL,
  changed_by     UUID,
  changed_by_name TEXT,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_data       JSONB,
  new_data       JSONB
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX ON products(name);
CREATE INDEX ON inventory_entries(zone_id);
CREATE INDEX ON inventory_entries(product_id);
CREATE INDEX ON inventory_entries(barcode);
CREATE INDEX ON order_items(order_list_id);
CREATE INDEX ON order_items(product_id);
CREATE INDEX idx_product_categories_l2_level1 ON product_categories_l2(level1_id);

-- Indexes cho audit_logs (SEC-11)
CREATE INDEX ON audit_logs(changed_at DESC);
CREATE INDEX ON audit_logs(record_id);
CREATE INDEX ON audit_logs(location_id);
CREATE INDEX ON audit_logs(table_name);


-- ============================================================
-- ROW LEVEL SECURITY — Bảng ứng dụng
-- ============================================================

ALTER TABLE locations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories_l1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories_l2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lists           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;

-- Phase 1+: cho phép tất cả user đã đăng nhập
-- Phase 3: thay bằng policy kiểm tra user role (F24 / SEC-09)
CREATE POLICY "allow_all" ON locations             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON zones                 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON product_categories_l1 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON product_categories_l2 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON products              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON inventory_entries     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON order_lists           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON order_items           FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS audit_logs (SEC-11): chỉ authenticated SELECT, không INSERT/UPDATE/DELETE từ client
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_audit"
ON audit_logs
FOR SELECT
TO authenticated
USING (true);


-- ============================================================
-- ROW LEVEL SECURITY — Realtime (SEC-08)
-- Chỉ user đã đăng nhập mới được subscribe/publish qua Realtime
-- Áp dụng cho tất cả Realtime channel trong app (private: true)
-- ============================================================

CREATE POLICY "authenticated_users_can_receive"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_can_broadcast"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);


-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================

-- Cho phép postgres_changes subscribe trên các bảng cần Realtime
-- inventory_entries: đã có sẵn từ trước (Settings/Discontinued dùng)
-- zones: thêm mới (C1 — MapScreen realtime update cho multi-user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'zones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE zones;
  END IF;
END;
$$;


-- ============================================================
-- AUDIT TRIGGER (SEC-11)
-- ============================================================

-- Trigger function (SECURITY DEFINER — bypass RLS để ghi được)
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_location_id UUID;
  v_record_id   UUID;
  v_zone_id     UUID;
BEGIN
  v_record_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;

  IF TG_TABLE_NAME = 'inventory_entries' THEN
    v_zone_id := COALESCE(NEW.zone_id, OLD.zone_id);
    SELECT location_id INTO v_location_id FROM zones WHERE id = v_zone_id;
  ELSE
    v_location_id := NULL;
  END IF;

  INSERT INTO audit_logs (
    table_name, action, record_id, location_id,
    changed_by, changed_by_name,
    old_data, new_data
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    v_record_id,
    v_location_id,
    auth.uid(),
    NULLIF(split_part(auth.jwt() ->> 'email', '@', 1), ''),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn trigger vào inventory_entries và products
CREATE TRIGGER audit_inventory_entries
  AFTER INSERT OR UPDATE OR DELETE ON inventory_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================
-- AUTO-UPDATE TRIGGERS (A5)
-- ============================================================

CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at_trigger ON products;
CREATE TRIGGER products_updated_at_trigger
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_products_updated_at();

CREATE OR REPLACE FUNCTION update_inventory_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_entries_updated_at_trigger ON inventory_entries;
CREATE TRIGGER inventory_entries_updated_at_trigger
  BEFORE UPDATE ON inventory_entries
  FOR EACH ROW EXECUTE FUNCTION update_inventory_entries_updated_at();

CREATE OR REPLACE FUNCTION update_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS zones_updated_at_trigger ON zones;
CREATE TRIGGER zones_updated_at_trigger
  BEFORE UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION update_zones_updated_at();


-- ============================================================
-- STORAGE BUCKETS (F08)
-- Bucket product-images: public read; authenticated write/update/delete
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');


-- ============================================================
-- SEED DATA
-- ============================================================

-- 1 kho mặc định cho Phase 1
INSERT INTO locations (name, description)
VALUES ('Kho', 'Phòng kho tầng dưới');