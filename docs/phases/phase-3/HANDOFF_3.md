# Phase 3 — Handoff

**Phiên bản:** closeout Phase 3 | Tháng 7/2026

---

## 1. Tổng quan Phase 3

Phase 3 ổn định multi-user (conflict + Realtime map), hoàn thiện nợ Phase 2 (**F28**, **F08**), thêm **F23 Dashboard** + **F24 RBAC**, security **SEC-05/06**, và **Group F** (scanner nav, block xóa lô, archive sync, Internal Notes, barcode autofill, ZonePicker). **F27 mở rộng** chưa code → Phase 4. **F19 Dropped**.

Chi tiết plan: **`docs/phases/phase-3/PLAN_3.md`**. Tổng kết: **`SUMMARY_3.md`**.

---

## 2. Tính năng đã implement

| Feature | Mô tả | File chính |
|---------|-------|------------|
| **A1–A5** | Hạn DD/MM/YYYY; Products/Map barcode search; zone overlap; conflict `updated_at` | `dateUtils.ts`, `ProductsScreen`, `MapScreen`, `conflictUtils.ts`, migrations updated_at |
| **B1–B8** | Badge giảm giá; chuyển lô cùng zone; normalizeText; MM/YYYY; hints; sửa tên ZoneDetail; Map→sheet scroll; warning toggles | `NotificationsScreen`, `ZoneDetailSheet`, `textUtils`, `warningStore`, `AddInventoryScreen` |
| **C1** | Realtime zones + inventory trên Map | `MapScreen`, `20260528120000_add_zones_to_realtime.sql` |
| **F28** | `discontinued_reason` | migration F28, `DiscontinuedProductsScreen`, `NotificationsScreen`, store |
| **F08** | Ảnh SP Storage + 3 màn | `imageUtils.ts`, `ImageViewerModal`, Products/Detail/AddInventory, migration storage |
| **F23** | Dashboard tổng quan | `DashboardScreen`, `dashboardStats.ts`, `SimplePieChart` |
| **F24** | RBAC user_profiles + UserManagement + RLS staff+ | `authStore`, `UserManagementScreen`, migrations `20260601_*` |
| **SEC-05/06** | maxLength; generic errors | 12+ screens, `errorMessages.ts`, warehouseStore/authStore |
| **F1 / KI-057** | Scanner out-of-stock → returnTab + stack Main+Detail | `BarcodeScannerScreen`, `tabNavigation.ts` |
| **F2 / KI-058** | Chỉ xóa lô qty = 0 | ProductDetail, ZoneDetailSheet, `deleteInventoryEntry` |
| **F3** | Ẩn archived ZoneDetail; toggle archived local state | ZoneDetailSheet, ProductsScreen (KI-059/060) |
| **F4** | Tap kho → Map | `LocationManagementScreen` |
| **F5** | Filter chưa ảnh | `ProductsScreen` |
| **F31** | Internal Notes + free-name | `InternalNotesScreen`, migrations `20260717_*` |
| **F7** | Autofill barcode lô sau quét+chọn | `AddInventoryScreen` (`pendingLotBarcodeRef`) |
| **F8** | ZonePicker map dời lô | `ZonePickerScreen`, ZoneDetailSheet navigate |
| **product_barcodes** | Lịch sử mã UNIQUE + CONFLICT audit | migrations B1/B2, warehouseStore barcode actions |

---

## 3. Migration files đã tạo (Phase 3)

| File | Mô tả |
|------|-------|
| `20260528120000_add_zones_to_realtime.sql` | C1 — `zones` → `supabase_realtime` |
| `20260529122000_add_updated_at_to_products.sql` | A5 — `products.updated_at` |
| `20260529123000_add_updated_at_triggers.sql` | A5 — triggers inventory + zones |
| `20260530001000_f08_product_images_storage.sql` | F08 — bucket `product-images` + RLS |
| `20260530002000_f28_add_discontinued_reason.sql` | F28 — `discontinued_reason` |
| `20260530190000_sync_missing_indexes.sql` | KI-049 — indexes |
| `20260530190100_products_is_archived_not_null.sql` | KI-049 — `is_archived` NOT NULL |
| `20260531100000_create_product_barcodes.sql` | `product_barcodes` |
| `20260531120000_audit_barcode_conflict.sql` | RPC `log_barcode_conflict` + action CONFLICT |
| `20260601000000_add_user_profiles.sql` | F24 — `user_profiles` + RPC last_login |
| `20260601000100_add_user_profiles_to_audit.sql` | F24 — audit `user_profiles` |
| `20260601000200_fix_user_profiles_rls_recursion.sql` | KI-054 — SECURITY DEFINER helpers |
| `20260601000300_add_list_users_rpc.sql` | F24 — list users RPC |
| `20260601000400_backfill_last_login_at.sql` | KI-056 — backfill last_login |
| `20260601000500_add_user_profiles_to_realtime.sql` | F24 — realtime kick disable |
| `20260601000600_rls_role_based_writes.sql` | KI-055 — guest SELECT / staff+ mutate |
| `20260717_create_internal_notes.sql` | F31 — `internal_notes` |
| `20260717_alter_internal_notes_nullable_product.sql` | F31 — nullable product + custom name |

