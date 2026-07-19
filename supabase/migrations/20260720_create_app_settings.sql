-- F35 / Phase 5 C-part1: app_settings — shared notification config (1 row)
-- updated_at: dùng function riêng (pattern inventory/products), không moddatetime

CREATE TABLE IF NOT EXISTS app_settings (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_enabled  BOOLEAN     NOT NULL DEFAULT true,
  notification_time     TEXT        NOT NULL DEFAULT '11:00',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed 1 row (migration chạy một lần)
INSERT INTO app_settings (notification_enabled, notification_time)
VALUES (true, '11:00');

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Mọi authenticated đọc được
CREATE POLICY app_settings_select_authenticated ON app_settings
  FOR SELECT TO authenticated USING (true);

-- Chỉ admin+ sửa
CREATE POLICY app_settings_update_admin ON app_settings
  FOR UPDATE TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Không cho INSERT/DELETE từ client (đã seed sẵn 1 row)

CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_settings_updated_at_trigger ON app_settings;
CREATE TRIGGER app_settings_updated_at_trigger
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_app_settings_updated_at();
