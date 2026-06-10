-- F24: fix RLS infinite recursion — SECURITY DEFINER helpers thay EXISTS subquery trên user_profiles

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_super_admin() TO authenticated;

DROP POLICY IF EXISTS user_profiles_select_admin ON user_profiles;
DROP POLICY IF EXISTS user_profiles_update_super_admin ON user_profiles;
DROP POLICY IF EXISTS user_profiles_update_admin ON user_profiles;

CREATE POLICY user_profiles_select_admin ON user_profiles
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY user_profiles_update_super_admin ON user_profiles
  FOR UPDATE TO authenticated
  USING (public.is_current_user_super_admin())
  WITH CHECK (public.is_current_user_super_admin());

CREATE POLICY user_profiles_update_admin ON user_profiles
  FOR UPDATE TO authenticated
  USING (
    public.is_current_user_admin()
    AND role IN ('staff', 'guest')
  )
  WITH CHECK (
    public.is_current_user_admin()
    AND role IN ('staff', 'guest')
  );
