# Phase 3 — Handoff

**Trạng thái:** In progress | Tháng 5/2026

---

## 1. Tổng quan Phase 3

Phase 3 tập trung vào **ổn định vận hành multi-user** và **hoàn thiện nghiệp vụ còn nợ**:

- **Bug fixes (A1–A5):** format hạn DD/MM/YYYY, ProductsScreen barcode/search, zone overlap khi tạo zone, Map search theo barcode text, conflict detection (`updated_at`).
- **UX (B1–B8):** badge giảm giá, chuyển lô cùng zone, `normalizeText`, MM/YYYY→ngày 1, hint AddInventory, sửa tên tại ZoneDetail, Map scan→sheet scroll, toggle cảnh báo global trong Settings.
- **Realtime (C1):** subscribe `zones` + `inventory_entries` trên Map; migration `zones` vào `supabase_realtime`; bỏ qua refetch 3s sau mutation local.
- **Hoàn thiện Phase 2:** F27 (2 tab + PDF), F28 (`discontinued_reason`), F08 (ảnh SP + Storage).
- **Tính năng mới:** F23 Dashboard, F24 RBAC (`user_profiles`).
- **Security:** SEC-05 (`maxLength`), SEC-06 (generic errors).
- **Dropped:** F19 chuyển hàng giữa khu vực — không implement.

Chi tiết task: **`docs/phases/phase-3/PLAN_3.md`**.

---

## 2. Tính năng đã implement

| Feature | Mô tả | File chính |
|---------|-------|------------|
| *(Điền dần khi hoàn thành từng task)* | | |

---

## 3. Migration files đã tạo

| File | Mô tả |
|------|-------|
| `20260528120000_add_zones_to_realtime.sql` | `ALTER PUBLICATION supabase_realtime ADD TABLE zones` (C1) |
| `20260529122000_add_updated_at_to_products.sql` | Thêm `products.updated_at` + trigger auto-update (A5) |
| `20260529123000_add_updated_at_triggers.sql` | `BEFORE UPDATE` auto-update `updated_at` cho `inventory_entries` + `zones` (A5 fix) |
| `20260530001000_f08_product_images_storage.sql` | F08: bucket `product-images` + RLS (public read, authenticated write/delete) |
| `20260601000000_add_user_profiles.sql` | F24 Task 1: `user_profiles` + RLS + trigger auth + RPC `update_my_last_login` |
| `20260601000100_add_user_profiles_to_audit.sql` | F24: audit trigger `user_profiles` (UPDATE/DELETE) |
| `20260601000200_fix_user_profiles_rls_recursion.sql` | F24: SECURITY DEFINER helpers `is_current_user_admin` |
| `20260601000300_add_list_users_rpc.sql` | F24 Task 3: RPC `list_user_profiles_with_email` |
| `20260601000400_backfill_last_login_at.sql` | F24: backfill `last_login_at` từ `auth.users.last_sign_in_at` |
| `20260601000500_add_user_profiles_to_realtime.sql` | F24: `user_profiles` trong `supabase_realtime` (kick disable) |
| `20260601000600_rls_role_based_writes.sql` | KI-055: guest SELECT only; staff+ mutate 9 bảng + storage product-images |

---

## 4. Breaking changes so với Phase 2

*Cập nhật khi có breaking change.*

---

## 5. Files quan trọng đã thêm/sửa

