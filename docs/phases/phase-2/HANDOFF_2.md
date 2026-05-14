# Phase 2 — Handoff

**Phiên bản:** Tháng 5/2026

---

## 1. Tổng quan Phase 2

Phase 2 bổ sung **multi-kho** (F20), **auth bảo mật** (SEC-04, auto-logout), **audit log** (SEC-11), **phân loại sản phẩm 2 cấp** (F30), **Zone Layout Editor** (F29), **Realtime RLS** (SEC-08), và **EAS Build** cho triển khai APK thật. Toàn bộ request giờ yêu cầu JWT authenticated — không còn dùng role `anon`.

---

## 2. Tính năng đã implement

| Feature | Mô tả | File chính |
|---------|-------|------------|
| **F20 — Multi-kho** | Dropdown selector chọn kho trên MapScreen; tạo/sửa/xóa kho; grid size per location (configurable); filter theo kho trên Products/Notifications. | `screens/MapScreen.tsx`, `screens/LocationManagementScreen.tsx`, `stores/warehouseStore.ts` |
| **F29 — Zone Layout Editor** | Compact tile editor, footprint preview, collision check theo tọa độ thật, confirm → `batchUpdateZoneCells`. | `screens/ZoneLayoutEditorScreen.tsx`, `stores/warehouseStore.ts` |
| **F30 — Phân loại sản phẩm** | Category 2 cấp (L1/L2), CRUD trong Settings, gán SP trên ProductDetailScreen và AddInventoryScreen (optional). | `screens/CategoryManagementScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/AddInventoryScreen.tsx` |
| **SEC-04 — Authentication** | LoginScreen (email/password), auth gate trong App.tsx, `persistSession: false`, signOut trên SettingsScreen. | `screens/LoginScreen.tsx`, `App.tsx`, `lib/supabase.ts`, `screens/SettingsScreen.tsx` |
| **SEC-08 — Realtime RLS** | `private: true` trên tất cả Realtime channels; RLS policy trên `realtime.messages`. | `screens/SettingsScreen.tsx`, `screens/DiscontinuedProductsScreen.tsx`, migration `20260513_realtime_rls_sec08.sql` |
| **SEC-11 — Audit Log** | Trigger ghi `audit_logs` khi INSERT/UPDATE/DELETE trên `inventory_entries` và `products`; `AuditLogScreen` với 4 filter + pagination; section lịch sử trong ProductDetailScreen; card trong SettingsScreen. | `screens/AuditLogScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/SettingsScreen.tsx`, `stores/warehouseStore.ts`, migrations `20260513_*.sql` |
| **Auto-logout** | Inactivity timer 20 phút (timestamp-based, check 30s foreground + AppState listener); `persistSession: false` → kill app = logout; Alert chỉ hiện khi auto-logout do inactivity. | `App.tsx`, `lib/supabase.ts` |
| **EAS Build setup** | `expo-updates`, `eas.json` profile preview (APK), `eas update:configure`. | `eas.json`, `app.json`, `package.json` |

---

## 3. Migration files đã tạo

| File | Mô tả |
|------|-------|
| `schema.sql` | Schema gốc + RLS `authenticated_only` trên 8 bảng (thay thế `allow_all` anon) |
| `20260509_add_product_low_stock_thresholds.sql` | `low_warning_boxes`, `warning_days` trên `products` |
| `20260511_add_product_is_deferred.sql` | `products.is_deferred` (Phase 1, không còn dùng trong UI) |
| `20260511_add_product_is_price_reduced.sql` | `products.is_price_reduced` (superseded bởi migration dưới) |
| `20260511_move_is_price_reduced_to_inventory_entries.sql` | Chuyển `is_price_reduced` từ `products` sang `inventory_entries` |
| `20260511_add_product_is_discontinued.sql` | `products.is_discontinued` |
| `20260511_drop_products_barcode.sql` | Xóa `products.barcode` (chuyển sang per lô) |
| `20260511_add_inventory_entries_barcode.sql` | `inventory_entries.barcode` (barcode per lô) |
| `20260511_add_grid_size_to_locations.sql` | `locations.grid_rows`, `locations.grid_cols` |
| `20260511_add_order_lists_and_items.sql` | Bảng `order_lists` + `order_items` |
| `20260512143000_create_product_categories.sql` | Bảng `product_categories_l1` / `product_categories_l2` + RLS |
| `20260512143001_add_category_to_products.sql` | `products.category_level1_id`, `category_level2_id` FK |
| `20260513_realtime_rls_sec08.sql` | RLS policy `authenticated_users_can_receive` + `_can_broadcast` trên `realtime.messages` |
| `20260513_add_audit_logs.sql` | Bảng `audit_logs` + trigger `audit_trigger_fn` + 4 index + RLS |
| `20260513_enrich_audit_trigger.sql` | Trigger v2: nhúng `_product_name`, `_zone_name`, `_location_name` vào JSONB |

