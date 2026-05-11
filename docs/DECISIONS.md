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
- **Cập nhật sau này:** Quyết định này không còn dùng trong UI hiện tại do Notifications được restructure thành **Sắp hết hạn / Sắp hết hàng**.

---

### Lưu trạng thái Để sau — `products.is_deferred` (BLK-002 Resolved)

- **Ngày:** tháng 5/2026
- **Quyết định:** Lưu cờ **Để sau** bằng cột **`is_deferred BOOLEAN NOT NULL DEFAULT false`** trên bảng **`products`** (migration `20260511_add_product_is_deferred.sql`). App cập nhật qua Supabase và `warehouseStore.toggleDeferred`.
- **Lý do:** Đồng bộ đa thiết bị, không phụ thuộc state cục bộ Zustand; một sản phẩm — một cờ.
- **Thay thế đã xem xét:** Chỉ lưu local Zustand — từ chối cho Phase 1+ thông báo.
- **Cập nhật sau này:** Sau khi bỏ tab **Để sau**, cột `is_deferred` vẫn giữ trong DB để tương thích dữ liệu cũ, nhưng **không còn dùng trong UI**.

---

### Restructure NotificationsScreen

- **Ngày:** tháng 5/2026
- **Quyết định:** Tách Notifications thành 2 tab: **Sắp hết hạn** và **Sắp hết hàng**.
- **Quyết định bổ sung:** Bỏ tab **Để sau** và thay bằng luồng xử lý trực tiếp trên từng card.
- **Sắp hết hạn:** Card sản phẩm sắp hết hạn có toggle **Đã giảm giá** theo sản phẩm/lô; card đã hết hạn hiển thị đỏ nhạt, nhãn `Hết hạn rồi`, bấm vào mở `ProductDetailScreen`.
- **Sắp hết hàng:** Card sản phẩm có 2 hành động chính: thêm vào danh sách đặt hàng hoặc đánh dấu không nhập nữa.
- **Lý do:** Luồng thao tác ngắn hơn, bám đúng nghiệp vụ vận hành hàng ngày.

---

### Tab Đặt hàng — danh sách nhập hàng

- **Ngày:** tháng 5/2026
- **Quyết định:** Thêm tab **Đặt hàng** giữa tab Sản phẩm và Thông báo.
- **Luồng:** Một tab quản lý nhiều list độc lập, mỗi list có 3 trạng thái: **Đang soạn → Đã confirm → Đã đặt hàng**.
- **Quy tắc list:** Sản phẩm thêm tay được đánh dấu ⭐; sản phẩm tự động từ kho không đánh dấu; cùng sản phẩm trong list đang soạn thì cộng dồn.
- **Hành động:** Mỗi list có nút Confirm (khóa tạm), nút Đã đặt hàng (khóa hẳn, có mở lại), và nút xuất PDF riêng.
- **Lý do:** Tách rõ luồng chuẩn bị đơn nhập, xác nhận nội bộ, và xác nhận đã đặt nhà cung cấp.

---

### Sản phẩm không nhập nữa

- **Ngày:** tháng 5/2026
- **Quyết định:** Lưu sản phẩm không nhập nữa bằng cờ DB `is_discontinued`.
- **UI:** Hiển thị trong Settings với card tổng số lượng; màn chi tiết hiển thị tên, tồn kho thực tế realtime, lý do (optional); cho phép chuyển lại luồng Sắp hết hàng.
- **Lý do:** Giảm nhiễu cảnh báo sắp hết hàng cho các mặt hàng không còn kế hoạch nhập.

---

### ProductDetailScreen — lô hết hạn

- **Ngày:** tháng 5/2026
- **Quyết định:** Lô hết hạn hiển thị banner `Lô này đã hết hạn [Xóa lô]`, cùng pattern với lô hết hàng nhưng đổi text theo ngữ nghĩa hạn sử dụng.
- **Lý do:** Đồng nhất UX thao tác dọn lô không còn giá trị kinh doanh.

---

### Barcode chuyển sang per lô (`inventory_entries`)

- **Ngày:** tháng 5/2026
- **Quyết định:** Barcode gắn với **từng lô hàng** (`inventory_entries.barcode`), không còn per sản phẩm.
- **DB migration:** Xóa `products.barcode` (drop column), thêm `inventory_entries.barcode` (add column, optional).
- **Lý do:** Cùng một sản phẩm có thể có nhiều lô với barcode khác nhau.
- **Thay thế đã xem xét:** 1 sản phẩm 1 barcode — từ chối.

