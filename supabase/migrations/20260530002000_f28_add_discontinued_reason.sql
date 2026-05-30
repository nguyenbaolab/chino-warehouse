-- F28: lý do không nhập nữa (tách khỏi products.notes)
ALTER TABLE products ADD COLUMN IF NOT EXISTS discontinued_reason TEXT;
