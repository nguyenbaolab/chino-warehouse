# DECISIONS — Quyết định thiết kế

Các quyết định quan trọng đã chốt cho Chino's Warehouse.

---

### Hệ thống màu: gộp critical + warning = vàng

- **Ngày:** tháng 5/2026
- **Quyết định:** Trạng thái “cần chú ý” về tồn (sắp hết hàng theo `low_warning_boxes`) và về hạn (sắp hết hạn theo `warning_days`) dùng **cùng tông vàng** trên UI (không tách màu cam riêng cho một nhánh).
- **Lý do:** Đơn giản hơn cho người dùng — thấy vàng là biết cần kiểm tra.
- **Thay thế đã xem xét:** Màu cam riêng cho sắp hết hàng (đã loại bỏ).

---

### 0–1 thùng hardcode đỏ, không configurable

- **Ngày:** tháng 5/2026
- **Quyết định:** 0 thùng = hết hàng, 1 thùng = còn rất ít; cả hai mức đều **đỏ** theo PRD, **không** cho nhân viên chỉnh ngưỡng trên UI.
- **Lý do:** Ngưỡng nguy hiểm không nên tùy chỉnh lung tung.
- **Thay thế đã xem xét:** Cho chỉnh `low_critical_boxes` trên UI (từ chối; có thể hardcode = 1 trong logic).

### low_critical_boxes = 1 cố định trong logic, không còn UI chỉnh

- **Ngày:** tháng 5/2026
- **Quyết định:** Toàn app dùng **`low_critical_boxes = 1`** khi gọi `getCombinedStatus` / tính combined (không đọc chỉnh từ UI). **Đã gỡ hoàn toàn** block chỉnh “còn rất ít (thùng)” trên `ProductDetailScreen`. Cột DB có thể còn nhưng không còn đường cập nhật từ màn hình này.
- **Lý do:** Thống nhất PRD (0–1 thùng đỏ) và tránh nhập sai ngưỡng critical.
- **Thay thế đã xem xét:** Giữ input đồng bộ DB — từ chối.

---

### low_warning_boxes configurable per sản phẩm

- **Ngày:** tháng 5/2026
- **Quyết định:** Mỗi sản phẩm chỉnh ngưỡng **vàng** “sắp hết hàng” riêng (mặc định **3** thùng), tại màn chi tiết sản phẩm (trong section **Chi tiết** có thể thu gọn).
- **Lý do:** Mỗi SKU có tần suất bán / dự trữ khác nhau.
- **Thay thế đã xem xét:** Một ngưỡng cố định toàn app.

---

### warning_days configurable per sản phẩm

- **Ngày:** tháng 5/2026
- **Quyết định:** Mỗi sản phẩm chỉnh số ngày cảnh báo trước hạn (mặc định **30**), tại màn chi tiết sản phẩm (trong section **Chi tiết** có thể thu gọn).
- **Lý do:** Chu kỳ nhập hàng / shelf life khác nhau giữa các loại hàng.
- **Thay thế đã xem xét:** 30 ngày cứng cho mọi sản phẩm.

---

### Màu zone = combined status

- **Ngày:** tháng 5/2026
- **Quyết định:** Chấm màu trên zone khi tìm kiếm / locate dựa trên **combined status** (tồn + hạn), lô xấu nhất trong zone quyết định màu.
- **Lý do:** Nhất quán với hệ thống màu toàn app và với PRD.
- **Thay thế đã xem xét:** Chỉ tô màu zone theo hạn.

---

### Phase 1 không có auth

- **Ngày:** tháng 5/2026
- **Quyết định:** Mở app dùng luôn, mọi người **full quyền**, không đăng nhập.
- **Lý do:** Đưa app vào vận hành nhanh, đủ cho quy mô cửa hàng nhỏ.
- **Thay thế đã xem xét:** Auth sớm — hoãn sang super app / phase sau.

---

### Super app integration — Phase 3

- **Ngày:** tháng 5/2026
- **Quyết định:** Warehouse là **một module** trong hệ app nội bộ lớn hơn (kho, chấm công, chia ca, …). Auth và phân quyền chi tiết thiết kế **sau** khi có yêu cầu cụ thể.
- **Lý do:** Lộ trình chủ cửa hàng; tránh over-engineer giai đoạn đầu.
- **Thay thế đã xem xét:** Tích hợp auth ngay trong Phase 1.

---

### Tồn kho theo tổng thùng per sản phẩm

- **Ngày:** tháng 5/2026
- **Quyết định:** Cảnh báo tồn kho (`low_warning_boxes`, critical) xét theo **tổng số thùng của tất cả lô trong cùng sản phẩm**, không xét theo từng lô riêng lẻ.
- **Logic hạn sử dụng:** Vẫn giữ theo từng lô như hiện tại.
- **Lý do:** Tổng thùng phản ánh đúng nhu cầu nhập thêm hàng ở mức sản phẩm.

---

### Lô 0 thùng được giữ lại, không tự xóa

- **Ngày:** tháng 5/2026
- **Quyết định:** Lô về `quantity_boxes = 0` vẫn tồn tại trong DB, không tự động xóa.
- **Hiển thị:** Trên `ProductDetailScreen`, lô 0 thùng hiển thị một dòng: `Lô này đã hết hàng [Xóa lô]`.
- **Vận hành:** Nhân viên chủ động bấm xóa khi muốn, không xóa tự động.
- **Notifications:** Không tạo thông báo riêng theo từng lô.

---

### NotificationsScreen — format card mới

- **Ngày:** tháng 5/2026
- **Quyết định:** Card thông báo gồm:
  - Dòng 1: `Còn ... thùng` (tổng tất cả lô của sản phẩm).
  - Dòng 2: `Số thùng sắp hết hạn: ... thùng` (tổng thùng của lô vàng/đỏ theo hạn).
  - Pill 1: trạng thái tồn kho theo **tổng thùng sản phẩm**.
  - Pill 2: trạng thái hạn theo **lô xấu nhất**.
- **Ghi chú:** Giữ nguyên 2 pill, không đổi vị trí UI.

---

### NotificationsScreen — tab Có vấn đề / Để sau

- **Ngày:** tháng 5/2026
- **Quyết định:** Tab Thông báo có 2 tab con: **Có vấn đề** và **Để sau**.
- **Luồng:** Tab Có vấn đề hiển thị danh sách sản phẩm có vấn đề; mỗi card có nút **Để sau**. Tab Để sau hiển thị sản phẩm đã đánh dấu và cho phép chuyển lại Có vấn đề.
- **Phạm vi đánh dấu:** Đánh dấu **theo sản phẩm**, không theo lô.
- **Lý do:** Giảm nhiễu thông báo và cho phép xử lý theo thứ tự ưu tiên.

---

### Lưu trạng thái Để sau — `products.is_deferred` (BLK-002 Resolved)

- **Ngày:** tháng 5/2026
- **Quyết định:** Lưu cờ **Để sau** bằng cột **`is_deferred BOOLEAN NOT NULL DEFAULT false`** trên bảng **`products`** (migration `20260511_add_product_is_deferred.sql`). App cập nhật qua Supabase và `warehouseStore.toggleDeferred`.
- **Lý do:** Đồng bộ đa thiết bị, không phụ thuộc state cục bộ Zustand; một sản phẩm — một cờ.
- **Thay thế đã xem xét:** Chỉ lưu local Zustand — từ chối cho Phase 1+ thông báo.
