# Phase 4 — Handoff

**Trạng thái:** Closed | Tháng 7/2026

---

## 1. Cách chạy

- Clone repo → `npm install` → `npx expo start`
- Supabase: apply migrations theo thứ tự (phase-4: `20260719_rollback_shelf_add_market_columns.sql`, `20260719_f32_ignore_warning_flags.sql`)
- Build APK: `bash build.sh` trong WSL2 Ubuntu (xem `BUILD_APK_GUIDE.md`)
- Backup: `node --env-file=.env --experimental-strip-types backup.ts`

---

## 2. Biến môi trường

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `.env` đã trong `.gitignore` (+ `.env.*`)

---

## 3. Schema hiện tại

- **Version:** v4.2
- **Migrations Phase 4:** 2 file (xem §1)
- **Bảng chính:** locations (+ `type`), zones, products (+ `ignore_expiry/stock_warning`), inventory_entries (+ `is_special`, `is_checked`), product_barcodes, product_categories_l1/l2, order_lists, order_items, internal_notes, audit_logs, user_profiles
- **Shelf tables:** rolled back (migration giữ trong repo cho history)

---

## 4. Cấu trúc navigation

- Auth gate → Login hoặc Tabs
- Bottom tabs: Map (Kho/Siêu thị) · Products · Orders · Notifications · Settings
- MapStack, ProductsStack, OrdersStack, NotificationsStack, SettingsStack
- StockCheck trong SettingsStack (Phase 4 mới)
- BarcodeScanner fullscreen modal ở Root

---

## 5. Carry / Deferred → Phase 5

| Hạng mục | Ghi chú |
|----------|---------|
| **B1 F27 mở rộng** | 2 tab + PDF + list active — carry từ Phase 3→4→5 |
| **F34 Picking list** | Schema + screen + checklist |
| **F35 Push notification** | expo-notifications local 11:00 |
| **F21 Offline mode** | Zustand persist + sync queue |
| **F25 Báo cáo** | CSV/PDF xuất tồn kho |
| **F26 Kiểm kho** | Đếm → diff → confirm |
| **KI-026** | AuditLog Realtime |
| **Expo major** | npm audit transitive fix |

---

## 6. Lưu ý kỹ thuật

- `store.locations` đã filter theo `appMode` — các màn cần ALL locations phải query riêng (LocationManagement, FilterModal)
- `fetchProducts` vẫn load full — `fetchProductsPage` chỉ cho ProductsScreen
- FilterModal mode là filter **local**, không gọi `setAppMode`
- Date range Notifications có 2 chế độ: mặc định (checkbox expired/warning) vs kích hoạt range (mọi lô)
- `is_deferred` cột DB giữ backward compat — type/store đã xóa
- Warning toggles global (Settings) ẩn toàn bộ list Notifications khi tắt
