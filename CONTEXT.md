# Chino's Warehouse — Context

## App là gì
Ứng dụng nội bộ giúp nhân viên Chino's Boba Tea & Asian Market tra cứu hàng trong kho mà không cần xuống tận nơi kiểm tra. Tìm sản phẩm theo tên hoặc quét mã vạch → biết ngay hàng ở zone nào, tầng nào, còn bao nhiêu thùng, hạn sử dụng thế nào.

## Người dùng
Chủ cửa hàng + 1–2 nhân viên. Không cần đăng nhập. Mở app lên dùng luôn.

## Trạng thái hiện tại

### ✅ Đã xong
- Database Supabase: `locations`, `zones`, `products`, `inventory_entries`
- Realtime bật cho `zones` và `inventory_entries`
- Zustand stores: `warehouseStore`, `themeStore`
- **MapScreen**: lưới kho 6×6 (1-indexed), zone nhiều ô, màu zone riêng, tên ở ô trung tâm, ô liền nhau liền mạch, tìm kiếm sản phẩm, chấm màu hạn sử dụng khi search, thêm/sửa/xóa zone
- **SettingsScreen**: toggle dark/light theme
- Navigation: 3 tab (Kho 🗺️ / Sản phẩm 📦 / Cài đặt ⚙️)

### ❌ Chưa làm
| Tính năng | Mô tả | Ưu tiên |
|---|---|---|
| ZoneDetailSheet | Tap zone → bottom sheet danh sách sản phẩm theo tầng | 🔴 Cao |
| ProductDetailScreen | Chi tiết sản phẩm, sửa/xóa lô hàng | 🔴 Cao |
| ProductsScreen | Danh sách tất cả sản phẩm, tìm kiếm, thêm mới | 🔴 Cao |
| AddInventoryForm | Thêm lô hàng: chọn sản phẩm, zone, tầng, số thùng, hạn | 🔴 Cao |
| BarcodeScanner | Camera quét mã vạch → kết quả như search | 🟡 Trung bình |
| Low stock warning | Icon cảnh báo khi còn ≤ 1 thùng | 🟡 Trung bình |

## Business rules quan trọng
- Số lượng tính theo **thùng nguyên** — thùng đang dùng dở vẫn tính là 1
- Chỉ cập nhật khi bỏ thùng đi hoàn toàn
- Xóa zone chỉ được khi không còn lô hàng nào (`quantity_boxes > 0`)
- Màu hạn: đỏ = hết hạn/hôm nay, vàng = 1–30 ngày, xanh = >30 ngày
- Một sản phẩm có thể có ở nhiều zone/tầng cùng lúc

## File quan trọng
- `types/index.ts` — tất cả types, `getExpiryStatus()`, `EXPIRY_COLORS`, `ZONE_COLORS`
- `stores/warehouseStore.ts` — mọi logic fetch/CRUD
- `stores/themeStore.ts` — theme colors
- `lib/supabase.ts` — Supabase client