# Hướng dẫn sử dụng — Chino's Warehouse

**Phiên bản:** Phase 1 | Tháng 5/2026  
**Cửa hàng:** Chino's Boba Tea & Asian Market — Joensuu, Finland

Tài liệu này dành cho **chủ cửa hàng** và **nhân viên** dùng chung: cùng một app, không phân tài khoản trong Phase 1.

---

## Giới thiệu

**Chino's Warehouse** là app nội bộ trên điện thoại để **biết hàng đang ở đâu trong kho (tầng dưới)**, còn bao nhiêu thùng, và **hạn sử dụng** ra sao — mà không phải chạy xuống kho mỗi lần. Phù hợp khi nhân viên ở **quầy / siêu thị (tầng trên)** cần kiểm tra nhanh: ví dụ trà sữa, snack, đồ châu Á còn đủ thùng không, nằm zone nào.

- **Ai dùng:** chủ cửa hàng và nhân viên (1–2 người).
- **Thiết bị:** điện thoại **Android** hoặc **iPhone**, cài **Expo Go** để chạy bản Phase 1.
- **Đăng nhập:** **không có** — mở app là dùng được (mọi người cùng quyền).

---

## Bắt đầu

1. **Cài Expo Go** từ Google Play hoặc App Store.
2. **Cùng mạng WiFi** với máy tính đang chạy server dev (hoặc mạng nội bộ mà app được cấu hình kết nối Supabase).
3. Mở Expo Go → **Quét mã QR** do người phụ trách kỹ thuật cung cấp (màn hình `npx expo start`).
4. Đợi app tải xong → bạn sẽ thấy thanh tab dưới cùng.

*Nếu không vào được:* kiểm tra WiFi, hỏi người phụ trách xem QR có còn hiệu lực không.

---

## Các tab chính

| Tab | Tên trên app | Dùng để làm gì (ngắn gọn) |
|-----|----------------|---------------------------|
| **Kho** | Kho | Bản đồ các **zone** trong kho; tìm tên; quét mã; xem hàng trong từng ô. |
| **Sản phẩm** | Sản phẩm | Danh sách toàn bộ mặt hàng; lọc theo zone; tìm tên; quét barcode **theo từng lô**; sửa thông tin sản phẩm. |
| **Đặt hàng** | Đặt hàng | Ghi **danh sách nhập hàng** (nhiều list): soạn → confirm → đánh dấu đã đặt — thường do **chủ cửa hàng** quản lý. |
| **Thông báo** | Thông báo | **Sắp hết hạn** / **Sắp hết hàng** — nhắc lô gần hết date hoặc tồn thấp; đánh dấu giảm giá; “không nhập nữa”. |
| **Cài đặt** | Cài đặt | Giao diện sáng/tối; vào **Sản phẩm không nhập nữa**; thông tin zone (xem thêm trên tab Kho). |

---

## Hướng dẫn theo tác vụ thường gặp

### Tìm hàng trong kho

**Tìm theo tên**

1. Vào tab **Kho** (hoặc **Sản phẩm** nếu bạn quen lọc theo danh sách).
2. Gõ tên mặt hàng (ví dụ: *“trân châu”*, *“mì Hàn”*) — thường cần **ít nhất 2 ký tự**.
3. Các **zone** có hàng đó sẽ được **tô màu** trên bản đồ; bấm vào kết quả để xem chi tiết / mở sản phẩm tùy màn hình.

**Quét barcode (mã trên từng thùng / lô)**

- Mỗi **lô** có thể có một mã riêng trên thùng (lưu trong hệ thống theo **lô**, không phải một mã cố định cho cả sản phẩm).
- Tab **Sản phẩm** hoặc **Kho**: bấm nút quét → đưa camera vào mã.
- Khi nhận diện đúng: app chỉ ra **zone** (và thông tin **đúng lô** đó) — ví dụ thùng trân châu nằm zone B tầng 2.

---

### Xem hàng trong zone

1. Tab **Kho** → bấm vào **một ô zone** có màu trên bản đồ (ví dụ zone đựng đồ uống, đồ khô).
2. Mở bảng danh sách: tên mặt hàng, số **thùng**, màu cảnh báo nếu có.
3. Nếu zone có **nhiều tầng kệ**: chọn **Tầng 1, Tầng 2…** — hàng nặng/thường dùng thường ở tầng thấp hơn (tùy cách cửa hàng xếp).