| File | Mô tả |
|------|-------|
| `App.tsx` | SettingsStack: `NotificationsFromDashboard` (reuse NotificationsScreen) |
| `screens/DashboardScreen.tsx` | F23 — `push` stat cards → NotificationsFromDashboard / DiscontinuedProducts + filter params |
| `screens/NotificationsScreen.tsx` | Route params tab/filter/kho/zone; dropdown Zone |
| `screens/ProductDetailScreen.tsx` | Đổi tên inline; section mã vạch đã dùng (CRUD) |
| `stores/warehouseStore.ts` | `fetchProductBarcodes`, `deleteProductBarcode`, `updateProductBarcode` |
| `components/SimplePieChart.tsx` | Pie chart + legend (`react-native-svg`) |
| `utils/dashboardStats.ts` | Metric client-side; `totalProducts` filter theo kho |
| `screens/SettingsScreen.tsx` | Card **Tổng quan kho** |
| `App.tsx` | Route `Dashboard` trong SettingsStack |
| `stores/authStore.ts` | F24 Task 1 — `currentUserProfile`, fetch/clear, `updateLastLogin` |
| `App.tsx` | F24 — guard `is_disabled`, spinner fetch profile |
| `types/index.ts` | `UserRole`, `UserProfile`; `AuditLog.table_name` + `user_profiles` |
| `stores/authStore.ts` | F24 Task 2 — `useIsReadOnly`, `useCanWrite`, `useIsAdmin`, `useIsSuperAdmin` |
| `screens/MapScreen.tsx` | F24 Task 2 — ẩn zone CRUD, layout editor, thêm kho |
| `components/ZoneDetailSheet.tsx` | F24 Task 2 — ẩn thêm hàng, sửa SP/lô, chuyển lô |
| `screens/ZoneLayoutEditorScreen.tsx` | F24 Task 2 — mount safety guest → goBack |
| `screens/ProductsScreen.tsx` | F24 Task 2 — ẩn FAB + upload ảnh card |
| `screens/ProductDetailScreen.tsx` | F24 Task 2 — ẩn mutate (ảnh, tên, ngưỡng, barcode, lô, archive/delete) |
| `screens/AddInventoryScreen.tsx` | F24 Task 2 — mount safety guest |
| `screens/NotificationsScreen.tsx` | F24 Task 2 — ẩn toggle giảm giá, không nhập, thêm danh sách nhập |
| `screens/OrderListScreen.tsx` | F24 Task 2 — ẩn tạo list mới |
| `screens/OrderDetailScreen.tsx` | F24 Task 2 — ẩn sửa/xóa item, footer mutate; giữ Xuất PDF |
| `screens/DiscontinuedProductsScreen.tsx` | F24 Task 2 — ẩn Nhập lại |
| `screens/CategoryManagementScreen.tsx` | F24 Task 2 — ẩn CRUD + mount safety |
| `screens/LocationManagementScreen.tsx` | F24 Task 2 — ẩn FAB/edit/delete + mount safety |
| `screens/BarcodeScannerScreen.tsx` | F24 Task 2 — ẩn alert Thêm thủ công (guest) |
| `screens/SettingsScreen.tsx` | F24 Task 2 — card Quản lý người dùng (admin) |
| `screens/UserManagementScreen.tsx` | F24 Task 3 — list users + toggle role/disabled |
| `stores/authStore.ts` | F24 Task 3 — `fetchUsers`, `updateUserRole`, `updateUserDisabled` |
| `App.tsx` | F24 Task 3 — route `UserManagement` trong SettingsStack |
| `screens/SettingsScreen.tsx` | F24 Task 3 — navigate `UserManagement` |
| `types/index.ts` | F24 Task 3 — `UserProfileWithEmail` |
| `lib/presence.ts` | F24 — presence channel join/leave + sync `onlineUserIds` |
| `App.tsx` | F24 — Realtime own `user_profiles` + presence join/leave |
| `stores/authStore.ts` | F24 — `onlineUserIds`, `setOnlineUserIds`, `fetchCurrentUserProfile({ silent })` |
| `screens/UserManagementScreen.tsx` | F24 — badge online + switch spacing |
| `supabase/migrations/20260601000600_rls_role_based_writes.sql` | KI-055 — RLS guest read-only server-side |
| `supabase/migrations/schema.sql` | v3.16 — helpers + 18 table policies + 4 storage policies |
| `screens/LoginScreen.tsx` | SEC-05 — maxLength email/password |
| `screens/AddInventoryScreen.tsx` | SEC-05 — maxLength 7 input |
| `screens/ProductsScreen.tsx` | SEC-05 — maxLength 4 input |
| `screens/ProductDetailScreen.tsx` | SEC-05 — maxLength 9 input |
| `screens/MapScreen.tsx` | SEC-05 — maxLength 3 input |
| `screens/OrderDetailScreen.tsx` | SEC-05 — maxLength 6 input |
| `screens/LocationManagementScreen.tsx` | SEC-05 — maxLength 6 input |
| `screens/CategoryManagementScreen.tsx` | SEC-05 — maxLength 1 input |
| `screens/NotificationsScreen.tsx` | SEC-05 — maxLength 1 input |
| `screens/AuditLogScreen.tsx` | SEC-05 — maxLength SearchableDropdownModal search |
| `screens/ZoneLayoutEditorScreen.tsx` | SEC-05 — maxLength 1 input |
| `components/ZoneDetailSheet.tsx` | SEC-05 — maxLength 7 input |
| `utils/errorMessages.ts` | SEC-06 — `getErrorMessage(error, operation)` |
| `stores/warehouseStore.ts` | SEC-06 — wrap 27 Supabase error sites |
| `stores/authStore.ts` | SEC-06 — wrap fetchUsers / update role / disabled |
| `screens/LoginScreen.tsx` | SEC-06 — auth fallback generic |
| `screens/ProductDetailScreen.tsx` | SEC-06 — deleteProduct catch + console.error |

---

## 6. Known issues còn open

