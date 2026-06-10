-- F24 Task 1: bảng user_profiles + RLS + auto-insert trigger + RPC last_login

CREATE TABLE user_profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL DEFAULT 'staff'
                              CHECK (role IN ('super_admin', 'admin', 'staff', 'guest')),
  is_disabled     BOOLEAN     NOT NULL DEFAULT false,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_is_disabled ON user_profiles(is_disabled);

-- Backfill user hiện có
INSERT INTO user_profiles (id, role)
SELECT id, 'staff' FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Tự tạo profile khi có user mới (Supabase Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role)
  VALUES (NEW.id, 'staff');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC cập nhật last_login — bypass RLS cho field này
CREATE OR REPLACE FUNCTION update_my_last_login()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles SET last_login_at = now() WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_my_last_login() TO authenticated;

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profiles_select_own ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY user_profiles_select_admin ON user_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY user_profiles_update_super_admin ON user_profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

CREATE POLICY user_profiles_update_admin ON user_profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
    AND role IN ('staff', 'guest')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
    AND role IN ('staff', 'guest')
  );

-- Không có policy INSERT/DELETE cho authenticated → deny mặc định
