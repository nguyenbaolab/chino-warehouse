# Chino's Warehouse

Ứng dụng React Native (Expo) quản lý tồn kho nội bộ — bản đồ zone, sản phẩm, lô, hạn dùng, barcode.

**Tài liệu root** (cập nhật khi đổi code có ý nghĩa — xem `CONTEXT.md` **§12**):

| File | Nội dung |
|------|----------|
| [CONTEXT.md](./CONTEXT.md) | Cấu trúc project, thực tế triển khai, màu chuẩn, backlog, dependency F20–F23, TODO sau docs, quy tắc cập nhật doc. |
| [FEATURES.md](./FEATURES.md) | Ma trận **F01–F25**, bảng màu, dependency. |
| [USER_GUIDE.md](./USER_GUIDE.md) | Hướng dẫn UI / flow người dùng. |

---

## Yêu cầu

- Node.js (LTS)
- `npm` hoặc tương đương
- Project **Supabase** (URL + anon key)

---

## Cài đặt

```bash
npm install
```

Tạo **`.env`** tại root (không commit):

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

---

## Chạy app

```bash
npx expo start
```

Dùng **Expo Go** trên điện thoại (khuyến nghị cho camera / barcode).

---

## Cấu trúc project (tóm tắt)

```
assets/
components/     # ZoneDetailSheet.tsx, …
lib/            # supabase.ts
screens/        # Map, Products, ProductDetail, AddInventory, BarcodeScanner, Notifications, Settings
stores/         # warehouseStore.ts, themeStore.ts
supabase/migrations/
types/          # index.ts
App.tsx
```

Chi tiết cây file: **`CONTEXT.md` §2**.

---

## Thực tế nhanh

- **Một kho**; grid **6×6**; barcode scanner **3 mode**; `searchByBarcode` **local sync**.
- **`AddInventoryScreen`**: chưa có field barcode.
- **`low_warning_boxes`** default **3** + UI **ProductDetail**; **`low_critical_boxes`**: hướng **hardcode 1**, bỏ UI (TODO trong `CONTEXT.md` §13).

---

## Database

Áp dụng migration trong `supabase/migrations/` lên project Supabase (SQL Editor hoặc CLI).

---

## License

Theo quyết định chủ repo (chưa ghi nếu chưa có file LICENSE).
