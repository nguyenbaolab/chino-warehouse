# Chino's Warehouse

Ứng dụng React Native (Expo) quản lý tồn kho nội bộ — bản đồ zone, sản phẩm, lô, hạn dùng, barcode.

**Tài liệu** (cập nhật khi đổi code có ý nghĩa — xem `docs/project/WORKFLOW.md`):

| File | Nội dung |
|------|----------|
| [docs/project/REQUIREMENTS.md](./docs/project/REQUIREMENTS.md) | PRD: F01–F25, quy tắc nghiệp vụ, màu §5, mô hình dữ liệu. |
| [docs/project/CONTEXT.md](./docs/project/CONTEXT.md) | Ngữ cảnh kỹ thuật: cấu trúc repo, navigation, store, types, conventions. |
| [docs/project/USER_GUIDE.md](./docs/project/USER_GUIDE.md) | Hướng dẫn UI / flow người dùng. |
| [docs/project/WORKFLOW.md](./docs/project/WORKFLOW.md) | Quy trình DEV/TEST và cập nhật tài liệu. |
| [docs/KNOWN_ISSUES.md](./docs/KNOWN_ISSUES.md) | Bug / sai lệch đã biết (KI-xxx). |

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
docs/           # REQUIREMENTS, CONTEXT, WORKFLOW, phases, …
lib/            # supabase.ts
screens/        # Map, Products, ProductDetail, AddInventory, BarcodeScanner, Notifications, Settings
stores/         # warehouseStore.ts, themeStore.ts
supabase/migrations/
types/          # index.ts
App.tsx
```

Chi tiết cây file: **`docs/project/CONTEXT.md` §2**.

---

## Thực tế nhanh

- **Nhiều location** có thể có trong DB; tab Kho có **hàng nút chọn kho**. Lưới **6×6**; barcode scanner **3 mode**; `searchByBarcode` trên store local.
- **`AddInventoryScreen`**: chưa có field barcode lô (xem PLAN / KNOWN_ISSUES).
- **`low_warning_boxes`** default **3** + UI **ProductDetail**; **`low_critical_boxes`**: kế hoạch hardcode **1**, bỏ UI (xem `docs/phases/phase-1/PLAN_1.md`).
- **Màu status:** theo **REQUIREMENTS §5**; 0–1 thùng = đỏ (`critical` / KI-001 đã resolved).

---

## Database

Áp dụng migration trong `supabase/migrations/` lên project Supabase (SQL Editor hoặc CLI).

---

## License

Theo quyết định chủ repo (chưa ghi nếu chưa có file LICENSE).
