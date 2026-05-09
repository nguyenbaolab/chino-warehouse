# Chino's Warehouse — CONTEXT

Tài liệu nguồn tại **root** (cùng cấp `App.tsx`, `package.json`): `CONTEXT.md`, `README.md`, `FEATURES.md`, `USER_GUIDE.md`.

---

## 1) Mục tiêu

Ứng dụng nội bộ tra cứu tồn kho theo zone/tầng, theo dõi hạn sử dụng và số thùng, đồng bộ realtime trên nhiều thiết bị.

---

## 2) Cấu trúc project (hiện tại)

```
assets/
components/
  ZoneDetailSheet.tsx
lib/
  supabase.ts
screens/
  AddInventoryScreen.tsx
  BarcodeScannerScreen.tsx
  MapScreen.tsx
  NotificationsScreen.tsx
  ProductDetailScreen.tsx
  ProductsScreen.tsx
  SettingsScreen.tsx
stores/
  themeStore.ts
  warehouseStore.ts
supabase/migrations/
types/
  index.ts
App.tsx
CONTEXT.md
README.md
FEATURES.md
USER_GUIDE.md
```

*Nếu thêm / xóa / đổi tên file hoặc screen: cập nhật lại mục này trong `CONTEXT.md`.*

---

## 3) Thực tế triển khai (đã phản ánh trong code)

- **Một kho duy nhất**: chưa multi-location, **chưa có UI** thêm hay chọn nhiều kho.
- **Bản đồ kho**: lưới **cố định 6×6**.
- **`BarcodeScannerScreen`**: **3 mode** — `search` | `assign` | `locate`; tra **`searchByBarcode`** đồng bộ trên **local store** (không query Supabase mỗi lần quét khi `products` đã có trong store).
- **`AddInventoryScreen`**: **chưa có** field nhập mã vạch; gán barcode tại **`ProductDetailScreen`** (và luồng quét **`assign`**).
- **`low_warning_boxes`**: mặc định **3**, có **UI chỉnh** trong `ProductDetailScreen`.
- **`low_critical_boxes`**: trong nghiệp vụ hiển thị **coi như 1** (cảnh báo đỏ 0–1 thùng); tài liệu backlog ghi rõ hướng **hardcode = 1**, bỏ UI riêng (xem TODO).
- **`BarcodeScannerScreen`** fullscreen: **không cần** bottom tab bar.
- **Các màn hình stack khác** (thêm hàng, chi tiết, v.v.): **nên có** bottom tab bar — **chưa làm** (backlog).

---

## 4) Hệ thống màu chuẩn (tham chiếu)

**Không còn màu cam trong status.** “Sắp hết hàng” và “sắp hết hạn” dùng **cùng một vàng** (đậm hơn bậc trước); trong code `getCombinedStatus` vẫn có khóa `critical` | `warning` nhưng **cùng map màu** — token **`#FACC15`** (`EXPIRY_COLORS`); dark theme **`#FACC15`**; light theme **`#EAB308`** (`themeStore`).

| Mức | Điều kiện | Màu | Hex |
|-----|-----------|-----|-----|
| Hết hàng / Còn rất ít | 0–1 thùng | Đỏ | `#EF4444` |
| Sắp hết hàng | ≤ `low_warning_boxes` | Vàng | `#FACC15` |
| Hết hạn | `expired` | Đỏ | `#EF4444` |
| Sắp hết hạn | theo `warning days` | Vàng | `#FACC15` |
| Bình thường | `ok` | Xanh | `#22C55E` |

**Triển khai hex:** `EXPIRY_COLORS.critical` = `EXPIRY_COLORS.warning` = **`#FACC15`**; `getExpiryColorHex` (`'yellow'`) = **`#FACC15`**. `themeStore`: dark — `statusCritical` & `statusWarning` **`#FACC15`**; light — cả hai **`#EAB308`**.

---

## 5) Data model & logic (tóm tắt)

- **`products`**: `barcode` (optional), `warning_days`, `low_warning_boxes`, `low_critical_boxes` (DB có cột; vận hành/UI đang lệch backlog — xem §13), …
- **`inventory_entries`**: `quantity_boxes`, `expiry_date`, `zone_id`, `tier`, …
- Chấm màu / badge: logic kết hợp hạn + tồn (ví dụ `getCombinedStatus` trong `types/index.ts`), map với bảng màu §4.

---

## 6) Business rules bắt buộc

