-- SEC-11: Bảng audit_logs + trigger + RLS

-- 1. Bảng audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL CHECK (table_name IN ('inventory_entries','products')),
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  record_id UUID,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  changed_by UUID,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_data JSONB,
  new_data JSONB
);

-- 2. Indexes
CREATE INDEX ON audit_logs(changed_at DESC);
CREATE INDEX ON audit_logs(record_id);
CREATE INDEX ON audit_logs(location_id);
CREATE INDEX ON audit_logs(table_name);

-- 3. RLS — chỉ authenticated SELECT, không có INSERT/UPDATE/DELETE từ client
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_audit"
ON audit_logs
FOR SELECT
TO authenticated
USING (true);

-- 4. Trigger function (SECURITY DEFINER — bypass RLS để ghi được)
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

-- 5. Gắn trigger vào inventory_entries và products
CREATE TRIGGER audit_inventory_entries
  AFTER INSERT OR UPDATE OR DELETE ON inventory_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
