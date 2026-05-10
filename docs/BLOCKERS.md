# BLOCKERS

Những vấn đề Cursor không tự quyết định được.  
Khi gặp blocker mới: **ghi vào đây**, **dừng lại**, **hỏi người dùng**.

---

## Đã giải quyết

(trống — chưa có blocker nào)

---

## Đang chờ

### [BLK-001] Chưa rõ hành vi barcode per lô

- **Vấn đề:** Chưa xác định barcode gắn với **Product** hay **InventoryEntry** (lô). Hiện tại code đang gắn per Product.
- **Ảnh hưởng:** Data model `InventoryEntry`, luồng quét barcode, màn hình chi tiết sản phẩm.
- **Cần hỏi chủ cửa hàng:**
  1. Cùng sản phẩm, các lô khác nhau có bao giờ khác barcode không?
  2. Quét barcode muốn thấy tất cả lô hay chỉ lô khớp barcode?
  3. Có barcode nào map với 2 sản phẩm khác nhau không?
- **Trạng thái:** Blocked — chờ xác nhận từ chủ cửa hàng
- **Hành động:** Không làm gì liên quan đến barcode per lô cho đến khi blocker này được giải quyết.