- Đơn vị tồn: **thùng nguyên**; thùng đang dở vẫn tính **1**.
- Chỉ cập nhật số lượng khi **bỏ hết** thùng.
- Không xóa zone nếu còn lô có `quantity_boxes > 0`.
- Một sản phẩm có thể nằm ở **nhiều** zone/tầng.

---

## 7) File code nên đọc trước khi sửa

- `types/index.ts`
- `stores/warehouseStore.ts`, `stores/themeStore.ts`
- `screens/MapScreen.tsx`, `ProductsScreen.tsx`, `ProductDetailScreen.tsx`, `BarcodeScannerScreen.tsx`, `NotificationsScreen.tsx`, `AddInventoryScreen.tsx`
- `components/ZoneDetailSheet.tsx`
- `lib/supabase.ts`

---

## 8) Trạng thái tính năng (tóm tắt)

- **Đã có**: bản đồ zone, tìm kiếm, zone detail, sản phẩm, chi tiết, thêm/sửa/xóa/chuyển lô, realtime, thông báo (một phần), theme, quét barcode 3 mode, ngưỡng cảnh báo tồn (một phần).
- **Chưa / backlog**: xem **§9** và ma trận **`FEATURES.md`**.

---

## 9) Backlog (có dependency)

| Hạng mục | Ghi chú dependency |
|----------|-------------------|
| Thêm **barcode field** vào `AddInventoryScreen` | Độc lập. |
| **Bỏ UI** `low_critical_boxes`, **hardcode = 1** trong logic hiển thị | Đồng bộ với DB nếu cần giữ cột cố định. |
| **Fix `NotificationsScreen`**: hiện đủ cảnh báo sắp hết hàng (`quantity_boxes <= low_warning_boxes`) | Phụ thuộc rule tồn + có thể cần đồng bộ màu §4. |
| **Bottom tab bar** cho các màn hình mới (stack) | Navigation structure. |
| **Grid kho mở rộng** (không chỉ 6×6 cứng) | Map + model zone. |
| **Multi-location / thêm kho** (**F21**) | **Phụ thuộc F23** (auth), model dữ liệu kho. |
| **Auth / login** (**F23**) | **Prerequisite** cho F21. |
| **Chuyển hàng giữa kho** (**F20**) | **Depends on F21**. |
| **Ảnh sản phẩm** (**F08**) | Storage + UI; có thể sau auth. |
| **Offline mode** (**F22**) | Ưu tiên thấp; thường sau sync ổn định. |

---

## 10) Tài liệu liên quan (root)

| File | Vai trò |
|------|---------|
| `README.md` | Cài đặt, chạy app, env, cấu trúc tóm tắt. |
| `FEATURES.md` | Ma trận **F01–F25** + trạng thái. |
| `USER_GUIDE.md` | UI / flow người dùng. |

---

## 11) Liên kết nội bộ

- Ma trận chi tiết: **`FEATURES.md`**
- Hướng dẫn sử dụng: **`USER_GUIDE.md`**

---

## 12) Quy tắc cập nhật docs

- Sau **mỗi** thay đổi code có ý nghĩa (tính năng, luồng, data model, màu, navigation, env, migration), **bắt buộc** cập nhật tài liệu **root** tương ứng.
- Nếu **thêm / xóa / đổi tên** file hoặc screen: cập nhật **cấu trúc project** trong **`CONTEXT.md`** (mục §2).
- **`CONTEXT.md`**: trạng thái tính năng, data model, business rules, backlog, TODO sau docs.
- **`FEATURES.md`**: trạng thái **F01–F25**.
- **`USER_GUIDE.md`**: khi có thay đổi **UI** hoặc **flow** người dùng.
- **`README.md`**: khi có thay đổi **setup**, biến môi trường, plugin, hoặc **cấu trúc dự án**.
- **Không** commit thay đổi tính năng mà **không** cập nhật doc khi thay đổi đó **ảnh hưởng** hành vi, dữ liệu, hoặc hướng dẫn sử dụng / cài đặt.

---

## 13) TODO sau khi docs (ưu tiên thực hiện trong code)

1. Bỏ UI `low_critical_boxes` khỏi `ProductDetailScreen`, hardcode = **1** trong logic.
2. Fix `NotificationsScreen`: hiện đủ cảnh báo sắp hết hàng (`quantity_boxes <= low_warning_boxes`).
3. Thêm bottom tab bar cho các màn hình mới (stack).
4. Thêm barcode field vào `AddInventoryScreen`.
