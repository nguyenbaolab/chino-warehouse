# Chino's Warehouse — USER GUIDE

Hướng dẫn sử dụng cho chủ cửa hàng và nhân viên. Chi tiết kỹ thuật: [`CONTEXT.md`](./CONTEXT.md), [`REQUIREMENTS.md`](./REQUIREMENTS.md).

---

## 1) Tổng quan

App quản lý kho nội bộ, yêu cầu **đăng nhập bằng email/password** do người phụ trách cấp.

App có **5 tab**: **Kho**, **Sản phẩm**, **Đặt hàng**, **Thông báo**, **Cài đặt**.
Màn **Quét mã vạch** mở **toàn màn hình** — không thấy thanh tab là đúng thiết kế.

Cài đặt: tải file APK (Android) do người phụ trách gửi, hoặc chạy qua Expo Go khi phát triển.

---

## 2) Đăng nhập

- Mở app → màn hình **Đăng nhập** (email + mật khẩu).
- Phiên đăng nhập tự hết sau **20 phút không thao tác** — app hiện thông báo "Phiên đăng nhập đã hết hạn" và quay về màn đăng nhập.
- **Tắt app hoàn toàn** (swipe kill) → phải đăng nhập lại (session không được lưu lại).
- Chuyển sang app khác dưới 20 phút → quay lại vẫn dùng bình thường.
- Quên mật khẩu hoặc cần tài khoản mới → liên hệ người phụ trách.

---

## 3) Tab Kho (bản đồ)

- Lưới zone với **kích thước configurable** (mặc định 6×6, mỗi kho có thể khác).
- **Chọn kho:** bấm tên kho trên thanh header → bottom sheet hiện danh sách kho (tên + grid size), chọn kho → bản đồ load zone tương ứng.
- **Tìm kiếm** theo tên sản phẩm → highlight các zone có lô.
- **Nút quét** cạnh ô tìm: mở camera mode **`locate`** — quét barcode → highlight zone chứa lô.
- **Nút ▦ (Sắp xếp):** mở **Zone Layout Editor** — kéo tile zone vào vị trí mới trên grid, preview bản đồ thật, confirm để lưu.
- **Nút + Zone:** tạo zone mới trong kho đang chọn.

---

## 4) Tab Sản phẩm

- Danh sách sản phẩm; **chấm màu** theo trạng thái tổng hợp (tồn + hạn).
- **Lọc theo kho:** dropdown đầu màn hình — chọn kho cụ thể chỉ hiện SP có lô trong kho đó; chọn "Tất cả kho" hiện toàn bộ.
- **Lọc theo zone:** dropdown bên dưới kho — cần chọn kho trước mới lọc được zone.
- **Dòng phân loại:** mỗi card hiện nhóm (Cấp 1) · loại (Cấp 2) nếu đã gán.
- **Tìm kiếm** + **quét**: mode **`search`** — quét barcode → mở chi tiết (hoặc hướng dẫn thêm thủ công nếu chưa có).

---

## 5) Chi tiết sản phẩm

- Xem lô, số thùng, hạn, zone/tầng.
- **Mã vạch**: nhập tay hoặc bấm **📷** → camera quét → **Lưu**.
- **Ngưỡng sắp hết hàng** (`low_warning_boxes`): mặc định **3**, chỉnh tại section Chi tiết.
- Mức **hết hàng / còn rất ít** (0–1 thùng): **đỏ** — không chỉnh được.
- **Section Phân loại:** dropdown **Nhóm (Cấp 1)** và **Loại (Cấp 2)** — chọn hoặc bỏ chọn (cả hai optional). Đổi Cấp 1 → Cấp 2 cũ bị reset.
- **Section Lịch sử thay đổi:** 10 entries gần nhất liên quan SP (thêm lô, sửa số thùng, chuyển zone, xóa lô, đổi tên…). Nút **Xem tất cả** → màn Lịch sử thay đổi đầy đủ.

---

## 6) Tab Thông báo

- **2 tab con:** Sắp hết hạn / Sắp hết hàng.
- **Lọc theo kho:** dropdown đầu màn hình — chọn kho hoặc "Tất cả kho".
- **Sắp hết hạn:** card sản phẩm sắp hết hạn; toggle **Đã giảm giá** theo lô; card đã hết hạn hiện đỏ nhạt + nhãn "Hết hạn rồi"; bấm card → chi tiết SP. Tab có checkbox lọc Hết hạn / Sắp hết hạn.
- **Sắp hết hàng:** card sản phẩm tồn thấp; nút **Thêm vào danh sách nhập** (→ tab Đặt hàng) và **Không nhập nữa** (→ đánh dấu `is_discontinued`).

---

## 7) Tab Cài đặt

- **Quản lý kho:** danh sách kho (tên, grid size, số SKU). Thêm kho mới (nhập tên + kích thước lưới), sửa tên / đổi grid size, xóa kho (block nếu còn hàng).
- **Phân loại sản phẩm:** quản lý danh mục 2 cấp — Cấp 1 (nhóm) và Cấp 2 (loại). Thêm/sửa/xóa nhóm và loại trong giao diện accordion.
- **Lịch sử thay đổi:** card hiện entry mới nhất (ai làm gì). Bấm vào → màn **Lịch sử thay đổi** với 4 filter (kho, loại thay đổi, người, sản phẩm) + pagination 10 entries/trang.
- **Sản phẩm không nhập nữa:** danh sách SP đánh dấu discontinued; xem tồn kho realtime; cho phép **Nhập lại** nếu cần.
- **Giao diện sáng / tối:** toggle chuyển theme.
- **Đăng xuất:** bấm nút Đăng xuất → về màn đăng nhập.

---

## 8) Ý nghĩa màu (chuẩn tài liệu)

**Vàng** = có việc cần kiểm tra: **sắp hết hàng** (tồn ≤ `low_warning_boxes`) **hoặc sắp hết hạn** (trong khoảng cảnh báo ngày) — **cùng một màu**, không tách riêng.

Tham chiếu chính xác bảng hex: **REQUIREMENTS.md §5**. Tóm tắt:

| Mức | Điều kiện | Màu | Hex (tham chiếu) |
|-----|-----------|-----|------------------|
| Hết hàng / Còn rất ít | 0–1 thùng | Đỏ | `#EF4444` |
| Sắp hết hàng | ≤ `low_warning_boxes` | Vàng | `#FACC15` |
| Hết hạn | đã hết hạn | Đỏ | `#EF4444` |
| Sắp hết hạn | ≤ `warning_days` | Vàng | `#FACC15` |
| Bình thường | không thuộc các mức trên | Xanh | `#22C55E` |

---

## 9) Gợi ý khi lỗi

- **Không đăng nhập được:** kiểm tra email/password đúng; quên mật khẩu hoặc cần tài khoản mới → liên hệ người phụ trách.
- **"Phiên đăng nhập đã hết hạn":** bình thường — phiên hết sau 20 phút không dùng. Đăng nhập lại.
- **Camera:** cấp quyền camera trong cài đặt máy.
- **Quét không ra:** kiểm tra sản phẩm/lô đã có barcode trong hệ thống (gán ở chi tiết sản phẩm hoặc khi thêm lô).
- **Dữ liệu không load:** cần mạng Internet; đồng bộ tức thì giữa thiết bị qua Supabase Realtime.
- **App bị tắt / khởi động lại:** phải đăng nhập lại — đây là hành vi bảo mật có chủ đích.