---

### Logic tìm kiếm theo barcode vs tên

- **Ngày:** tháng 5/2026
- **Quyết định:**
  - Gõ tên: tìm theo **sản phẩm**, highlight tất cả zone có sản phẩm đó.
  - Quét barcode: tìm theo **lô**, highlight zone chứa đúng lô đó và hiện thông tin lô tương ứng.
- **UI liên quan:** `ProductDetailScreen` thêm field barcode trên card lô; `AddInventoryScreen` dùng barcode per lô; `BarcodeScanner` bỏ `assign` mode.

---

### Multi-kho: products global, filter per screen

- **Ngày:** tháng 5/2026
- **Quyết định:** Tab Sản phẩm, Thông báo, Đặt hàng hiện toàn bộ sản phẩm của tất cả kho. Thêm dropdown lọc theo kho trên từng màn hình — không chọn = hiện full. MapScreen chỉ hiện zones của kho đang được chọn trong selector.
- **Lý do:** Sản phẩm là global (cùng SKU có thể ở nhiều kho); chỉ inventory mới gắn với kho cụ thể. Lọc theo kho là optional, không bắt buộc.
- **Thay thế đã xem xét:** Mỗi tab lọc cứng theo kho đang chọn trên Map — từ chối, gây mất thông tin tổng quan.

---

### Grid size: per location, configurable

- **Ngày:** tháng 5/2026
- **Quyết định:** Lưu `grid_rows` và `grid_cols` trên bảng `locations` (default 6×6). Hỏi khi tạo kho mới, cho đổi lại sau. Tăng kích thước: thoải mái. Giảm kích thước: block nếu có zone nào bị cắt ra ngoài (tọa độ cells vượt quá grid mới).
- **Lý do:** Mỗi kho có layout vật lý khác nhau, không nên dùng chung một kích thước cố định.
- **Thay thế đã xem xét:** Grid size global toàn app — từ chối.

---

### Xóa kho: block nếu còn hàng

- **Ngày:** tháng 5/2026
- **Quyết định:** Trước khi xóa một location, kiểm tra toàn bộ inventory_entries trong tất cả zones thuộc location đó. Nếu có bất kỳ lô nào còn tồn tại trong DB (kể cả quantity_boxes = 0 chưa được xóa thủ công) → block xóa và hiện thông báo rõ lý do.
- **Lý do:** Tránh mất dữ liệu tồn kho, nhất quán với quy tắc xóa zone (§7.1 REQUIREMENTS).
- **Thay thế đã xem xét:** Xóa cascade toàn bộ — từ chối.

---

### Zone move: Compact Layout Editor (F29)

- **Ngày:** tháng 5/2026
- **Quyết định:** Dùng màn hình Layout Editor riêng biệt thay vì drag trực tiếp trên map chính. Mỗi zone hiển thị dưới dạng tile nhỏ cố định (không phụ thuộc kích thước thật) kèm badge kích thước. Kéo tile vào grid → collision check theo tọa độ thật, không phải theo tile. Có nút Preview trước khi Confirm.
- **Lý do:** Map chính khi kho đầy không còn chỗ trống để kéo thả zone kích thước thật — gây khó thao tác.
- **Thay thế đã xem xét:** Drag zone kích thước thật trên map (Option A) — từ chối vì cramped; Swap 2 zone (Option C) — từ chối vì không đủ linh hoạt khi zone kích thước khác nhau; Zoom out + drag (Option E) — từ chối vì touch target quá nhỏ.

---

### Tab Đặt hàng: không filter theo kho

- **Ngày:** tháng 5/2026
- **Quyết định:** Tab Đặt hàng không có dropdown lọc theo kho. Chỉ Products và Notifications có filter theo kho.
- **Lý do:** Order list không gắn trực tiếp với kho cụ thể — một đơn nhập có thể gồm hàng từ nhiều kho.

---

### Location card trong Settings: hiển thị số sản phẩm

- **Ngày:** tháng 5/2026
- **Quyết định:** Card location trong LocationManagementScreen hiển thị: tên kho, grid size (ví dụ "6 × 6"), và số sản phẩm (distinct product_id từ inventory_entries → zones thuộc location đó, kể cả lô 0 thùng chưa xóa).
- **Lý do:** Giúp nhân viên biết kho nào đang chứa bao nhiêu SKU trước khi thao tác xóa hay sửa.
