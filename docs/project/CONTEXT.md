# Chino's Warehouse — CONTEXT

Tài liệu kỹ thuật cho Cursor (và dev) khi đọc/ghi code. Business đầy đủ: **`REQUIREMENTS.md`**. Quy trình làm việc: **`WORKFLOW.md`**.

---

## §1 Tech Stack

- **React Native** (Expo SDK), **TypeScript**
- **Zustand** — state client (`warehouseStore`, `themeStore`, `warningStore`)
- **Supabase** — PostgreSQL + Realtime (backend)
- **React Navigation** — Bottom Tabs + Native Stack
- **expo-camera** — `CameraView`, quét barcode
- **expo-secure-store** — không còn dùng cho session auth; có thể dùng cho mục đích khác nếu cần
- **Supabase Auth** — email/password sign-in, `persistSession: false` (session trong RAM của Supabase client, không custom storage — kill app = logout), inactivity timer 20 phút trong App.tsx

**Mô hình bảo mật (client-direct BaaS):**
- Anon key bundle trong APK — hợp lệ vì RLS chặn mọi request không có JWT authenticated.
- RLS bật trên tất cả 8 bảng với policy `authenticated_only` (`auth.uid() IS NOT NULL`).
- Realtime channel dùng `private: true` + RLS policy trên `realtime.messages`.
- Không có server backend riêng — phù hợp app nội bộ quy mô nhỏ (xem `DECISIONS.md`).
- RBAC (F24) → Phase 3 **In progress**: `user_profiles`, `UserManagementScreen`, guard theo role.

**Build & phân phối APK:** hướng dẫn vận hành đầy đủ (EAS Cloud + EAS Local qua WSL2, cache Gradle, lỗi thường gặp, script `build.sh`) → **`docs/BUILD_APK_GUIDE.md`**. Checklist go-live: `docs/phases/phase-2/GOLIVE_CHECKLIST_2.md`. Tổng quan kiến trúc EAS (phase 2): `docs/phases/phase-2/EAS_BUILD_GUIDE.md`.

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
      SUMMARY_2.md
      TESTCASES_2.md
      USER_GUIDE_2.md
    phase-3/
      PLAN_3.md
      HANDOFF_3.md
      SUMMARY_3.md
      TESTCASES_3.md
      USER_GUIDE_3.md
  DECISIONS.md
  WORKLOG.md
  BLOCKERS.md
  KNOWN_ISSUES.md
  BUILD_APK_GUIDE.md    # Hướng dẫn build APK (EAS Cloud + Local WSL2, cache, troubleshooting)
lib/
  supabase.ts
utils/
  textUtils.ts          # normalizeText() — tìm kiếm / filter text toàn app
  conflictUtils.ts     # A5 checkConflict optimistic locking (updated_at + audit_logs)
screens/
  AddInventoryScreen.tsx
  AuditLogScreen.tsx
  BarcodeScannerScreen.tsx
  CategoryManagementScreen.tsx
  DashboardScreen.tsx          # F23 — tổng quan kho (Phase 3)
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
  UserManagementScreen.tsx     # F24 — quản lý người dùng (admin/super_admin, Phase 3)
stores/
  themeStore.ts
  warningStore.ts     # expiryWarningEnabled, lowStockWarningEnabled (AsyncStorage)
  warehouseStore.ts   # + locateIntent; Phase 3: user RBAC
supabase/migrations/
  # ... (hiện có)
  # [timestamp]_add_user_profiles.sql      # F24 — Phase 3
  # [timestamp]_add_discontinued_reason.sql # F28 — Phase 3
types/
  index.ts
