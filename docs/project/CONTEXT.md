# Chino's Warehouse — CONTEXT

Tài liệu kỹ thuật cho Cursor (và dev) khi đọc/ghi code. Business đầy đủ: **`REQUIREMENTS.md`**. Quy trình làm việc: **`WORKFLOW.md`**.

---

## §1 Tech Stack

- **React Native** (Expo SDK), **TypeScript**
- **Zustand** — state client (`warehouseStore`, `themeStore`)
- **Supabase** — PostgreSQL + Realtime (backend)
- **React Navigation** — Bottom Tabs + Native Stack
- **expo-camera** — `CameraView`, quét barcode
- **expo-secure-store** — không còn dùng cho session auth (đã đổi sang memory-only); có thể dùng cho mục đích khác nếu cần
- **Supabase Auth** — email/password sign-in, memory-only session (kill app = logout), inactivity timer 20 phút trong App.tsx

**Mô hình bảo mật (client-direct BaaS):**
- Anon key bundle trong APK — hợp lệ vì RLS chặn mọi request không có JWT authenticated.
- RLS bật trên tất cả 8 bảng với policy `authenticated_only` (`auth.uid() IS NOT NULL`).
- Realtime channel dùng `private: true` + RLS policy trên `realtime.messages`.
- Không có server backend riêng — phù hợp app nội bộ quy mô nhỏ (xem `DECISIONS.md`).
- RBAC (phân quyền manager/nhân viên) → Phase 3, F24.

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
      PLAN_1.md
      TESTCASES_1.md
      HANDOFF_1.md
      SUMMARY_1.md
      USER_GUIDE_1.md
    phase-2/
      PLAN_2.md
      GOLIVE_CHECKLIST_2.md
      HANDOFF_2.md
      TESTCASES_2.md
  DECISIONS.md
  WORKLOG.md
  BLOCKERS.md
  KNOWN_ISSUES.md
lib/
  supabase.ts
screens/
  AddInventoryScreen.tsx
  AuditLogScreen.tsx
  BarcodeScannerScreen.tsx
  CategoryManagementScreen.tsx
  DiscontinuedProductsScreen.tsx
  LocationManagementScreen.tsx
  LoginScreen.tsx
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

- **Auth gate** (`App.tsx`): kiểm tra `supabase.auth.getSession()` khi mount + subscribe `onAuthStateChange`. Chưa có session → `<LoginScreen />`; loading → `<ActivityIndicator />`; có session → render `NavigationContainer` + navigation bên dưới.
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

