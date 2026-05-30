-- KI-049: bổ sung index thiếu trên DB production (schema.sql đã khai báo từ trước)
CREATE INDEX IF NOT EXISTS inventory_entries_barcode_idx ON inventory_entries (barcode);
CREATE INDEX IF NOT EXISTS order_items_order_list_id_idx ON order_items (order_list_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items (product_id);
