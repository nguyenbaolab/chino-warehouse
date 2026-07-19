-- F32: per-product warning ignore flags
ALTER TABLE products ADD COLUMN IF NOT EXISTS ignore_expiry_warning BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ignore_stock_warning BOOLEAN NOT NULL DEFAULT false;
