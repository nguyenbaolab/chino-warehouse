# Phase 1 — Handoff

## Trạng thái

Chưa sẵn sàng test toàn bộ phase — còn TODO trong `PLAN.md`.

---

## Task gần nhất — UI Thông báo / Sản phẩm / Chi tiết

### 1) `NotificationsScreen`

**Thay đổi:** Mỗi card: hàng đầu chỉ **tên SP** (chấm màu worst combined). Ngay dưới: một dòng `Tổng X thùng | Y thùng có vấn đề`. **Dòng tiếp theo:** tối đa **hai pill** trên **cùng một hàng** — chỉ hiện pill có cảnh báo (không pill “xanh”): tồn **Hết hàng** / **Sắp hết hàng**, hạn **Hết hạn** / **Sắp hết hạn**; chữ + viền `#EF4444` / `#FACC15`. Không còn dòng zone/tầng/hạn trên card.

**Test:**

1. Có ít nhất một SP có lô đỏ hoặc vàng (tồn/hạn theo ngưỡng).
2. Tab **Thông báo** — đúng X/Y; pill nằm **dưới** dòng tổng, cùng hàng; chỉ pill đỏ/vàng khi có vấn đề tương ứng.
3. Bấm card → mở **Chi tiết** đúng SP.

---

### 2) `ProductsScreen`

**Thay đổi:** Mỗi dòng SP: **Tổng N thùng** (cạnh nút ✏️). **Không** có toggle **Có vấn đề** trên màn này. Lọc theo tìm kiếm + zone chip như trước.

**Test:**

1. So sánh tổng thùng trên card với tổng thủ công từ các lô (cùng zone filter nếu có).
2. Không thấy hàng **Có vấn đề** / không crash khi dùng tab Sản phẩm.
3. Chọn zone chip — danh sách SP vẫn lọc đúng theo zone.

---

### 3) `ProductDetailScreen`

**Thay đổi:** Thanh **Tổng … thùng** + Switch **Có vấn đề** phía trên nút **Thêm lô hàng mới**. Bật lọc chỉ hiện lô có combined ≠ `ok`; nếu không có lô khớp — thông báo rõ.

**Test:**

1. SP có nhiều lô — số **Tổng** khớp tổng số thùng mọi lô.
2. Bật **Có vấn đề** — chỉ còn lô đỏ/vàng; tắt — lại đủ danh sách.
3. SP chỉ có lô xanh — bật **Có vấn đề** — thấy dòng “Không có lô đỏ/vàng…”.

---

## Task cũ — KI-005 (đã fix trước đó)

Xem `docs/KNOWN_ISSUES.md` (KI-005 Resolved): race `fetchProducts` trên `AddInventoryScreen`; `ProductDetail` refetch khi focus.

## Sẽ cập nhật khi

DEV hoàn thành TODO trong `PLAN.md` hoặc QA xác nhận xong lượt test trên.
