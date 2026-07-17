-- F31 / F6: bảng internal_notes — ghi chú nội bộ theo sản phẩm
CREATE TABLE IF NOT EXISTS internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_internal_notes_product_id ON internal_notes(product_id);
CREATE INDEX idx_internal_notes_created_at ON internal_notes(created_at DESC);

ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: mọi authenticated (guest xem được)
CREATE POLICY internal_notes_select_authenticated ON internal_notes
  FOR SELECT TO authenticated USING (true);

-- Mutate: staff+
CREATE POLICY internal_notes_mutate_staff_plus ON internal_notes
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- Audit: mở rộng CHECK + trigger
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_table_name_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_table_name_check
  CHECK (table_name IN ('inventory_entries', 'products', 'product_barcodes', 'user_profiles', 'internal_notes'));

CREATE TRIGGER audit_internal_notes
  AFTER INSERT OR UPDATE OR DELETE ON internal_notes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
