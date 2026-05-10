# Phase 1 — Handoff

## Trạng thái

Chưa sẵn sàng test toàn bộ phase — còn TODO trong `PLAN.md`.

## Task gần nhất — KI-005 (đã fix code)

**Mô tả:** (1) Sau khi thêm sản phẩm mới hoặc lô từ **Thêm hàng** (`AddInventoryScreen`), quay lại tab **Sản phẩm** phải thấy dữ liệu cập nhật ngay. (2) Từ **Chi tiết sản phẩm** → **Thêm lô** → `goBack()` về chi tiết, danh sách **lô** phải hiện lô vừa thêm **không cần** rời màn rồi vào lại.

**Hướng dẫn test (thủ công):**

### A — Tab Sản phẩm (race `fetchProducts`)

1. Mở tab **Sản phẩm** (store đã có danh sách SP).
2. Mở **Thêm hàng**, tạo **sản phẩm mới**, lưu.
3. Quay tab **Sản phẩm** — tên SP mới **xuất hiện ngay**.

### B — Chi tiết SP + lô mới (`useFocusEffect`)

1. Mở **Chi tiết sản phẩm** có ít nhất một lô (để so sánh).
2. **Thêm lô hàng mới** (cùng SP hoặc luồng từ chi tiết), lưu → `goBack()` về **Chi tiết**.
3. Kiểm tra danh sách lô trên chi tiết **có lô vừa thêm** (zone/tầng/số thùng/hạn đúng) **ngay**, không cần back ra Products rồi vào lại.

### C — Thêm lô rồi về tab Sản phẩm (store)

1. Từ **Thêm hàng** thêm lô cho SP đã có, lưu, về tab **Sản phẩm**.
2. Nhóm lô / chấm màu (nếu hiển thị) phản ánh **không cần** ép refresh bằng cách rời app.

**Kỳ vọng kỹ thuật:** Không race `fetchProducts()` trên mount `AddInventoryScreen` sau `addProduct`; `ProductDetailScreen` refetch `loadData` mỗi lần focus.

## Sẽ cập nhật khi

DEV hoàn thành tất cả TODO trong `docs/phases/phase-1/PLAN.md` (hoặc QA xác nhận xong lượt test KI-005).
