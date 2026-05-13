# Go-Live Checklist — Chino's Warehouse

Checklist bảo mật và triển khai trước khi đưa app lên thiết bị thật.

---

## Nhóm C: Xử lý Credentials — **Đã hoàn thành**

- [x] **C1** — Rotate Supabase anon key trên Dashboard (key cũ bị lộ trong Git history)
- [x] **C2** — Sửa `backup.mjs` / `backup.ts` dùng `process.env` thay vì hardcode credentials
- [x] **C3** — Xóa credentials khỏi Git history (`git filter-repo`)
- [x] **C4** — Cập nhật `.env` với key mới sau khi rotate

---

## Nhóm B: Sửa RLS — **Đã hoàn thành**

- [x] **B1** — Xóa toàn bộ policy `allow_all` cho role `anon` trên 8 bảng
- [x] **B2** — Tạo policy `authenticated_only` `FOR ALL TO authenticated USING (auth.uid() IS NOT NULL)` trên 8 bảng (`schema.sql` v2.1)
- [x] **B3** — Verify Realtime: `private: true` trên tất cả `.channel()` calls + RLS policy trên `realtime.messages` (migration `20260513_realtime_rls_sec08.sql`)

---

## Nhóm A: Authentication — **Đã hoàn thành**

- [x] **A1** — Tắt "Confirm email" trong Supabase Dashboard → Auth → Settings
- [x] **A2** — Tạo user (email + password) trên Supabase Dashboard → Authentication → Users
- [x] **A3** — Cài `expo-secure-store`
- [x] **A4** — Cập nhật `lib/supabase.ts`: `ExpoSecureStoreAdapter` + auth config (`persistSession`, `autoRefreshToken`, `detectSessionInUrl: false`)
- [x] **A5** — Tạo `screens/LoginScreen.tsx`: email + password, `signInWithPassword`, hiện lỗi
- [x] **A6** — Cập nhật `App.tsx`: auth gate (`getSession` + `onAuthStateChange` + loading + LoginScreen)
- [x] **A7** — Cập nhật `screens/SettingsScreen.tsx`: nút Đăng xuất (`signOut`)

---

## Nhóm D: Build & cài máy — **Chưa làm**

- [ ] **D1** — Chạy `npx expo prebuild` (tạo native project)
- [ ] **D2** — Build APK: `cd android && ./gradlew assembleRelease` (hoặc `eas build --platform android --profile preview`)
- [ ] **D3** — Cài APK lên thiết bị thật (sideload hoặc qua `adb install`)
- [ ] **D4** — Build iOS (nếu cần): `eas build --platform ios --profile preview`
- [ ] **D5** — Kiểm tra app khởi động đúng trên thiết bị thật (không crash on launch)
- [ ] **D6** — Kiểm tra `.env` production có đúng Supabase URL + key mới (sau rotate)
- [ ] **D7** — Xác nhận `expo-secure-store` hoạt động trên thiết bị thật (session persist sau kill app)

---

## Nhóm E: Kiểm tra trước go-live — **Chưa làm**

- [ ] **E1** — Đăng nhập thành công trên thiết bị thật (email + password)
- [ ] **E2** — Đăng xuất + đăng nhập lại hoạt động đúng
- [ ] **E3** — Thử truy cập Supabase API với anon key (không JWT) → bị RLS chặn (403/empty)
- [ ] **E4** — Realtime subscription hoạt động sau khi đăng nhập (2 thiết bị, cập nhật data → sync)
- [ ] **E5** — Toàn bộ CRUD (thêm/sửa/xóa SP, lô, zone, kho) hoạt động bình thường sau auth

---

**Tham chiếu:** `docs/KNOWN_ISSUES.md` (KI-012 → KI-025), `docs/BLOCKERS.md` (BLK-003), `docs/DECISIONS.md` (kiến trúc client-direct + RLS).
