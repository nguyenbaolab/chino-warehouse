# Phase 6 — Tổng kết

**Trạng thái:** Closed | Tháng 7/2026

---

## 1. Mục tiêu Phase 6

Hoàn thiện UX picking (B), gắn picking vào Products (C), **Hàng giảm giá** end-to-end (D), searchable filter (E scope thu gọn), Settings redesign (F), và tối ưu hiệu năng (G). **F27 mở rộng (A1)** không kịp trong phase → **carry Phase 7**.

**Nguồn:** `PLAN_6.md`, closeout Phase 5 (`SUMMARY_5.md` / `HANDOFF_5.md`), `REQUIREMENTS.md` v1.3.35+.

---

## 2. Đã hoàn thành (theo group)

### Group B — Picking UX ✅
- B1: Tab bottom / Orders default **Lấy hàng** trước Đặt hàng
- B2: 📷 barcode trên PickingDetail
- B3: Suggestions tối đa 20 + ScrollView
- B4: Default qty = 1 khi thêm lô
- B5: Modal chọn nhiều lô (`LotPickerModal`)
- Bổ sung: edit qty draft; `completed_at` trên header khi hoàn thành

### Group C — Products picking ✅
- C1: Nút 🛒 trên card Products → draft → LotPickerModal
- C2: Save qty = 0 → Alert nếu lô trong picking (Giữ / Xóa khỏi đơn / Huỷ)

### Group D — Hàng giảm giá ✅
- D1: `inventory_entries.discount_percent` (schema v5.2)
- D2: Notifications card + badge % + nhập inline
- D3: `DiscountScreen` grid + FilterModal
- D4: Xuất PDF (`expo-print` + `expo-sharing`)
- UI mở rộng: ＋ thêm SP (search + barcode), SectionList theo tháng, search bar, sort hạn, PDF ngày DD/MM/YYYY, cache ảnh theo `entry.id`, badges dọc, «Hạn gần nhất» trên card notify, Settings subtitle động

### Group E — Searchable dropdown ✅ (scope thu gọn)
- Không tạo component `SearchableDropdown.tsx` riêng
- FilterModal search Kho/Zone; InternalNotes gợi ý 20; AddInventory Zone search

### Group F — Settings redesign ✅
- 4 section: Kho & Hàng hóa · Vận hành · Thông báo & Cảnh báo · Hệ thống
- Bỏ info box zone

### Group G — Perf ✅
- P1: `completePicking` → `Promise.all` (KI-071)
- P2/P3: projection `fetchAllInventoryEntries` / `fetchProducts` (KI-072/073)
- P4: indexes expiry + is_archived (KI-074, schema v5.5)
- S1: `dashboardStats` productMap
- S2: Map search debounce 300ms + projection search
- `Tab.Navigator` `screenOptions.lazy: true`
- *Ghi chú:* TTL guard ProductsScreen đã **revert** (gây loop) — không ship

### Group A — F27 mở rộng ❌
- **Không làm** trong Phase 6 → **Phase 7 A1**

---

## 3. Làm thêm ngoài scope gốc PLAN_6

| Hạng mục | Ghi chú |
|----------|---------|
| Internal Notes 2 tầng folder | Schema v5.4 + UI (DECISIONS folders) |
| Ảnh đính kèm note (`image_url`) | Cùng migration v5.3 |
| `picking_lists.completed_at` | v5.3 |
| Toggle Giảm giá + % inline market | ZoneDetailSheet + ProductDetailScreen |
| Icon ⭐ / 💥 list & badge | Market lots |
| LoginScreen `adaptive-icon.png` | Thay emoji 📦 |
| Discount SectionList theo tháng + search/📷 | Mở rộng D3 |
| Group G Perf (P1–P4, S1–S2) | Thêm vào PLAN_6 giữa phase |

---

## 4. Schema changes (v5.2 → v5.5)

| Ver | Thay đổi | Migration |
|-----|----------|-----------|
| 5.2 | `discount_percent` | `20260721014051_add_discount_percent_to_inventory_entries.sql` |
| 5.3 | `picking_lists.completed_at`; `internal_notes.image_url` | `20260721161200_add_completed_at_and_notes_image.sql` |
| 5.4 | `internal_note_folders` + `folder_id` | `20260723125009_add_internal_note_folders.sql` |
| 5.5 | Indexes `expiry_date`, `is_archived` | `20260723000000_add_perf_indexes.sql` |

**Schema tham chiếu:** `supabase/migrations/schema.sql` **v5.5**.

---

## 5. Files thay đổi chính

**Mới:** `screens/DiscountScreen.tsx`, `components/LotPickerModal.tsx`, migrations trên, `docs/phases/phase-6/*`

**Sửa nhiều:** `SettingsScreen`, `NotificationsScreen`, `InternalNotesScreen`, `ProductsScreen`, `PickingDetailScreen`, `ProductDetailScreen`, `ZoneDetailSheet`, `MapScreen`, `warehouseStore`, `dashboardStats`, `App.tsx`, `LoginScreen`, `types/index.ts`

---

## 6. Known issues

| Mã | Trạng thái | Ghi chú |
|----|------------|---------|
| KI-071–074 | Resolved | Perf P1–P4 |
| KI-062 | Open (accepted) | Notification nội dung tĩnh |
| KI-065 | Deferred | Custom location types → Phase 7+ |
| — | — | TTL ProductsScreen không ship (revert WORKLOG) |

Không mở KI High mới khi close phase.

---

## 7. Carry → Phase 7

| Hạng mục | Ưu tiên |
|----------|---------|
| **A1 F27 mở rộng** (2 tab + PDF tổng hợp) | **Bắt buộc** |
| Optimization tiếp (server filter inventory, expo-image, Zustand selectors, …) | Optional |
| F21 / F25 / F26 / Expo major / KI-026 | Deferred tiếp |

---

## 8. Số liệu

| | |
|--|--|
| Groups Done | B, C, D, E, F, G |
| Groups skipped | A (F27) |
| Schema | v5.1 → **v5.5** |
| REQUIREMENTS | **v1.3.46** — lộ trình Phase 6 Closed + Phase 7 Planning |
