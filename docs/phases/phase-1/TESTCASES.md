# Phase 1 — TESTCASES

Test cases cho tính năng Phase 1 (F01–F16) đang **Done** hoặc **Partial**.  
Điền **Kết quả thực tế** khi chạy test thủ công.

---

### TC-F01-01: Chọn kho — happy path

- **Feature:** F01
- **Bước thực hiện:** Mở tab Kho. Nếu DB có ≥2 `locations`, bấm từng nút kho khác nhau.
- **Kết quả mong đợi:** Zone trên bản đồ tải theo `location_id` đã chọn; nút kho đang chọn hiển thị trạng thái active.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F01-02: Chọn kho — edge (một kho)

- **Feature:** F01
- **Bước thực hiện:** Chỉ có một bản ghi `locations` trong Supabase.
- **Kết quả mong đợi:** Vẫn hiển thị một nút kho; bản đồ hoạt động bình thường.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F02-01: Bản đồ 6×6 — happy path

- **Feature:** F02
- **Bước thực hiện:** Tab Kho, quan sát lưới ô.
- **Kết quả mong đợi:** Lưới 6×6 hiển thị; zone đã tạo tô màu đúng `cells`.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F02-02: Bản đồ — edge (không có zone)

- **Feature:** F02
- **Bước thực hiện:** Location mới chưa có zone nào.
- **Kết quả mong đợi:** Lưới trống vẫn cuộn/tương tác; có thể bắt đầu chọn ô tạo zone.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F03-01: Chấm màu zone khi tìm — happy path

- **Feature:** F03
- **Bước thực hiện:** Gõ tên sản phẩm (≥2 ký tự) có tồn trong kho; xem các zone trong kết quả.
- **Kết quả mong đợi:** Zone chứa lô của SP đó có chấm màu theo combined status lô xấu nhất trong zone.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F03-02: Chấm màu — edge (xóa / đóng tìm kiếm)

- **Feature:** F03
- **Bước thực hiện:** Sau khi có highlight, bấm ✕ xóa ô tìm hoặc xóa query.
- **Kết quả mong đợi:** Chấm màu / highlight zone theo tìm kiếm biến mất.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F04-01: Thêm zone — happy path

- **Feature:** F04
- **Bước thực hiện:** + Zone → chọn các ô liền hoặc rời → đặt tên, số tầng, màu → lưu.
- **Kết quả mong đợi:** Zone xuất hiện trên bản đồ; lưu được lên Supabase.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F04-02: Xóa zone có hàng — edge

- **Feature:** F04
- **Bước thực hiện:** Thử xóa zone còn `inventory_entries` với `quantity_boxes > 0`.
- **Kết quả mong đợi:** Không cho xóa (hoặc báo lỗi) theo §7.1.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F05-01: Zone nhiều tầng — happy path

- **Feature:** F05
- **Bước thực hiện:** Tạo zone `tier_count > 1`. Tap zone → mở sheet.
- **Kết quả mong đợi:** Có tab/chọn tầng; danh sách SP theo tầng đúng.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F05-02: Zone một tầng — edge

- **Feature:** F05
- **Bước thực hiện:** Zone `tier_count === 1`, mở sheet.
- **Kết quả mong đợi:** Không gây lỗi; hiển thị danh sách tầng 1 (hoặc ẩn UI tầng dư thừa).
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F06-01: Danh sách SP trong zone — happy path

- **Feature:** F06
- **Bước thực hiện:** Tap zone có hàng → xem danh sách tên + số thùng + chấm màu.
- **Kết quả mong đợi:** Đúng dữ liệu từng lô; tap tên → mở F07.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F06-02: Zone trống — edge

- **Feature:** F06
- **Bước thực hiện:** Tap zone không có lô nào.
- **Kết quả mong đợi:** Danh sách trống hoặc thông báo rõ ràng, không crash.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F07-01: Chi tiết sản phẩm — happy path

- **Feature:** F07
- **Bước thực hiện:** Từ sheet zone hoặc tab Sản phẩm → mở chi tiết một SP có nhiều lô.
- **Kết quả mong đợi:** Hiện tên, barcode (nếu có), từng lô với zone/tầng, số thùng, hạn, ghi chú; có thể sửa/xóa lô.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F07-02: Chi tiết — edge (SP không có lô)

- **Feature:** F07
- **Bước thực hiện:** Mở SP chưa có `inventory_entries`.
- **Kết quả mong đợi:** Thông báo “chưa có lô”; vẫn chỉnh được barcode / ngưỡng nếu có UI.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F09-01: Tìm kiếm tên trên bản đồ — happy path