| KI | Mô tả | Mức độ | Trạng thái |
|----|-------|--------|-----------|
| KI-044 | Format nhập hạn DD/MM/YYYY ở ZoneDetailSheet inline edit | Medium | Resolved |
| KI-045 | ProductsScreen: barcode X clear + barcode text search | High | Resolved |
| KI-046 | Zone overlap race condition khi tạo zone | High | Resolved |
| KI-047 | MapScreen text search không hỗ trợ barcode | Medium | Resolved |
| KI-048 | Thiếu conflict detection khi nhiều user cùng sửa | Medium | Resolved — A5 (optimistic locking `updated_at`) |

---

## 7. Checklist bàn giao

### Group A — Bug Fixes

- [x] **A1** — Format nhập hạn DD/MM/YYYY (`ZoneDetailSheet`) — KI-044
- [x] **A2** — ProductsScreen barcode: X restore + incremental search + barcode text — KI-045
- [x] **A3** — Zone overlap race condition (`MapScreen`, store) — KI-046
- [x] **A4** — MapScreen search barcode text — KI-047
- [x] **A5** — Conflict detection optimistic locking — KI-048

### Group B — UX Improvements

- [x] **B1** — Badge "Đã giảm giá" ngay trên card (`NotificationsScreen`)
- [x] **B2** — Chuyển lô gồm zone hiện tại (`ZoneDetailSheet`)
- [x] **B3** — `normalizeText` bỏ qua ký tự đặc biệt (`utils/textUtils.ts`)
- [ ] **B4** — MM/YYYY → ngày 1 (`ZoneDetailSheet`, `AddInventoryScreen`)
- [x] **B5** — Hint text AddInventoryScreen
- [x] **B6** — Sửa tên SP inline tại ZoneDetailSheet (nút ✏️/✕/✓ trên hàng lô; lưu bằng ✓)
- [x] **B7** — Map search/locate → mở ZoneDetailSheet + scroll/highlight SP
- [x] **B8** — Toggle cảnh báo global (Settings + `warningStore` → toàn app qua `statusUtils`)

### Group C — Realtime

- [x] **C1** — Realtime `zones` + `inventory_entries` trên MapScreen (`private: true`, debounce 2s); migration publication `zones`; `markOwnMutation` skip self-refresh

### Group D — Feature Completion

- [ ] **D1 / F27** — 2 tab trong list + active list + PDF tổng hợp + flow Confirm
- [ ] **D2 / F28** — `discontinued_reason` migration + UI
- [x] **D3 / F08** — Supabase Storage bucket + migration RLS
- [x] **D3 / F08** — Cài `expo-image-picker`, `expo-image-manipulator`, `expo-file-system` (gỡ `react-native-image-viewing` → custom `ImageViewerModal`)
- [x] **D3 / F08** — `utils/imageUtils.ts`: `uploadProductImage`, `deleteProductImage`, compress
- [x] **D3 / F08** — `warehouseStore`: `updateProductImage`, `removeProductImage`; `deleteProduct` xóa Storage
- [x] **D3 / F08** — `ProductsScreen`: xóa nút ✏️ card (edit chuyển ProductDetail)
- [x] **D3 / F08** — `ProductsScreen`: thumbnail 64×64 + zoom + upload
- [x] **D3 / F08** — `ProductDetailScreen`: image block + zoom + upload + xóa ảnh
- [x] **D3 / F08** — `AddInventoryScreen`: ô ảnh optional khi tạo SP mới

### Group E — New Features

- [x] **E1 / F23** — DashboardScreen + entry Settings
- [x] **E2 / F24** — RBAC `user_profiles` + UserManagementScreen + guards
  - [x] **E2 / F24 Task 1** — migration `user_profiles` + `authStore` + guard `is_disabled` + load role
  - [x] **E2 / F24 Task 2** — hooks RBAC + guard guest read-only toàn app + card User Management (admin)
  - [x] **E2 / F24 Task 3** — UserManagementScreen + RPC list users + toggle role/disabled

### Security

- [x] **SEC-05** — `maxLength` trên TextInput — KI-017
- [x] **SEC-06** — Generic error messages — KI-018

### Docs & QA

- [ ] Cập nhật §2–§5 file này khi từng nhóm Done
- [ ] Chạy `TESTCASES_3.md` (TC-301 → TC-365)
- [ ] `SUMMARY_3.md` closeout khi Phase 3 kết thúc

---

## 8. Hướng dẫn chạy local

```bash
git clone <repo-url>
cd chino-warehouse
npm install
```

Tạo file `.env` ở root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Chạy dev server:

```bash
npx expo start
```

Mở **Expo Go** trên điện thoại (cùng WiFi) → quét QR code.

**Lưu ý:** Cần tài khoản user đã tạo trên Supabase Dashboard → Authentication → Users (app không có đăng ký tự phục vụ).
