# Phase 7 — Kế hoạch

**Trạng thái:** Planning | Tháng 7/2026

---

## 1. Tổng quan / Mục tiêu Phase 7

Phase 7 tập trung **đóng nợ F27 mở rộng (A1)** — feature bắt buộc đã carry từ Phase 3→4→5→6. Sau A1 ổn định, xen kẽ **optimization** và **UX polish** từ test Phase 6.

**Nguồn:** `SUMMARY_6.md`, `HANDOFF_6.md`, `REQUIREMENTS.md` §6 F27, `DECISIONS.md` (List đặt hàng 2 tab / số thùng / PDF gộp).

**Kế thừa Phase 6:** Discount + picking UX + Settings 4 sections + notes folders + schema v5.5 + perf projections.

---

## 2. Group A (bắt buộc) — F27 mở rộng

> **Ưu tiên số 1.** Không bắt đầu Group B/C lớn trước khi A1 có đường đi rõ (sau recon).

### A1 — OrderDetail 2 tab + PDF tổng hợp

- **Files:** `screens/OrderDetailScreen.tsx`, `screens/OrderListScreen.tsx`, `stores/warehouseStore.ts`, có thể `supabase/migrations/` + `types/index.ts`
- **Tham chiếu:** `REQUIREMENTS.md` §6 F27; `DECISIONS.md`:
  - List đặt hàng — 2 tab trong một list
  - Số thùng để trống đến Confirm
  - Xuất PDF tổng hợp
- **Hành vi mục tiêu:**
  - Mỗi list: tab **Hàng trong kho** / **Hàng mới**
  - Một list **active**; auto tạo + popup tên nếu chưa có
  - SP từ Sắp hết hàng → tab trong kho; ô số thùng **trống** đến Confirm
  - Nhóm theo category + **Chưa phân loại**
  - Tab Hàng mới: tên, phân loại, số thùng, ghi chú
  - Flow: **Draft → Confirm → Xuất PDF (gộp 2 tab) → Đã đặt**

#### Sub-tasks đề xuất

| # | Việc | Ghi chú |
|---|------|---------|
| A1.0 | **Recon** OrderDetail + OrderList + order store/types | Bắt buộc trước schema |
| A1.1 | Schema `order_items` (cột phân biệt tab / loại item nếu thiếu) | Chỉ thêm nếu recon chứng minh cần |
| A1.2 | Store actions CRUD / confirm / PDF data | Giữ RLS/audit hiện có |
| A1.3 | UI 2 tab trên OrderDetail | Guest xem; staff+ sửa |
| A1.4 | PDF gộp 2 tab | Có thể reuse pattern Discount PDF |

---

## 3. Group B (optional) — Optimization tiếp theo

> Làm **sau** A1 có bản shippable, hoặc xen kẽ task nhỏ khi chờ confirm design A1.

### B1 — Server-side / scoped filter `fetchAllInventoryEntries`
- **Mô tả:** Notifications / Discount (và màn tương tự) tránh luôn kéo full inventory khi đã có filter location/zone — query hoặc projection theo scope.
- **Rủi ro:** Merge store (KI-064) — recon trước khi đổi.

### B2 — Expo Image migration
- **Mô tả:** Thay `Image` RN → `expo-image` (disk cache) cho thumbnail SP / Discount / Notes.
- **Ràng buộc:** Không thêm package nếu chưa được user yêu cầu rõ; khi làm → confirm + cập nhật docs.

### B3 — Zustand selector granular
- **Mô tả:** Giảm re-render do destructure nhiều field `useWarehouseStore()` (Products, Discount, Map).
- **Hướng:** Selector hẹp hoặc `useShallow` nơi phù hợp.

### B4 — FlatList / SectionList `getItemLayout`
- **Mô tả:** List chiều cao cố định (Products cards, Discount rows) → scroll mượt hơn.

---

## 4. Group C (optional) — UX nhỏ / polish

- Bug hoặc polish phát sinh khi chạy `TESTCASES_6.md`
- Không mở scope lớn (không F21/F25/F26 trừ khi user yêu cầu)

---

## 5. Thứ tự làm việc

1. **A1.0 recon** OrderDetail / OrderList  
2. **A1.1–A1.4** implement F27  
3. Chạy testcases F27 (sẽ bổ sung `TESTCASES_7` khi implement)  
4. Xen **B** / **C** tùy thời gian  

**Không** ưu tiên F21 Offline / F25 Báo cáo / F26 Kiểm kho / Expo major / KI-026 / KI-065 trong Phase 7 trừ khi chốt lại scope.

---

## 6. Definition of Done (Phase 7 tối thiểu)

- [ ] A1 F27: 2 tab + confirm + PDF gộp hoạt động trên thiết bị thật  
- [ ] REQUIREMENTS §6 F27 → Done (hoặc Partial rõ ràng nếu cắt scope có confirm)  
- [ ] Migration (nếu có) + `schema.sql` bump **6.x**  
- [ ] WORKLOG + SUMMARY_7 / HANDOFF_7 khi close  

---

## 7. Tài liệu liên quan

- `HANDOFF_6.md`, `SUMMARY_6.md`, `TESTCASES_6.md` (trong `docs/phases/phase-6/`)
- `PLAN_6.md` — Group A gốc (chưa làm)
- `CONTEXT.md` — Orders stack hiện tại
