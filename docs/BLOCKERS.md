# BLOCKERS

Những vấn đề Cursor không tự quyết định được.  
Khi gặp blocker mới: **ghi vào đây**, **dừng lại**, **hỏi người dùng**.

---

## Đã giải quyết

### [BLK-002] Để sau cần bảng lưu trữ mới → Resolved

- **Đã chốt:** Cột `products.is_deferred` (boolean, default false); migration `supabase/migrations/20260511_add_product_is_deferred.sql`; `toggleDeferred` trong `warehouseStore`.
- **Tham chiếu:** `docs/DECISIONS.md` (mục BLK-002 Resolved), F18 trong `docs/project/REQUIREMENTS.md`.

### [BLK-001] Chưa rõ hành vi barcode per lô → Resolved

- **Đã chốt:** Barcode per lô (`inventory_entries.barcode`), không dùng `products.barcode`.
- **Ghi chú:** Đã chốt và implement trong Phase 1.

---

## Đang chờ

(trống)
