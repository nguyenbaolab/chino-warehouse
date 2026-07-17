# Phase 3 — Tổng kết

**Phiên bản tài liệu:** closeout Phase 3 | Tháng 7/2026

---

## 1. Tổng quan Phase 3

### Mục tiêu

Ổn định app multi-user (conflict detection, Realtime map), cải thiện UX vận hành hàng ngày, hoàn thiện nợ Phase 2 (F28 lý do discontinued, F08 ảnh SP), bổ sung Dashboard (F23) + RBAC đầy đủ (F24), security High (SEC-05/06), và Group F (navigation scanner, block xóa lô, sync archive, Internal Notes, barcode autofill, dời lô bằng map).

### Kết quả

- **28/29** task PLAN Done; **1 carry** — F27 mở rộng (2 tab + PDF) → Phase 4.
- **F19 Dropped** — không implement.
- Bugs A1–A5 (KI-044→048) Resolved; UX B1–B8 Done; C1 Realtime zones Done.
- F08 ảnh + Storage Done; F28 `discontinued_reason` Done; F23 Dashboard Done; F24 RBAC + RLS role-based Done.
- Group F (F1–F8 / F31 Internal Notes) Done.
- SEC-05 / SEC-06 Resolved; SEC-09 (KI-020) Resolved qua F24.
- Ngoài PLAN: bảng `product_barcodes` + audit CONFLICT (RPC).

---

## 2. Tính năng đã hoàn thành

| Mã | Tóm tắt |
|----|---------|
| A1 | Hạn DD/MM/YYYY ZoneDetail (+ ProductDetail); `utils/dateUtils.ts` — KI-044 |
| A2 | ProductsScreen: X restore list + incremental search + barcode text — KI-045 |
| A3 | MapScreen zone overlap + anti double-tap — KI-046 |
| A4 | MapScreen search barcode text — KI-047 |
| A5 | Conflict detection optimistic lock `updated_at` — KI-048 |
| B1 | Badge «Đã giảm giá» trên header card Notifications |
| B2 | Chuyển lô gồm zone hiện tại (sau F8: ZonePicker mọi zone kho) |
| B3 | `normalizeText` bỏ ký tự đặc biệt |
| B4 | MM/YYYY → ngày 1 (gộp dateUtils / A1) |
| B5 | Hint text AddInventoryScreen |
| B6 | Sửa tên SP inline ZoneDetailSheet |
| B7 | Map search/locate → mở ZoneDetailSheet + scroll/highlight SP |
| B8 | Toggle cảnh báo hết hạn / hết hàng global (`warningStore`) |
| C1 | Realtime `zones` + `inventory_entries` trên Map; publication `zones`; `markOwnMutation` |
| D2 / F28 | Cột `discontinued_reason` + UI modal / DiscontinuedProducts |
| D3 / F08 | Ảnh SP: Storage `product-images`, 3 màn upload, ImageViewerModal, compress |
| E1 / F23 | DashboardScreen + card Settings; pie chart; navigate stat cards |
| E2 / F24 | `user_profiles`, UserManagement, guest read-only, RLS staff+ (KI-054–056) |
| SEC-05 | `maxLength` mọi TextInput — KI-017 |
| SEC-06 | Generic error messages (`getErrorMessage`) — KI-018 |
| F1 | Scanner «Hàng đã hết» → returnTab + stack Main+ProductDetail — KI-057 |
| F2 | Block xóa lô khi còn thùng — KI-058 |
| F3 | Ẩn lô SP archived trong ZoneDetail; toggle Chỉ SP đã ẩn; KI-059/060 |
| F4 | Tap card kho → tab Map + `setSelectedLocation` |
| F5 | Toggle «Chưa có ảnh» ProductsScreen |
| F6 / F31 | Internal Notes (nullable product_id + custom name) — KI-061 liên quan |
| F7 | Barcode lô autofill sau quét + chọn SP (`pendingLotBarcodeRef`) |
| F8 | ZonePicker map fullscreen dời lô |
| *(ngoài PLAN)* | `product_barcodes` UNIQUE + `log_barcode_conflict` / audit CONFLICT |

---

## 3. Tính năng chưa hoàn thành → Phase 4

| Hạng mục | Ghi chú |
|----------|---------|
| **D1 / F27 mở rộng** | 2 tab Hàng trong kho / Hàng mới, list active, số thùng trống đến Confirm, PDF tổng hợp, flow Draft→Confirm→PDF→Đã đặt — **chưa code** |
| **F19** | **Dropped** — không implement |
| **F21** | Offline mode |
| **F25** | Báo cáo / Xuất dữ liệu |
| **F26** | Kiểm kho |
| **F32** | Cảnh báo per SP (`ignore_expiry_warning` / `ignore_stock_warning`) |
| **F33** | Lô «Đã lên kệ» (`is_on_shelf`) |
| **F34** | Picking list / giỏ hàng |
| **F35** | Push notification local 11:00 |
| **F36** | Shelf Management («Hàng đang bán») — gộp nghiệp vụ với F33 |
| **SEC-10** | Backup script (KI-021 Mitigated; caveat RBAC) |
| **SEC-12** | `console.log` guard (KI-023 Open) |
| **SEC-13** | Dependency audit (KI-024 Open) |
| **SEC-14** | `.env.*` gitignore (KI-025 Open) |
| **KI-039** | `useFocusEffect` fetch thừa — TTL cache |
| **KI-040** | `fetchProducts` không limit — pagination DB |

