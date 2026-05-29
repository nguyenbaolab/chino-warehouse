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

---

## 4. Breaking changes so với Phase 2

*Cập nhật khi có breaking change.*

---

## 5. Files quan trọng đã thêm/sửa

*(Điền dần khi implement)*

---

## 6. Known issues còn open

| KI | Mô tả | Mức độ | Trạng thái |
|----|-------|--------|-----------|
| KI-017 | SEC-05: Input validation thiếu (`maxLength`) | High | Open |
| KI-018 | SEC-06: Error message lộ schema | High | Open |
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
- [ ] **D3 / F08** — Ảnh sản phẩm (Storage + camera/picker)

### Group E — New Features

- [ ] **E1 / F23** — DashboardScreen + entry Settings
- [ ] **E2 / F24** — RBAC `user_profiles` + UserManagementScreen + guards

### Security

- [ ] **SEC-05** — `maxLength` trên TextInput — KI-017
- [ ] **SEC-06** — Generic error messages — KI-018

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
