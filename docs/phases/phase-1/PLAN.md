# Phase 1 — MVP Plan

## Mục tiêu (đã đạt)

App dùng được trong kho: tìm hàng, quét mã (theo lô), cập nhật tồn kho, thông báo cơ bản, đặt hàng dạng list, quản lý “không nhập nữa”.

## Scope theo mã tính năng (REQUIREMENTS §6)

### Done (Phase 1 — hoàn thành thực tế)

F01, F02, F03, F04, F05, F06, F07, F09, F10, F11, F12, F13, F14, F15, F16, F17, F27, F28.

### Partial (Phase 1 — còn việc sang Phase 2)

- **F18** — `NotificationsScreen`: đã có 2 tab **Sắp hết hạn / Sắp hết hàng**, toggle giảm giá theo lô, discontinued, v.v.; **chưa polish hoàn toàn**, logic hiển thị còn một số edge case (tiếp tục Phase 2).

### Deferred sang Phase 2 (không giao trong Phase 1)

- **F08** — Hình ảnh sản phẩm (Storage).
- **F19** — Chuyển hàng giữa khu vực.
- **F20** — Bản đồ / nhiều khu vực (multi-kho).
- **F21** — Chế độ offline.
- **F26** — Kiểm kho.

### Out of scope Phase 1 (theo lộ trình PRD)

- **F22–F25** — Lịch sử, dashboard, auth/super app, báo cáo xuất dữ liệu (Phase 3+).

---

## Việc chưa hoàn thiện trong Phase 1 → tiếp tục Phase 2

| Hạng mục | Mô tả ngắn |
|----------|------------|
| **NotificationsScreen (F18)** | Chưa polish hoàn toàn; một số edge case trong logic hiển thị / lọc card. |
| **Tab Đặt hàng (F27)** | Chưa **xuất PDF** (nút placeholder). Nút **Thêm vào danh sách nhập** từ tab **Sắp hết hàng** chưa kết nối với list đặt hàng. |
| **Không nhập nữa (F28)** | Chưa có **field lý do riêng** trên DB/UI; đang dùng tạm `products.notes` cho dòng lý do trên màn discontinued. |
| **Barcode (BLK-001 / edge cases)** | Barcode **per lô** đã triển khai; **chờ xác nhận từ chủ cửa hàng** về edge cases vận hành (quét trùng, đổi mã, v.v.) trước khi coi là “đóng hẳn” mọi kịch bản. |

Chi tiết test và handoff kỹ thuật: `docs/phases/phase-1/HANDOFF.md`, `docs/phases/phase-1/TESTCASES.md`.

---

## Tổng kết giai đoạn

Phase 1 coi như **đóng scope MVP**: luồng kho chính, thông báo 2 tab, đặt hàng list, discontinued + Settings. Bản tổng hợp kết quả và quyết định: **`docs/phases/phase-1/SUMMARY.md`**. Kế hoạch tiếp theo: **`docs/phases/phase-2/PLAN.md`**.
