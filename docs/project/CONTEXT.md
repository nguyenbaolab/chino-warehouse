# Chino's Warehouse — CONTEXT

Tài liệu kỹ thuật cho Cursor (và dev) khi đọc/ghi code. Business đầy đủ: **`REQUIREMENTS.md`**. Quy trình làm việc: **`WORKFLOW.md`**.

---

## §1 Tech Stack

- **React Native** (Expo SDK), **TypeScript**
- **Zustand** — state client (`warehouseStore`, `themeStore`, `warningStore`, `authStore`)
- **Supabase** — PostgreSQL + Realtime (backend)
- **React Navigation** — Bottom Tabs + Native Stack
- **expo-camera** — `CameraView`, quét barcode
- **expo-secure-store** — không còn dùng cho session auth; có thể dùng cho mục đích khác nếu cần
- **Supabase Auth** — email/password sign-in, `persistSession: false` (session trong RAM của Supabase client, không custom storage — kill app = logout), inactivity timer 20 phút trong App.tsx

**Mô hình bảo mật (client-direct BaaS):**
- Anon key bundle trong APK — hợp lệ vì RLS chặn mọi request không có JWT authenticated.
- RLS bật trên tất cả bảng app: **bảng kho** — guest SELECT only / staff+ mutate (`is_current_user_at_least_staff`); **`user_profiles`** policy theo role F24; **`audit_logs`** SELECT only. **F36 Market mode (C1 Done):** `locations.type`, `inventory_entries.is_special` / `is_checked`; 3 bảng `shelf_*` đã rollback (`20260719_rollback_shelf_add_market_columns.sql`, schema **v4.1**).
- Realtime channel dùng `private: true` + RLS policy trên `realtime.messages`.
- Storage **`product-images`:** public read; staff+ upload/update/delete (KI-055).
- Không có server backend riêng — phù hợp app nội bộ quy mô nhỏ (xem `DECISIONS.md`).
- RBAC (F24) → Phase 3 **xong Task 1–3 + RLS server (KI-055):** client guard guest read-only **và** DB enforce; `UserManagementScreen`; tạo user qua Dashboard.

**Build & phân phối APK:** hướng dẫn vận hành đầy đủ (EAS Cloud + EAS Local qua WSL2, cache Gradle, lỗi thường gặp, script `build.sh`) → **`docs/BUILD_APK_GUIDE.md`**. Checklist go-live: `docs/phases/phase-2/GOLIVE_CHECKLIST_2.md`. Tổng quan kiến trúc EAS (phase 2): `docs/phases/phase-2/EAS_BUILD_GUIDE.md`.

---

## §2 Cấu trúc file & thư mục (hiện tại)

