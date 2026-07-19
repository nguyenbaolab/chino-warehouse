-- F34 / Phase 5 B1: picking_lists + picking_list_items
-- Không audit triggers (giống order_lists / order_items)

CREATE TABLE IF NOT EXISTS picking_lists (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS picking_list_items (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  picking_list_id     UUID        NOT NULL REFERENCES picking_lists(id) ON DELETE CASCADE,
  inventory_entry_id  UUID        NOT NULL REFERENCES inventory_entries(id) ON DELETE CASCADE,
  product_id          UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  zone_id             UUID        NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  tier                INTEGER     NOT NULL,
  quantity_boxes      INTEGER     NOT NULL DEFAULT 1 CHECK (quantity_boxes > 0),
  is_picked           BOOLEAN     NOT NULL DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_picking_list_items_picking_list_id
  ON picking_list_items(picking_list_id);
CREATE INDEX IF NOT EXISTS idx_picking_list_items_inventory_entry_id
  ON picking_list_items(inventory_entry_id);

ALTER TABLE picking_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE picking_list_items ENABLE ROW LEVEL SECURITY;

-- SELECT: mọi authenticated (guest xem được)
CREATE POLICY picking_lists_select_authenticated ON picking_lists
  FOR SELECT TO authenticated USING (true);

CREATE POLICY picking_lists_mutate_staff_plus ON picking_lists
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

CREATE POLICY picking_list_items_select_authenticated ON picking_list_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY picking_list_items_mutate_staff_plus ON picking_list_items
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());