---

## 4. Quyết định thiết kế quan trọng (Phase 3)

Tóm tắt — chi tiết trong **[`docs/DECISIONS.md`](../../DECISIONS.md)**:

- **F19 Dropped:** Không chuyển hàng giữa khu vực — xóa/chuyển lô trong kho đủ nghiệp vụ.
- **A5 Conflict:** Optimistic lock `updated_at`; Alert Ghi đè / Xem lại (lô, zone, SP).
- **B8 Warning toggles:** 2 Switch Settings, AsyncStorage; tắt màu/badge, vẫn hiện list SP.
- **Hạn:** TextInput DD/MM/YYYY; MM/YYYY → ngày 01.
- **F08:** 1 ảnh/SP path `{productId}.jpg`, compress client, upload 3 màn, xóa Storage kèm DB.
- **Ẩn SP:** Archive chỉ từ ProductDetail; bỏ ✏️ trên Products card.
- **F24 RBAC:** `super_admin` / `admin` / `staff` / `guest` (+ disabled); guard client + RLS staff+ writes.
- **SEC-05/06:** maxLength; generic errors không lộ schema.
- **product_barcodes:** lịch sử mã UNIQUE per hệ thống; audit CONFLICT khi gán trùng.
- **F2:** Chỉ xóa lô khi `quantity_boxes === 0`.
- **F3:** `is_archived` ẩn ZoneDetail; AddInventory vẫn gợi ý archived; Products toggle archived dùng **local state** (không ghi đè `store.products`).
- **F4:** Tap body card kho → Map.
- **F31:** Internal Notes tách F27; cho phép tên tự do (`custom_product_name`).
- **F8:** Chọn zone đích bằng map fullscreen (`ZonePickerScreen`).
- **F36:** Shelf Management design chốt → Phase 4 (cùng F33).

---

## 5. Security Phase 3 — Tổng kết

| SEC | Mô tả | KI | Trạng thái |
|-----|-------|----|-----------|
| SEC-05 | Input validation `maxLength` | KI-017 | **Resolved** |
| SEC-06 | Generic error messages | KI-018 | **Resolved** |
| SEC-09 | RBAC đầy đủ (F24) | KI-020 | **Resolved** (Phase 3) |
| SEC-10 | Backup script | KI-021 | Mitigated — Deferred tinh chỉnh Phase 4 |
| SEC-12 | `console.log` production | KI-023 | Open → Phase 4 |
| SEC-13 | Dependency audit | KI-024 | Open → Phase 4 |
| SEC-14 | `.env.*` gitignore | KI-025 | Open → Phase 4 |

**Tóm tắt Phase 3 security:** SEC-05/06/09 Done; SEC-10 Mitigated; SEC-12/13/14 Open → Phase 4.

---

## 6. Known issues còn open

| KI | Mô tả | Mức độ | Trạng thái |
|----|-------|--------|-----------|
| KI-023 | SEC-12: `console.log` production | Low | Open → Phase 4 |
| KI-024 | SEC-13: Dependency audit | Low | Open → Phase 4 |
| KI-025 | SEC-14: `.env.*` gitignore | Low | Open → Phase 4 |
| KI-050 | `toggleDeferred` dead path | Low | Open (chấp nhận tạm) |
| KI-026 | AuditLog Realtime | Low | Deferred |
| KI-039 | Fetch thừa khi re-focus | Medium | Deferred → Phase 4 |
| KI-040 | `fetchProducts` không limit | Medium | Deferred → Phase 4 |

*(KI-020 Resolved qua F24 — không còn open.)*

---

## 7. Số liệu Phase 3

- **Task PLAN:** 29 tổng → **28 Done**, **1 carry** (F27 mở rộng)
- **Migrations mới:** ~18 file incremental (+ `schema.sql` → **v3.18**)
- **Screens mới:** `DashboardScreen`, `UserManagementScreen`, `InternalNotesScreen`, `ZonePickerScreen`
- **Components / utils / stores mới hoặc lớn:** `ImageViewerModal`, `SimplePieChart`, `warningStore`, `authStore`, `dateUtils`, `imageUtils`, `conflictUtils`, `dashboardStats`, `errorMessages`
- **KI tạo Phase 3:** KI-044 → KI-061 (~18); hầu hết Resolved (trừ KI-050 Open chấp nhận)
- **KI A1–A5 / F1–F2:** tất cả Resolved
- **TESTCASES_3:** TC-301+ (xem `TESTCASES_3.md`)

---

## 8. Chuyển sang Phase 4

Ưu tiên đề xuất:

1. **F27 mở rộng** — 2 tab + PDF + list active (nợ D1)
2. **F36 + F33** — Shelf Management / Đã lên kệ
3. **F32** — Cảnh báo per SP
4. **F34** — Picking list
5. **F35** — Push notification local
6. **F26** — Kiểm kho
7. **F25** — Báo cáo / xuất dữ liệu
8. **F21** — Offline
9. **SEC-12/13/14** + **KI-039/040** — hardening & performance

Kế hoạch chi tiết: tạo **`docs/phases/phase-4/PLAN_4.md`** khi bắt đầu Phase 4.
