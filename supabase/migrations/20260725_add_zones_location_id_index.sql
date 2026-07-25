-- KI-090: index zones.location_id — hỗ trợ filter theo kho (LocationManagement SKU count, v.v.)
CREATE INDEX IF NOT EXISTS idx_zones_location_id ON zones(location_id);
