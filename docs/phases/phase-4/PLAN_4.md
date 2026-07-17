# Phase 4 — Kế hoạch

**Trạng thái:** In progress | Tháng 7/2026

---

## 1. Tổng quan / Mục tiêu Phase 4

Phase 4 tập trung vào **vận hành siêu thị** (Shelf Management F33+F36), **cảnh báo & thông báo** (F32 per-SP, F35 push), **picking list** (F34), hoàn thiện **F27 mở rộng** (carry Phase 3), cùng **performance / cleanup** (KI-039/040/050) và **security còn lại** (SEC-10/12/13/14). Offline / báo cáo / kiểm kho (F21/F25/F26) nằm trong Group G — **có thể defer Phase 5** tùy ưu tiên vận hành thực tế.

**F19:** Dropped từ Phase 3 — không mở lại.

**Nguồn tham chiếu:** `docs/project/REQUIREMENTS.md`, `docs/project/CONTEXT.md`, `docs/DECISIONS.md`, `docs/KNOWN_ISSUES.md`, `docs/phases/phase-3/SUMMARY_3.md`, `docs/phases/phase-3/PLAN_3.md`.

**Kế thừa Phase 3:** Auth + RBAC (F24), Dashboard (F23), ảnh SP (F08), Internal Notes (F31), conflict detection, Realtime map, ZonePicker dời lô, SEC-05/06.

---

## 2. Group A — Bug fix + performance (carry Phase 3)

### A1 — KI-039: TTL cache / giảm fetch thừa `useFocusEffect`

- **File:** nhiều screens dùng `useFocusEffect` / mount fetch; có thể `warehouseStore` helpers
- **Mô tả:** Xác định màn fetch lại không cần thiết khi re-focus; thêm TTL hoặc điều kiện skip khi data còn mới.
- **KNOWN_ISSUES:** KI-039 (Medium) — Deferred Phase 4.

### A2 — KI-040: Pagination DB Products (cursor-based)

- **File:** `stores/warehouseStore.ts` (`fetchProducts`), `screens/ProductsScreen.tsx`
- **Mô tả:** `fetchProducts()` hiện không limit — load toàn bộ `products`. Refactor cursor pagination DB (pattern `AuditLogScreen`) + server-side filter search/kho/zone khi scale lớn.
- **KNOWN_ISSUES:** KI-040 (Medium) — Deferred Phase 4.

### A3 — KI-050: Xóa dead path `toggleDeferred`

- **File:** `stores/warehouseStore.ts`, `types/index.ts`, (optional) migration deprecate `products.is_deferred`
- **Mô tả:** UI không còn tab «Để sau»; `toggleDeferred` là dead path. Dọn store/type; quyết định có drop cột DB hay giữ.
- **KNOWN_ISSUES:** KI-050 (Low, Open chấp nhận tạm).

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

## 4. Group C — Shelf Management (F33 + F36)

### C1 — Migration schema shelf

- **Files:** `supabase/migrations/[timestamp]_create_shelf_*.sql`, `schema.sql`, `types/index.ts`
- **Mô tả:** Tạo `shelf_items`, `shelf_zones`, `shelf_zone_items` (+ RLS staff+ / guest SELECT). Tham chiếu DECISIONS F36.

### C2 — Flag `inventory_entries.is_on_shelf` (F33)

- **Files:** migration, `types`, ProductDetail / ZoneDetailSheet, Map filter
- **Mô tả:** Lô 0 thùng → nút **«Đã lên kệ»**; ẩn khỏi Map/ZoneDetail; giữ `expiry_date` → Notifications vẫn cảnh báo hạn; Products/Detail hiện «Đang bán trên kệ».

### C3 — ShelfManagementScreen (F36)

- **Files:** `screens/ShelfManagementScreen.tsx` (mới), Settings entry, store CRUD
- **Mô tả:** 2 tab **Tất cả** / **Hàng đặc biệt**; list hàng trên kệ (ảnh, tên, hạn, qty **cá thể**, toggle giảm giá **độc lập** kho, notes); CRUD khu; checklist tick; 1 SP nhiều khu; RBAC guest xem / staff+ CRUD.

### C4 — Reset checklist thủ công