- **Feature:** F09
- **Bước thực hiện:** Tab Kho, tìm tên đúng với sản phẩm đang có tồn.
- **Kết quả mong đợi:** Danh sách kết quả; zone được highlight; tap kết quả → điều hướng chi tiết (nếu có nút/thẻ).
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F09-02: Tìm kiếm — edge (query < 2 ký tự)

- **Feature:** F09
- **Bước thực hiện:** Gõ 0–1 ký tự vào ô tìm.
- **Kết quả mong đợi:** Không gọi kết quả / không highlight (theo implementation hiện tại).
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F10-01: Quét barcode mode search — happy path

- **Feature:** F10
- **Bước thực hiện:** Từ tab Sản phẩm bấm quét; quét mã đã gán cho SP có trong store.
- **Kết quả mong đợi:** Mở `ProductDetail` đúng SP.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F10-02: Quét không có trong hệ thống — edge

- **Feature:** F10
- **Bước thực hiện:** Quét mã không khớp `products.barcode`.
- **Kết quả mong đợi:** Dialog “Thêm thủ công” / “Quét lại”; điều hướng `AddInventory` nếu chọn thêm.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F11-01: Tồn theo thùng — happy path

- **Feature:** F11
- **Bước thực hiện:** Thêm lô với `quantity_boxes = 5`; sau đó sửa còn `3`.
- **Kết quả mong đợi:** UI và DB phản ánh đúng số thùng nguyên.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F11-02: Cùng SP nhiều zone — edge

- **Feature:** F11
- **Bước thực hiện:** Cùng một `product_id`, thêm lô ở hai zone khác nhau.
- **Kết quả mong đợi:** Chi tiết SP hiện cả hai vị trí; tổng tồn phản ánh đúng khi tìm kiếm/highlight.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F12-01: Hạn sử dụng — happy path

- **Feature:** F12
- **Bước thực hiện:** Tạo lô có `expiry_date` trong tương lai xa; một lô sắp hết hạn theo `warning_days`.
- **Kết quả mong đợi:** Màu chấm / combined status phản ánh đúng §5 (đỏ/vàng/xanh).
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F12-02: Không nhập hạn — edge

- **Feature:** F12
- **Bước thực hiện:** Lưu lô để trống hạn (nếu cho phép).
- **Kết quả mong đợi:** Không crash; logic expiry coi là “ổn” hoặc “không hạn” theo code.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F13-01: Ghi chú sản phẩm & lô — happy path

- **Feature:** F13
- **Bước thực hiện:** Sửa `notes` trên SP (modal tab Sản phẩm); sửa `notes` trên lô ở chi tiết.
- **Kết quả mong đợi:** Lưu Supabase; hiển thị lại đúng sau khi mở lại màn.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F13-02: Ghi chú rỗng — edge

- **Feature:** F13
- **Bước thực hiện:** Xóa toàn bộ nội dung ghi chú rồi lưu.
- **Kết quả mong đợi:** `null`/empty hợp lệ; không lỗi validation.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F14-01: Thêm sản phẩm mới — happy path

- **Feature:** F14
- **Bước thực hiện:** `AddInventoryScreen` → tạo SP mới với tên bắt buộc + barcode tuỳ chọn.
- **Kết quả mong đợi:** SP xuất hiện trong store và tab Sản phẩm sau refresh/fetch.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F14-02: Thêm SP thiếu tên — edge

- **Feature:** F14
- **Bước thực hiện:** Thử tạo SP để trống tên.
- **Kết quả mong đợi:** Alert / chặn submit.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F15-01: Thêm lô hàng — happy path

- **Feature:** F15
- **Bước thực hiện:** Chọn SP, zone, tầng, số thùng, hạn (DD/MM/YYYY), ghi chú → Lưu.
- **Kết quả mong đợi:** Lô mới trên Supabase; quay lại màn trước; tồn hiển thị đúng.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F15-02: Trùng lô (cùng SP+zone+tầng+hạn) — edge

- **Feature:** F15
- **Bước thực hiện:** Thêm lô trùng key với lô đã có.
- **Kết quả mong đợi:** Hỏi “Cộng thêm” hoặc tương đương; cộng đúng số thùng nếu xác nhận.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F16-01: Sửa lô — happy path

- **Feature:** F16
- **Bước thực hiện:** Chi tiết SP → sửa số thùng / hạn ISO / ghi chú → lưu.
- **Kết quả mong đợi:** DB và UI đồng bộ.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F16-02: Xóa lô — edge

- **Feature:** F16
- **Bước thực hiện:** Xóa lô đang có tồn > 0 (xác nhận trong dialog).
- **Kết quả mong đợi:** Lô bị xóa khỏi DB và khỏi danh sách.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**