```
assets/
components/
  FilterModal.tsx          # Shared filter Mode + Kho + Zone (Products/Notifications/Dashboard)
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
    phase-4/
      PLAN_4.md
      HANDOFF_4.md
      SUMMARY_4.md
      TESTCASES_4.md
    phase-5/
      PLAN_5.md
  DECISIONS.md
  WORKLOG.md
  BLOCKERS.md
  KNOWN_ISSUES.md
  BUILD_APK_GUIDE.md    # Hướng dẫn build APK (EAS Cloud + Local WSL2, cache, troubleshooting)
lib/
  supabase.ts
  presence.ts         # F24 — join/leave presence channel warehouse-online; sync onlineUserIds
utils/
  textUtils.ts          # normalizeText() — tìm kiếm / filter text toàn app
  dateUtils.ts          # isoExpiryToDisplay / parseDisplayDateToIso / isValidDisplayDate (nhập hạn lô)
  conflictUtils.ts     # A5 checkConflict optimistic locking (updated_at + audit_logs)
  imageUtils.ts        # uploadProductImage, deleteProductImage, compressImage (F08)
  errorMessages.ts     # SEC-06 getErrorMessage — generic Supabase errors (RLS, network, operation map)
screens/
  AddInventoryScreen.tsx
  AuditLogScreen.tsx
  BarcodeScannerScreen.tsx
  CategoryManagementScreen.tsx
  DashboardScreen.tsx          # F23 — tổng quan kho (Phase 3)
  DiscontinuedProductsScreen.tsx
  InternalNotesScreen.tsx      # F31 — ghi chú nội bộ (Settings)
  StockCheckScreen.tsx         # C4 — Checklist kiểm hàng (Settings, market is_special)
  LocationManagementScreen.tsx
  LoginScreen.tsx
  MapScreen.tsx
  ZoneLayoutEditorScreen.tsx
  ZonePickerScreen.tsx         # F8 — chọn zone đích khi chuyển lô
  NotificationsScreen.tsx
  OrderDetailScreen.tsx
  OrderListScreen.tsx
  ProductDetailScreen.tsx
  ProductsScreen.tsx
  SettingsScreen.tsx
  UserManagementScreen.tsx     # F24 — quản lý người dùng (admin/super_admin, Phase 3)
stores/
  authStore.ts        # F24 — currentUserProfile, fetch/clear, updateLastLogin RPC
  themeStore.ts
  warningStore.ts     # expiryWarningEnabled, lowStockWarningEnabled (AsyncStorage)
  warehouseStore.ts   # + locateIntent, fetchProductsPage (KI-040), TTL screens (KI-039)
supabase/migrations/
  # ... (hiện có)
  20260601000000_add_user_profiles.sql      # F24 Task 1
  20260601000100_add_user_profiles_to_audit.sql
  20260717_create_internal_notes.sql        # F31
  20260717_alter_internal_notes_nullable_product.sql
  20260718_create_shelf_tables.sql          # C1 F36 shelf — ROLLED BACK by 20260719_rollback_shelf_add_market_columns.sql
  20260719_rollback_shelf_add_market_columns.sql  # C1 Market mode — DROP shelf_* + locations.type + is_special/is_checked
  20260719_f32_ignore_warning_flags.sql           # F32 ignore_expiry/stock_warning
  20260720_create_picking_tables.sql              # F34 B1 — picking_lists + picking_list_items
  schema.sql                                # Canonical schema v5.0
supabase/db_dump_schema/   # Snapshot pg_dump (script dump_schema.bat — không thay schema.sql)
dump_schema.bat            # Tiện ích dump schema public qua Session Pooler (xem §9)
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

- **Auth gate** (`App.tsx`): kiểm tra `supabase.auth.getSession()` khi mount + subscribe `onAuthStateChange`. Chưa có session → `<LoginScreen />`; loading bootstrap / **đang fetch `user_profiles`** → `<ActivityIndicator />`; có session + profile OK → `SafeAreaProvider` → `NavigationContainer`. **F24:** sau login gọi `authStore.fetchCurrentUserProfile()`; `is_disabled` hoặc thiếu profile → `signOut` + Alert; OK → RPC `update_my_last_login()`. **Realtime (F24):** sau profile OK — subscribe `postgres_changes` UPDATE own `user_profiles` (kick disable + silent refetch role); join presence `presence:warehouse-online` qua `lib/presence.ts`; cleanup khi logout.
- **Root:** `NavigationContainer` → **Native Stack** (`headerShown: false`) với 2 route: `Tabs` + `BarcodeScanner`.
- **Root / BarcodeScanner:** `fullScreenModal`, fullscreen, **không** có bottom tab bar. **Flow quét (search/locate):** `searchByBarcode` (lô) → nếu không có → `lookupProductByBarcode` (`product_barcodes`) → Alert **"Hàng đã hết"** + **Xem chi tiết** → `returnTab` với **state tường minh** `[Main, ProductDetail]` (`tabsParamsForProductDetail` / `getMainScreenName` trong `lib/tabNavigation.ts`) — KI-057 lần 2, tránh stack cụt; fallback tab `'Products'`; nếu vẫn không có SP → Alert **Không tìm thấy** (Thử lại / Thêm thủ công / Huỷ).
- **Bottom tabs:** `Map` — `tabBarLabel` **dynamic** theo `appMode` (**Kho** warehouse / **Siêu thị** market) → `Products` (**Sản phẩm**) → `Orders` (**Đặt hàng**) → `Notifications` (**Thông báo**) → `Settings` (**Cài đặt**).
- **Market mode (F36 redesign, C2–C4 Done):** `warehouseStore.appMode` + header Map dropdown **Chino's Warehouse** ↔ **Chino's Market**; `fetchLocations` `.eq('type', appMode)`; label qty `getQtyUnit()` «thùng» / «sản phẩm»; Products: toggle «Hàng đặc biệt» (`is_special`); Settings **📋 Kiểm hàng** → `StockCheck` (`is_checked` checklist + Reset). Không màn Shelf riêng.
- **Map tab:** `MapStack` (`MapMain` → `ZoneLayoutEditor` → **`ZonePicker`** (F8) → `ProductDetail` → `AddInventory` → `AuditLog`).
- **Products tab:** `ProductsStack` (`ProductsMain` → `ProductDetail` → `AddInventory` → `AuditLog`).
- **Orders tab:** `OrdersStack` (`OrderListMain` → `OrderDetail`).
- **Notifications tab:** `NotificationsStack` (`NotificationsMain` → `ProductDetail` → `AddInventory` → `AuditLog`).
- **Settings tab:** `SettingsStack` (`SettingsMain` → `LocationManagement` → `CategoryManagement` → `DiscontinuedProducts` → **`InternalNotes`** (F31) → **`StockCheck`** (C4) → **`ProductDetail`** → `Dashboard` → **`NotificationsFromDashboard`** (reuse `NotificationsScreen`) → `UserManagement` → `AuditLog`). Card **📝 Ghi chú** trên Settings (sau "Không nhập nữa") → `InternalNotes`; subtitle = số ghi chú từ store. Card **📋 Kiểm hàng** (sau Ghi chú) → `StockCheck`; subtitle `X/Y đã kiểm` hoặc «Chưa có hàng đặc biệt». **`StockCheckScreen` (C4):** luôn list market (`locations.type=market`) entries `is_special=true` (không phụ thuộc `appMode`); checkbox → `updateInventoryEntry({ is_checked })`; **Reset** → `resetMarketChecklist` (batch `is_checked=false`); `useCanWrite` gate; sort chưa checked trước + tên SP a–z. **`DiscontinuedProductsScreen`:** nút Đóng — `canGoBack() ? goBack() : navigate('SettingsMain')` (KI-061). **`InternalNotesScreen` (F31):** `useFocusEffect` → luôn `fetchProducts()` + `fetchInternalNotes`; FlatList card ảnh 64×64 + tên + lý do + ngày; card có `product_id` → tap mở `ProductDetail`; card `custom_product_name` → placeholder + dòng "Sản phẩm chưa có trong hệ thống" (không navigate); FAB (+) staff+ → modal autocomplete SP **hoặc** tên tự do + lý do → `addInternalNote({ productId?, customName?, reason })`; ✏️/`updateInternalNote`; 🗑️ confirm/`deleteInternalNote`; guest chỉ xem. `LocationManagement` nhận optional param `openCreateModal` (boolean): `true` thì mở modal tạo kho khi mount. **`DashboardScreen`** (F23): card **Tổng quan kho**; stat cards `push` sang `NotificationsFromDashboard` / `DiscontinuedProducts` (back về Dashboard). **`UserManagementScreen`** (F24): card **Quản lý người dùng** — chỉ hiện với role `admin` và `super_admin` (guard trên Settings card).
- **ZoneDetailSheet:** component / sheet trên `MapScreen`, **không** phải route riêng. Sheet: `paddingBottom` động (`useSafeAreaInsets().bottom`). Inline edit lô (gồm barcode): cùng pattern **`checkBarcodeConflict`** / **`logBarcodeConflict`** / **`upsertProductBarcode`** như ProductDetail. **F8 — Chuyển lô:** nút → navigate `ZonePicker` (map fullscreen); bỏ modal dropdown zone/tầng; `useIsFocused` reload inventory khi quay lại từ picker. **🗑️ xóa lô chỉ khi `quantity_boxes = 0`** (KI-058). **F3:** filter `!entry.product?.is_archived` trong `currentTierEntries` — lô SP ẩn không hiện trong sheet (zone có thể trống nếu mọi SP đều archived).
- **ZonePickerScreen (F8):** MapStack route — params `entryId`, `sourceZoneId`, `sourceTier`, `locationId`, optional `markOwnMutation`. Grid copy pattern MapScreen (zone màu + tên); zone nguồn viền đậm; tap zone 1 tầng → Alert confirm → `updateInventoryEntry({ zone_id, tier })` → `goBack`; nhiều tầng → modal chọn tầng rồi confirm. Huỷ = goBack.
- **Cross-tab locate:** `ProductDetailScreen` bấm **📍** trên lô → `setLocateIntent` trong `warehouseStore` → chuyển tab **Kho**; `MapScreen` `useFocusEffect` đọc intent → `setSelectedLocation` · `handleSearch(productName)` (highlight zone qua kết quả) · panel kết quả expanded → `clearLocateIntent`. Không truyền qua navigation params (xem `DECISIONS.md`).

**UI bản đồ & lọc (đối chiếu code):**

- **UserManagementScreen (F24):** mount guard `useIsAdmin()`; `useFocusEffect` → `fetchUsers` (RPC); mỗi user một card (tên = phần trước `@`, badge role, trạng thái, đăng nhập cuối); Switch **Guest** / **Vô hiệu hóa** / **Admin** (chỉ super_admin) — logic ẩn theo viewer/target; Alert confirm → `updateUserRole` / `updateUserDisabled`.
- **SettingsScreen:** hai card ngang **Quản lý kho** / **Phân loại sản phẩm** (subtext `X nhóm · Y loại`); `useFocusEffect` gọi `fetchCategories` khi cả hai danh sách category rỗng; card phân loại → `CategoryManagement`. Card **Tổng quan kho** (F23) — subtitle `{SKU không archived} · {số kho}` → `Dashboard`. Card **Lịch sử thay đổi** — subtitle audit gần nhất từ `fetchLatestAuditEntry`; navigate `AuditLog`. Realtime `products` + `inventory_entries` (debounce 2s) → `refreshDiscontinuedContext`.
- **DashboardScreen (F23):** nút **Lọc (N)** → `FilterModal` (Mode / Kho / Zone — filter **local**, không đổi `appMode` store). Stats qua `computeDashboardStats` với `effectiveZoneSet` (kho hoặc mọi zone thuộc mode). **8 stat cards** (lưới 2 cột): tổng SP, SKU có lô, SP hết/sắp hết, lô hết/sắp hết hạn, không nhập nữa, tổng kho — màu `#EF4444` / `#FACC15` / `#22C55E`. **Pie chart** (`SimplePieChart` + `react-native-svg`). `useFocusEffect` fetch; Realtime debounce 2s → refetch.
- **AuditLogScreen:** Settings / ProductDetail. **4 filter** (`SearchableDropdownModal`): **Mode** (Tất cả / Kho / Siêu thị — local; locations query theo `type`) · **Kho** · **Người** · **Sản phẩm** (+ 📷). Đổi mode → reset kho. `fetchAuditLogs` theo `filterLocationId`. Pagination cursor `changed_at`, 10/trang.
- **MapScreen:** thanh header — **mode switcher** (`Pressable` + ▾): **🏪 Chino's Warehouse** / **🏪 Chino's Market** → bottom sheet → `setAppMode` (reset location/zones/inventory + `fetchLocations`); nút **▦** (`ZoneLayoutEditor`) và **+ Zone**. **Chọn kho:** bottom sheet — danh sách theo `appMode` + lưới; **Thêm kho mới** → Settings `LocationManagement`. Đổi kho → `clearSearch` (KI-004). **Realtime:** `zones` + `inventory_entries` debounce 2s; `markOwnMutation`. **Tìm kiếm** toàn mode; bấm lô → đổi kho + highlight + `ZoneDetailSheet`. **Locate intent** từ ProductDetail.
- **ProductsScreen:** **luôn hiện mọi SP** (catalog) — **không** filter theo `appMode` global. **KI-040:** `fetchProductsPage` — search server-side `.ilike` (debounce 300ms), max 200; barcode digits → `product_barcodes`; zone/stock/special filter local trên `inventoryEntries`; pagination UI 10/trang. Nút **Lọc (N)** → `FilterModal`. **4 toggles:** Chỉ SP đã ẩn · Chỉ hết lô · Hàng đặc biệt · Chưa có ảnh. Qty = `getQtyUnit()`. FAB tạo SP. `fetchProducts` full vẫn dùng cho Notifications/Dashboard/Notes.
- **TTL focus fetch (KI-039):** pattern `FOCUS_FETCH_TTL_MS = 30_000` trên InternalNotes, StockCheck, LocationManagement, Discontinued, ProductDetail (reset khi đổi `productId`), ZoneLayoutEditor, OrderList, UserManagement (+ Settings/Dashboard từ trước).
- **NotificationsScreen:** nút **Lọc (N)** → `FilterModal` (Mode/Kho/Zone local). Route params từ Dashboard seed `filterLocationId` / `filterZoneId`. Tab **Sắp hết hạn:** checkbox Hết hạn / Sắp hết hạn + **date range** `dateFrom`/`dateTo` (ISO; UI DD/MM/YYYY; default hôm nay → +30 ngày) + `dateRangeActive`. **Mặc định** (`dateRangeActive=false`): chỉ lots expired/warning; checkbox lọc bình thường. **Date range mode** (bấm ➜ sau validate; ✕ tắt): mọi lô có `expiry_date ∈ [from, to]` (kể cả `ok`); checkbox disable (opacity 0.4, giữ state). Tab **Sắp hết hàng:** checkbox (không date range). Search + pagination giữ nguyên.
- **LocationManagementScreen:** `allLocations` local (fetch `locations` đầy đủ, không phụ thuộc store filter `appMode`) + dropdown **viewMode** Tất cả / Kho / Siêu thị (pattern FilterModal); badge type trên card khi xem Tất cả; SKU count theo `allLocations`. **F4:** tap body → Map + `setSelectedLocation`; FAB **+** tạo kho (`addLocation` dùng `appMode`); modal tạo/sửa. Keyboard: `softwareKeyboardLayoutMode: pan` + `KeyboardAvoidingView` + `scrollToEnd` onFocus.
- **CategoryManagementScreen:** accordion Cấp 1 → Cấp 2; thêm/sửa/xóa nhóm & loại (modal tên); `fetchCategories` khi mount; nút **+ Thêm nhóm** cuối danh sách; **+ Thêm loại** trong section khi đã xổ Cấp 1.
- **ProductDetailScreen:** **image block** căn giữa phía trên tên SP (trong `ScrollView`); tap ảnh → zoom full-screen; placeholder 📷 → upload; nút **✏️** đổi ảnh + **🗑️** xóa ảnh (confirm; xóa kèm file Storage + `image_url` null). Thanh **Tổng … thùng** + lọc lô; refetch khi focus. Mỗi lô: **✏️** inline edit (barcode lô: **`checkBarcodeConflict`** trước save → block + `logBarcodeConflict`; OK → `updateInventoryEntry` + **`upsertProductBarcode`**) · **📍** `setLocateIntent` → tab Kho (khi còn thùng) · **🗑️** xóa (**chỉ khi `quantity_boxes = 0`** — KI-058). Chuyển lô chỉ ở `ZoneDetailSheet`. Section **Chi tiết** (F30 thresholds + category; **F32** 2 Switch «Bỏ qua cảnh báo hết hạn / hết hàng» → `ignore_expiry_warning` / `ignore_stock_warning`), **Lịch sử** (10 entries + AuditLog), **Xóa sản phẩm** (`deleteProduct` — xóa ảnh Storage trước nếu có).
- **AddInventoryScreen:** chọn zone/tầng, tìm/chọn SP. Ô tìm SP: **📷** → `BarcodeScanner` → `searchByBarcode` (lô đang còn) → điền `searchQuery` = tên SP (không auto-chọn); nếu không có lô → **`lookupProductByBarcode`** (`product_barcodes`, kể cả SP hết lô) → điền tên tương tự; cả hai miss → text warning. **F7:** `pendingLotBarcodeRef` stash mã vừa quét khi lookup OK; user **bấm chọn** SP từ dropdown → điền `lotBarcode` từ stash rồi clear; gõ tên thủ công (`onChangeText`) → clear stash → chọn SP → barcode lô trống. Hint cố định dưới ô tìm (tránh tạo trùng tên). Cuối gợi ý: **+ Tạo mới '[tên]'**; không kết quả: **Tạo sản phẩm mới**. **Barcode lô:** trước `addInventoryEntry` → **`checkBarcodeConflict`**; conflict → Alert + **`logBarcodeConflict`**; sau save OK → **`upsertProductBarcode`**. **F08:** ô ảnh vuông nhỏ optional sau field tên SP mới (tạo SP → `productId` → upload → `image_url`). `SafeAreaView` (`react-native-safe-area-context`). **F30:** category read-only / dropdown khi tạo SP mới.

