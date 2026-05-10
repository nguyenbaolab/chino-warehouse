# Chino's Warehouse — USER GUIDE

Hướng dẫn sử dụng cho chủ cửa hàng và nhân viên. Chi tiết kỹ thuật: [`CONTEXT.md`](./CONTEXT.md), [`REQUIREMENTS.md`](./REQUIREMENTS.md).

---

## 1) Tổng quan

App có **bottom tab**: **Kho**, **Sản phẩm**, **Thông báo**, **Cài đặt**.  
Màn **Quét mã vạch** mở **toàn màn hình** — **không thấy thanh tab** là đúng thiết kế hiện tại.  
**Các màn khác** (thêm hàng, chi tiết, …) trong tương lai nên vẫn thấy tab — tính năng đó **đang trong backlog** (chưa có trên mọi màn).

---

## 2) Chọn kho (location)

Trên tab **Kho**, phía trên bản đồ có **hàng nút** chọn kho đang xem (theo dữ liệu `locations` trong Supabase). Có thể có một hoặc nhiều kho — bấm tên kho để đổi bản đồ zone tương ứng.

---

## 3) Tab Kho (bản đồ)

- Lưới zone **6×6** (cố định trong phiên bản hiện tại).
- **Tìm kiếm** theo tên sản phẩm → highlight các zone có lô.
- **Nút quét** cạnh ô tìm: mở camera mode **`locate`** — quét barcode → điền tìm kiếm và highlight giống gõ tên.

---

## 4) Tab Sản phẩm

- Danh sách sản phẩm; **chấm màu** theo trạng thái tổng hợp (tồn + hạn).
- **Tìm kiếm** + **quét**: mode **`search`** — tìm theo barcode → mở chi tiết (hoặc hướng dẫn thêm thủ công nếu chưa có).
- **Thêm sản phẩm / lô** (`AddInventoryScreen`): **không có ô mã vạch** cho lô; gán barcode sản phẩm sau tại **Chi tiết sản phẩm** (theo quy tắc nghiệp vụ).

---

## 5) Chi tiết sản phẩm

- Xem lô, số thùng, hạn, zone/tầng.
- **Mã vạch**: nhập tay hoặc bấm **📷** → camera mode **`assign`** → quay lại màn hình → **Lưu**.
- **Ngưỡng sắp hết hàng** (`low_warning_boxes`): mặc định **3**, có thể chỉnh tại đây.
- Mức **hết hàng / còn rất ít** (0–1 thùng): theo **REQUIREMENTS.md §5** là **đỏ** trên chấm màu / theme (`critical`). Kế hoạch: bỏ chỉnh `low_critical_boxes` trên UI, hardcode = 1.

---

## 6) Tab Thông báo

- Danh sách cảnh báo (hết hạn, sắp hết hạn, tồn thấp theo ngưỡng, …).
- Định dạng card đầy đủ theo **REQUIREMENTS.md §7.6** (tổng thùng + thùng có vấn đề) có thể chưa khớp — xem backlog trong `docs/phases/phase-1/PLAN.md` và `docs/KNOWN_ISSUES.md`.

---

## 7) Tab Cài đặt

- Chế độ **sáng / tối**.

---

## 8) Ý nghĩa màu (chuẩn tài liệu)

**Vàng** = có việc cần kiểm tra: **sắp hết hàng** (tồn ≤ `low_warning_boxes`) **hoặc sắp hết hạn** (trong khoảng cảnh báo ngày) — **cùng một màu**, không còn tách riêng màu cam.

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

- **Camera**: cấp quyền camera trong cài đặt máy.
- **Quét không ra**: kiểm tra sản phẩm đã có barcode trong hệ thống (gán ở chi tiết sản phẩm).
- **Dữ liệu**: cần mạng; đồng bộ tức thì giữa thiết bị phụ thuộc Supabase Realtime (xem KI-002 trong `docs/KNOWN_ISSUES.md`).
