# Chino's Warehouse — CONTEXT

Tài liệu kỹ thuật cho Cursor (và dev) khi đọc/ghi code. Business đầy đủ: **`REQUIREMENTS.md`**. Quy trình làm việc: **`WORKFLOW.md`**.

---

## §1 Tech Stack

- **React Native** (Expo SDK), **TypeScript**
- **Zustand** — state client (`warehouseStore`, `themeStore`)
- **Supabase** — PostgreSQL + Realtime (backend)
- **React Navigation** — Bottom Tabs + Native Stack
- **expo-camera** — `CameraView`, quét barcode

---

## §2 Cấu trúc file & thư mục (hiện tại)

```
assets/
components/
  ZoneDetailSheet.tsx
docs/
  project/
    REQUIREMENTS.md
    CONTEXT.md
    USER_GUIDE.md
    WORKFLOW.md
  phases/
    phase-1/
      PLAN.md
      TESTCASES.md
      HANDOFF.md
      SUMMARY.md
  DECISIONS.md
  WORKLOG.md
  BLOCKERS.md
  KNOWN_ISSUES.md
lib/
  supabase.ts
screens/
  AddInventoryScreen.tsx
  BarcodeScannerScreen.tsx
  DiscontinuedProductsScreen.tsx
  LocationManagementScreen.tsx
  MapScreen.tsx
  NotificationsScreen.tsx
  OrderDetailScreen.tsx
  OrderListScreen.tsx
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
.cursorrules
README.md
```

*Nếu thêm / xóa / đổi tên file → cập nhật lại mục này.*

---

## §3 Navigation structure

- **Root:** `NavigationContainer` → **Native Stack** (`headerShown: false`) với 2 route: `Tabs` + `BarcodeScanner`.
- **Root / BarcodeScanner:** `fullScreenModal`, fullscreen, **không** có bottom tab bar.
- **Bottom tabs:** `Map` (nhãn **Kho**) → `Products` (**Sản phẩm**) → `Orders` (**Đặt hàng**) → `Notifications` (**Thông báo**) → `Settings` (**Cài đặt**).
- **Map tab:** `MapStack` (`MapMain` → `ProductDetail` → `AddInventory`).
- **Products tab:** `ProductsStack` (`ProductsMain` → `ProductDetail` → `AddInventory`).
- **Orders tab:** `OrdersStack` (`OrderListMain` → `OrderDetail`).
- **Notifications tab:** `NotificationsStack` (`NotificationsMain` → `ProductDetail` → `AddInventory`).
- **Settings tab:** `SettingsStack` (`SettingsMain` → `LocationManagement` → `DiscontinuedProducts`). `LocationManagement` nhận optional param `openCreateModal` (boolean): `true` thì mở modal tạo kho khi mount.
- **ZoneDetailSheet:** component / sheet trên `MapScreen`, **không** phải route riêng.

**Danh sách / lọc (UI):**

- **NotificationsScreen:** dropdown **Kho** (đầu tiên **Tất cả kho**, sau đó từng `location`); lọc áp dụng cho cả hai tab **Sắp hết hạn** / **Sắp hết hàng** (chỉ tính `inventory_entries` trong zone thuộc kho đã chọn). Tab hết hạn có thêm lọc checkbox Hết hạn / Sắp hết hạn.
- **ProductsScreen:** dropdown **Kho** (cùng quy ước); khi chọn một kho chỉ hiện SP có lô trong zone của kho đó; chip lọc zone theo zone của kho đang lọc (hoặc zone của kho đang chọn trên Map khi **Tất cả kho**). Mỗi card hiện **tổng thùng** theo bộ lọc.
- **LocationManagementScreen:** danh sách kho (tên, grid X×Y, số SP distinct theo `inventory_entries` qua `zones`); FAB **+** tạo kho; sửa/xóa có modal / confirm và thông báo lỗi từ store.
- **ProductDetailScreen:** thanh **Tổng … thùng** + lọc lô theo ngữ cảnh màn hình; refetch khi focus (`useFocusEffect` + `loadData`).

---

## §4 Store — `warehouseStore.ts`

**State:** `locations`, `selectedLocationId`, `zones`, `products`, `inventoryEntries`, `isLoading`.

**Actions chính:** `setSelectedLocation`, `fetchLocations`, `addLocation`, `updateLocation`, `deleteLocation`, `fetchZones`, `fetchProducts`, `fetchInventoryByZone`, `searchProducts`, `searchByBarcode`, `addProduct`, `addInventoryEntry`, `updateInventoryEntry`, `deleteInventoryEntry`, `updateBarcode`, `updateProductStockThresholds`, `addZone`, `updateZone`, `deleteZone`.

---

## §5 Types & logic chính (`types/index.ts`)

- **Types:** `Location`, `ZoneCell`, `Zone`, `Product`, `InventoryEntry`, `ExpiryStatus`, `ExpiryColor`, `CombinedStatus`
- **Hàm:** `getExpiryStatus`, `getExpiryColor`, `getExpiryColorHex`, `getCombinedStatus`, `getCombinedStatusRank`, `formatExpiryDate`
- **Hằng màu:** `EXPIRY_COLORS` (map `CombinedStatus` → hex), `ZONE_COLORS` (preset màu zone trên bản đồ)

*Lưu ý triển khai:* `Product` trong code có thể có thêm trường DB (ví dụ `low_critical_boxes`) so với bảng tóm tắt trong `REQUIREMENTS.md` §8 — khi đổi schema hãy sync cả hai nơi.

---

## §6 Hệ thống màu chuẩn

Tham chiếu đầy đủ: **`docs/project/REQUIREMENTS.md` §5**.

Tóm tắt nhanh:

- **0–1 thùng** → Đỏ `#EF4444` (đã khớp UI sau KI-001)
- **≤ low_warning_boxes** → Vàng `#FACC15`
- **Hết hạn** → Đỏ `#EF4444`
- **≤ warning_days** (sắp hết hạn) → Vàng `#FACC15`
- **Bình thường** → Xanh `#22C55E`

**Logic ưu tiên:** Đỏ > Vàng > Xanh.

---

## §7 Coding conventions

- Comment code bằng **tiếng Việt**
- **Functional components** + hooks, không dùng class components
- Luôn dùng **`useThemeStore()`** để lấy colors — **không** hardcode màu (ngoại lệ đang tồn tại: tab bar trong `App.tsx` — xem **KI-003**)
- **Không** tự thêm npm package mới khi chưa được yêu cầu
- Khi bí hoặc thiếu thông tin → ghi vào **`docs/BLOCKERS.md`**, dừng lại hỏi người dùng

---

## §8 Quy tắc cập nhật tài liệu

Xem đầy đủ: **`docs/project/WORKFLOW.md`**.

Tóm tắt: sau mỗi thay đổi có ý nghĩa → cập nhật file tài liệu tương ứng theo vai trò DEV/TEST trong `WORKFLOW.md`.