---

## §4 Store — `authStore.ts` (F24)

**State:** `currentUserProfile` (`UserProfile | null`), `currentUserEmail`, `isLoadingProfile`, `users` (`UserProfileWithEmail[]`), `isLoadingUsers`, `onlineUserIds` (`Set<string>` — user đang online qua Presence).

**Actions:** `fetchCurrentUserProfile` (query `user_profiles`; option `{ silent: true }` khi refetch Realtime), `clearCurrentUserProfile`, `updateLastLogin` (RPC `update_my_last_login`), `fetchUsers` (RPC `list_user_profiles_with_email`), `updateUserRole`, `updateUserDisabled` (UPDATE `user_profiles` qua RLS, refetch list), `setOnlineUserIds` (cập nhật từ `lib/presence.ts` sync).

**Gọi từ:** `App.tsx` — fetch sau khi có session; clear khi logout; guard `is_disabled`.

**Hooks (Task 2):** `useIsReadOnly()` — `role === 'guest'`; `useCanWrite()` — `role !== 'guest'`; `useIsAdmin()` — `admin` \| `super_admin`; `useIsSuperAdmin()` — `super_admin`. Dùng ẩn nút CRUD và safety handler trên màn hình.

---

## §4a Store — `warehouseStore.ts`

**State:** `locations` (mỗi `Location` có `grid_rows`, `grid_cols`, **`type`**), `selectedLocationId`, **`appMode`** (`'warehouse' | 'market'`, default `'warehouse'`), `zones`, `products`, `productCategoriesL1`, `productCategoriesL2`, `inventoryEntries`, `orderLists`, `orderItems`, **`internalNotes`** (F31), `isLoading`, **`locateIntent`** (`LocateIntent | null` — cross-tab Map locate từ ProductDetail). **F24 Task 2+ (planned):** `users` (danh sách cho admin/super_admin).

