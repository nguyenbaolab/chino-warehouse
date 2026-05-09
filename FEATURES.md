# Chino's Warehouse — FEATURES (F01–F25)

Ma trận tính năng so với roadmap nội bộ. Trạng thái phản ánh **thực tế** tại thời điểm cập nhật doc (xem `CONTEXT.md`).

**Legend:** Done | Partial | Not started

---

## Bảng màu chuẩn (đồng bộ với `CONTEXT.md`)

| Mức | Điều kiện | Màu | Hex |
|-----|-----------|-----|-----|
| Hết hàng / Còn rất ít | 0–1 thùng | Đỏ | `#EF4444` |
| Sắp hết hàng | ≤ `low_warning_boxes` | Cam | `#F97316` |
| Hết hạn | expired | Đỏ | `#EF4444` |
| Sắp hết hạn | warning days | Vàng | `#EAB308` |
| Bình thường | ok | Xanh lá | `#22C55E` |

---

## Ma trận F01–F25

| ID | Tính năng | Trạng thái | Ghi chú |
|----|-------------|------------|---------|
| **F01** | Vận hành một kho (baseline map + zone) | **Done** | Multi-location là **F21** (chưa làm). |
| **F02** | Bản đồ kho / lưới zone | **Done** | Grid **6×6** cố định; backlog mở rộng grid. |
| **F03** | Zone detail (sheet / danh sách lô) | **Done** | |
| **F04** | Danh sách sản phẩm + CRUD cơ bản | **Done** | |
| **F05** | Chi tiết sản phẩm + lô | **Done** | Barcode gán tại đây; `low_warning_boxes` có UI. |
| **F06** | Thêm hàng (`AddInventoryScreen`) | **Partial** | **Chưa có** field barcode trên màn thêm hàng. |
| **F07** | Sửa / xóa / chuyển lô | **Done** | |
| **F08** | Ảnh sản phẩm | **Not started** | Backlog. |
| **F09** | Realtime (Supabase) | **Done** | |
| **F10** | Quét barcode (`BarcodeScannerScreen`) | **Done** | 3 mode: `search`, `assign`, `locate`; `searchByBarcode` sync local store. |
| **F11** | Thông báo (`NotificationsScreen`) | **Partial** | Backlog: đủ cảnh báo sắp hết hàng theo `low_warning_boxes`. |
| **F12** | Theme sáng/tối | **Done** | |
| **F13** | Hạn sử dụng + cảnh báo theo ngày | **Done** | Màu: bảng trên. |
| **F14** | Ngưỡng tồn (low stock) | **Partial** | `low_warning_boxes` default 3 + UI; `low_critical` hướng hardcode 1, bỏ UI (TODO). |
| **F15** | Màn Cài đặt | **Done** / **Partial** | Chủ yếu theme; chưa auth. |
| **F16** | Hiệu năng / tối ưu | **Partial** | Luôn có chỗ cải thiện. |
| **F17** | UX polish | **Partial** | Ví dụ bottom tab trên màn stack mới: chưa. |
| **F18** | Cấu hình app mở rộng | **Partial** | |
| **F19** | Báo cáo / xuất dữ liệu | **Not started** | |
| **F20** | Chuyển hàng giữa kho | **Not started** | **Depends on F21.** |
| **F21** | Multi-location / thêm & chọn kho | **Not started** | **Prerequisite: F23** (auth + model). |
| **F22** | Offline mode | **Not started** | Ưu tiên thấp. |
| **F23** | Auth / login (chủ & nhân viên) | **Not started** | **Prerequisite** cho **F21**. |
| **F24** | Tích hợp ngoài (POS / kế toán) | **Not started** | |
| **F25** | AI / gợi ý tối ưu kho | **Not started** | |

---

## Dependency (tóm tắt)

```text
F23 (Auth) ──prerequisite──► F21 (Multi-location)
                                    │
                                    └──► F20 (Chuyển hàng giữa kho)
```

---

## Technical notes (đồng bộ code)

- **BarcodeScanner**: fullscreen, không bottom tab; 3 mode như trên.
- **`searchByBarcode`**: đồng bộ, filter `products` trong memory.
- **Một kho**: không UI multi-location.
