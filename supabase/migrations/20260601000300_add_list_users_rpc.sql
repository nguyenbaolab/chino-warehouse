-- F24 Task 3: RPC list user_profiles kèm email (admin/super_admin only)

CREATE OR REPLACE FUNCTION public.list_user_profiles_with_email()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  is_disabled BOOLEAN,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin required';
  END IF;
  RETURN QUERY
  SELECT up.id, au.email::TEXT, up.role, up.is_disabled, up.last_login_at, up.created_at
  FROM public.user_profiles up
  JOIN auth.users au ON au.id = up.id
  ORDER BY au.email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_user_profiles_with_email() TO authenticated;
