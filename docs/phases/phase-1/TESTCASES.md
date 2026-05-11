# Phase 1 — TESTCASES

Test cases cho Phase 1: **F01–F16** (Done / Partial), **F17** (Realtime), **F18** (Notifications — Partial), **F27** (Đặt hàng), **F28** (Không nhập nữa).  
Barcode theo **`inventory_entries.barcode`** (per **lô**), không còn per sản phẩm.  
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

### TC-F10-01: Quét barcode lô (mode search) — happy path

- **Feature:** F10
- **Bước thực hiện:** Chuẩn bị lô có `inventory_entries.barcode` đã lưu. Từ tab **Sản phẩm** mở scanner (mode search), quét đúng mã đó.
- **Kết quả mong đợi:** App khớp theo **`inventory_entries.barcode`** (per lô); **highlight zone** chứa đúng lô đó; hiển thị thông tin **đúng lô** (zone/tầng/số thùng/hạn… theo UI tab Sản phẩm sau quét); không còn giả định mã gắn trên `products`.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F10-02: Quét mã không khớp barcode lô — edge

- **Feature:** F10
- **Bước thực hiện:** Quét một mã **không** trùng bất kỳ `inventory_entries.barcode` nào trong hệ thống.
- **Kết quả mong đợi:** Hiện dialog / luồng xử lý **“Thêm thủ công”** (hoặc tương đương) và tùy chọn **quét lại**; có thể điều hướng **Thêm hàng** nếu người dùng chọn thêm thủ công.
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

---

## F17 — Đồng bộ thời gian thực (Realtime)

### TC-F17-01: Hai thiết bị — cập nhật tồn

- **Feature:** F17
- **Bước thực hiện:** Thiết bị A và B cùng mở app (cùng dữ liệu). Trên **A** sửa **số thùng** của một lô (chi tiết SP hoặc sheet zone). Trên **B** giữ màn đang hiển thị tồn liên quan (cùng SP/zone hoặc danh sách có lô đó), **không** pull refresh tay.
- **Kết quả mong đợi:** Trong **vài giây**, **B** tự phản ánh số thùng mới (Realtime hoặc refetch tương đương đã cấu hình).
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:** (Ghi rõ màn hình đã mở trên B; nếu fail, ghi có bật replication Realtime trên Supabase cho `inventory_entries` / `products` hay không.)

---

## F18 — Thông báo (`NotificationsScreen`)

### TC-F18-01: Tab Sắp hết hạn — đúng lô

- **Feature:** F18
- **Bước thực hiện:** Tạo/chọn dữ liệu có lô **sắp hết hạn** và lô **đã hết hạn** theo `warning_days` / ngày hiện tại. Mở tab **Thông báo → Sắp hết hạn**.
- **Kết quả mong đợi:** Card sản phẩm chỉ xuất hiện khi có ít nhất một lô đủ điều kiện; expand (nếu có) hiện đúng **từng lô** sắp/đã hết hạn.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F18-02: Toggle Đã giảm giá (per lô)

