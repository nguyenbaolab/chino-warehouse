-- KI-049: đưa DB khớp schema.sql — products.is_archived NOT NULL
UPDATE products SET is_archived = false WHERE is_archived IS NULL;

ALTER TABLE products
  ALTER COLUMN is_archived SET NOT NULL;
