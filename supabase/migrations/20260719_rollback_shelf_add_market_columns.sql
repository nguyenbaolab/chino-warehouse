-- C1: Rollback 3 bảng shelf (F36 redesign → Market mode)
-- + thêm locations.type, inventory_entries.is_special, inventory_entries.is_checked

-- 1. Drop trigger + function shelf
DROP TRIGGER IF EXISTS audit_shelf_items ON shelf_items;
DROP TRIGGER IF EXISTS shelf_items_updated_at_trigger ON shelf_items;
DROP FUNCTION IF EXISTS update_shelf_items_updated_at();

-- 2. Drop 3 bảng (thứ tự FK: junction → child → parent)
DROP TABLE IF EXISTS shelf_zone_items;
DROP TABLE IF EXISTS shelf_items;
DROP TABLE IF EXISTS shelf_zones;

-- 3. Thu hẹp audit CHECK — bỏ 'shelf_items'
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_table_name_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_table_name_check
  CHECK (table_name IN ('inventory_entries', 'products', 'product_barcodes', 'user_profiles', 'internal_notes'));

-- 4. Market mode columns
ALTER TABLE locations ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'warehouse';
ALTER TABLE inventory_entries ADD COLUMN IF NOT EXISTS is_special BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE inventory_entries ADD COLUMN IF NOT EXISTS is_checked BOOLEAN NOT NULL DEFAULT false;