- **SettingsScreen:** hai card ngang **Quản lý kho** / **Phân loại sản phẩm** (subtext `X nhóm · Y loại`); `useFocusEffect` gọi `fetchCategories` khi cả hai danh sách category rỗng; card phân loại → `CategoryManagement`. Card **Lịch sử thay đổi** — subtitle hiển thị "Lần cuối: [tên] [action] [tên sản phẩm]" (query 1 record mới nhất từ `audit_logs`); navigate sang `AuditLogScreen`.
- **AuditLogScreen:** truy cập từ Settings card "Lịch sử thay đổi" hoặc từ nút "Xem tất cả" trong `ProductDetailScreen`. **4 Filter — Modal-based searchable dropdown** (`SearchableDropdownModal`: Modal bottom sheet + FlatList + TextInput tìm kiếm auto-focus, case-insensitive substring): [1] Kho (tất cả / từng kho — disabled + opacity 0.4 khi loại = Sản phẩm) · [2] Loại thay đổi (tất cả / Lô hàng / Sản phẩm — chọn Sản phẩm tự reset kho về null) · [3] Người thay đổi (distinct `changed_by_name` từ 50 entries gần nhất; placeholder "Tất cả (chưa có lịch sử)" khi chưa có entry) · [4] Sản phẩm (tất cả / từng sản phẩm — set sẵn khi navigate từ `ProductDetailScreen`; icon 📷 bên phải label → `BarcodeScanner` → `searchByBarcode` → set `filterProductId`). Khi bất kỳ filter thay đổi: reset pages + load lại. **Danh sách:** 10 entries mỗi trang, mỗi entry gồm icon action · tên người · nhãn loại (Lô hàng / Sản phẩm) · thời gian · field thay đổi. **Pagination:** nút mũi tên góc dưới phải = xem cũ hơn (query thêm 10 từ DB); nút mũi tên góc dưới trái = xem mới hơn (từ cache). Cursor-based pagination dùng `changed_at`. **Cache:** tất cả pages đã query lưu trong local state, clear khi unmount màn. **Tên user:** lấy phần trước @ của email, được lưu sẵn trong cột `changed_by_name` của `audit_logs` (ghi bởi trigger, không join runtime). **Realtime:** chưa implement — deferred (xem KI-026).
- **MapScreen:** thanh header có nút **▦** (Sắp xếp / mở `ZoneLayoutEditor` cho `locationId` đang chọn) và **+ Zone**. **Chọn kho:** `Pressable` mở bottom sheet modal — danh sách kho kèm kích thước lưới (`grid_rows × grid_cols`), dòng đang chọn có ✓; nút **Thêm kho mới** điều hướng sang tab Cài đặt → `LocationManagement` với `openCreateModal: true`. Đổi kho (`pickLocation`) gọi `clearSearch` trước `setSelectedLocation` (KI-004).
- **ProductsScreen:** dropdown **Kho** (đầu **Tất cả kho**, sau đó từng `location`); khi chọn một kho chỉ hiện SP có lô trong zone của kho đó; **dropdown Zone** (cùng style hàng Kho) ngay dưới — khi **Tất cả kho** chỉ hiện cảnh báo *Vui lòng chọn kho trước* (không mở list); khi đã chọn kho: **Tất cả zone** + từng zone của kho, đổi kho reset zone về **Tất cả zone**. Khi **Tất cả kho** gọi `fetchAllInventoryEntries()` (một query toàn bộ `inventory_entries`, giống Thông báo — không phụ thuộc `store.zones`). Mỗi card hiện **tổng thùng** theo bộ lọc và **dòng phân loại** (L1·L2 / chỉ L1) khi có `category_level1_id`.
- **NotificationsScreen:** dropdown **Kho** (cùng quy ước); khi **Tất cả kho** gọi `fetchAllInventoryEntries()` (một query toàn bộ `inventory_entries`, ghi đè store — không phụ thuộc `store.zones`). Khi chọn một kho: fetch theo zone của kho đó (`zonesForFilterLoc` + `fetchInventoryByZone`); lọc áp dụng cho cả hai tab **Sắp hết hạn** / **Sắp hết hàng**. Tab hết hạn có thêm lọc checkbox Hết hạn / Sắp hết hạn.
- **LocationManagementScreen:** danh sách kho (tên, grid X×Y, số SKU distinct theo `inventory_entries` qua `zones` của từng kho); FAB **+** tạo kho; sửa/xóa có modal / confirm và thông báo lỗi từ store.
- **CategoryManagementScreen:** accordion Cấp 1 → Cấp 2; thêm/sửa/xóa nhóm & loại (modal tên); `fetchCategories` khi mount; nút **+ Thêm nhóm** cuối danh sách; **+ Thêm loại** trong section khi đã xổ Cấp 1.
- **ProductDetailScreen:** thanh **Tổng … thùng** + lọc lô theo ngữ cảnh màn hình; refetch khi focus (`useFocusEffect` + `loadData`); section **Chi tiết** (F30): `fetchCategories` khi mount nếu store category rỗng; dropdown **Nhóm (Cấp 1)** / **Loại (Cấp 2)** với **Không phân loại**, đổi Cấp 1 → xóa Cấp 2; cập nhật qua `updateProductCategory`. Section **Lịch sử thay đổi** ở cuối màn — hiện 10 entries gần nhất liên quan đến product đó (bao gồm thay đổi trên cả bảng `inventory_entries` lẫn `products`). Mỗi entry: icon action (➕ INSERT / ✏️ UPDATE / 🗑️ DELETE) · thời gian · tên người thay đổi (phần trước @ của email) · field nào thay đổi. Có nút "Xem tất cả" navigate sang `AuditLogScreen` với filter sẵn theo product đó.
- **AddInventoryScreen:** chọn zone/tầng, tìm/chọn SP hoặc tạo SP mới; **F30:** `fetchCategories` khi store category rỗng; SP đã chọn → dòng **Phân loại** read-only; form tạo SP mới → dropdown Cấp 1/2 dưới field tên, gửi kèm `addProduct`.

---

## §4 Store — `warehouseStore.ts`

**State:** `locations` (mỗi `Location` có `grid_rows`, `grid_cols`), `selectedLocationId`, `zones`, `products`, `productCategoriesL1`, `productCategoriesL2`, `inventoryEntries`, `orderLists`, `orderItems`, `isLoading`.

**Actions — kho & zone:** `setSelectedLocation`, `fetchLocations`, `addLocation`, `updateLocation`, `deleteLocation`, `fetchZones`, `fetchProducts`, `fetchInventoryByZone`, `fetchAllInventoryEntries`, `searchProducts`, `searchByBarcode`, `addProduct`, `addInventoryEntry`, `updateInventoryEntry`, `deleteInventoryEntry`, `updateProductStockThresholds`, `addZone`, `updateZone`, `batchUpdateZoneCells`, `deleteZone`.

**Actions — phân loại (F30, `warehouseStore`):** `fetchCategories`, `addCategoryL1`, `updateCategoryL1`, `deleteCategoryL1`, `addCategoryL2`, `updateCategoryL2`, `deleteCategoryL2`, `updateProductCategory` (cập nhật `category_level1_id` / `category_level2_id` trên `products` + đồng bộ store).

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