- **Feature:** F18
- **Bước thực hiện:** Tab **Sắp hết hạn**, mở card có nhiều lô; bấm toggle **Đã giảm giá / Chưa giảm giá** trên **một lô** cụ thể.
- **Kết quả mong đợi:** Giá trị lưu theo **`inventory_entries.is_price_reduced`**; sau khi bật **Đã giảm giá**, nút/tông hiển thị **màu xanh** (#22C55E / text trắng) theo spec UI; reload app vẫn giữ đúng lô đó.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F18-03: Filter Hết hạn / Sắp hết hạn

- **Feature:** F18
- **Bước thực hiện:** Dưới tab Sắp hết hạn, thử tổ hợp tick **Hết hạn**, **Sắp hết hạn**: không tick; tick một; tick cả hai.
- **Kết quả mong đợi:** Danh sách lô trong card lọc đúng theo quy tắc (chỉ lô hết hạn / chỉ lô sắp hết hạn / cả hai khi tick cả hai / đầy đủ khi không tick hoặc tương đương đã implement).
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F18-04: Tab Sắp hết hàng — đúng sản phẩm

- **Feature:** F18
- **Bước thực hiện:** Chuẩn bị SP có tổng thùng ≤ `low_warning_boxes` hoặc = 0, `is_discontinued = false`, không archive. Mở **Sắp hết hàng**.
- **Kết quả mong đợi:** SP xuất hiện trên tab; tổng thùng hiển thị khớp tổng mọi lô.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F18-05: Không nhập nữa — ẩn khỏi tab

- **Feature:** F18
- **Bước thực hiện:** Trên card **Sắp hết hàng**, bấm **Không nhập nữa** cho một SP đang hiện.
- **Kết quả mong đợi:** `products.is_discontinued = true`; card **biến mất** khỏi tab Sắp hết hàng; sau reload app vẫn không hiện (trừ khi đã Nhập lại từ Settings).
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

## F27 — Tab Đặt hàng

### TC-F27-01: Tạo list, thêm SP, lưu

- **Feature:** F27
- **Bước thực hiện:** Tab **Đặt hàng** → tạo list mới → vào chi tiết → thêm sản phẩm có trong kho (tên + số thùng) → lưu (blur/Done theo UI).
- **Kết quả mong đợi:** List và item hiển thị đúng; dữ liệu còn sau khi rời màn và quay lại / refetch.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F27-02: Sản phẩm thủ công ⭐ (không có trong kho)

- **Feature:** F27
- **Bước thực hiện:** Trên list **draft**, thêm tên **không** tồn tại trong kho; xác nhận dialog thêm tay (nếu có).
- **Kết quả mong đợi:** Item có cờ **manual** (⭐), tên đúng như nhập; không gán `product_id` khớp kho (theo implementation).
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F27-03: Confirm list — khóa tạm

- **Feature:** F27
- **Bước thực hiện:** List **draft** có ít nhất một item → bấm **Confirm** (hoặc nhãn tương đương).
- **Kết quả mong đợi:** Trạng thái **confirmed**; không còn sửa/xóa list như draft (khóa tạm); có lối **Mở lại** nếu spec cho phép.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F27-04: Đã đặt hàng — khóa hẳn + mở lại

- **Feature:** F27
- **Bước thực hiện:** Từ **confirmed**, bấm **Đã đặt hàng** (hoặc luồng tương đương) → kiểm tra khóa; thử **Mở lại** (có thể có confirm đặc biệt).
- **Kết quả mong đợi:** Trạng thái **placed**; UI khóa hợp lý; **Mở lại** đưa về trạng thái cho phép chỉnh sửa theo spec (draft / confirmed).
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F27-05: Xóa list draft

- **Feature:** F27
- **Bước thực hiện:** Mở list **draft** → **Xóa list** → đọc dialog (2 dòng message theo spec) → **Xóa** / **Huỷ**.
- **Kết quả mong đợi:** **Huỷ** → không đổi DB. **Xóa** → list và items xóa khỏi DB; điều hướng về danh sách list; card không còn.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

## F28 — Không nhập nữa (Settings)

### TC-F28-01: Settings — đếm discontinued

- **Feature:** F28
- **Bước thực hiện:** Đảm bảo có N sản phẩm `is_discontinued = true`, không archive. Mở tab **Cài đặt**.
- **Kết quả mong đợi:** Card **Sản phẩm không nhập nữa** hiển thị đúng **“N sản phẩm”** (khớp số thực tế).
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F28-02: Màn danh sách — tên + tồn

- **Feature:** F28
- **Bước thực hiện:** Bấm card → màn **Sản phẩm không nhập nữa**. So sánh tổng thùng với tổng `quantity_boxes` mọi lô của từng SP (tính tay hoặc từ Supabase).
- **Kết quả mong đợi:** Mỗi dòng có **tên** + **tồn kho thực tế** (tổng thùng); nếu tổng = 0 hiện **Hết hàng** (hoặc nhãn tương đương).
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**

---

### TC-F28-03: Nhập lại — quay tab Sắp hết hàng

- **Feature:** F28
- **Bước thực hiện:** Chọn một SP discontinued vẫn đủ điều kiện **Sắp hết hàng** (tổng thùng thấp theo ngưỡng). Trên màn discontinued bấm **Nhập lại**. Mở **Thông báo → Sắp hết hàng**.
- **Kết quả mong đợi:** `is_discontinued = false`; SP **xuất hiện lại** trên tab Sắp hết hàng với trạng thái tồn đúng thực tế.
- **Kết quả thực tế:** [ ] Pass [ ] Fail
- **Ghi chú:**