- **File:** ShelfManagementScreen + store
- **Mô tả:** Nút **Reset checklist** — **không** tự reset hàng ngày (DECISIONS F36).

---

## 5. Group D — Cảnh báo per SP (F32)

### D1 — Migration ignore flags

- **Files:** migration, `types` Product
- **Mô tả:** `products.ignore_expiry_warning`, `ignore_stock_warning` BOOLEAN default false.

### D2 — Switch trên ProductDetail

- **File:** `screens/ProductDetailScreen.tsx` section Chi tiết
- **Mô tả:** 2 switch bật/tắt ignore; lưu qua store.

### D3 — Notifications + Dashboard skip

- **Files:** `NotificationsScreen`, `DashboardScreen` / `dashboardStats.ts`
- **Mô tả:** SP có flag tương ứng không vào count/list cảnh báo hết hạn hoặc hết hàng.

---

## 6. Group E — Picking list (F34)

### E1 — Schema picking

- **Files:** migration `picking_lists`, `picking_list_items`, types, RLS
- **Mô tả:** Schema đơn lấy hàng + item (product, qty, zone/tier hints, checked).

### E2 — PickingListScreen

- **Files:** screen mới, nav (Settings hoặc tab), store
- **Mô tả:** Tạo đơn; thêm SP autocomplete + ảnh; chỉnh qty; nhóm theo kho/zone/tầng.

### E3 — Checklist + confirm trừ tồn

- **Mô tả:** Tick khi lấy xong; confirm → trừ `quantity_boxes` trên `inventory_entries` (transaction / validate đủ tồn).

---

## 7. Group F — Push notification (F35)

### F1 — Local scheduled 11:00

- **Package:** `expo-notifications` (cần thêm khi implement)
- **Mô tả:** Schedule local notification mỗi ngày **11:00**.

### F2 — Nội dung từ dữ liệu hạn

- **Mô tả:** Check lô sắp hết hạn (theo `warning_days` / global toggles) → text kiểu «N lô sắp hết hạn trong X ngày».

### F3 — Permission + opt-out Settings

- **Files:** SettingsScreen, permission OS
- **Mô tả:** Xin quyền notification; toggle opt-out trong Settings; guest/staff behavior theo RBAC nếu cần.

---

## 8. Group G — Offline / Báo cáo / Kiểm kho (có thể defer Phase 5)

> **Lưu ý:** Có thể **defer** một hoặc nhiều task sang Phase 5 tùy độ ưu tiên vận hành thực tế. Không chặn closeout Group C–F nếu G chưa làm.

### G1 — F21 Offline mode

- Zustand persist + sync queue khi mất mạng; đồng bộ khi có mạng.

### G2 — F25 Báo cáo / xuất dữ liệu

- Xuất tồn kho / lịch sử (CSV/PDF hoặc share sheet).

### G3 — F26 Kiểm kho

- Chọn zone → đếm từng tầng → diff vs hiện tại → confirm cập nhật.

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
- Phase 4: không bắt buộc đổi schema barcode; nếu Shelf/Picking cần quét mã → **reuse** `searchByBarcode` / `lookupProductByBarcode` / `onScanFillBarcode`.
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
| **Group G** (F21 / F25 / F26) | Nếu không kịp / ưu tiên thấp hơn Shelf + F27 |
| **KI-026** | AuditLog Realtime nếu H5 không làm |
| **Dropped** | *(chưa có item mới; F19 vẫn Dropped)* |

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
| **A — Bug / perf** | 3 | A1–A3 (KI-039, KI-040, KI-050) |
| **B — Feature completion** | 1 | B1 (F27 mở rộng) |
| **C — Shelf** | 4 | C1–C4 (F33+F36) |
| **D — Per-SP warning** | 3 | D1–D3 (F32) |
| **E — Picking** | 3 | E1–E3 (F34) |
| **F — Push** | 3 | F1–F3 (F35) |
| **G — Offline/Report/Stocktake** | 3 | G1–G3 (F21/F25/F26) — **có thể defer** |
| **H — Security** | 5 | H1–H5 |
| **Tổng ước tính** | **~25** | (~22 nếu defer toàn bộ G) |

**Ưu tiên đề xuất khi bắt đầu code:** B1 (F27) → C (Shelf) → D (F32) → E (F34) → F (F35) → A/H → G tùy thực tế.
