-- B2: audit action CONFLICT + RPC log_barcode_conflict (client không INSERT audit_logs trực tiếp)

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
  CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'CONFLICT'));

CREATE OR REPLACE FUNCTION log_barcode_conflict(
  p_barcode TEXT,
  p_attempted_product_id UUID,
  p_conflicting_product_id UUID,
  p_attempted_product_name TEXT,
  p_conflicting_product_name TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name, action, record_id,
    changed_by, changed_by_name,
    old_data, new_data
  ) VALUES (
    'product_barcodes',
    'CONFLICT',
    p_conflicting_product_id,
    auth.uid(),
    NULLIF(split_part(auth.jwt() ->> 'email', '@', 1), ''),
    jsonb_build_object('barcode', p_barcode, 'current_owner', p_conflicting_product_name),
    jsonb_build_object('barcode', p_barcode, 'attempted_owner', p_attempted_product_name)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_barcode_conflict(TEXT, UUID, UUID, TEXT, TEXT) TO authenticated;
