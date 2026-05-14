# Phase 2 — Tổng kết

**Phiên bản tài liệu:** closeout Phase 2 | Tháng 5/2026

---

## 1. Tổng quan Phase 2

### Mục tiêu

Mở rộng app nội bộ từ MVP một kho sang hệ thống multi-kho với auth bảo mật, audit log, phân loại sản phẩm 2 cấp, Zone Layout Editor, và triển khai APK thật qua EAS Build.

### Kết quả

- **Multi-kho** (F20) đạt: tạo/sửa/xóa kho với grid size configurable, dropdown filter trên Map/Products/Notifications.
- **Auth bảo mật** đạt: LoginScreen, RLS `authenticated_only` trên 8 bảng, Realtime `private: true`, auto-logout 20 phút, kill app = logout.
- **Audit log** (SEC-11) đạt: trigger PostgreSQL ghi mọi INSERT/UPDATE/DELETE, `AuditLogScreen` 4 filter + pagination, section lịch sử trong ProductDetail, card trong Settings.
- **Category** (F30) đạt: phân loại 2 cấp, CRUD trong Settings, gán SP trên ProductDetail/AddInventory.
- **Zone Layout Editor** (F29) đạt: compact tile editor, collision check, preview, confirm → lưu batch.
- **EAS Build** đạt: `eas.json` profile preview (APK), `expo-updates`, environment variables.
- Các tính năng **F08, F19, F26, F27 mở rộng** chưa code — kế hoạch Phase 3.

---

## 2. Tính năng đã hoàn thành

| Mã | Tóm tắt |
|----|---------|
| F20 | Multi-kho: dropdown selector, tạo/sửa/xóa kho, grid size configurable, filter kho trên Products/Notifications, fix KI-004 |
| F29 | Zone Layout Editor: compact tile, footprint preview, collision check, confirm → `batchUpdateZoneCells` |
| F30 | Phân loại sản phẩm 2 cấp (L1/L2), CRUD trong Settings, gán SP trên ProductDetail/AddInventory (optional) |
| SEC-04 | Authentication: LoginScreen email/password, auth gate App.tsx, `persistSession: false`, signOut |
| SEC-08 | Realtime RLS: `private: true` trên channels, RLS policy trên `realtime.messages` |
| SEC-11 | Audit Log: trigger SECURITY DEFINER, `AuditLogScreen` 4 filter + pagination, section ProductDetail, card Settings |
| Auto-logout | Inactivity timer 20 phút (timestamp-based, AppState listener), kill app = logout |
| EAS Build | `expo-updates`, `eas.json` preview profile (APK), environment variables |

---

## 3. Tính năng chưa hoàn thành → Phase 3

| Hạng mục | Lý do |
|----------|-------|
| F27 mở rộng (2 tab + PDF) | Design chốt v1.3.3, chưa code — ưu tiên cao Phase 3 |
| F28 `discontinued_reason` | Cần migration field lý do riêng, hiện dùng `products.notes` làm proxy |
| F08 hình ảnh sản phẩm | Chưa bắt đầu — cần Supabase Storage |
| F19 chuyển hàng giữa khu vực | Chưa bắt đầu |
| F26 kiểm kho | Chưa bắt đầu |
| F21 offline mode | Deferred từ Phase 2, priority P3 |
| SEC-05 Input validation | Medium — cần `maxLength` trên TextInput |
| SEC-06 Generic error messages | Medium — wrap error Supabase |
| SEC-07 Barcode debounce | Medium — thêm debounce 500ms |
| SEC-10 Backup script | Medium — chuyển sang `service_role` key |
| SEC-12 `console.log` guard | Low — wrap `__DEV__` |
| SEC-13 Dependency audit | Low — chạy `npm audit` trước release |
| SEC-14 `.env.*` gitignore | Low — kiểm tra pattern |

---

## 4. Quyết định thiết kế quan trọng (Phase 2)

Tóm tắt — chi tiết đầy đủ trong **[`docs/DECISIONS.md`](../../DECISIONS.md)**:

- **Client-direct Supabase + RLS:** không thêm server backend — Auth + RLS làm tầng bảo mật duy nhất; phù hợp app nội bộ quy mô nhỏ.
- **`persistSession: false` thay vì SecureStore:** session thuần RAM của Supabase client, không custom storage — kill app = logout; tránh conflict `autoRefreshToken` đọc storage null.
- **Auto-logout timestamp-based:** `lastActivityRef` + `setInterval` 30s foreground + `AppState` listener — không dùng timer chạy nền (battery-friendly, chính xác khi quay lại từ background).
- **Audit log: PostgreSQL trigger SECURITY DEFINER:** client không thể INSERT/UPDATE/DELETE trực tiếp vào `audit_logs`; trigger nhúng metadata (`_product_name`, `_zone_name`, `_location_name`) vào JSONB — không join runtime.
- **AuditLogScreen: Realtime deferred (KI-026):** audit log là historical data, pagination phức tạp khi kết hợp realtime insert — deferred để tránh UX rối.
- **EAS Build + OTA:** `eas.json` preview profile (APK), `expo-updates` cho OTA sau này, environment variables trên EAS Dashboard.
- **Grid size per location:** mỗi kho grid riêng (default 6×6), tăng thoải mái, giảm block nếu zone bị cắt.
- **Category 2 cấp optional:** cả Cấp 1 và Cấp 2 đều optional — không chặn nhập hàng khi chưa phân loại.