**Actions — mode (F36 C2):** `setAppMode(mode)` — set `appMode`, clear `selectedLocationId` / `zones` / `inventoryEntries`, gọi `fetchLocations()`; **`getQtyUnit()`** → `'thùng'` | `'sản phẩm'`.

**Actions — locate:** `setLocateIntent`, `clearLocateIntent`.

**Actions — user management (F24 Task 2+):** `fetchUsers`, `createUser`, `updateUserRole`, `toggleUserDisabled`, `toggleUserGuest`.

**Actions — kho & zone:** `setSelectedLocation`, **`fetchLocations`** (`.eq('type', appMode)` + auto-select location đầu nếu `selectedLocationId === null`), `addLocation`, `updateLocation`, `deleteLocation`, `fetchZones`, `fetchProducts` (full), **`fetchProductsPage`** (KI-040 ProductsScreen — search/archived/image DB max 200 → `productsPage` / `productsTotalCount` / `productsPageLoading`), `fetchInventoryByZone`, `fetchInventoryByLocation` (một query `.in('zone_id', …)` cho cả kho, một lần `set` store), `fetchAllInventoryEntries`, `searchProducts` (filter `products` trong store bằng `normalizeText`, sau đó query `inventory_entries` theo `product_id` — không `ilike` DB), `searchInventoryByBarcode`, `searchByBarcode`, **`lookupProductByBarcode`**, **`checkBarcodeConflict`**, **`upsertProductBarcode`** (optional `reassign` sau confirm conflict), **`fetchProductBarcodes`**, **`deleteProductBarcode`**, **`updateProductBarcode`**, **`logBarcodeConflict`** (RPC `log_barcode_conflict`), `addProduct`, `deleteProduct`, `addInventoryEntry`, `updateInventoryEntry`, `deleteInventoryEntry`, `updateProductStockThresholds`, `addZone`, `updateZone`, `batchUpdateZoneCells`, `deleteZone`.