App.tsx
build.sh                # Script build EAS Local (chạy trong Ubuntu/WSL2; xem BUILD_APK_GUIDE.md)
eas.json
apk/                    # APK đã build (gitignore)
.cursorrules
README.md
```

*Nếu thêm / xóa / đổi tên file → cập nhật lại mục này.*

---

## §3 Navigation structure

- **Auth gate** (`App.tsx`): kiểm tra `supabase.auth.getSession()` khi mount + subscribe `onAuthStateChange`. Chưa có session → `<LoginScreen />`; loading → `<ActivityIndicator />`; có session → `SafeAreaProvider` → `NavigationContainer` + navigation bên dưới.
- **Root:** `NavigationContainer` → **Native Stack** (`headerShown: false`) với 2 route: `Tabs` + `BarcodeScanner`.
- **Root / BarcodeScanner:** `fullScreenModal`, fullscreen, **không** có bottom tab bar.
- **Bottom tabs:** `Map` (nhãn **Kho**) → `Products` (**Sản phẩm**) → `Orders` (**Đặt hàng**) → `Notifications` (**Thông báo**) → `Settings` (**Cài đặt**).
- **Map tab:** `MapStack` (`MapMain` → `ZoneLayoutEditor` → `ProductDetail` → `AddInventory` → `AuditLog`).
- **Products tab:** `ProductsStack` (`ProductsMain` → `ProductDetail` → `AddInventory` → `AuditLog`).
- **Orders tab:** `OrdersStack` (`OrderListMain` → `OrderDetail`).
- **Notifications tab:** `NotificationsStack` (`NotificationsMain` → `ProductDetail` → `AddInventory` → `AuditLog`).
- **Settings tab:** `SettingsStack` (`SettingsMain` → `LocationManagement` → `CategoryManagement` → `DiscontinuedProducts` → `Dashboard` → `UserManagement` → `AuditLog`). `LocationManagement` nhận optional param `openCreateModal` (boolean): `true` thì mở modal tạo kho khi mount. **`DashboardScreen`** (F23): card **Tổng quan kho** trên Settings. **`UserManagementScreen`** (F24): card **Quản lý người dùng** — chỉ hiện với role `admin` và `super_admin` (guard trên Settings card).
- **ZoneDetailSheet:** component / sheet trên `MapScreen`, **không** phải route riêng. Sheet: `paddingBottom` động (`useSafeAreaInsets().bottom`). Modal **Chuyển lô hàng**: nội dung zone/tầng trong `ScrollView`; nút Hủy/Xác nhận fixed dưới (`marginTop` 16).
- **Cross-tab locate:** `ProductDetailScreen` bấm **📍** trên lô → `setLocateIntent` trong `warehouseStore` → chuyển tab **Kho**; `MapScreen` `useFocusEffect` đọc intent → `setSelectedLocation` · `handleSearch(productName)` (highlight zone qua kết quả) · panel kết quả expanded → `clearLocateIntent`. Không truyền qua navigation params (xem `DECISIONS.md`).

**UI bản đồ & lọc (đối chiếu code):**

- **SettingsScreen:** hai card ngang **Quản lý kho** / **Phân loại sản phẩm** (subtext `X nhóm · Y loại`); `useFocusEffect` gọi `fetchCategories` khi cả hai danh sách category rỗng; card phân loại → `CategoryManagement`. Card **Lịch sử thay đổi** — subtitle hiển thị "Lần cuối: [tên] [action] [tên sản phẩm]" (query 1 record mới nhất từ `audit_logs`); navigate sang `AuditLogScreen`.
- **AuditLogScreen:** truy cập từ Settings card "Lịch sử thay đổi" hoặc từ nút "Xem tất cả" trong `ProductDetailScreen`. **4 Filter — Modal-based searchable dropdown** (`SearchableDropdownModal`: Modal bottom sheet + FlatList + TextInput tìm kiếm auto-focus, case-insensitive substring): [1] Kho (tất cả / từng kho — disabled + opacity 0.4 khi loại = Sản phẩm) · [2] Loại thay đổi (tất cả / Lô hàng / Sản phẩm — chọn Sản phẩm tự reset kho về null) · [3] Người thay đổi (distinct `changed_by_name` từ 50 entries gần nhất; placeholder "Tất cả (chưa có lịch sử)" khi chưa có entry) · [4] Sản phẩm (tất cả / từng sản phẩm — set sẵn khi navigate từ `ProductDetailScreen`; icon 📷 bên phải label → `BarcodeScanner` → `searchByBarcode` → set `filterProductId`). Khi bất kỳ filter thay đổi: reset pages + load lại. **Danh sách:** 10 entries mỗi trang, mỗi entry gồm icon action · tên người · nhãn loại (Lô hàng / Sản phẩm) · thời gian · field thay đổi. **Pagination:** nút mũi tên góc dưới phải = xem cũ hơn (query thêm 10 từ DB); nút mũi tên góc dưới trái = xem mới hơn (từ cache). Cursor-based pagination dùng `changed_at`. **Cache:** tất cả pages đã query lưu trong local state, clear khi unmount màn. **Tên user:** lấy phần trước @ của email, được lưu sẵn trong cột `changed_by_name` của `audit_logs` (ghi bởi trigger, không join runtime). **Realtime:** chưa implement — deferred (xem KI-026).
- **MapScreen:** thanh header có nút **▦** (Sắp xếp / mở `ZoneLayoutEditor` cho `locationId` đang chọn) và **+ Zone**. **Chọn kho:** `Pressable` mở bottom sheet modal — danh sách kho kèm kích thước lưới (`grid_rows × grid_cols`), dòng đang chọn có ✓; nút **Thêm kho mới** điều hướng sang tab Cài đặt → `LocationManagement` với `openCreateModal: true`. Đổi kho thủ công (`pickLocation`) gọi `clearSearch` trước `setSelectedLocation` (KI-004). **Realtime (C1):** `useEffect` theo `selectedLocationId` — channel `private: true`, `postgres_changes` bảng `zones` + `inventory_entries` (migration `zones` vào `supabase_realtime`), debounce 2s → `fetchZones` + `fetchInventoryByLocation`; `markOwnMutation` (3s) bỏ qua refetch sau mutation từ Map / ZoneDetail / Layout Editor. **Tìm kiếm:** `searchProducts` filter tên SP trên `store.products` (`normalizeText`) rồi query lô **toàn bộ kho** (không lọc `selectedLocationId`); panel kết quả **nhóm theo tên kho** (header đậm + từng lô: tên SP, zone, tầng, số thùng, hạn). Bấm một lô → `focusSearchResultLot` → `setSelectedLocation` + `highlightedZones` + đóng panel + **tự mở `ZoneDetailSheet`** (`scrollToProductId` → scroll/highlight nhóm SP trong sheet). **Locate intent:** `useFocusEffect` — nếu `locateIntent` có giá trị → `setSelectedLocation` · `handleSearch(productName)` · `isSearchPanelExpanded = true` · `clearLocateIntent`.
- **ProductsScreen:** dropdown **Kho** (đầu **Tất cả kho**, sau đó từng `location`); khi chọn một kho chỉ hiện SP có lô trong zone của kho đó; **dropdown Zone** (cùng style hàng Kho) ngay dưới — khi **Tất cả kho** chỉ hiện cảnh báo *Vui lòng chọn kho trước* (không mở list); khi đã chọn kho: **Tất cả zone** + từng zone của kho, đổi kho reset zone về **Tất cả zone**. Khi **Tất cả kho** gọi `fetchAllInventoryEntries()` (một query toàn bộ `inventory_entries`, giống Thông báo — không phụ thuộc `store.zones`). Mỗi card hiện **tổng thùng** theo bộ lọc và **dòng phân loại** (L1·L2 / chỉ L1) khi có `category_level1_id`. **Pagination client:** sau `filteredProducts`, `FlatList` hiển thị **10 SP/trang**; thanh **← Trang X / Y →** (style giống AuditLog) khi > 10 kết quả; `currentPage` reset về 0 khi đổi search / kho / zone.
- **NotificationsScreen:** dropdown **Kho** (cùng quy ước); khi **Tất cả kho** gọi `fetchAllInventoryEntries()` (một query toàn bộ `inventory_entries`, ghi đè store — không phụ thuộc `store.zones`). Khi chọn một kho: fetch theo zone của kho đó (`zonesForFilterLoc` + `fetchInventoryByZone`); lọc áp dụng cho cả hai tab **Sắp hết hạn** / **Sắp hết hàng**. **Tìm kiếm:** thanh dưới dropdown Kho, trên tab — `normalizeText` theo tên SP; nút 📷 → `BarcodeScanner` (`onScanFillBarcode`) → khớp `barcode` trong `inventoryEntriesForNotify` → điền `searchQuery` = tên SP. Pipeline mỗi tab: build cards → **search** → **checkbox** → pagination. Tab **Sắp hết hạn:** checkbox **Hết hạn (X)** / **Sắp hết hạn (X)** — count = số card (sau search) có ≥1 lô `expired` / `warning`; lọc lô trong card (cả hai tắt hoặc cả hai bật = tất cả). Tab **Sắp hết hàng:** checkbox **Hết hàng (X)** (`totalBoxes === 0`) / **Sắp hết hàng (X)** (`totalBoxes > 0` và ≤ `low_warning_boxes`); count sau search. **Pagination client:** `currentPageExpiry` / `currentPageLowStock` riêng; `FlatList` **10 SP/trang**; footer **← Trang X / Y →** khi > 10; reset trang khi đổi search / kho / checkbox / tab.
- **LocationManagementScreen:** danh sách kho (tên, grid X×Y, số SKU distinct theo `inventory_entries` qua `zones` của từng kho); FAB **+** tạo kho; modal tạo/sửa kho (RN `Modal` bottom sheet). Keyboard: `softwareKeyboardLayoutMode: pan` (`app.json`) + `KeyboardAvoidingView` trong modal + `ScrollView`/`scrollToEnd` onFocus.
- **CategoryManagementScreen:** accordion Cấp 1 → Cấp 2; thêm/sửa/xóa nhóm & loại (modal tên); `fetchCategories` khi mount; nút **+ Thêm nhóm** cuối danh sách; **+ Thêm loại** trong section khi đã xổ Cấp 1.
- **ProductDetailScreen:** thanh **Tổng … thùng** + lọc lô; refetch khi focus. Mỗi lô (khi còn thùng): **✏️** inline edit · **📍** `setLocateIntent` → tab Kho · **🗑️** xóa. Chuyển lô chỉ ở `ZoneDetailSheet` (không nút **→** / modal chuyển lô tại PDS). Section **Chi tiết** (F30), **Lịch sử** (10 entries + AuditLog), **Xóa sản phẩm** (`deleteProduct` block nếu còn lô).
- **AddInventoryScreen:** chọn zone/tầng, tìm/chọn SP. Ô tìm SP: **📷** → `BarcodeScanner` → `searchByBarcode` → điền tên vào gợi ý (không auto-chọn); không thấy → text warning. Hint cố định dưới ô tìm (tránh tạo trùng tên). Cuối gợi ý: **+ Tạo mới '[tên]'**; không kết quả: **Tạo sản phẩm mới**. `SafeAreaView` (`react-native-safe-area-context`). **F30:** category read-only / dropdown khi tạo SP mới.

---

## §4 Store — `warehouseStore.ts`

**State:** `locations` (mỗi `Location` có `grid_rows`, `grid_cols`), `selectedLocationId`, `zones`, `products`, `productCategoriesL1`, `productCategoriesL2`, `inventoryEntries`, `orderLists`, `orderItems`, `isLoading`, **`locateIntent`** (`LocateIntent | null` — cross-tab Map locate từ ProductDetail). **Phase 3 (planned):** `currentUserRole` (role user đang đăng nhập), `users` (danh sách cho admin/super_admin).

**Actions — locate:** `setLocateIntent`, `clearLocateIntent`.

**Actions — user management (Phase 3, F24):** `fetchUsers`, `createUser`, `updateUserRole`, `toggleUserDisabled`, `toggleUserGuest`, `fetchCurrentUserRole`.

**Actions — kho & zone:** `setSelectedLocation`, `fetchLocations`, `addLocation`, `updateLocation`, `deleteLocation`, `fetchZones`, `fetchProducts`, `fetchInventoryByZone`, `fetchInventoryByLocation` (một query `.in('zone_id', …)` cho cả kho, một lần `set` store), `fetchAllInventoryEntries`, `searchProducts` (filter `products` trong store bằng `normalizeText`, sau đó query `inventory_entries` theo `product_id` — không `ilike` DB), `searchInventoryByBarcode`, `searchByBarcode`, `addProduct`, `deleteProduct`, `addInventoryEntry`, `updateInventoryEntry`, `deleteInventoryEntry`, `updateProductStockThresholds`, `addZone`, `updateZone`, `batchUpdateZoneCells`, `deleteZone`.

**Actions — phân loại (F30, `warehouseStore`):** `fetchCategories`, `addCategoryL1`, `updateCategoryL1`, `deleteCategoryL1`, `addCategoryL2`, `updateCategoryL2`, `deleteCategoryL2`, `updateProductCategory` (cập nhật `category_level1_id` / `category_level2_id` trên `products` + đồng bộ store).

**Actions — sản phẩm / cờ:** `toggleDeferred`, `togglePriceReduced`, `setProductDiscontinued`, `toggleDiscontinued`, `fetchDiscontinuedProducts`, `refreshDiscontinuedContext`, `updateProductName`.

**Actions — đặt hàng:** `fetchOrderLists`, `createOrderList`, `updateOrderList`, `deleteOrderList`, `addOrderItem`, `updateOrderItem`, `deleteOrderItem`, `confirmOrderList`, `markOrderPlaced`.

**Actions — audit log:** `fetchAuditLogs` (cursor-based, filter kho + loại + người + sản phẩm), `fetchLatestAuditEntry`, `fetchAuditLogsForProduct`.

---

## §4b Store — `warningStore.ts`

**State:** `expiryWarningEnabled`, `lowStockWarningEnabled` (mặc định `true`).

**Persist:** AsyncStorage `warning_expiry`, `warning_low_stock` (giá trị `'true'` / `'false'`; thiếu key = bật).

**Actions:** `loadWarningSettings`, `toggleExpiryWarning`, `toggleLowStockWarning`.

**UI:** `SettingsScreen` (2 `Switch`); `loadWarningSettings()` gọi một lần trong `App.tsx`. Màu cảnh báo qua `utils/statusUtils.ts` → `getDisplayColor` / `getDisplayColorForEntry` trên **ProductsScreen**, **MapScreen** (highlight zone + chấm auto), **ZoneDetailSheet**, **ProductDetailScreen**, **NotificationsScreen** (ẩn count filter khi tắt; danh sách SP vẫn hiện).

---

## §5 Types & logic chính (`types/index.ts`)

- **Types:** `Location` (gồm `grid_rows`, `grid_cols`), `ZoneCell`, `Zone`, `Product`, `ProductCategoryL1`, `ProductCategoryL2`, `InventoryEntry`, `ExpiryStatus`, `ExpiryColor`, `CombinedStatus`, **`LocateIntent`** (`productName`, `locationId`, `zoneId`), `AuditLog`, `OrderList`, `OrderItem`
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
- **Safe area:** `SafeAreaProvider` ở `App.tsx`; màn hình dùng `SafeAreaView` từ **`react-native-safe-area-context`** (không từ `react-native`)
- **Default theme:** `isDark = false` (light mode mặc định); `themeStore` chỉ đổi sang dark khi AsyncStorage trả về `'dark'`. Không hardcode `isDark = true`.
- **Không** tự thêm npm package mới khi chưa được yêu cầu
- **Tìm kiếm / filter text:** LUÔN dùng `normalizeText()` từ `utils/textUtils.ts`, không dùng `.toLowerCase().includes()` trực tiếp. Áp dụng cho cả query lẫn data khi so sánh. `normalizeText()` xử lý: tiếng Việt không dấu, Phần Lan (ö, ä, å), và dấu Latin khác.
- Khi bí hoặc thiếu thông tin → ghi vào **`docs/BLOCKERS.md`**, dừng lại hỏi người dùng
- **Guard role (Phase 3, F24):** Kiểm tra `currentUserRole` trước khi render nút thêm/sửa/xóa; dùng helper `isReadOnly()` (`role === 'guest'`) thay vì hardcode role ở từng màn.

---

## §8 Quy tắc cập nhật tài liệu

Xem đầy đủ: **`docs/project/WORKFLOW.md`**.

Tóm tắt: sau mỗi thay đổi có ý nghĩa → cập nhật file tài liệu tương ứng theo vai trò DEV/TEST trong `WORKFLOW.md`.