---

## 5. Security Phase 2 — Tổng kết

| SEC | Mô tả | KI | Trạng thái |
|-----|-------|----|-----------|
| SEC-01 | Credentials hardcode trong backup.mjs | KI-013 | Resolved — rotate key + `process.env` + `git filter-repo` |
| SEC-02 | RLS policy `allow_all` anon | KI-014 | Resolved — `authenticated_only` trên 8 bảng |
| SEC-03 | `EXPO_PUBLIC_*` bundle vào APK | KI-015 | Mitigated — vô hại khi RLS yêu cầu JWT |
| SEC-04 | Không có Authentication | KI-016 | Resolved — LoginScreen + auth gate + `persistSession: false` |
| SEC-05 | Input validation thiếu | KI-017 | Open (High) |
| SEC-06 | Error message lộ schema | KI-018 | Open (High) |
| SEC-07 | Barcode scanner thiếu debounce | KI-019 | Open (High) |
| SEC-08 | Realtime chạy dưới role anon | KI-012 | Resolved — `private: true` + RLS `realtime.messages` |
| SEC-09 | Không có RBAC | KI-020 | Deferred → Phase 3 (F24) |
| SEC-10 | Backup script cần `service_role` | KI-021 | Open (Medium) |
| SEC-11 | Audit Log | KI-022 | Resolved — trigger + AuditLogScreen + ProductDetail + Settings |
| SEC-12 | `console.log` trong production | KI-023 | Open (Low) |
| SEC-13 | Dependency audit | KI-024 | Open (Low) |
| SEC-14 | `.env.*` coverage gitignore | KI-025 | Open (Low) |

**Tóm tắt:** 6 resolved (SEC-01/02/04/08/11 + SEC-03 mitigated), 1 deferred (SEC-09), 7 open (SEC-05/06/07/10/12/13/14).

---

## 6. Known issues còn open

| KI | Mô tả | Mức độ | Trạng thái |
|----|-------|--------|-----------|
| KI-017 | SEC-05: Input validation thiếu (`maxLength`) | High | Open |
| KI-018 | SEC-06: Error message lộ thông tin schema | High | Open |
| KI-019 | SEC-07: Barcode scanner thiếu debounce | High | Open |
| KI-020 | SEC-09: Không có RBAC | Medium | Deferred → Phase 3 |
| KI-021 | SEC-10: Backup script cần `service_role` key | Medium | Open |
| KI-023 | SEC-12: `console.log` trong production | Low | Open |
| KI-024 | SEC-13: Dependency audit | Low | Open |
| KI-025 | SEC-14: `.env.*` coverage gitignore | Low | Open |
| KI-026 | Realtime chưa implement cho AuditLogScreen | Low | Deferred |

---

## 7. Số liệu Phase 2

- **Migrations tạo mới:** 15 file (bao gồm `schema.sql` cập nhật RLS + 14 incremental migrations)
- **Screens mới:** `LoginScreen`, `AuditLogScreen`, `CategoryManagementScreen`, `LocationManagementScreen`, `ZoneLayoutEditorScreen`, `DiscontinuedProductsScreen`, `OrderListScreen`, `OrderDetailScreen`
- **KI resolved trong Phase 2:** KI-004, KI-012, KI-013, KI-014, KI-015 (mitigated), KI-016, KI-022, KI-027, KI-028
- **KI open:** KI-017, KI-018, KI-019, KI-021, KI-023, KI-024, KI-025
- **KI deferred:** KI-020 (Phase 3), KI-026

---

## 8. Chuyển sang Phase 3

Ưu tiên giảm dần:

1. **F27 mở rộng + PDF** — 2 tab (Hàng trong kho / Hàng mới), số thùng để trống đến Confirm, PDF tổng hợp, flow Draft → Confirm → Xuất PDF → Đã đặt
2. **F28** — `discontinued_reason` migration (field lý do riêng thay vì dùng `products.notes`)
3. **F08** — Hình ảnh sản phẩm (chụp/chọn, Supabase Storage)
4. **F19** — Chuyển hàng giữa khu vực (trừ nguồn, cộng đích)
5. **F26** — Kiểm kho (đối chiếu thực tế, diff, confirm)
6. **F24 + SEC-09** — RBAC manager/nhân viên + super app integration
7. **F21** — Offline mode (cache, queue, đồng bộ)
8. **SEC-05/06/07/10/12/13/14** — Security items medium/low

Kế hoạch chi tiết: **`docs/phases/phase-3/PLAN_3.md`** (tạo khi bắt đầu Phase 3).
