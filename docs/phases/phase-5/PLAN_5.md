# Phase 5 — Kế hoạch

**Trạng thái:** Closed | Tháng 7/2026

---

## 1. Tổng quan / Mục tiêu Phase 5

Phase 5 hoàn thiện các feature deferred từ Phase 3–4: **F27 mở rộng** (carry B1), **F34 Picking list**, **F35 Push notification**, và optional **F21 Offline / F25 Báo cáo / F26 Kiểm kho**. Nâng cấp kỹ thuật: **Expo major upgrade** (npm audit), **KI-026 AuditLog Realtime** (optional).

**Nguồn tham chiếu:** `SUMMARY_4.md`, `HANDOFF_4.md`, `REQUIREMENTS.md` v1.3.24, `KNOWN_ISSUES.md`, `DECISIONS.md`.

**Kế thừa Phase 4:** Market mode F36 (C1–C4), F32 per-SP warning, FilterModal, TTL cache, Products hybrid search, Security H1–H4.

---

## 2. Group A — Feature carry (từ Phase 3→4→5)

### A1 — F27 mở rộng: 2 tab + PDF tổng hợp

> Carry → Phase 6 — xem `PLAN_6.md` Group A.

- **Files:** `screens/OrderListScreen.tsx`, `screens/OrderDetailScreen.tsx`, `stores/warehouseStore.ts`
- **Tham chiếu:** `REQUIREMENTS.md` §6 F27, `DECISIONS.md` list đặt hàng 2 tab
- **Mô tả:**
  - Mỗi list: tab **Hàng trong kho** / **Hàng mới**
  - Một list **active**; auto tạo + popup đặt tên nếu chưa có
  - SP từ Sắp hết hàng → tab trong kho, ô số thùng **trống**, bắt buộc điền trước Confirm
  - Nhóm theo category + **Chưa phân loại**
  - Tab Hàng mới: tên, phân loại, số thùng, ghi chú
  - Flow: **Draft → Confirm → Xuất PDF (gộp 2 tab) → Đã đặt**

---

## 3. Group B — Picking list (F34) ✅ Done

### B1 — Schema picking ✅ Done

- Schema `picking_lists`, `picking_list_items`, types, RLS (migration `20260720_create_picking_tables.sql`, schema v5.0).
- Không audit; `inventory_entry_id` NOT NULL; status draft → in_progress → completed.

### B2 — PickingListScreen ✅ Done

- Tab switcher Đặt hàng / Lấy hàng trên OrderListScreen; PickingDetailScreen (search lô, nhóm, tick); store CRUD + start/complete (chưa trừ tồn).

### B3 — Checklist + confirm trừ tồn ✅ Done

- Confirm chỉ trừ items `is_picked`; re-fetch qty → sequential update; partial fail giữ `in_progress`.

---

## 4. Group C — Push notification (F35) ✅ Done

### C1 — Local scheduled 11:00 ✅ Done
- `expo-notifications` + `app_settings.notification_time`; schedule daily/weekly/monthly.

### C2 — Nội dung từ dữ liệu hạn ✅ Done
- `expiryCountUtils` + body «X lô (kho) · Y SP (siêu thị)»; skip F32/archived.

### C3 — Permission + opt-out Settings ✅ Done
- Permission sau login (denied = im lặng); admin toggle trên ExpiryAlertScreen.

> **C-part2** danh sách hết hạn 6 section — ✅ Done (collapsible + ProductDetail).

---

## 5. Group D — Offline / Báo cáo / Kiểm kho (optional)

### D1 — F21 Offline mode
- Zustand persist + sync queue khi mất mạng.

### D2 — F25 Báo cáo / xuất dữ liệu
- Xuất tồn kho / lịch sử (CSV/PDF hoặc share sheet).

### D3 — F26 Kiểm kho
- Chọn zone → đếm từng tầng → diff vs hiện tại → confirm cập nhật.

---

## 6. Group E — Technical upgrade

### E1 — Expo major upgrade
- Upgrade expo 54 → 57+ để fix transitive npm audit vulns (postcss/uuid/ws).
- Chạy `npx expo install --fix` + test toàn bộ.

### E2 — KI-026 AuditLog Realtime (optional)
- Subscribe INSERT; page 0 prepend; page khác banner "Có X thay đổi mới".

---

## 7. Deferred / Dropped

| Hạng mục | Ghi chú |
|----------|---------|
| **F19** | Dropped từ Phase 3 — không mở lại |
| **F33** | Dropped — is_on_shelf |
| **Shelf tables** | Rolled back Phase 4 |
| **is_deferred cột DB** | Deprecated — drop khi convenient |

---

## 8. Tài liệu đi kèm Phase 5

| File | Mục đích |
|------|----------|
| `docs/phases/phase-5/PLAN_5.md` | File này |
| `docs/phases/phase-5/HANDOFF_5.md` | Tạo khi Phase 5 kết thúc |
| `docs/phases/phase-5/TESTCASES_5.md` | Tạo khi Phase 5 kết thúc |
| `docs/phases/phase-5/SUMMARY_5.md` | Tạo khi Phase 5 kết thúc |

---

## 9. Tóm tắt scope (đếm task)

| Group | Số task | Mã |
|-------|---------|-----|
| **A — F27 carry** | 1 | A1 |
| **B — Picking** | 3 | B1–B3 (F34) |
| **C — Push** | 3 | C1–C3 (F35) |
| **D — Offline/Report/Stocktake** | 3 | D1–D3 (optional) |
| **E — Tech upgrade** | 2 | E1–E2 (optional) |
| **Tổng** | **~12** | A+B+C bắt buộc; D+E optional |

**Ưu tiên đề xuất:** **A1 (F27) → B (F34) → C (F35)** → D/E tùy thực tế.

---

## 10. Deferred → Phase 6+

### KI-065 — Custom location types

- **Scope ước lượng:** 6–8 prompt (schema migration + store refactor + utils + FilterModal + MapScreen + Settings UI + màn hardcode)
- **Blocker:** 3 câu hỏi design chưa confirm (xem KNOWN_ISSUES KI-065)
- **Không chặn Phase 5** — hardcode 2 mode vẫn hoạt động đúng
- **Tham chiếu:** KNOWN_ISSUES KI-065
