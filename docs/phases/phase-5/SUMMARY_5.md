# Phase 5 — Tổng kết

**Trạng thái:** Closed | Tháng 7/2026

---

## 1. Mục tiêu Phase 5

Hoàn thiện F34 Picking list, F35 Push notification, cải thiện UX picking,
fix bugs tồn đọng. F27 mở rộng carry → Phase 6.

---

## 2. Đã hoàn thành

### Group B — F34 Picking list ✅
- B1: Schema `picking_lists` + `picking_list_items` (migration 20260720)
- B2: PickingDetailScreen + store CRUD + tab switcher Orders
- B3: Confirm trừ tồn batch; revert draft (nút «Quay lại chỉnh sửa»)

### Group C — F35 Push notification ✅
- C1: expo-notifications + app_settings + schedule daily/weekly/monthly
- C2: Nội dung từ dữ liệu hạn (expiryCountUtils); 4 mốc exact-day
- C3: Permission + opt-out Settings
- C-part2: ExpiryAlertScreen 6 section collapsible + tap → ProductDetail

### UX & Bug fixes ✅
- Realtime silent refresh (KI-063)
- Picking revert draft
- Products filter scope fix (KI-064/066/068)
- Tap-to-zoom ảnh toàn app (ImageViewerModal)
- Tap card → ProductDetail (DiscontinuedProducts, StockCheck, PickingDetail)
- Rename Chino's Warehouse → Chino's Store (UI + config)
- EAS slug fix (chino-warehouse)
- ProductsScreen limit catalog 200 → 1000 (KI-040)
- Toggle is_special (Hàng đặc biệt) trên ZoneDetailSheet + ProductDetailScreen (KI-069)
- ⭐ prefix tên SP đặc biệt trên ZoneDetailSheet
- Fix crash presence channel sau re-login (KI-070)
- .cursorrules: Product Image Rule + Product Card Navigation Rule

### Docs ✅
- KI-065 blast radius analysis + defer Phase 6+
- KI-069, KI-070 resolved

---

## 3. Deferred → Phase 6

| Hạng mục | Lý do |
|----------|-------|
| F27 mở rộng (2 tab + PDF) | Carry Phase 3→4→5→6; spec chốt, chưa implement |
| KI-065 Custom location types | Blast radius lớn, 3 open questions chưa confirm |

---

## 4. Optional chưa làm

| Hạng mục | Ghi chú |
|----------|---------|
| D1 F21 Offline mode | Deferred tiếp |
| D2 F25 Báo cáo / xuất dữ liệu | Deferred tiếp |
| D3 F26 Kiểm kho | Deferred tiếp |
| E1 Expo major upgrade | Deferred tiếp |
| E2 KI-026 AuditLog Realtime | Deferred tiếp |

---

## 5. Số liệu

| | |
|--|--|
| Tasks hoàn thành | ~15 |
| Bugs fixed | KI-063, KI-064, KI-066, KI-068, KI-069, KI-070 |
| Migrations mới | 20260720_create_picking_tables.sql, 20260720_create_app_settings.sql |
| Schema version | v5.1 |
