# Phase 4 — Kế hoạch

**Trạng thái:** In progress | Tháng 7/2026

---

## 1. Tổng quan / Mục tiêu Phase 4

Phase 4 tập trung vào **Market mode (F36 redesign)** — switcher Warehouse ↔ Market reuse schema `locations` / `zones` / `inventory_entries`; **cảnh báo per SP (F32)**; hoàn thiện **F27 mở rộng** (carry Phase 3); **performance / cleanup** (KI-039/040/050) và **security còn lại** (SEC-10/12/13/14). Offline / báo cáo / kiểm kho (F21/F25/F26) nằm trong Group G — **có thể defer Phase 5**.

**F19:** Dropped từ Phase 3 — không mở lại.
**F33:** Dropped — không implement `is_on_shelf` (xem `DECISIONS.md`).
**F34 / F35:** Deferred → **Phase 5** (picking list, push notification).
**Shelf tables C1:** sẽ **rollback** — thay bằng Market mode (xem Group C + `DECISIONS.md`).

**Nguồn tham chiếu:** `docs/project/REQUIREMENTS.md`, `docs/project/CONTEXT.md`, `docs/DECISIONS.md`, `docs/KNOWN_ISSUES.md`, `docs/phases/phase-3/SUMMARY_3.md`, `docs/phases/phase-3/PLAN_3.md`.

**Kế thừa Phase 3:** Auth + RBAC (F24), Dashboard (F23), ảnh SP (F08), Internal Notes (F31), conflict detection, Realtime map, ZonePicker dời lô, SEC-05/06.

---

## 2. Group A — Bug fix + performance (carry Phase 3)

### A1 — KI-039: TTL cache / giảm fetch thừa `useFocusEffect` ✅ Done

- **File:** InternalNotes, StockCheck, LocationManagement, Discontinued, ProductDetail, ZoneLayoutEditor, OrderList, UserManagement
- **Mô tả:** TTL 30s (`FOCUS_FETCH_TTL_MS`); ProductDetail force fetch khi đổi `productId`.
- **KNOWN_ISSUES:** KI-039 → Resolved.

### A2 — KI-040: Pagination DB Products (hybrid) ✅ Done

- **File:** `stores/warehouseStore.ts` (`fetchProductsPage`), `screens/ProductsScreen.tsx`
- **Mô tả:** Giữ `fetchProducts` full cho màn khác. ProductsScreen: search server-side `.ilike` (debounce 300ms), max 200; barcode digits → `product_barcodes`; zone/stock/special filter local; pagination UI client giữ nguyên.
- **KNOWN_ISSUES:** KI-040 → Mitigated (hybrid).

### A3 — KI-050: Xóa dead path `toggleDeferred` ✅ Done

- **File:** `stores/warehouseStore.ts`, `types/index.ts`, `schema.sql` (comment DEPRECATED)
- **Mô tả:** Xóa store action + type field; cột DB `is_deferred` giữ backward compat.
- **KNOWN_ISSUES:** KI-050 → Resolved.

---

## 3. Group B — Feature completion (carry Phase 3)

### B1 — D1 / F27 mở rộng: 2 tab + PDF tổng hợp

- **Files:** `screens/OrderListScreen.tsx`, `screens/OrderDetailScreen.tsx`, `stores/warehouseStore.ts` (+ PDF lib nếu cần)
- **Tham chiếu:** `REQUIREMENTS.md` §6 F27, `DECISIONS.md` list đặt hàng 2 tab
- **Mô tả:**
  - Mỗi list: tab **Hàng trong kho** / **Hàng mới**
  - Một list **active**; auto tạo + popup đặt tên nếu chưa có
  - SP từ Sắp hết hàng → tab trong kho, ô số thùng **trống**, bắt buộc điền trước Confirm
  - Nhóm theo category + **Chưa phân loại**
  - Tab Hàng mới: tên, phân loại, số thùng, ghi chú
  - Flow: **Draft → Confirm → Xuất PDF (gộp 2 tab) → Đã đặt**

---

## 4. Group C — Market mode (thay thế F33+F36 Shelf Management)

> **Redesign (tháng 7/2026):** Bỏ 3 bảng shelf riêng. Market = `locations.type = 'market'`, reuse zones + `inventory_entries`. Qty cùng cột `quantity_boxes` — UI label **«thùng»** (warehouse) / **«sản phẩm»** (market). Xem `DECISIONS.md`.

