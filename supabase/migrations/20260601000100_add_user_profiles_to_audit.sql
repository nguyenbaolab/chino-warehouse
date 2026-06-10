-- F24 Task 1: audit trigger trên user_profiles (UPDATE, DELETE)

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_table_name_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_table_name_check
  CHECK (table_name IN ('inventory_entries', 'products', 'product_barcodes', 'user_profiles'));

CREATE TRIGGER audit_user_profiles
  AFTER UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
