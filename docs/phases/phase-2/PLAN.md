# Phase 2 — Plan

**Trạng thái:** nháp kế hoạch — bắt đầu implement khi DEV kickoff Phase 2.

---

## 1. Tiếp tục từ Phase 1 (nợ kỹ thuật / polish)

- **F18 — `NotificationsScreen`:** polish UI/UX; rà soát và xử lý edge case trong logic hiển thị / lọc card (Sắp hết hạn, Sắp hết hàng).
- **Tab Đặt hàng + tab Sắp hết hàng:** kết nối nút **Thêm vào danh sách nhập** với tạo/ghi nhận item trong list đặt hàng (thay placeholder).
- **Xuất PDF:** triển khai nút xuất PDF trên list đặt hàng (và/hoặc lưu “bản in” theo từng list — theo spec cuối).
- **Sản phẩm không nhập nữa:** thêm **field lý do riêng** (migration + type + UI); không dùng `products.notes` làm proxy dài hạn.

---

## 2. Tính năng Phase 2 (scope mới)

| Mã | Nội dung |
|----|----------|
| **F08** | Hình ảnh sản phẩm (chụp/chọn, Supabase Storage). |
| **F19** | Chuyển hàng giữa khu vực (trừ nguồn, cộng đích). |
| **F20** | Bản đồ nhiều khu vực / multi-kho (kèm điều kiện cho F19). |
| **F21** | Chế độ offline (cache, queue, đồng bộ lại). |
| **F26** | Kiểm kho (đối chiếu thực tế theo zone/tầng, diff, confirm). |

---

## 3. Barcode & dữ liệu mã

- **Edge cases:** sau khi có thông tin từ **chủ cửa hàng** (vận hành thực tế barcode per lô) — cập nhật logic/UI nếu cần; tham chiếu theo dõi **BLK-001** trong tài liệu blocker / handoff.
- **Multi-barcode per sản phẩm:** đánh giá nếu nghiệp vụ yêu cầu (có thể mở rộng schema và luồng quét).

---

## 4. Tài liệu đi kèm Phase 2

| File | Mục đích |
|------|----------|
| `docs/phases/phase-2/HANDOFF.md` | Hướng dẫn dev/QA — **điền khi bắt đầu Phase 2**. |
| `docs/phases/phase-2/TESTCASES.md` | Test cases — **điền khi bắt đầu Phase 2**. |

Đồng bộ `REQUIREMENTS.md` / `DECISIONS.md` khi scope Phase 2 được chốt chi tiết từng sprint.
