-- B1: Lịch sử mã vạch per sản phẩm (UNIQUE barcode toàn hệ thống)

CREATE TABLE product_barcodes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  barcode          TEXT        NOT NULL UNIQUE,
  first_scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_barcodes_product_id ON product_barcodes(product_id);

ALTER TABLE product_barcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_only ON product_barcodes
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Backfill TRƯỚC audit trigger (tránh audit entry rác)
INSERT INTO product_barcodes (product_id, barcode, first_scanned_at, last_scanned_at)
SELECT DISTINCT product_id, barcode, NOW(), NOW()
FROM inventory_entries
WHERE barcode IS NOT NULL AND barcode != ''
ON CONFLICT (barcode) DO NOTHING;

-- Mở rộng CHECK audit_logs.table_name cho product_barcodes
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_table_name_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_table_name_check
  CHECK (table_name IN ('inventory_entries', 'products', 'product_barcodes'));

CREATE TRIGGER audit_product_barcodes
  AFTER INSERT OR UPDATE OR DELETE ON product_barcodes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