---

### Thêm sản phẩm mới

Khi có mặt hàng **chưa từng** có trong app (ví dụ nhập thêm một loại snack mới):

1. Vào luồng **Thêm hàng** (từ bản đồ kho hoặc chi tiết sản phẩm — theo nút **Thêm lô** / **Thêm hàng** trên app).
2. Chọn hoặc tạo **sản phẩm mới**: nhập **tên** (bắt buộc), có thể thêm ghi chú (nhà cung cấp, quy cách thùng…).
3. Lưu — sau đó gán **lô** vào zone (bước dưới).

---

### Thêm lô hàng mới

**Lô** = một “đợt” hàng cùng sản phẩm trong một zone/tầng: có số thùng, hạn, có thể có barcode riêng trên thùng.

1. Chọn **sản phẩm** → **zone** → **tầng**.
2. Nhập **số thùng** (số nguyên, kể cả 0 nếu đang ghi nhận lô trống tạm thời — theo quy trình cửa hàng).
3. Nhập **hạn sử dụng** nếu có (định dạng app hướng dẫn trên màn hình).
4. **Barcode lô** (nếu có): gõ tay hoặc quét — giúp sau này tìm đúng **thùng đó** bằng máy quét.
5. **Lưu** — lô xuất hiện trong zone và trong **Chi tiết sản phẩm**.

*Ví dụ Chino's:* một thùng trà sữa đóng lon mới về — tạo lô mới ở zone lạnh, ghi hạn và dán/quét mã thùng.

---

### Cập nhật số thùng / hạn sử dụng

1. Mở **Chi tiết sản phẩm** (từ zone, tab Sản phẩm, hoặc Thông báo).
2. Chọn **lô** cần sửa → chỉnh **số thùng** hoặc **ngày hạn** (ví dụ vừa kiểm đếm lại, hoặc sửa nhập nhầm).
3. **Lưu** — màu cảnh báo trên bản đồ / danh sách sẽ cập nhật theo số liệu mới.

---

### Xóa lô hàng

- Khi lô **hết thùng** (0 thùng) hoặc **hết hạn** cần dọn: trên thẻ lô thường có lựa chọn **Xóa lô** (có thể hỏi xác nhận).
- **Lưu ý:** xóa là **mất khỏi hệ thống** — chỉ làm khi chắc chắn không cần theo dõi lô đó nữa.

---

### Xem thông báo hàng sắp hết hạn

**Tab Sắp hết hạn**

1. Tab **Thông báo** → chọn **Sắp hết hạn**.
2. Bạn thấy các sản phẩm có ít nhất một **lô** sắp đến hạn hoặc đã quá hạn (theo số ngày cảnh báo đã cài cho từng mặt hàng — ví dụ 30 ngày cho snack dài hạn, có thể khác cho đồ tươi).

**Đánh dấu Đã giảm giá**

- Mở rộng card sản phẩm → từng **dòng lô** có nút **Đã giảm giá / Chưa giảm giá** — bấm khi quầy đã giảm giá đúng lô đó (ví dụ lon trà sữa gần date).
- Màu nút đổi để dễ nhận biết lô đã xử lý giá.

**Lọc nhanh**

- Có thể tick **Hết hạn** / **Sắp hết hạn** để chỉ xem một loại lô — tiện khi soạn việc dọn quầy.

---

### Xem thông báo hàng sắp hết

**Tab Sắp hết hàng**

1. **Thông báo** → **Sắp hết hàng**.
2. Liệt kê mặt hàng có **tổng thùng trong kho thấp** (theo ngưỡng vàng đã cài cho từng sản phẩm — ví dụ còn ≤ 3 thùng trân châu).

**Đánh dấu Không nhập nữa**

- Khi cửa hàng quyết định **không kinh doanh / không nhập thêm** loại đó (ví dụ một loại snack không bán chạy): bấm **Không nhập nữa** trên card.
- Sản phẩm **biến mất** khỏi tab Sắp hết hàng nhưng vẫn theo dõi tồn ở **Cài đặt → Sản phẩm không nhập nữa** (xem mục dưới).

*Nút **Thêm vào danh sách nhập**:* **chưa hoạt động** trong Phase 1 (bấm không tạo list hay thêm mặt hàng vào tab Đặt hàng). **Phase 2** sẽ **kết nối** nút này với tab **Đặt hàng** để chuyển mặt hàng sang danh sách nhập.

