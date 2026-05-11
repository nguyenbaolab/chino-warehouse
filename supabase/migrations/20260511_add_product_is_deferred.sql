-- Thông báo (F18): trạng thái "Để sau" theo sản phẩm
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_deferred BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.is_deferred IS 'Khi true: ẩn khỏi tab Có vấn đề, hiện ở tab Để sau (Notifications).';