### C1 — Rollback shelf tables + migration mới — ✅ Done (tháng 7/2026)

- Migration `20260719_rollback_shelf_add_market_columns.sql` (giữ nguyên `20260718_create_shelf_tables.sql` trong lịch sử)
- Xóa types `ShelfZone`, `ShelfItem`, `ShelfZoneItem`; bỏ `'shelf_items'` khỏi `AuditLog`
- `schema.sql` **v4.1**: không còn shelf; thêm `locations.type`, `inventory_entries.is_special`, `is_checked`
- Migration đã ADD:
  - `locations.type` TEXT NOT NULL DEFAULT `'warehouse'` (`'warehouse' | 'market'`)
  - `inventory_entries.is_special` BOOLEAN NOT NULL DEFAULT false
  - `inventory_entries.is_checked` BOOLEAN NOT NULL DEFAULT false

### C2 — Mode switcher UI ✅ Done

- Header dropdown: **Chino's Warehouse** ↔ **Chino's Market**
- Filter toàn app theo `location.type` (Map / `fetchLocations`)
- Tab **Kho** label → **Siêu thị** khi market mode
- Tab Sản phẩm: **4 toggles luôn hiện** (không swap); FilterModal Mode/Kho/Zone **local** (không đổi `appMode`)
- Label qty: **«thùng»** / **«sản phẩm»** via `getQtyUnit()`
- **Follow-up:** `FilterModal` shared Products/Notifications/Dashboard; AuditLog + Mode filter (REQUIREMENTS v1.3.17)


### C3 — Notifications nâng cấp ✅ Done

- Dropdown type: **FilterModal** Mode (Tất cả / Kho / Siêu thị) — đã có từ v1.3.17
- Date range filter (**tab Sắp hết hạn only**): **Từ** (hôm nay) — **Đến** (mặc định +30 ngày); expired luôn hiện; warning filter by range
- Tab Sắp hết hàng: chỉ FilterModal Mode/Kho/Zone, **không** date range

### C4 — Checklist kiểm hàng ✅ Done

- Settings → màn **Kiểm hàng** (`StockCheckScreen`): list market items có `is_special = true`
- Mỗi item: checkbox tick → `is_checked = true` (`updateInventoryEntry`; `canWrite`)
- Nút **Reset** → `resetMarketChecklist` set tất cả `is_checked = false` (is_special + đang checked)
- Group C (Market mode) **hoàn tất** (C1–C4)

---

## 5. Group D — Cảnh báo per SP (F32)

### D1 — Migration ignore flags ✅ Done

- **Files:** migration `20260719_f32_ignore_warning_flags.sql`, `types` Product, schema.sql v4.2
- **Mô tả:** `products.ignore_expiry_warning`, `ignore_stock_warning` BOOLEAN default false.

### D2 — Switch trên ProductDetail ✅ Done

- **File:** `screens/ProductDetailScreen.tsx` section Chi tiết
- **Mô tả:** 2 switch bật/tắt ignore; lưu supabase trực tiếp + patch store.

### D3 — Notifications + Dashboard skip ✅ Done

- **Files:** `NotificationsScreen`, `dashboardStats.ts`
- **Mô tả:** SP có flag tương ứng không vào count/list cảnh báo hết hạn hoặc hết hàng.

---

## 6. Group E — Picking list (F34) — **Deferred Phase 5**

### E1 — Schema picking *(Phase 5)*

- Schema `picking_lists`, `picking_list_items`, types, RLS.

### E2 — PickingListScreen *(Phase 5)*

- Tạo đơn; autocomplete + ảnh; nhóm kho/zone/tầng.

### E3 — Checklist + confirm trừ tồn *(Phase 5)*

- Tick khi lấy xong; confirm → trừ `quantity_boxes`.

---

## 7. Group F — Push notification (F35) — **Deferred Phase 5**

### F1 — Local scheduled 11:00 *(Phase 5)*

### F2 — Nội dung từ dữ liệu hạn *(Phase 5)*

### F3 — Permission + opt-out Settings *(Phase 5)*

---

## 8. Group G — Offline / Báo cáo / Kiểm kho (có thể defer Phase 5)

> **Lưu ý:** Có thể **defer** một hoặc nhiều task sang Phase 5. Không chặn closeout Group C–D nếu G chưa làm.

### G1 — F21 Offline mode

- Zustand persist + sync queue khi mất mạng; đồng bộ khi có mạng.

### G2 — F25 Báo cáo / xuất dữ liệu

