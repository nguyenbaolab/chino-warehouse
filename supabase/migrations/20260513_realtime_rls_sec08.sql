-- SEC-08: Thêm RLS cho realtime.messages
-- Chỉ user đã đăng nhập (authenticated) mới được subscribe/publish qua Realtime

CREATE POLICY "authenticated_users_can_receive"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_users_can_broadcast"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