---

## 4. Breaking changes so với Phase 1

- **Auth bắt buộc:** mọi Supabase request cần JWT authenticated — RLS đổi từ `anon` allow_all sang `authenticated_only`.
- **SecureStore không còn dùng cho session:** `lib/supabase.ts` dùng `persistSession: false`, không có custom storage.
- **Kill app = logout:** session chỉ sống trong RAM của Supabase client (hành vi có chủ đích).
- **Realtime channels private:** tất cả `.channel()` calls dùng `config: { private: true }` + RLS trên `realtime.messages`.
- **expo-updates:** đã thêm vào `package.json` (cần cho OTA updates qua EAS).
- **Barcode per lô:** `products.barcode` đã bị xóa; barcode giờ nằm trên `inventory_entries.barcode`.

---

## 5. Files quan trọng đã thêm/sửa Phase 2

**Files mới:**
- `screens/LoginScreen.tsx` — màn hình đăng nhập
- `screens/AuditLogScreen.tsx` — lịch sử thay đổi (4 filter + pagination)
- `screens/LocationManagementScreen.tsx` — CRUD kho
- `screens/CategoryManagementScreen.tsx` — CRUD category 2 cấp
- `screens/ZoneLayoutEditorScreen.tsx` — sắp xếp zone
- `screens/DiscontinuedProductsScreen.tsx` — SP không nhập nữa
- `screens/OrderListScreen.tsx` + `screens/OrderDetailScreen.tsx` — đặt hàng
- 15 migration files (xem §3)

**Files sửa lớn:**
- `App.tsx` — auth gate (`getSession` + `onAuthStateChange`), inactivity timer (refs + `setInterval` + `AppState`), wrap navigator bắt touch, tab Đặt hàng, AuditLog routes
- `lib/supabase.ts` — `persistSession: false`, xóa SecureStore adapter
- `stores/warehouseStore.ts` — thêm ~20 actions (locations CRUD, categories CRUD, audit log, orders, discontinued, `fetchAllInventoryEntries`)
- `types/index.ts` — thêm `Location.grid_rows/cols`, `ProductCategoryL1/L2`, `AuditLog`, `OrderList/OrderItem`, `InventoryEntry.barcode`
- `screens/SettingsScreen.tsx` — signOut, card Quản lý kho / Phân loại / Lịch sử / Discontinued, Realtime `private: true`
- `screens/ProductDetailScreen.tsx` — category dropdown, audit log section, barcode per lô
- `screens/MapScreen.tsx` — kho selector, zone editor button, search improvements
- `screens/NotificationsScreen.tsx` — filter theo kho, `fetchAllInventoryEntries`
- `screens/ProductsScreen.tsx` — filter theo kho/zone, category display

---

## 6. Known issues còn open

| KI | Mô tả | Mức độ | Trạng thái |
|----|-------|--------|-----------|
| KI-017 | SEC-05: Input validation thiếu (`maxLength`) | High | Open |
| KI-018 | SEC-06: Error message lộ schema | High | Open |
| KI-019 | SEC-07: Barcode scanner thiếu debounce | High | Open |
| KI-020 | SEC-09: Không có RBAC | Medium | Deferred → Phase 3 |
| KI-021 | SEC-10: Backup script cần `service_role` key | Medium | Open |
| KI-023 | SEC-12: `console.log` trong production | Low | Open |
| KI-024 | SEC-13: Dependency audit | Low | Open |
| KI-025 | SEC-14: `.env.*` coverage gitignore | Low | Open |
| KI-026 | Realtime chưa implement cho AuditLogScreen | Low | Deferred |

---

## 7. Checklist bàn giao

- [ ] Go-live checklist D5–D8 (EAS environment variables + build APK + cài máy)
- [ ] Go-live checklist E1–E8 (smoke test trên thiết bị thật)
- [ ] F27 mở rộng (2 tab + PDF — chưa code)
- [ ] F28 `discontinued_reason` migration (field lý do riêng)
- [ ] F08 hình ảnh sản phẩm
- [ ] F19 chuyển hàng giữa khu vực
- [ ] F26 kiểm kho
- [ ] SEC-05/06/07/12 (medium/low security items)

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