**Schema tham chiếu:** `supabase/migrations/schema.sql` **v3.18**.

---

## 4. Breaking changes so với Phase 2

- **RBAC bắt buộc đọc `user_profiles`:** login fail / disabled kick; guest không CRUD (UI + RLS).
- **RLS role-based writes (KI-055):** guest chỉ SELECT trên bảng kho; staff+ mới INSERT/UPDATE/DELETE; Storage product-images write staff+.
- **Ẩn/khôi phục SP** chỉ từ ProductDetail (không còn modal edit trên Products card).
- **Xóa lô** chỉ khi `quantity_boxes === 0` (UI + store reject).
- **Chuyển lô** không còn modal dropdown — mở `ZonePicker` fullscreen.
- **F08:** cần apply migration Storage trên Supabase trước khi upload ảnh trên thiết bị.

---

## 5. Files quan trọng đã thêm/sửa Phase 3

**Files mới:**
- `screens/DashboardScreen.tsx`, `UserManagementScreen.tsx`, `InternalNotesScreen.tsx`, `ZonePickerScreen.tsx`
- `components/ImageViewerModal.tsx`, `SimplePieChart.tsx`
- `stores/warningStore.ts`, `stores/authStore.ts` (mở rộng lớn)
- `utils/dateUtils.ts`, `imageUtils.ts`, `conflictUtils.ts`, `dashboardStats.ts`, `errorMessages.ts`
- `lib/presence.ts`, `lib/tabNavigation.ts` (bổ sung stack ProductDetail)
- ~18 migrations (xem §3)

**Files sửa lớn:**
- `App.tsx` — SettingsStack (Dashboard, UserManagement, InternalNotes, ProductDetail); MapStack ZonePicker; auth profile/presence
- `stores/warehouseStore.ts` — images, barcodes, internal notes, conflict-related flows
- `types/index.ts` — UserProfile, InternalNote, ProductBarcode, …
- `screens/MapScreen.tsx` — Realtime C1, B7 sheet scroll, F24 guards
- `components/ZoneDetailSheet.tsx` — A1/B6/F2/F3/F8 navigate ZonePicker
- `screens/ProductsScreen.tsx` — A2, F08 thumbnail, F5, archived local state
- `screens/AddInventoryScreen.tsx` — F08 ảnh, F7 autofill, B5 hints
- `screens/ProductDetailScreen.tsx` — F08, F2, archive, barcodes
- `screens/NotificationsScreen.tsx` — B1, B8, F28 reason
- `screens/SettingsScreen.tsx` — B8, Dashboard, Ghi chú, User Management
- `screens/BarcodeScannerScreen.tsx` — F1 / KI-057

---

## 6. Known issues còn open

| KI | Mô tả | Mức độ | Trạng thái |
|----|-------|--------|-----------|
| KI-023 | SEC-12 console.log production | Low | Open → Phase 4 |
| KI-024 | SEC-13 npm audit | Low | Open → Phase 4 |
| KI-025 | SEC-14 .env gitignore | Low | Open → Phase 4 |
| KI-050 | toggleDeferred dead path | Low | Open (chấp nhận tạm) |
| KI-026 | AuditLog Realtime | Low | Deferred |
| KI-039 | Fetch thừa re-focus | Medium | Deferred → Phase 4 |
| KI-040 | fetchProducts no limit | Medium | Deferred → Phase 4 |

---

## 7. Checklist bàn giao

### Done Phase 3

- [x] A1–A5, B1–B8, C1
- [x] D2 F28, D3 F08
- [x] E1 F23, E2 F24
- [x] SEC-05, SEC-06, SEC-09 (F24)
- [x] F1–F8 / F31
- [x] `SUMMARY_3.md` closeout
- [x] `TESTCASES_3.md` đầy đủ (TC-301+)
- [x] Sync REQUIREMENTS / KNOWN_ISSUES / PLAN_3

### Carry / Phase 4

- [ ] **D1 / F27** — 2 tab + PDF + list active
- [ ] F21, F25, F26, F32–F36
- [ ] SEC-12/13/14, KI-039/040
- [ ] Chạy smoke TESTCASES_3 trên thiết bị / APK
- [ ] Apply mọi migration Phase 3 trên Supabase production (nếu chưa)

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

**Lưu ý:**
- Cần user trên Supabase Auth + bản ghi `user_profiles` (role phù hợp).
- Apply migrations Phase 3 (đặc biệt Storage F08, `user_profiles`, `internal_notes`) trước khi test ảnh / RBAC / ghi chú.
