-- F30: FK optional từ products tới phân loại

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_level1_id UUID REFERENCES product_categories_l1(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_level2_id UUID REFERENCES product_categories_l2(id) ON DELETE SET NULL;
