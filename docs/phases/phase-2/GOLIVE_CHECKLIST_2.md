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
- [x] **A3** — Cấu hình Supabase client: `persistSession: false`, `autoRefreshToken: true`, `detectSessionInUrl: false` trong `lib/supabase.ts`
- [x] **A4** — Xác nhận `lib/supabase.ts` dùng `persistSession: false` (không có custom storage — session chỉ sống trong RAM)
- [x] **A5** — Tạo `screens/LoginScreen.tsx`: email + password, `signInWithPassword`, hiện lỗi
- [x] **A6** — Cập nhật `App.tsx`: auth gate (`getSession` + `onAuthStateChange` + loading + LoginScreen)
- [x] **A7** — Cập nhật `screens/SettingsScreen.tsx`: nút Đăng xuất (`signOut`)

---

## Nhóm D: Build & cài máy (EAS) — **Đang làm**

- [x] **D1** — Cài EAS CLI: `npm install -g eas-cli` → `eas login`
- [x] **D2** — Cài `expo-updates`: `npx expo install expo-updates`
- [x] **D3** — Khởi tạo EAS: `eas build:configure` → chọn Android; thêm profile `"preview"` (`distribution: internal`, `buildType: apk`) vào `eas.json`
- [x] **D4** — Cấu hình OTA: `eas update:configure`
- [ ] **D5** — Set biến môi trường trên EAS (Sensitive): `eas env:create --name EXPO_PUBLIC_SUPABASE_URL --environment production` + `eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --environment production`
- [ ] **D6** — Build APK: `eas build --profile preview --platform android` (~10–30 phút, theo dõi tại expo.dev → project → Builds)
- [ ] **D7** — Gửi link APK cho nhân viên → tải → bật "Cài từ nguồn không rõ" → cài
- [ ] **D8** — Xác nhận app khởi động đúng trên thiết bị thật (không crash on launch)

---

## Nhóm E: Kiểm tra trước go-live — **Chưa làm**

- [ ] **E1** — Đăng nhập thành công trên thiết bị thật (email + password)
- [ ] **E2** — Đăng xuất + đăng nhập lại hoạt động đúng
- [ ] **E3** — Thử truy cập Supabase API với anon key (không JWT) → bị RLS chặn (403/empty)
- [ ] **E4** — Realtime subscription hoạt động sau khi đăng nhập (2 thiết bị, cập nhật data → sync)
- [ ] **E5** — Toàn bộ CRUD (thêm/sửa/xóa SP, lô, zone, kho) hoạt động bình thường sau auth
- [ ] **E6** — Test auto-logout: để app foreground 20 phút không chạm → phải hiện Alert "Phiên đăng nhập đã hết hạn"
- [ ] **E7** — Test kill app: tắt app hoàn toàn → mở lại → phải về màn LoginScreen (không vào thẳng app)
- [ ] **E8** — Test background ngắn: switch sang app khác < 20 phút → quay lại → vẫn vào được app không cần login lại

---

**Tham chiếu:** `docs/KNOWN_ISSUES.md` (KI-012 → KI-025), `docs/BLOCKERS.md` (BLK-003), `docs/DECISIONS.md` (kiến trúc client-direct + RLS).
