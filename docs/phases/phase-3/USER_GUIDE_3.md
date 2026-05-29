# Hướng dẫn sử dụng — Tính năng Phase 3

**Phiên bản:** Phase 3 | Tháng 5/2026  
**Cửa hàng:** Chino's Boba Tea & Asian Market — Joensuu, Finland

Hướng dẫn này **chỉ bao gồm tính năng mới từ Phase 3**. Các tính năng cơ bản (bản đồ kho, quét mã, thêm lô, thông báo, đặt hàng…) xem **`docs/phases/phase-1/USER_GUIDE_1.md`**.

---

## Phân quyền (F24)

Sau khi đăng nhập, mỗi người có **một vai trò**. App tự ẩn nút mà bạn không được dùng.

| Vai trò | Ai thường là | Làm được gì |
|---------|----------------|-------------|
| **Chủ cửa hàng** (super_admin) | Bạn | Mọi thứ + **tạo tài khoản** + cấp/thu quyền admin + bật/tắt nhân viên |
| **Quản lý** (admin) | Người bạn tin tưởng | Xem **Quản lý người dùng**, bật/tắt guest hoặc khóa tài khoản nhân viên — **không** tạo tài khoản mới |
| **Nhân viên** (staff) | Nhân viên kho/quầy | Thêm, sửa, xóa hàng, zone, đặt hàng… như trước — **không** vào Quản lý người dùng |
| **Khách xem** (guest) | Người chỉ cần xem | Chỉ **xem** — không sửa, không thêm, không xóa; vẫn xem được **Lịch sử thay đổi** và **Tổng quan kho** |

**Tài khoản bị khóa:** đăng nhập xong app báo *"Tài khoản đã bị vô hiệu hóa"* và đăng xuất ngay.

### Chủ cửa hàng: tạo tài khoản cho nhân viên

1. Vào tab **Cài đặt** → **Quản lý người dùng**.
2. Bấm **+ Tạo tài khoản**.
3. Nhập **email** và **mật khẩu** (nhân viên dùng để đăng nhập lần sau).
4. Tài khoản mới mặc định là **nhân viên** (staff).

### Bật/tắt hoặc chuyển quyền nhân viên

Trong **Quản lý người dùng**, mỗi dòng là một người:

- **Vô hiệu hóa / Kích hoạt** — nhân viên nghỉ việc thì tắt; quay lại thì bật.
- **Chuyển Guest ↔ Staff** — cho người chỉ xem tạm thời, hoặc trả lại quyền làm việc bình thường.
- **Cấp Admin** (chỉ chủ) — cho người đó quản lý user khác.

*Bạn không thể tự khóa hoặc hạ quyền chính mình.*

---

## Bật/tắt cảnh báo (Settings)

Trong **Cài đặt**, có hai công tắc riêng:

| Công tắc | Khi bật | Khi tắt |
|----------|---------|---------|
| **Cảnh báo hết hạn** | Tab **Thông báo → Sắp hết hạn** tô đỏ/vàng theo hạn | Vẫn thấy danh sách SP, **không** tô màu cảnh báo, **không** đếm badge cảnh báo |
| **Cảnh báo hết hàng** | Tab **Sắp hết hàng** tô màu theo tồn thấp | Tương tự — vẫn thấy SP, không nhấn mạnh màu |

Dùng khi mùa ít cần nhắc, hoặc muốn tập trung làm việc khác mà không bị “đỏ vàng” liên tục. Cài đặt **lưu trên máy** — mở app lại vẫn giữ.

---

## Tổng quan kho (Dashboard)

1. **Cài đặt** → card **Tổng quan kho**.
2. Màn hình hiện các con số, ví dụ:
   - Tổng **SKU** (loại hàng có ít nhất một lô trong kho)
   - Số **kho** đang dùng
   - Số SP **sắp hết hàng** / **hết hàng**
   - Số lô **sắp hết hạn** / **đã hết hạn**
   - Số SP **không nhập nữa**

Không có biểu đồ — chỉ số chữ, màu theo mức độ (xanh / vàng / đỏ). Mỗi lần vào màn, app **tải lại** số mới nhất.

---

## Nhập ngày hạn mới (DD/MM/YYYY)

Khi thêm hoặc sửa **hạn sử dụng** của lô (trong zone hoặc khi nhập hàng):

- Gõ theo dạng **ngày/tháng/năm**, ví dụ: `30/12/2026` = 30 tháng 12 năm 2026.
- Chỉ cần **tháng và năm**? Gõ `12/2026` — app tự hiểu là **ngày 1** tháng 12 năm 2026.
- Sai format (thiếu số, ký tự lạ) → app **báo lỗi**, không lưu.

*Gợi ý trên màn hình sẽ nhắc format DD/MM/YYYY.*

---

## Tìm hàng bằng mã vạch (gõ tay)

Ngoài nút **quét camera**, bạn có thể **gõ mã** trên thùng vào ô tìm:

| Màn | Cách làm |
|-----|----------|
| **Kho** | Ô tìm trên bản đồ — gõ mã vạch → thấy sản phẩm/lô, zone được highlight |
| **Sản phẩm** | Ô tìm danh sách — gõ mã → lọc đúng SP có lô mang mã đó |

Sau khi quét mã trên tab **Sản phẩm**, bấm **✕** trong ô tìm → danh sách **trở lại đầy đủ** (không kẹt ở kết quả lọc).

---

## Sửa tên hàng nhanh (trong zone)

1. Tab **Kho** → chạm một **zone** → mở danh sách hàng trong zone.
2. **Chạm vào tên** sản phẩm (không cần vào chi tiết SP).
3. Tên thành ô chỉnh sửa — sửa xong bấm **Done** hoặc chạm ra ngoài → **lưu**.

Chỉ đổi **tên hiển thị**; không đổi số thùng, hạn, hay vị trí lô.

---

## Ảnh sản phẩm (F08)

Trong **chi tiết sản phẩm**:

1. **Thêm ảnh:** bấm vùng ảnh → chọn **chụp** hoặc **chọn từ thư viện**.
2. **Xem:** ảnh hiện trên đầu màn chi tiết.
3. **Thay ảnh:** thêm ảnh mới → ảnh cũ được thay (không còn dùng).

Ảnh giúp nhân viên nhận đúng mặt hàng (ví dụ nhiều loại trân châu, bao bì tương tự).

---

## Đặt hàng mở rộng (F27) — tóm tắt

*(Khi Phase 3 hoàn thành phần F27)*

- Mỗi **danh sách đặt hàng** có hai tab: **Hàng trong kho** (từ kho) và **Hàng mới** (ghi tay).
- Hàng từ tab **Sắp hết hàng** nhảy vào list — **để trống số thùng** đến khi bạn **Xác nhận** đơn.
- Sau xác nhận: **Xuất PDF** một file gộp cả hai tab → rồi đánh dấu **Đã đặt**.

Chi tiết đầy đủ sẽ bổ sung trong bản USER_GUIDE khi tính năng được bàn giao.

---

## Cần trợ giúp?

Hỏi người phụ trách kỹ thuật hoặc xem **`docs/project/USER_GUIDE.md`** (nếu có bản tổng hợp).