---

### Tạo danh sách đặt hàng *(chủ cửa hàng — hoặc người được giao)*

**Tạo list mới**

1. Tab **Đặt hàng** → **Tạo list mới**.
2. Đặt tên gợi nhớ (ví dụ *“Nhập tuần 20/5”*).

**Thêm sản phẩm**

- **Có trong kho:** gõ tên → chọn gợi ý → nhập số thùng dự định nhập.
- **Không có trong kho:** gõ tên lạ → app hỏi xác nhận → thêm dòng **tự thêm tay** (có dấu ⭐) — dùng khi đặt mặt hàng mới chưa khai báo trong app.

**Confirm và đánh dấu đã đặt hàng**

- **Confirm:** list chuyển sang trạng thái **đã confirm** — tạm khóa chỉnh sửa như soạn thảo ban đầu.
- **Đã đặt hàng:** khi đã gửi đơn nhà cung cấp — list **khóa hẳn**; vẫn có thể **mở lại** theo quy trình trên app nếu cần sửa hiếm (đọc kỹ cảnh báo trên màn hình).

**Xóa list nháp**

- Chỉ list **đang soạn** mới xóa được; bấm **Xóa list** → đọc hộp thoại → xác nhận.

---

### Xem sản phẩm không nhập nữa *(chủ cửa hàng — hoặc người quản lý)*

**Vào Cài đặt → Sản phẩm không nhập nữa**

1. Tab **Cài đặt**.
2. Bấm dòng **Sản phẩm không nhập nữa** — thấy **số lượng** mặt hàng đang gắn cờ “không nhập nữa”.
3. Trong danh sách: **tên**, **tồn thùng thực tế** (hoặc chữ **Hết hàng** nếu 0 thùng), có thể có dòng **lý do / ghi chú** (hiện dùng chung trường ghi chú sản phẩm).

**Nhập lại nếu cần**

- Bấm **Nhập lại** — mặt hàng quay vào luồng **Sắp hết hàng** nếu tồn vẫn thấp theo quy tắc — để nhập tiếp khi đổi ý kinh doanh.

---

## Hệ thống màu sắc

App dùng màu **đỏ / vàng / xanh** để nhận biết nhanh (trên bản đồ, danh sách, chi tiết):

| Màu | Ý nghĩa (nói ngắn) |
|-----|---------------------|
| **Đỏ** | Rất “gắt”: **hết thùng**, **còn 1 thùng**, hoặc **đã quá hạn sử dụng**. Cần xử lý gấp. |
| **Vàng** | **Sắp hết** (ít thùng hơn ngưỡng vàng) **hoặc** **sắp đến hạn** — nên lên kế hoạch bán / giảm giá / nhập thêm. |
| **Xanh** | Trong ngưỡng an toàn — chưa cần lo theo quy tắc hiện tại. |

*Lưu ý:* cùng một mặt hàng có thể có nhiều lô khác nhau — màu trên bản đồ phản ánh **lô “xấu” nhất** trong zone đó.

---

## Lưu ý quan trọng

- **Đồng bộ (Realtime):** khi một máy **đổi số thùng** hoặc **thêm lô**, máy khác mở cùng dữ liệu thường sẽ thấy cập nhật **trong vài giây** (cần WiFi ổn và cấu hình máy chủ bình thường). Nếu chưa thấy, thoát màn hình vào lại hoặc kéo danh sách (nếu có).
- **Không đăng nhập:** ai cầm điện thoại có app đều thấy cùng dữ liệu — **giữ máy trong nội bộ cửa hàng**.
- **Đơn vị tồn:** **thùng nguyên** — một thùng đang mở dùng dở vẫn tính là **một thùng** cho đến khi cửa hàng cập nhật lại số liệu theo quy ước nội bộ.
- **Một kho trong Phase 1:** app đã sẵn UI cho nhiều kho sau này; hiện tại Chino's thường chỉ dùng **một kho** chính — đổi kho (nếu có) có thể xóa kết quả tìm kiếm đang mở.

---

*Nếu thiếu bước hoặc nút không thấy trên màn hình của bạn, chụp màn hình và gửi cho người phụ trách kỹ thuật — có thể app đã cập nhật phiên bản mới.*
