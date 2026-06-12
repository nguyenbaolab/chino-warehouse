-- F24: backfill last_login_at từ auth.users.last_sign_in_at cho user đã login trước khi có RPC

UPDATE public.user_profiles up
SET last_login_at = au.last_sign_in_at
FROM auth.users au
WHERE up.id = au.id
  AND up.last_login_at IS NULL
  AND au.last_sign_in_at IS NOT NULL;