- Xuất tồn kho / lịch sử (CSV/PDF hoặc share sheet).

### G3 — F26 Kiểm kho

- Chọn zone → đếm từng tầng → diff vs hiện tại → confirm cập nhật.
- *Khác C4 «Kiểm hàng» market checklist (`is_special` / `is_checked`).*

---

## 9. Group H — Security

| Task | SEC / KI | Mô tả | Mức độ |
|------|----------|-------|--------|
| **H1** | SEC-10 / KI-021 | Backup script — tinh chỉnh auth (service_role hoặc admin backup); hiện Mitigated anon+login | Medium |
| **H2** | SEC-12 / KI-023 | Wrap `console.log` / `console.error` bằng `__DEV__` | Low |
| **H3** | SEC-13 / KI-024 | `npm audit` trước release; patch deps | Low |
| **H4** | SEC-14 / KI-025 | Đảm bảo `.gitignore` cover `.env.*` | Low |
| **H5** | KI-026 | AuditLogScreen Realtime — **có thể defer tiếp** (pagination phức tạp) | Low |

---

## 10. Barcode & dữ liệu mã

- Phase 3 đã có `product_barcodes` UNIQUE + audit CONFLICT + F7 autofill AddInventory.
- Phase 4 Market mode: **reuse** `searchByBarcode` / `lookupProductByBarcode` / `onScanFillBarcode` trên cả warehouse và market locations.
- Edge case BLK-001 Closed — không mở lại trừ nghiệp vụ mới.

---

## 11. Security Phase 4 — bảng trạng thái

| SEC | KI | Mô tả | Trạng thái đầu Phase 4 |
|-----|-----|-------|------------------------|
| SEC-10 | KI-021 | Backup script | Mitigated → H1 refine |
| SEC-12 | KI-023 | console.log production | Open → H2 |
| SEC-13 | KI-024 | Dependency audit | Open → H3 |
| SEC-14 | KI-025 | `.env.*` gitignore | Open → H4 |
| — | KI-026 | AuditLog Realtime | Deferred (H5 optional) |

*(SEC-05/06/09 đã Done Phase 3.)*

---

## 12. Deferred → Phase 5 (dự kiến)

| Hạng mục | Ghi chú |
|----------|---------|
| **F34** Picking list (Group E) | Defer — không chặn vận hành Market mode |
| **F35** Push notification (Group F) | Defer — không chặn vận hành |
| **Group G** (F21 / F25 / F26) | Có thể defer tiếp nếu ưu tiên thấp hơn Market + F32 |
| **KI-026** | AuditLog Realtime nếu H5 không làm |
| **Dropped** | **F33** `is_on_shelf`; F19; Shelf tables (rollback C1) |

---

## 13. Tài liệu đi kèm Phase 4

| File | Mục đích |
|------|----------|
| `docs/phases/phase-4/PLAN_4.md` | File này |
| `docs/phases/phase-4/HANDOFF_4.md` | Tạo khi Phase 4 kết thúc |
| `docs/phases/phase-4/TESTCASES_4.md` | Tạo khi Phase 4 kết thúc |
| `docs/phases/phase-4/SUMMARY_4.md` | Tạo khi Phase 4 kết thúc |
| `docs/phases/phase-4/USER_GUIDE_4.md` | (optional) hướng dẫn user Phase 4 |

---

## 14. Tóm tắt scope (đếm task)

| Group | Số task | Mã |
|-------|---------|-----|
| **A — Bug / perf** | 3 | A1–A3 ✅ Done (KI-039/040/050) |
| **B — Feature completion** | 1 | B1 (F27 mở rộng) |
| **C — Market mode** | 4 | C1 ✅ Done, C2 ✅ Done, C3 ✅ Done, C4 ✅ Done (F36 redesign — Group C complete) |
| **D — Per-SP warning** | 3 | D1–D3 ✅ Done (F32) |
| **E — Picking** | 3 | E1–E3 (F34) — **Deferred Phase 5** |
| **F — Push** | 3 | F1–F3 (F35) — **Deferred Phase 5** |
| **G — Offline/Report/Stocktake** | 3 | G1–G3 — có thể defer |
| **H — Security** | 5 | H1–H5 |
| **Tổng active Phase 4** | **~16** | A+B+C+D+H (không tính E/F; G optional) |

**Ưu tiên đề xuất:** **C1 → C2 → C3 → C4 → D (F32) → A/H** → B1 / G tùy thực tế. E/F không làm trong Phase 4.
