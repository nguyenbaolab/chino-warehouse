# Phase 4 — Tóm tắt

**Trạng thái:** Closed | Tháng 7/2026

---

## 1. Mục tiêu Phase 4

Market mode (F36 redesign) — switcher Warehouse ↔ Market reuse schema hiện có; cảnh báo per SP (F32); performance/cleanup (KI-039/040/050); security (SEC-10/12/13/14).

---

## 2. Kết quả

| Group | Task | Trạng thái |
|-------|------|-----------|
| **C — Market mode** | C1 rollback shelf + migration | ✅ Done |
| | C2 mode switcher UI | ✅ Done |
| | C3 Notifications date range | ✅ Done |
| | C4 Checklist kiểm hàng | ✅ Done |
| **D — Per-SP warning** | D1 migration ignore flags | ✅ Done |
| | D2 Switch ProductDetail | ✅ Done |
| | D3 Notifications + Dashboard skip | ✅ Done |
| **A — Perf/cleanup** | A1 KI-039 TTL cache | ✅ Done |
| | A2 KI-040 Products pagination | ✅ Done |
| | A3 KI-050 dead path toggleDeferred | ✅ Done |
| **H — Security** | H1 SEC-10 backup.ts 12 bảng | ✅ Done |
| | H2 SEC-12 __DEV__ wrap | ✅ Done |
| | H3 SEC-13 npm audit fix | ✅ Done |
| | H4 SEC-14 .gitignore .env.* | ✅ Done |
| **H5** | KI-026 AuditLog Realtime | Deferred → Phase 5 |
| **B — F27 mở rộng** | B1 2 tab + PDF | Carry → Phase 5 |
| **E — Picking** | E1–E3 F34 | Deferred → Phase 5 |
| **F — Push** | F1–F3 F35 | Deferred → Phase 5 |
| **G — Offline/Report/Stocktake** | G1–G3 F21/F25/F26 | Deferred → Phase 5 |

**Tổng:** 14 Done / 1 carry (B1) / còn lại deferred.

---

## 3. Thay đổi kỹ thuật chính

### Schema (v3.18 → v4.2)
- v4.0: shelf_zones/items/zone_items (sau đó rollback)
- v4.1: Rollback shelf; thêm `locations.type`, `inventory_entries.is_special`, `inventory_entries.is_checked`
- v4.2: `products.ignore_expiry_warning`, `products.ignore_stock_warning`

### Migrations mới: 2 file
- `20260719_rollback_shelf_add_market_columns.sql`
- `20260719_f32_ignore_warning_flags.sql`

### Screens mới: 1
- `StockCheckScreen.tsx` (C4 — Checklist kiểm hàng)

### Components mới: 1
- `FilterModal.tsx` (shared filter Mode/Kho/Zone cho Products, Notifications, Dashboard)

### Store thay đổi lớn
- `appMode` state + `setAppMode` + `fetchLocations` filter by type + `getQtyUnit()`
- `fetchProductsPage` hybrid server search + local filter
- `resetMarketChecklist` batch update
- TTL 30s trên 8 màn `useFocusEffect`
- Xóa `toggleDeferred` dead path

### UI thay đổi lớn
- MapScreen: header dropdown Chino's Warehouse ↔ Chino's Market
- Tab Map label dynamic (Kho / Siêu thị)
- ProductsScreen: 4 toggles luôn hiện + FilterModal thay dropdown
- NotificationsScreen: FilterModal + date range Từ/Đến (2 chế độ)
- DashboardScreen: FilterModal
- AuditLogScreen: filter Mode
- ProductDetailScreen: 2 Switch ignore warning
- SettingsScreen: card Kiểm hàng
- LocationManagementScreen: dropdown viewMode + badge type
- Qty label dynamic "thùng"/"sản phẩm" trên 11 file

---

## 4. Quyết định thiết kế Phase 4

1. Redesign F36 — Market mode thay Shelf tables (`locations.type`)
2. Hàng đặc biệt — `is_special` + `is_checked` trên `inventory_entries`
3. F33 Dropped — bỏ `is_on_shelf`
4. F34/F35 Deferred Phase 5
5. Tab Sản phẩm — luôn hiện tất cả SP, filter local (không theo `appMode`)
6. Notifications date range — 2 chế độ (mặc định checkbox vs kích hoạt range toàn lô)
7. FilterModal mode local — không thay đổi `appMode` store global

---

## 5. Security Phase 4

| SEC | KI | Trạng thái |
|-----|-----|-----------|
| SEC-10 | KI-021 | Mitigated — backup.ts 12 bảng, auth anon+login |
| SEC-12 | KI-023 | Resolved — __DEV__ wrap ~59 chỗ |
| SEC-13 | KI-024 | Mitigated — npm audit fix; transitive expo chờ major |
| SEC-14 | KI-025 | Resolved — .gitignore .env.* |

---

## 6. Known Issues còn open/deferred

| KI | Mô tả | Trạng thái |
|----|-------|-----------|
| KI-026 | AuditLog Realtime | Deferred → Phase 5 (H5) |
| KI-021 | Backup auth refinement | Mitigated |
| KI-024 | Transitive npm vulns (expo) | Mitigated |

---

## 7. Số liệu Phase 4

- **Task PLAN:** ~16 active → 14 Done, 1 carry (B1), H5 deferred
- **Migrations mới:** 2 file (+ `schema.sql` v4.2)
- **Screens mới:** StockCheckScreen
- **Components mới:** FilterModal
- **WORKLOG entries Phase 4:** 16
- **REQUIREMENTS:** v1.3.11 → v1.3.23 (13 bumps)
- **DECISIONS entries Phase 4:** 7 (+ 1 superseded)

---

## 8. Chuyển sang Phase 5

Ưu tiên đề xuất:
1. **F27 mở rộng** — 2 tab + PDF + list active (carry B1)
2. **F34** — Picking list
3. **F35** — Push notification local
4. **F21** — Offline mode
5. **F25** — Báo cáo / xuất dữ liệu
6. **F26** — Kiểm kho
7. **KI-026** — AuditLog Realtime (optional)
8. **Expo major upgrade** — npm audit transitive fix

Kế hoạch chi tiết: `docs/phases/phase-5/PLAN_5.md`.
