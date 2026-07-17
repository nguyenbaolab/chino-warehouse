-- F31: cho phép ghi chú với tên SP tự do (không bắt buộc product_id)
ALTER TABLE internal_notes ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE internal_notes ADD COLUMN IF NOT EXISTS custom_product_name TEXT;

ALTER TABLE internal_notes DROP CONSTRAINT IF EXISTS internal_notes_product_or_name;
ALTER TABLE internal_notes ADD CONSTRAINT internal_notes_product_or_name
  CHECK (
    product_id IS NOT NULL
    OR (custom_product_name IS NOT NULL AND trim(custom_product_name) <> '')
  );