**Schema — `product_barcodes` (B1):** `id`, `product_id` → `products`, `barcode` **UNIQUE**, `first_scanned_at`, `last_scanned_at`; RLS authenticated; audit trigger SEC-11; backfill một lần từ `inventory_entries.barcode` (migration). **`audit_logs.action`:** thêm **`CONFLICT`** (B2) — RPC **`log_barcode_conflict`** ghi attempt gán barcode trùng SP khác.

**Schema — Market mode + F32 + F34 picking (schema v5.0):** `locations.type` (`warehouse`|`market`); `inventory_entries.is_special`, `is_checked`; `products.ignore_expiry_warning` / `ignore_stock_warning`; **`picking_lists` / `picking_list_items`** (F34 B1). Shelf tables **đã DROP**. **C2 Done:** `appMode` + mode switcher UI + `getQtyUnit`.

**Actions — phân loại (F30, `warehouseStore`):** `fetchCategories`, `addCategoryL1`, `updateCategoryL1`, `deleteCategoryL1`, `addCategoryL2`, `updateCategoryL2`, `deleteCategoryL2`, `updateProductCategory` (cập nhật `category_level1_id` / `category_level2_id` trên `products` + đồng bộ store).

**Actions — sản phẩm / cờ:** `toggleDeferred`, `togglePriceReduced`, `setProductDiscontinued`, `toggleDiscontinued`, `fetchDiscontinuedProducts`, `refreshDiscontinuedContext`, `updateProductName`, `updateProductImage(productId, imageUrl)`, `removeProductImage(productId)` (xóa Storage + set `image_url` null). **Ẩn/khôi phục SP** (`ProductDetailScreen` `handleArchiveToggle`): cập nhật DB `is_archived` + store `products` (ẩn = remove khỏi list) **và** sync `inventoryEntries[].product` (cùng object `updated`, pattern như `updateProductName`) — KI-059; tránh Notifications fallback snapshot cũ.

