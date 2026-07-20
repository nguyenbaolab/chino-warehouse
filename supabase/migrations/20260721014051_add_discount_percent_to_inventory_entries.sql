-- D1 Phase 6 — phần trăm giảm giá per lô (NULL = không giảm giá)
ALTER TABLE inventory_entries
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2)
    CHECK (discount_percent >= 0 AND discount_percent <= 100);

COMMENT ON COLUMN inventory_entries.discount_percent
  IS 'Phần trăm giảm giá (0–100), NULL = không giảm giá';
