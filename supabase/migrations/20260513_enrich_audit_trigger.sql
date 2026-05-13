-- SEC-11 v2: Trigger nhúng _product_name, _zone_name, _location_name vào JSONB
-- Prefix _ = metadata display, không phải data gốc.
-- Không cần DROP/CREATE TRIGGER — CREATE OR REPLACE FUNCTION đủ.

CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_location_id   UUID;
  v_record_id     UUID;
  v_zone_id       UUID;
  v_product_name  TEXT;
  v_zone_name     TEXT;
  v_old_zone_name TEXT;
  v_location_name TEXT;
  v_enriched_old  JSONB;
  v_enriched_new  JSONB;
BEGIN
  v_record_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;

  IF TG_TABLE_NAME = 'inventory_entries' THEN
    v_zone_id := COALESCE(NEW.zone_id, OLD.zone_id);
    SELECT z.location_id, z.name, l.name
    INTO v_location_id, v_zone_name, v_location_name
    FROM zones z JOIN locations l ON l.id = z.location_id
    WHERE z.id = v_zone_id;

    SELECT name INTO v_product_name
    FROM products WHERE id = COALESCE(NEW.product_id, OLD.product_id);

    IF TG_OP = 'UPDATE' AND OLD.zone_id IS DISTINCT FROM NEW.zone_id THEN
      SELECT name INTO v_old_zone_name FROM zones WHERE id = OLD.zone_id;
    END IF;

    v_enriched_old := CASE WHEN TG_OP = 'INSERT' THEN NULL
                      ELSE to_jsonb(OLD) || jsonb_build_object(
                        '_product_name', v_product_name,
                        '_zone_name', COALESCE(v_old_zone_name, v_zone_name),
                        '_location_name', v_location_name
                      ) END;

    v_enriched_new := CASE WHEN TG_OP = 'DELETE' THEN NULL
                      ELSE to_jsonb(NEW) || jsonb_build_object(
                        '_product_name', v_product_name,
                        '_zone_name', v_zone_name,
                        '_location_name', v_location_name
                      ) END;

  ELSE
    v_location_id := NULL;
    v_enriched_old := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
    v_enriched_new := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  END IF;

  INSERT INTO audit_logs (
    table_name, action, record_id, location_id,
    changed_by, changed_by_name,
    old_data, new_data
  ) VALUES (
    TG_TABLE_NAME, TG_OP, v_record_id, v_location_id,
    auth.uid(),
    NULLIF(split_part(auth.jwt() ->> 'email', '@', 1), ''),
    v_enriched_old,
    v_enriched_new
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
