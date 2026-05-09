# Chino's Warehouse — USER GUIDE

Hướng dẫn sử dụng cho chủ cửa hàng và nhân viên. Chi tiết kỹ thuật: `CONTEXT.md`, `FEATURES.md`.

---

## 1) Tổng quan

App có **bottom tab**: **Kho**, **Sản phẩm**, **Thông báo**, **Cài đặt**.  
Màn **Quét mã vạch** mở **toàn màn hình** — **không thấy thanh tab** là đúng thiết kế hiện tại.  
**Các màn khác** (thêm hàng, chi tiết, …) trong tương lai nên vẫn thấy tab — tính năng đó **đang trong backlog** (chưa có trên mọi màn).

---

## 2) Một kho

Hệ thống đang vận hành **một kho**; chưa có màn hình **thêm hay chọn nhiều kho**.

---

## 3) Tab Kho (bản đồ)

- Lưới zone **6×6** (cố định trong phiên bản hiện tại).
- **Tìm kiếm** theo tên sản phẩm → highlight các zone có lô.
- **Nút quét** cạnh ô tìm: mở camera mode **`locate`** — quét barcode → điền tìm kiếm và highlight giống gõ tên.

---

## 4) Tab Sản phẩm

- Danh sách sản phẩm; **chấm màu** theo trạng thái tổng hợp (tồn + hạn).
- **Tìm kiếm** + **quét**: mode **`search`** — tìm theo barcode → mở chi tiết (hoặc hướng dẫn thêm thủ công nếu chưa có).
- **Thêm sản phẩm / lô** (`AddInventoryScreen`): **không có ô mã vạch**; gán barcode sau tại **Chi tiết sản phẩm**.

---

## 5) Chi tiết sản phẩm

- Xem lô, số thùng, hạn, zone/tầng.
- **Mã vạch**: nhập tay hoặc bấm **📷** → camera mode **`assign`** → quay lại màn hình → **Lưu**.
- **Ngưỡng sắp hết hàng** (`low_warning_boxes`): mặc định **3**, có thể chỉnh tại đây.
- Mức **hết hàng / còn rất ít** (0–1 thùng): hiển thị theo rule chung; **không** có chỗ chỉnh ngưỡng “critical” riêng trên UI (theo hướng hardcode — xem `CONTEXT.md` TODO).

---

## 6) Tab Thông báo

- Danh sách cảnh báo (hết hạn, sắp hết hạn, tồn thấp, …).  
- Đang có backlog để **hiện đủ** cảnh báo sắp hết hàng theo ngưỡng `low_warning_boxes`.

---

## 7) Tab Cài đặt

- Chế độ **sáng / tối**.

---

## 8) Ý nghĩa màu (chuẩn tài liệu)

| Mức | Điều kiện | Màu | Hex |
|-----|-----------|-----|-----|
| Hết hàng / Còn rất ít | 0–1 thùng | Đỏ | `#EF4444` |
| Sắp hết hàng | ≤ `low_warning_boxes` | Cam | `#F97316` |
| Hết hạn | đã hết hạn | Đỏ | `#EF4444` |
| Sắp hết hạn | trong khoảng cảnh báo ngày | Vàng | `#EAB308` |
| Bình thường | không thuộc các mức trên | Xanh lá | `#22C55E` |

---

## 9) Gợi ý khi lỗi

- **Camera**: cấp quyền camera trong cài đặt máy.
- **Quét không ra**: kiểm tra sản phẩm đã có barcode trong hệ thống (gán ở chi tiết sản phẩm).
- **Dữ liệu**: cần mạng để đồng bộ realtime.
