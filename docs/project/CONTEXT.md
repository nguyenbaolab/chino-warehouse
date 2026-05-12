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
  CategoryManagementScreen.tsx
  DiscontinuedProductsScreen.tsx
  LocationManagementScreen.tsx
  MapScreen.tsx
  ZoneLayoutEditorScreen.tsx
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
- **Map tab:** `MapStack` (`MapMain` → `ZoneLayoutEditor` → `ProductDetail` → `AddInventory`).
- **Products tab:** `ProductsStack` (`ProductsMain` → `ProductDetail` → `AddInventory`).
- **Orders tab:** `OrdersStack` (`OrderListMain` → `OrderDetail`).
- **Notifications tab:** `NotificationsStack` (`NotificationsMain` → `ProductDetail` → `AddInventory`).
- **Settings tab:** `SettingsStack` (`SettingsMain` → `LocationManagement` → `CategoryManagement` → `DiscontinuedProducts`). `LocationManagement` nhận optional param `openCreateModal` (boolean): `true` thì mở modal tạo kho khi mount.
- **ZoneDetailSheet:** component / sheet trên `MapScreen`, **không** phải route riêng.

**UI bản đồ & lọc (đối chiếu code):**

- **MapScreen:** thanh header có nút **▦** (Sắp xếp / mở `ZoneLayoutEditor` cho `locationId` đang chọn) và **+ Zone**. **Chọn kho:** `Pressable` mở bottom sheet modal — danh sách kho kèm kích thước lưới (`grid_rows × grid_cols`), dòng đang chọn có ✓; nút **Thêm kho mới** điều hướng sang tab Cài đặt → `LocationManagement` với `openCreateModal: true`. Đổi kho (`pickLocation`) gọi `clearSearch` trước `setSelectedLocation` (KI-004).
- **ProductsScreen:** dropdown **Kho** (đầu **Tất cả kho**, sau đó từng `location`); khi chọn một kho chỉ hiện SP có lô trong zone của kho đó; chip lọc zone theo zone của kho đang lọc; khi **Tất cả kho** đồng bộ `inventoryEntries` theo các zone của kho đang chọn trên Map (`fetchInventoryByZone` theo `store.zones`). Mỗi card hiện **tổng thùng** theo bộ lọc.
- **NotificationsScreen:** dropdown **Kho** (cùng quy ước); khi **Tất cả kho** gọi `fetchAllInventoryEntries()` (một query toàn bộ `inventory_entries`, ghi đè store — không phụ thuộc `store.zones`). Khi chọn một kho: fetch theo zone của kho đó (`zonesForFilterLoc` + `fetchInventoryByZone`); lọc áp dụng cho cả hai tab **Sắp hết hạn** / **Sắp hết hàng**. Tab hết hạn có thêm lọc checkbox Hết hạn / Sắp hết hạn.
- **LocationManagementScreen:** danh sách kho (tên, grid X×Y, số SKU distinct theo `inventory_entries` qua `zones` của từng kho); FAB **+** tạo kho; sửa/xóa có modal / confirm và thông báo lỗi từ store.
- **ProductDetailScreen:** thanh **Tổng … thùng** + lọc lô theo ngữ cảnh màn hình; refetch khi focus (`useFocusEffect` + `loadData`).

---

## §4 Store — `warehouseStore.ts`

**State:** `locations` (mỗi `Location` có `grid_rows`, `grid_cols`), `selectedLocationId`, `zones`, `products`, `productCategoriesL1`, `productCategoriesL2`, `inventoryEntries`, `orderLists`, `orderItems`, `isLoading`.

**Actions — kho & zone:** `setSelectedLocation`, `fetchLocations`, `addLocation`, `updateLocation`, `deleteLocation`, `fetchZones`, `fetchProducts`, `fetchInventoryByZone`, `fetchAllInventoryEntries`, `searchProducts`, `searchByBarcode`, `addProduct`, `addInventoryEntry`, `updateInventoryEntry`, `deleteInventoryEntry`, `updateProductStockThresholds`, `addZone`, `updateZone`, `batchUpdateZoneCells`, `deleteZone`.

**Actions — phân loại (F30, `warehouseStore`):** `fetchCategories`, `addCategoryL1`, `updateCategoryL1`, `deleteCategoryL1`, `addCategoryL2`, `updateCategoryL2`, `deleteCategoryL2`.

**Actions — sản phẩm / cờ:** `toggleDeferred`, `togglePriceReduced`, `setProductDiscontinued`, `toggleDiscontinued`, `fetchDiscontinuedProducts`, `refreshDiscontinuedContext`.

**Actions — đặt hàng:** `fetchOrderLists`, `createOrderList`, `updateOrderList`, `deleteOrderList`, `addOrderItem`, `updateOrderItem`, `deleteOrderItem`, `confirmOrderList`, `markOrderPlaced`.

---

## §5 Types & logic chính (`types/index.ts`)

- **Types:** `Location` (gồm `grid_rows`, `grid_cols`), `ZoneCell`, `Zone`, `Product`, `ProductCategoryL1`, `ProductCategoryL2`, `InventoryEntry`, `ExpiryStatus`, `ExpiryColor`, `CombinedStatus`
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
