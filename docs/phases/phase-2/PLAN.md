# Phase 2 — Plan

**Trạng thái:** nháp kế hoạch — bắt đầu implement khi DEV kickoff Phase 2.

---

## 1. Tiếp tục từ Phase 1 (nợ kỹ thuật / polish)

- ~~**F18 — `NotificationsScreen`:** polish UI/UX; rà soát và xử lý edge case trong logic hiển thị / lọc card (Sắp hết hạn, Sắp hết hàng).~~ **Đã hoàn thành** — test thực tế không phát hiện lỗi UI/UX; `REQUIREMENTS.md` §6: F18 → **Done** (tháng 5/2026).
- **Tab Đặt hàng + tab Sắp hết hàng:** implement theo `REQUIREMENTS.md` §6 **F27 mở rộng** (design v1.3.3): list **active** (hàng trong kho, auto từ Sắp hết hàng) + list **tự tạo**; trong mỗi list 2 tab **Hàng trong kho** (trái) / **Hàng mới** (phải); chỉ một active; auto tạo + popup đặt tên nếu chưa có; số thùng **để trống** đến khi Confirm; nhóm theo category + **Chưa phân loại**; nối nút **Thêm vào danh sách nhập**.
- **Xuất PDF:** một file **PDF tổng hợp** cả hai tab (Hàng trong kho + Hàng mới), trong luồng Draft → Confirm → **Xuất PDF** → Đã đặt (`REQUIREMENTS.md` §6 F27).
- **Sản phẩm không nhập nữa:** thêm **field lý do riêng** (migration + type + UI); không dùng `products.notes` làm proxy dài hạn.

---

## 2. Tính năng Phase 2 (scope mới)

| Mã | Nội dung |
|----|----------|
| **F08** | Hình ảnh sản phẩm (chụp/chọn, Supabase Storage). |
| **F19** | Chuyển hàng giữa khu vực (trừ nguồn, cộng đích). |
| **F20** | ~~Multi-kho: dropdown selector trên MapScreen, tạo/sửa/xóa kho, grid size per location (configurable), dropdown lọc theo kho trên Products/Notifications/Orders, fix KI-004.~~ **✓ Done** |
| **F21** | Chế độ offline (cache, queue, đồng bộ lại). |
| **F26** | Kiểm kho (đối chiếu thực tế theo zone/tầng, diff, confirm). |
| **F27** | **Mở rộng đặt hàng** (chưa code, chốt design v1.3.3): 2 tab trong một list (Hàng trong kho / Hàng mới); list active duy nhất + popup đặt tên; SP từ Sắp hết hàng nhảy vào với số thùng trống, bắt buộc điền trước Confirm; nhóm theo category (F30) + nhóm **Chưa phân loại**; PDF gộp 2 tab; flow Draft → Confirm → Xuất PDF → Đã đặt; tab Hàng mới: tên SP, phân loại, số thùng, ghi chú. |
| **F29** | ~~Zone Layout Editor: compact tile editor, footprint preview, collision check theo tọa độ thật, confirm → lưu.~~ **✓ Done** |
| **F30** | ~~**Phân loại sản phẩm** 2 cấp: `product_categories_l1` / `product_categories_l2`, FK optional trên `products`; CRUD trong Settings; gán SP trên ProductDetailScreen và AddInventoryScreen (optional); list đặt hàng cập nhật nhóm khi đổi phân loại sau.~~ **✓ Done** |

F20, F29, F30 đã hoàn thành trong Phase 2.

---

## 3. Barcode & dữ liệu mã

- **Edge cases:** BLK-001 đã Closed hoàn toàn — không còn edge case tồn đọng. Multi-barcode per sản phẩm là tính năng tương lai độc lập nếu nghiệp vụ yêu cầu.
- **Multi-barcode per sản phẩm:** đánh giá nếu nghiệp vụ yêu cầu (có thể mở rộng schema và luồng quét).

---

## 4. Tài liệu đi kèm Phase 2

| File | Mục đích |
|------|----------|
| `docs/phases/phase-2/HANDOFF.md` | Hướng dẫn dev/QA — **điền khi bắt đầu Phase 2**. |
| `docs/phases/phase-2/TESTCASES.md` | Test cases — **điền khi bắt đầu Phase 2**. |

Đồng bộ `REQUIREMENTS.md` / `DECISIONS.md` khi scope Phase 2 được chốt chi tiết từng sprint.

---

## 5. Security (Phase 2)

**Đã hoàn thành:**
- ~~SEC-11: Audit Log (KI-022)~~ **✓ Done** — migration `20260513_add_audit_logs.sql`, trigger `audit_trigger_fn`, 3 store actions, `AuditLogScreen`, section `ProductDetailScreen`, card `SettingsScreen`.

**Còn lại (Medium/Low — làm dần):**
- SEC-05: Input validation `maxLength` (KI-017)
- SEC-06: Generic error messages (KI-018)
- SEC-07: Barcode scanner debounce (KI-019)
- SEC-10: `backup.mjs` dùng `service_role` key (KI-021)
- SEC-12: `__DEV__` guard cho `console.log` (KI-023)
- SEC-13: `npm audit` trước release (KI-024)
- SEC-14: `.env.*` coverage gitignore (KI-025)

**Deferred → Phase 3:**
- SEC-09: RBAC manager/nhân viên — cùng F24 super app integration (KI-020)
