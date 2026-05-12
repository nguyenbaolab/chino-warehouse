-- F30: Phân loại sản phẩm — bảng cấp 1 và cấp 2

CREATE TABLE product_categories_l1 (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_categories_l2 (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level1_id  UUID        NOT NULL REFERENCES product_categories_l1(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_categories_l2_level1 ON product_categories_l2(level1_id);

ALTER TABLE product_categories_l1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories_l2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON product_categories_l1 FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON product_categories_l2 FOR ALL TO anon USING (true) WITH CHECK (true);
