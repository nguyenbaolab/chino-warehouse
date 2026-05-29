-- A5 fix: auto-update updated_at cho inventory_entries và zones khi UPDATE

-- Auto-update updated_at cho inventory_entries khi UPDATE
CREATE OR REPLACE FUNCTION update_inventory_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_entries_updated_at_trigger
  ON inventory_entries;
CREATE TRIGGER inventory_entries_updated_at_trigger
  BEFORE UPDATE ON inventory_entries
  FOR EACH ROW EXECUTE FUNCTION update_inventory_entries_updated_at();

-- Auto-update updated_at cho zones khi UPDATE
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
