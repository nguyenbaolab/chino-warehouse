-- Perf: index expiry_date cho query Thông báo hết hạn / ExpiryAlertScreen
CREATE INDEX IF NOT EXISTS idx_inventory_entries_expiry_date
  ON inventory_entries(expiry_date);

-- Perf: index is_archived cho fetchProducts filter .eq('is_archived', false)
CREATE INDEX IF NOT EXISTS idx_products_is_archived
  ON products(is_archived);
