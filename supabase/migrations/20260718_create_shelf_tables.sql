-- C1: Shelf Management — 3 bảng (F33 + F36)
-- shelf_zones: khu trưng bày trên kệ siêu thị (nhân viên tự tạo, tách biệt Category F30 và zones kho)
-- shelf_items: hàng đang bán trên kệ (đơn vị cá thể, KHÔNG phải thùng)
-- shelf_zone_items: junction M:N (1 SP thuộc nhiều khu)

-- 1. shelf_zones
CREATE TABLE IF NOT EXISTS shelf_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shelf_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY shelf_zones_select_authenticated ON shelf_zones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY shelf_zones_mutate_staff_plus ON shelf_zones
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- 2. shelf_items
CREATE TABLE IF NOT EXISTS shelf_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  expiry_date DATE,
  is_price_reduced BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shelf_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY shelf_items_select_authenticated ON shelf_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY shelf_items_mutate_staff_plus ON shelf_items
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- auto-update updated_at — cùng pattern products / inventory_entries / zones
-- (không dùng set_updated_at — function đó không tồn tại trong DB)
CREATE OR REPLACE FUNCTION update_shelf_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shelf_items_updated_at_trigger ON shelf_items;
CREATE TRIGGER shelf_items_updated_at_trigger
  BEFORE UPDATE ON shelf_items
  FOR EACH ROW EXECUTE FUNCTION update_shelf_items_updated_at();

-- 3. shelf_zone_items (junction M:N)
CREATE TABLE IF NOT EXISTS shelf_zone_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_zone_id UUID NOT NULL REFERENCES shelf_zones(id) ON DELETE CASCADE,
  shelf_item_id UUID NOT NULL REFERENCES shelf_items(id) ON DELETE CASCADE,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shelf_zone_id, shelf_item_id)
);

ALTER TABLE shelf_zone_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY shelf_zone_items_select_authenticated ON shelf_zone_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY shelf_zone_items_mutate_staff_plus ON shelf_zone_items
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- 4. Audit: mở rộng CHECK + trigger chỉ cho shelf_items
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_table_name_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_table_name_check
  CHECK (table_name IN ('inventory_entries', 'products', 'product_barcodes', 'user_profiles', 'internal_notes', 'shelf_items'));

CREATE TRIGGER audit_shelf_items
  AFTER INSERT OR UPDATE OR DELETE ON shelf_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- 5. Indexes
CREATE INDEX idx_shelf_items_product_id ON shelf_items(product_id);
CREATE INDEX idx_shelf_zone_items_shelf_zone_id ON shelf_zone_items(shelf_zone_id);
CREATE INDEX idx_shelf_zone_items_shelf_item_id ON shelf_zone_items(shelf_item_id);
