-- ============================================================
-- Chino's Warehouse — Full Database Schema
-- Phiên bản: 1.4 | Tháng 5/2026
-- Chạy file này trên một database trắng để tạo lại toàn bộ cấu trúc
-- ============================================================


-- ============================================================
-- BẢNG CHÍNH
-- ============================================================

-- 1. Locations (kho/khu vực)
CREATE TABLE locations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
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

-- 3. Products (sản phẩm)
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
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- 4. Inventory entries (lô hàng)
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


-- 5. Order lists (danh sách đặt hàng)
CREATE TABLE order_lists (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'confirmed', 'placed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Order items (sản phẩm trong danh sách đặt hàng)
-- is_manual = true → ⭐ sản phẩm chị tự thêm tay
CREATE TABLE order_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_list_id UUID        NOT NULL REFERENCES order_lists(id) ON DELETE CASCADE,
  product_id    UUID        REFERENCES products(id) ON DELETE SET NULL,
  product_name  TEXT        NOT NULL,
  quantity_boxes INTEGER    NOT NULL DEFAULT 1,
  notes         TEXT,
  is_manual     BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
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


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE locations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;

-- Phase 1: không có auth — cho phép tất cả
-- Phase 3: thay bằng policy kiểm tra user role
CREATE POLICY "allow_all" ON locations         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON zones             FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON products          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON inventory_entries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON order_lists       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON order_items       FOR ALL TO anon USING (true) WITH CHECK (true);


-- ============================================================
-- SEED DATA
-- ============================================================

-- 1 kho mặc định cho Phase 1
INSERT INTO locations (name, description)
VALUES ('Kho', 'Phòng kho tầng dưới');