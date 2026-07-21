-- picking_lists: thêm completed_at
ALTER TABLE picking_lists
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

COMMENT ON COLUMN picking_lists.completed_at
  IS 'Thời điểm hoàn thành đơn lấy hàng (set khi status → completed)';

-- internal_notes: thêm image_url
ALTER TABLE internal_notes
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN internal_notes.image_url
  IS 'Ảnh đính kèm ghi chú (upload lên Storage product-images bucket)';