**Actions — đặt hàng:** `fetchOrderLists`, `createOrderList`, `updateOrderList`, `deleteOrderList`, `addOrderItem`, `updateOrderItem`, `deleteOrderItem`, `confirmOrderList`, `markOrderPlaced`.

**Actions — ghi chú nội bộ (F31):** `fetchInternalNotes`, `addInternalNote({ productId?, customName?, reason })`, `updateInternalNote`, `deleteInternalNote` (join `product:products(id, name, image_url)`; `product_id` nullable + `custom_product_name`).

**Actions — audit log:** `fetchAuditLogs` (cursor-based, filter kho + loại + người + sản phẩm), `fetchLatestAuditEntry`, `fetchAuditLogsForProduct`.

---

## §4c Store — `warningStore.ts`

**State:** `expiryWarningEnabled`, `lowStockWarningEnabled` (mặc định `true`).

**Persist:** AsyncStorage `warning_expiry`, `warning_low_stock` (giá trị `'true'` / `'false'`; thiếu key = bật).

**Actions:** `loadWarningSettings`, `toggleExpiryWarning`, `toggleLowStockWarning`.

**UI:** `SettingsScreen` (2 `Switch`); `loadWarningSettings()` gọi một lần trong `App.tsx`. Màu cảnh báo qua `utils/statusUtils.ts` → `getDisplayColor` / `getDisplayColorForEntry` trên **ProductsScreen**, **MapScreen** (highlight zone + chấm auto), **ZoneDetailSheet**, **ProductDetailScreen**, **NotificationsScreen** (ẩn count filter khi tắt; danh sách SP vẫn hiện).

