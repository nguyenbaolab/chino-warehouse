# BLOCKERS

Những vấn đề Cursor không tự quyết định được.  
Khi gặp blocker mới: **ghi vào đây**, **dừng lại**, **hỏi người dùng**.

---

## Đã giải quyết

### [BLK-002] Để sau cần bảng lưu trữ mới → Resolved

- **Đã chốt:** Cột `products.is_deferred` (boolean, default false); migration `supabase/migrations/20260511_add_product_is_deferred.sql`; `toggleDeferred` trong `warehouseStore`.
- **Tham chiếu:** `docs/DECISIONS.md` (mục BLK-002 Resolved), F18 trong `docs/project/REQUIREMENTS.md`.

### [BLK-001] Barcode per lô — **Closed hoàn toàn**

- **Đã chốt kỹ thuật:** Barcode per lô (`inventory_entries.barcode`), không dùng `products.barcode`; đã implement trong Phase 1.
- **Đã chốt nghiệp vụ (không còn mở):** Sau khi rà soát với chủ cửa hàng, các tình huống sau **hợp lệ**, **không** cần xử lý thêm trong app:
  - **Trùng barcode giữa 2 lô:** app hiện **cả hai zone**, **hợp lệ** (hai lô khác nhau trùng mã vật lý).
  - **Đổi nhãn / mã lô mới:** tức là **hai lô khác nhau** — hợp lệ, không coi là lỗi dữ liệu.
  - **Thùng không có barcode:** nhập tay vào field barcode khi thêm/sửa lô, **không bắt buộc** quét — hợp lệ.
- **Kết luận:** **Không có edge case nào** trong phạm vi BLK-001 cần backlog thêm. (Mở rộng kiểu multi-barcode nhiều mã cho một lô — nếu có — là chủ đề Phase 2 tách, không mở lại BLK-001.)

### [BLK-003] SEC-08 — Realtime security bị chặn bởi thiếu auth → Resolved

- **Vấn đề:** `SettingsScreen` và `DiscontinuedProductsScreen` (và toàn bộ Realtime subscription trong app) cần `private: true` + RLS `authenticated` để bảo mật channel. Fix không thể thực hiện khi chưa có auth.
- **Đã chốt:** `private: true` + migration RLS `realtime.messages` — xem KI-012 Resolved.
- **Tham chiếu:** `docs/KNOWN_ISSUES.md` KI-012

---

## Đang chờ

(trống)
