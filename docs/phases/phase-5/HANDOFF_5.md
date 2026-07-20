# Phase 5 — Handoff

**Ngày:** Tháng 7/2026
**Phase tiếp theo:** Phase 6

---

## 1. Trạng thái bàn giao

Phase 5 closed. App ổn định, không có bug High open.

---

## 2. Carry → Phase 6

### F27 mở rộng (bắt buộc)
- Spec: `REQUIREMENTS.md` §6 F27 + `DECISIONS.md` list đặt hàng 2 tab
- 2 tab: Hàng trong kho / Hàng mới
- Flow: Draft → Confirm → Xuất PDF → Đã đặt
- SP từ Sắp hết hàng → tab Hàng trong kho, số thùng trống
- Nhóm theo category + Chưa phân loại

---

## 3. Known issues open

| Mã | Mô tả | Mức |
|----|-------|-----|
| KI-062 | Notification nội dung tĩnh | Low (accepted) |
| KI-065 | Custom location types | Low (deferred) |

---

## 4. Môi trường

- Expo SDK 54, schema v5.1
- EAS slug: `chino-warehouse` (giữ nguyên)
- Package: `com.nguyenbaolab.chinosstore`

---

## 5. Tài liệu tham chiếu

- `REQUIREMENTS.md` v1.3.34
- `PLAN_6.md` — scope Phase 6
- `KNOWN_ISSUES.md` — danh sách đầy đủ