---

## §5 Types & logic chính (`types/index.ts`)

- **Types:** `Location` (gồm `grid_rows`, `grid_cols`, **`type: 'warehouse' | 'market'`**), `ZoneCell`, `Zone`, `Product`, **`ProductBarcode`** (B1), `ProductCategoryL1`, `ProductCategoryL2`, `InventoryEntry` (**`is_special`**, **`is_checked`**), **`InternalNote`** (F31), **`UserRole`**, **`UserProfile`** (F24), `ExpiryStatus`, `ExpiryColor`, `CombinedStatus`, **`LocateIntent`** (`productName`, `locationId`, `zoneId`), `AuditLog` (không còn `'shelf_items'`), `OrderList`, `OrderItem`, **`PickingListStatus`**, **`PickingList`**, **`PickingListItem`** (F34)
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

---

## §9 Ops — snapshot schema (pg_dump)

- **Script:** `dump_schema.bat` → output `supabase/db_dump_schema/schema_dump_<timestamp>.sql`
- **Mục đích:** snapshot tham khảo / so sánh; **không** thay quy trình maintain `supabase/migrations/schema.sql` thủ công.
- **Kết nối:** dùng **Session Pooler** (`aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<project_ref>`). Direct `db.<ref>.supabase.co:5432` thường chỉ IPv6 → dễ timeout trên mạng IPv4-only.
- **Trước khi chạy:** điền `<region>` và `<project_ref>` từ Supabase Dashboard → Connect → Session pooler; `pg_dump` client phải ≥ major version Postgres trên Supabase.
