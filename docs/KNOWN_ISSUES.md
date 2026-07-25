# KNOWN_ISSUES — Lỗi / sai lệch đã biết

---

### [KI-088] Settings auditSubtitle rỗng sau warm-cache settingsMain

- **Mức độ:** Low (UX)
- **File liên quan:** `screens/SettingsScreen.tsx`, `stores/warehouseStore.ts`, `App.tsx`
- **Mô tả:** `auditSubtitle` là `useState` set thủ công trong chuỗi `settingsMain` sau `fetchLatestAuditEntry()`. Warm-cache App gọi fetch + `markFetched('settingsMain')` → focus Settings trong TTL 30s skip cả chuỗi → không `setAuditSubtitle` → hiện «Chưa có thay đổi nào» dù audit đã fetch.
- **Hướng fix:** Lưu `latestAuditEntry` trong store; Settings dùng `useMemo` derived (giống discontinuedCount/categorySummary).
- **Trạng thái:** Resolved
- **Đã fix:** B13.9 — `fetchLatestAuditEntry` ghi `latestAuditEntry`; bỏ setState thủ công.
- **Tham chiếu:** PLAN_7 B13.9

---

### [KI-087] TTL toàn app là useRef cục bộ — không warm-cache được

- **Mức độ:** Medium (perf / architecture)
- **File liên quan:** `stores/warehouseStore.ts`, screens (6 màn), `App.tsx`
- **Mô tả:** Mọi TTL focus lưu `useRef` trong từng screen. Prefetch không đánh dấu timestamp → lần đầu vào màn vẫn refetch / đợi lâu.
- **Hướng fix:** `fetchTimestamps` + `shouldRefetch` / `markFetched`; migrate màn; warm-cache trigger sau bootstrap.
- **Trạng thái:** Resolved
- **Đã fix:** TTL trong store (6/6 màn + B13.7 settingsSubtitles); **warm-cache trigger live** trong `App.tsx` (8 group sau `bootstrapDone`, không kéo dài splash B11; reset khi logout). Case filter theo kho cụ thể vẫn fetch riêng (đúng thiết kế). Đóng issue gốc «vào app phải đợi lâu ở nhiều màn».
- **Tham chiếu:** PLAN_7 B13 Done

---

### [KI-086] Settings subtitle refresh không TTL — chạy lại mọi lần focus

- **Mức độ:** Medium (perf / UX)
- **File liên quan:** `screens/SettingsScreen.tsx`
- **Mô tả:** `useFocusEffect` luôn gọi `refreshStockCheckSubtitle` (3 query Supabase tuần tự), `refreshDiscountSubtitle`, `refreshNotifSubtitle` mỗi lần vào tab Settings — kể cả vừa fetch xong. Nhóm discontinued/notes/categories/audit đã có TTL 30s; 3 subtitle network không có → lag/đơ khi tap tab Cài đặt.
- **Hướng fix:** Áp dụng cùng pattern TTL 30s (`lastSubtitleFetchedAt` + skip trong window; chỉ set timestamp sau khi 3 fetch hoàn tất). `refreshBiometric` giữ luôn chạy (local API).
- **Trạng thái:** Resolved
- **Đã fix:** TTL 30s cho 3 subtitle network; biometric không TTL. PLAN_7 B12.
- **Tham chiếu:** PLAN_7 B12 (phát sinh recon Settings lag)

---

### [KI-085] App không bootstrap data sau login — tab đầu luôn spinner

- **Mức độ:** Medium (perf / UX)
- **File liên quan:** `App.tsx`, `stores/warehouseStore.ts`, `components/AppLoadingScreen.tsx`
- **Mô tả:** App.tsx sau login thành công chỉ fetch profile + schedule notifications. Không prefetch locations/products. Tab đầu tiên user bấm vào (thường MapScreen) phải fetch từ đầu → spinner chờ mỗi lần mở app.
- **Hướng fix:** Sau login OK, prefetch song song `fetchLocations` + `fetchProducts` (critical path MapScreen). Lazy fetch phần còn lại khi user vào các tab khác.
- **Trạng thái:** Resolved
- **Đã fix:** Prefetch `Promise.all([fetchLocations(), fetchProducts()])` đã có sẵn; task này thêm **gating** (`Promise.race` + timeout 5s → `dataReady`) thay vì fire-and-forget, và UI splash động `AppLoadingScreen` (stroke progress giả lập) trước khi vào `NavigationContainer`.
- **Tham chiếu:** PLAN_7 B11

---

### [KI-084] ProductsScreen mount cascade 7+ network call

- **Mức độ:** Medium (perf)
- **File liên quan:** `screens/ProductsScreen.tsx`
- **Mô tả:** Mount ProductsScreen trigger đồng thời: fetchCategories, fetchPickingLists, fetchProducts, fetchProductsPage (select * limit 1000), locations ×2, fetchAllInventoryEntries, zones. Không có TTL/useFocusEffect → một số useEffect trigger lại khi deps thay đổi khi quay về tab.
- **Hướng fix:** Gom locations/zones vào 1 call; thêm useFocusEffect + TTL cho data cần refresh; giải quyết khi làm B1 (bỏ fetchAllInventoryEntries) + B5 (projection).
- **Trạng thái:** Open
- **Partial fix tháng 7/2026:** projection 2 query supabase trực tiếp (#8 locations, #11 zones); cascade useEffect giữ nguyên
- **Tham chiếu:** PLAN_7 B10

---

### [KI-083] FlatList hiện tại thiếu getItemLayout + không có React.memo

- **Mức độ:** Medium (perf)
- **File liên quan:** `screens/NotificationsScreen.tsx`, `screens/DiscountScreen.tsx`, `screens/InternalNotesScreen.tsx`, `screens/ProductsScreen.tsx`
- **Mô tả:** Tất cả FlatList/SectionList trong app đều không khai báo `getItemLayout`. Không có `React.memo` nào trong toàn bộ codebase. Scroll list lớn (Products 500+ SP) không tận dụng được optimization của FlatList.
- **Hướng fix:** Thêm `getItemLayout` cho list item chiều cao cố định. Wrap render item bằng `React.memo`.
- **Trạng thái:** Resolved
- **Đã fix:** renderItem wrap useCallback trên 4 file; getItemLayout không áp dụng (height động)
- **Tham chiếu:** PLAN_7 B9

---

### [KI-082] List lớn dùng ScrollView + .map — không virtualize

- **Mức độ:** Medium (perf)
- **File liên quan:** `screens/OrderListScreen.tsx`, `screens/OrderDetailScreen.tsx`, `screens/MapScreen.tsx`, `components/ZoneDetailSheet.tsx`, `components/LotPickerModal.tsx`, `components/FilterModal.tsx`
- **Mô tả:** Các list trên dùng ScrollView + .map thay FlatList — render toàn bộ DOM cùng lúc. Khi list lớn (nhiều orders, nhiều lots, search results MapScreen) → JS thread block → app đơ.
- **Hướng fix:** Chuyển sang FlatList hoặc SectionList. Ưu tiên ZoneDetailSheet và MapScreen search results vì có thể nhiều items nhất.
- **Trạng thái:** Closed
- **Đánh giá tháng 7/2026:** recon 6 file xác nhận không có list nào đủ lớn để justify virtualize. FilterModal zones là candidate lớn nhất nhưng maxHeight 180 đã giới hạn; item height động. Won't fix ở quy mô hiện tại — reopen nếu data volume tăng đáng kể.
- **Tham chiếu:** PLAN_7 B8

---

### [KI-081] Zustand destructure không selector — re-render cascade toàn app

- **Mức độ:** Medium (perf)
- **File liên quan:** `screens/ProductsScreen.tsx` (23 fields), `screens/MapScreen.tsx` (17 fields), `screens/InternalNotesScreen.tsx` (13 fields), `screens/OrderDetailScreen.tsx` (13 fields), và các màn khác
- **Mô tả:** Tất cả màn destructure useWarehouseStore() không dùng selector → bất kỳ field nào trong store thay đổi (kể cả field không liên quan, ví dụ MapScreen Realtime update zones) → toàn bộ component re-render kể cả khi đang ở tab khác.
- **Hướng fix:** Chuyển sang selector cụ thể `useWarehouseStore(s => s.field)` hoặc `useShallow` cho nhóm fields liên quan. Thêm `React.memo` cho render item components.
- **Trạng thái:** Resolved
- **Đã fix:** useShallow selector trên 4 màn chính (ProductsScreen, MapScreen, InternalNotesScreen, OrderDetailScreen)
- **Tham chiếu:** PLAN_7 B7

---

### [KI-080] Image RN không có cache — re-download mỗi lần mount

- **Mức độ:** High (perf / UX)
- **File liên quan:** `screens/ProductsScreen.tsx`, `screens/DiscountScreen.tsx`, `screens/NotificationsScreen.tsx`, `screens/InternalNotesScreen.tsx`, `components/LotPickerModal.tsx`, `components/ImageViewerModal.tsx`
- **Mô tả:** Toàn app dùng `Image` từ `react-native`, không có cache policy. Mỗi lần component mount lại (chuyển tab rồi quay về, scroll) → re-download ảnh từ Supabase Storage từ đầu. ProductsScreen 500+ SP có ảnh → hàng chục request đồng thời khi scroll.
- **Hướng fix:** Install `expo-image`; thay `Image` RN → `Image` từ `expo-image` với `cachePolicy="disk"`. Cần rebuild APK.
- **Trạng thái:** Resolved
- **Đã fix:** expo-image + cachePolicy="disk" trên 5 file (9 chỗ); ImageViewerModal giữ Animated.Image
- **Lưu ý:** cần rebuild APK để cache có hiệu lực
- **Tham chiếu:** PLAN_7 B6

---

### [KI-079] `fetchProductsPage` select * limit 1000 — payload thừa

- **Mức độ:** Medium (perf)
- **File liên quan:** `stores/warehouseStore.ts` (`fetchProductsPage`), `screens/ProductsScreen.tsx`
- **Mô tả:** `fetchProductsPage` dùng `.select('*', { count: 'exact' }).limit(1000)` — kéo mọi cột products cho tối đa 1000 rows. ProductsScreen card UI chỉ cần một số cột nhất định, không cần toàn bộ.
- **Hướng fix:** Projection cụ thể chỉ select columns cần cho card UI.
- **Trạng thái:** Resolved
- **Đã fix:** projection 10 cột (drop notes, ignore_expiry_warning, ignore_stock_warning, updated_at, discontinued_reason, created_at)
- **Tham chiếu:** PLAN_7 B5

---

### [KI-078] Race condition 3 function ghi đồng thời vào inventoryEntries

- **Mức độ:** High (data consistency)
- **File liên quan:** `stores/warehouseStore.ts` (`fetchAllInventoryEntries`, `fetchInventoryByZone`, `fetchInventoryByLocationSilent`)
- **Mô tả:** Ba function cùng ghi vào `store.inventoryEntries` với strategy khác nhau: fetchAll set toàn bộ, fetchByZone merge theo zone_id, fetchByLocation merge theo zoneIdSet. Khi chạy đồng thời (ví dụ MapScreen Realtime + Notifications mount) → merge partial đè mất data → list hiển thị thiếu hoặc stale.
- **Hướng fix:** Giải quyết tự nhiên khi làm B1 (mỗi màn fetch scope riêng). Nếu vẫn giữ shared state, cần sequence lock nhất quán.
- **Trạng thái:** Open
- **Partial — race condition giảm do productsScreenEntries / discountedEntries / expiryEntries / lowStockEntries tách riêng; fetchAllInventoryEntries vẫn dùng bởi Dashboard**
- **Tham chiếu:** PLAN_7 B4

---

### [KI-077] `fetchInventoryByZone` + `fetchInventoryByLocationSilent` còn select * nested

- **Mức độ:** Medium (perf)
- **File liên quan:** `stores/warehouseStore.ts` (`fetchInventoryByZone`, `fetchInventoryByLocationSilent`)
- **Mô tả:** Cả hai function dùng `.select('*, product:products(*), zone:zones(*)')` — kéo toàn bộ cột 3 bảng. Trong khi `fetchAllInventoryEntries` đã có projection cụ thể. Hai function này được gọi từ MapScreen Realtime, Notifications khi chọn kho, ProductsScreen khi có filterLocationId.
- **Hướng fix:** Áp dụng cùng projection của `fetchAllInventoryEntries` cho 2 function này. Drop-in fix, không đổi logic.
- **Trạng thái:** Resolved
- **Đã fix:** projection cụ thể theo fetchAllInventoryEntries cho fetchInventoryByZone + fetchInventoryByLocationSilent
- **Tham chiếu:** PLAN_7 B3

---

### [KI-076] Double-fetch fetchAllInventoryEntries — Notifications không TTL, Discount 2 lần mỗi focus

- **Mức độ:** High (perf)
- **File liên quan:** `screens/NotificationsScreen.tsx`, `screens/DiscountScreen.tsx`, `screens/ProductsScreen.tsx`
- **Mô tả:** Discount: `useFocusEffect` (TTL 30s) + `useEffect [filterLocationId]` (không TTL) cùng gọi `fetchAllInventoryEntries` → 2 call full data mỗi lần focus khi TTL chưa hết ở useFocusEffect. Notifications: chỉ có `useEffect [filterLocationId]` không TTL → fetch full mỗi lần focus vào tab.
- **Hướng fix:** Loại bỏ duplicate call; thêm TTL cho Notifications. Giải quyết tự nhiên khi làm B1.
- **Trạng thái:** Resolved
- **Đã fix:** Discount + Notifications + Products đều dùng useFocusEffect TTL 30s / fetch scope riêng — không còn double-fetch `fetchAllInventoryEntries` từ 3 màn này
- **Tham chiếu:** PLAN_7 B2

---

### [KI-075] `fetchAllInventoryEntries` fetch full không filter — bottleneck toàn app

- **Mức độ:** High (perf)
- **File liên quan:** `stores/warehouseStore.ts` (`fetchAllInventoryEntries`), `screens/NotificationsScreen.tsx`, `screens/DiscountScreen.tsx`, `screens/ProductsScreen.tsx`
- **Mức độ chi tiết:** Kéo toàn bộ 550+ lô không có `.eq()` / `.filter()` / `.limit()` / pagination. Mỗi lô kèm nested product (12 cột) + zone (8 cột). Được gọi từ ít nhất 3 màn chính, mỗi màn filter local sau khi fetch. Là nguyên nhân chính gây lag và đơ app.
- **Hướng fix:** Tạo function fetch chuyên biệt theo scope (expiry range cho Notifications, is_price_reduced cho Discount, location_id cho Products). Mỗi màn chỉ fetch đúng data cần hiển thị.
- **Trạng thái:** Resolved
- **Đã fix:** Discount (`fetchDiscountedEntries`); Notifications (`fetchExpiryEntries` + `fetchLowStockEntries`); Products (`fetchProductsScreenEntries` → `productsScreenEntries`)
- **Tham chiếu:** PLAN_7 B1

---

### [KI-074] Thiếu index `inventory_entries.expiry_date` và `products.is_archived`

- **Mức độ:** Medium (perf)
- **File liên quan:** `supabase/migrations/schema.sql`; migration `20260723000000_add_perf_indexes.sql`
- **Mô tả:** Recon schema: không có index trên `inventory_entries.expiry_date` (Notifications / ExpiryAlert) và `products.is_archived` (`fetchProducts` `.eq('is_archived', false)` scan bảng).
- **Hướng fix:** Migration `CREATE INDEX idx_inventory_entries_expiry_date` + `idx_products_is_archived`; cập nhật `schema.sql`. Không đổi TypeScript. (PLAN_6 Group G / P4)
- **Trạng thái:** Resolved
- **Đã fix:** migration `20260723000000_add_perf_indexes.sql`
- **Tham chiếu:** PLAN_6 P4, KI-071–073

---

### [KI-073] `fetchProducts` (full) select `*` — payload thừa

- **Mức độ:** Medium (perf / RAM)
- **File liên quan:** `stores/warehouseStore.ts` (`fetchProducts`)
- **Mô tả:** `.select('*')` load mọi cột `products` (kể cả DEPRECATED / meta ít dùng) về client mỗi lần fetch full.
- **Hướng fix:** Projection cột dùng thực tế (đối chiếu type `Product`); không đụng `fetchProductsPage`. (PLAN_6 Group G / P3)
- **Trạng thái:** Resolved
- **Đã fix:** `fetchProducts` explicit select theo type `Product`; bỏ `is_deferred` (đã drop KI-050)
- **Tham chiếu:** PLAN_6 P3

---

### [KI-072] `fetchAllInventoryEntries` select `*` + nested `*` — payload thừa

- **Mức độ:** Medium (perf / RAM)
- **File liên quan:** `stores/warehouseStore.ts` (`fetchAllInventoryEntries`)
- **Mô tả:** `.select('*, product:products(*), zone:zones(*)')` kéo toàn bộ cột 3 bảng về client (Dashboard, Notifications, Discount, StockCheck, Picking, …).
- **Hướng fix:** Projection chỉ cột đang dùng; recon callers trước khi bỏ cột; giữ tên hàm / return type. (PLAN_6 Group G / P2)
- **Trạng thái:** Resolved
- **Đã fix:** projection nested `products`/`zones` theo recon 7 callers (bỏ `*` / cột nested không dùng)
- **Tham chiếu:** PLAN_6 P2

---

### [KI-071] `completePicking` update tồn tuần tự từng lô

- **Mức độ:** Medium (perf)
- **File liên quan:** `stores/warehouseStore.ts` (`completePicking`); `screens/PickingDetailScreen.tsx`
- **Mô tả:** Loop `await .update().eq('id')` tuần tự — N lô = N request nối tiếp; chậm khi đơn lớn.
- **Hướng fix:** Giữ logic tính `newQty` / partial fail; chạy update song song bằng `Promise.all` (mỗi entry unique một update). `resetMarketChecklist` đã batch — không sửa. (PLAN_6 Group G / P1)
- **Trạng thái:** Resolved
- **Đã fix:** `completePicking` đổi sequential loop → Promise.all (phase local tính newQty / gộp cùng lô; phase DB song song per `inventory_entry_id`)
- **Tham chiếu:** PLAN_6 P1

---

### [KI-070] Presence channel crash sau re-login (session 20 phút)

- **Mức độ:** High (crash)
- **File liên quan:** `lib/presence.ts`, `App.tsx`
- **Mô tả:** Topic presence cố định `'presence:warehouse-online'` + `leavePresenceChannel` fire-and-forget → channel cũ còn `SUBSCRIBED` khi join lại sau logout inactivity → crash "cannot add presence callbacks after subscribe()".
- **Trạng thái:** Resolved
- **Đã fix:** Topic unique per session (`presence:warehouse-online-${Date.now()}`); `cleanupChannels` async; presence leave trước `signOut` trên inactivity path.
- **Tham chiếu:** KI-053 (MapScreen Realtime pattern)

---

### [KI-069] is_special — trước đây thiếu UI toggle (đã fix)

- **Mức độ:** Medium (UX gap)
- **File liên quan:** `components/ZoneDetailSheet.tsx`, `screens/ProductDetailScreen.tsx`
- **Mô tả:** REQUIREMENTS F36 C2 ghi toggle Hàng đặc biệt nhưng code chỉ có filter đọc, không có UI set `is_special = true`. StockCheckScreen (Kiểm hàng) list lô `is_special` nhưng user không có cách đánh dấu từ app.
- **Trạng thái:** Resolved
- **Đã fix:** Switch «Hàng đặc biệt» trong inline edit lô trên ZoneDetailSheet (`appMode === 'market'`) và ProductDetailScreen (`locType === 'market'`); badge ⭐ read-only trên card lô.
- **Tham chiếu:** F36 C2, StockCheckScreen

---

### [KI-066] ProductsScreen Mode filter giao `productsPage` (max 200) → thiếu SP siêu thị

- **Mức độ:** High (UX — list Mode Siêu thị / Kho thiếu SP)
- **File liên quan:** `screens/ProductsScreen.tsx` (`filteredProducts`, KI-040)
- **Mô tả:** List lấy `productsPage` (≤200 SP theo tên) rồi mới lọc SP có lô trong mode. SP siêu thị ngoài 200 đầu (hoặc ít giao với page) biến mất; Map/ZoneDetail vẫn xem được vì đọc inventory theo zone.
- **Hướng fix:** List theo `product_id` có lô trong scope Mode/Kho/Zone; resolve tên/ảnh từ `products` + `productsPage` + nested `entry.product`; `fetchProducts` khi không archived.
- **Trạng thái:** Resolved *(catalog Mode Tất cả lại dùng `productsPage`; khi lọc Mode/Kho/Zone, qty/lots scoped inventory — không còn cắt list chỉ SP có lô)*
- **Đã fix:** inventory-scoped list (lần 1); sau đó user chọn catalog A + đơn vị theo type (v1.3.34).
- **Tham chiếu:** KI-040, KI-064, F36

---

### [KI-068] ProductsScreen spinner kẹt khi Mode Tất cả

- **Mức độ:** High (UX — list không hiện)
- **File liên quan:** `screens/ProductsScreen.tsx` (gate `modeZoneIds === null`)
- **Mô tả:** Sau khi trả Mode «Tất cả», `modeZoneIds` cố ý = `null` nhưng UI vẫn coi null = đang load → spinner vĩnh viễn.
- **Trạng thái:** Resolved
- **Đã fix:** chỉ chờ `modeZoneIds` khi Mode Kho/Siêu thị; spinner catalog dùng `productsPageLoading`.
- **Tham chiếu:** v1.3.34 catalog Tất cả

---

### [KI-067] ProductDetail tên kho `—` khi location ngoài appMode

- **Mức độ:** Medium (UX)
- **File liên quan:** `screens/ProductDetailScreen.tsx` (`lotPlaceTitle`); `store.locations` filter `appMode`
- **Mô tả:** Lô siêu thị hiện `— · Tủ 4 · Tầng 1` vì `locations.find` chỉ có kho của Map mode hiện tại.
- **Trạng thái:** Resolved
- **Đã fix:** load all locations trên ProductDetail; Map search fallback all location names.
- **Tham chiếu:** F36 appMode

---

### [KI-065] Custom location types — deferred Phase 6+

- **Mức độ:** Low (enhancement)
- **File liên quan:** `stores/warehouseStore.ts` (`getQtyUnit`, `appMode`), `utils/qtyUnitUtils.ts`, `utils/expiryCountUtils.ts`, `components/FilterModal.tsx`, `screens/MapScreen.tsx`, `types/index.ts`, và nhiều màn hình khác
- **Mô tả:** Hardcode 2 mode (`warehouse` → «thùng», `market` → «sản phẩm»). Chưa cho user thêm mode mới hoặc đặt đơn vị tùy ý.
- **Hướng fix (phase sau):** Bảng `location_types` (slug, name, unit_label, supports_special, supports_picking) + UI CRUD trong Settings; `locations.type` TEXT tự do (DB đã sẵn sàng — không có CHECK constraint); `getQtyUnit` / `qtyUnitForLocationType` / FilterModal đọc từ config; `appMode` đổi từ union cố định sang string slug.
- **Blast radius đã recon (tháng 7/2026):**
  - `types/index.ts` — `Location.type`, `FilterMode`, union `'warehouse' | 'market'` lặp ở 10+ nơi
  - `utils/qtyUnitUtils.ts` — `qtyUnitForLocationType`, `locationTypeOfEntry`, `formatSplitQtyLabel` (nhận 2 số cố định — vỡ khi có type thứ 3)
  - `stores/warehouseStore.ts` — `appMode` union, `getQtyUnit`, `fetchLocations`, `addLocation`
  - `components/FilterModal.tsx` — `MODE_OPTIONS_ALL`/`REQUIRED`, `MODE_LABEL` hardcode
  - `screens/MapScreen.tsx` — mode sheet hardcode 2 option
  - `screens/StockCheckScreen.tsx`, `SettingsScreen.tsx` — `.eq('type', 'market')` hardcode
  - `screens/PickingDetailScreen.tsx` — `.eq('type', 'warehouse')` hardcode
  - `screens/ExpiryAlertScreen.tsx`, `NotificationsScreen.tsx`, `ProductDetailScreen.tsx` — đơn vị qty hardcode ngoài utils
- **Câu hỏi cần confirm trước khi implement:**
  - `is_special` / StockCheck: chỉ market hay type mới cũng có? → đề xuất flag `supports_special` trên `location_types`
  - Picking: chỉ warehouse hay type mới cũng picking được? → đề xuất flag `supports_picking`
  - `formatSplitQtyLabel`: đổi thành array `{ qty, unit }[]` thay 2 số cố định
- **Trạng thái:** Deferred Phase 6+
- **Tham chiếu:** DECISIONS ProductsScreen filter mode; TODO trong `getQtyUnit` (`warehouseStore.ts:53–55`, `243–244`)

---

### [KI-064] ProductsScreen filter Mode/Kho thiếu inventoryEntries (SP siêu thị biến mất)

- **Mức độ:** Medium (UX filter sai)
- **File liên quan:** `screens/ProductsScreen.tsx`, `stores/warehouseStore.ts`
- **Mô tả:** Filter Mode/Kho client-side dựa trên `store.inventoryEntries`. Map Realtime `fetchInventoryByLocation` chỉ merge theo `store.zones` của kho đang chọn → entries siêu thị thiếu → filter market/warehouse sai. Race `fetchAllInventoryEntries` vs location-merge cũng có thể đè data.
- **Hướng fix:** Products refetch theo `filterMode`/`filterLocationId`; `fetchInventoryByLocationSilent` query zones theo `location_id` từ DB + MERGE; skip location-fetch khi `fetchAll` đang chạy.
- **Trạng thái:** Resolved
- **Đã fix:** useEffect filter fetch; zones-by-location từ DB; flag `allInventoryFetchInFlight`.
- **Tham chiếu:** F36 FilterModal, KI-063

---

### [KI-063] Realtime refetch → Map spinner / mất form đang nhập

- **Mức độ:** High (UX multi-user)
- **File liên quan:** `stores/warehouseStore.ts`, `screens/MapScreen.tsx`, `screens/DashboardScreen.tsx`, `screens/SettingsScreen.tsx`
- **Mô tả:** Realtime callback gọi `fetchZones` (set `isLoading: true`) → Map unmount grid hiện spinner (“reset màn kho”). Settings/Dashboard Realtime refetch `locations`/`products`/toàn bộ inventory → re-render rộng, form đang nhập bị ảnh hưởng.
- **Hướng fix:** `fetchZonesSilent` / `fetchInventoryByLocationSilent` (không `isLoading`) cho Map Realtime; Dashboard `refreshData('realtime')` chỉ inventory; Settings Realtime chỉ `fetchDiscontinuedProducts()`.
- **Trạng thái:** Resolved
- **Đã fix:** silent fetch + giới hạn scope Realtime (giữ channel/debounce; load thủ công vẫn dùng `isLoading`).
- **Tham chiếu:** KI-002, KI-053, F17 / SEC-08

---

### [KI-062] F35 — Local notification nội dung tĩnh (cần mở app để cập nhật)

- **Mức độ:** Low (accepted limitation)
- **File liên quan:** `lib/notifications.ts`, `App.tsx`, `screens/ExpiryAlertScreen.tsx`
- **Mô tả:** Local scheduled notification nội dung được tính khi mở app. Nếu không ai mở app, notification ngày tiếp theo vẫn hiện số liệu cũ. App nội bộ mở hàng ngày nên impact thấp.
- **Hướng nâng cấp:** Server push qua FCM/APNs + Supabase Edge Function — tính realtime trên server, gửi push chính xác.
- **Trạng thái:** Accepted — defer server push
- **Tham chiếu:** F35, DECISIONS F35

---

### [KI-061] Discontinued GO_BACK crash + Products archived ghi đè store.products

- **Mức độ:** High (crash / data consistency)
- **File liên quan:** `screens/DiscontinuedProductsScreen.tsx`, `screens/ProductsScreen.tsx`, `screens/InternalNotesScreen.tsx`
- **Mô tả:** (1) Nút **Đóng** trên Discontinued gọi `navigation.goBack()` khi không còn history → crash `GO_BACK`. (2) Toggle **Chỉ SP đã ẩn** trên ProductsScreen fetch `.eq('is_archived', true)` rồi `setState({ products })` → `store.products` chỉ còn archived; các màn khác (Internal Notes dropdown, AddInventory, …) thiếu SP bình thường.
- **Hướng fix:** `canGoBack()` → `goBack()`, else `navigate('SettingsMain')`. Archived list dùng **local state** `archivedProducts`, không ghi đè store; Internal Notes luôn `fetchProducts()` khi focus.
- **Trạng thái:** Resolved
- **Đã fix:** Discontinued close guard; ProductsScreen `archivedProducts` + source `showArchived ? archivedProducts : products`; Internal Notes always fetch + free-name (`custom_product_name`).
- **Tham chiếu:** F28, F09, F31

---

### [KI-060] Toggle "Chỉ sản phẩm đã ẩn" — race + thiếu client filter + page không reset

- **Mức độ:** Medium (UX / data consistency)
- **File liên quan:** `screens/ProductsScreen.tsx`
- **Mô tả:** (1) Bật/tắt toggle nhanh → fetch song song, response cũ ghi đè `store.products` → list sai mode. (2) `filteredProducts` không lọc `is_archived` theo toggle → SP lệch mode (vd. vừa khôi phục) vẫn hiện. (3) `setCurrentPage(0)` không deps `showArchived` → kẹt trang cũ.
- **Hướng fix:** cancelled flag khi fetch theo toggle; filter client `showArchived ? is_archived : !is_archived`; thêm `showArchived` vào deps reset page.
- **Trạng thái:** Resolved
- **Đã fix:** (lần 1) cancelled + filter client + page reset. **(lần 2 / KI-061)** archived mode → local `archivedProducts`, không ghi đè `store.products`; mode off → `fetchProducts()`.
- **Tham chiếu:** F3 / F09 toggle archived

---

### [KI-059] Ẩn SP — Notifications vẫn hiện (stale nested `product.is_archived`)

- **Mức độ:** Medium (UX / data consistency)
- **File liên quan:** `screens/ProductDetailScreen.tsx` (`handleArchiveToggle`), `screens/NotificationsScreen.tsx` (fallback `entries[0].product`)
- **Mô tả:** Ẩn SP từ ProductDetail (mở từ Notifications) chỉ `filter` remove khỏi `store.products`, **không** cập nhật `inventoryEntries[].product`. Notifications: `products.find ?? entries[0].product` → snapshot cũ `is_archived: false` → filter fail → card vẫn hiện. Từ ProductsScreen không lộ vì list đọc trực tiếp `products`.
- **Hướng fix:** Khi archive/khôi phục, sync `inventoryEntries` nested `product` giống `updateProductName` (gán `product: updated`).
- **Trạng thái:** Resolved
- **Đã fix:** `handleArchiveToggle` `setState` cập nhật cả `products` và `inventoryEntries` map theo `product_id`. Không thêm focus-refetch.
- **Tham chiếu:** F3 sync `is_archived`

---

### [KI-058] Xóa lô khi còn thùng — UI và store không block (F2 Phase 3)

- **Mức độ:** High (data loss risk)
- **File liên quan:** `screens/ProductDetailScreen.tsx`, `components/ZoneDetailSheet.tsx`, `stores/warehouseStore.ts` (`deleteInventoryEntry`)
- **Mô tả:** Lô còn `quantity_boxes > 0` vẫn hiện nút 🗑️ và cho phép xóa — cả ProductDetail lẫn ZoneDetailSheet. `deleteInventoryEntry` DELETE trực tiếp không validate qty.
- **Hướng fix:** Chỉ hiện/xử lý xóa khi `quantity_boxes === 0`; store reject nếu qty > 0; banner hết hạn chỉ hiện "Xóa lô" khi qty === 0.
- **Trạng thái:** Resolved
- **Đã fix:**
  - ProductDetail: 🗑️ chỉ khi `qty === 0`; banner hết hạn giữ text, link "Xóa lô" chỉ khi `qty === 0`; `handleDeleteLot` guard `qty > 0`.
  - ZoneDetailSheet: 🗑️ chỉ khi `qty === 0`; `handleDeleteLot` guard tương tự.
  - Store: `deleteInventoryEntry` reject nếu entry trong store có `quantity_boxes > 0`.
- **Tham chiếu:** `PLAN_3.md` F2, `REQUIREMENTS.md` F07/F16 v1.3.8

---

### [KI-057] BarcodeScanner "Hàng đã hết" — navigation / stack cụt ProductDetail (F1 Phase 3)

- **Mức độ:** High (UX / navigation)
- **File liên quan:** `screens/BarcodeScannerScreen.tsx`, `lib/tabNavigation.ts`
- **Mô tả:** Alert **"Hàng đã hết"** → **"Xem chi tiết"** nested navigate chỉ `ProductDetail` → stack tab có thể thành **`[ProductDetail]`** (thiếu Main). Đóng → `goBack()` index 0 bubble sang Tab → Map; tab Sản phẩm kẹt ProductDetail (`popToTop` không chạy vì `index === 0`). (Lần 1: thiếu `returnTab` — đã sửa nhưng chưa đủ.)
- **Hướng fix:** Navigate theo `returnTab` + **state tường minh** `[Main, ProductDetail]` (`index: 1`).
- **Trạng thái:** Resolved
- **Đã fix (lần 2):** `getMainScreenName` + `tabsParamsForProductDetail` trong `lib/tabNavigation.ts`; "Xem chi tiết" dùng state `{ routes: [Main, ProductDetail], index: 1 }`. Lần 1: `returnTab` thay hardcode Products. Huỷ / Thêm thủ công không đổi.
- **Tham chiếu:** `PLAN_3.md` F1, `REQUIREMENTS.md` F10

---

### [KI-056] F24 — `last_login_at` không cập nhật / UserManagement hiện "Chưa đăng nhập"

- **Mức độ:** Medium (data / UX)
- **File liên quan:** `App.tsx`, `stores/authStore.ts`, `supabase/migrations/20260601000000_add_user_profiles.sql`
- **Mô tả:** `App.tsx` đã gọi `updateLastLogin()` sau fetch profile OK; RPC `update_my_last_login` có `GRANT EXECUTE TO authenticated`. Root cause: **`updateLastLogin()` không kiểm tra `error` từ `supabase.rpc`** → fail im lặng, khó debug. User login trước Task 1 không có `last_login_at` cho đến khi login lại thành công hoặc backfill.
- **Hướng fix:** Log/warn lỗi RPC ở client; backfill `last_login_at` từ `auth.users.last_sign_in_at`.
- **Trạng thái:** Resolved
- **Đã fix:** `authStore.updateLastLogin` log error; migration `20260601000400_backfill_last_login_at.sql`.

---

### [KI-055] F24 Task 2 — Guest RBAC chỉ guard client; RLS server chưa enforce

- **Mức độ:** High (security — bypass nếu hack client)
- **File liên quan:** `stores/authStore.ts`, toàn bộ màn đã guard Task 2; RLS các bảng kho (`zones`, `products`, `inventory_entries`, …)
- **Mô tả:** Task 2 ẩn/vô hiệu CRUD UI cho role `guest` ở client. Các bảng nghiệp vụ kho vẫn dùng policy `allow_all` cho `authenticated` → guest có thể gọi API trực tiếp nếu biết endpoint/key.
- **Hướng fix:** RLS role-based cho INSERT/UPDATE/DELETE trên bảng kho; guest chỉ SELECT; staff+ full CRUD; storage product-images staff+ write.
- **Trạng thái:** Resolved
- **Đã fix:** Migration `20260601000600_rls_role_based_writes.sql`; `schema.sql` v3.16.

---

### [KI-054] F24 — RLS infinite recursion trên `user_profiles` (login fail)

- **Mức độ:** Critical (runtime / auth)
- **File liên quan:** `supabase/migrations/20260601000000_add_user_profiles.sql`, `stores/authStore.ts`, `App.tsx`
- **Mô tả:** Policy `user_profiles_select_admin` (và UPDATE policies) dùng `EXISTS (SELECT 1 FROM user_profiles …)` → PostgreSQL báo infinite recursion → client query fail / empty → Alert "Không tìm thấy hồ sơ tài khoản" dù row tồn tại trong DB.
- **Cách tái hiện:** Apply migration Task 1 gốc → login user `staff` → spinner rồi Alert lỗi profile.
- **Hướng fix:** Helper `is_current_user_admin()` / `is_current_user_super_admin()` SECURITY DEFINER; recreate policies gọi helper thay subquery.
- **Trạng thái:** Resolved
- **Đã fix:** Migration `20260601000200_fix_user_profiles_rls_recursion.sql`; `schema.sql` v3.12.

---

### [KI-029] Android crash on launch (màn đen, "has stopped working")

- **Mức độ:** Critical (runtime)
- **File liên quan:** `lib/supabase.ts`, `App.tsx`, `index.ts`, `app.json`, `eas.json` / EAS env (D5)
- **Mô tả:** APK standalone (EAS preview/production) thoát ngay khi mở nếu build **không embed** `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — `createClient(undefined, …)` ném lỗi lúc import module. Thêm: `getSession()` / `onAuthStateChange` không có try/catch; `newArchEnabled: false` lệch với Expo Go (New Arch bật) có thể gây hành vi lạ trên bản native.
- **Cách tái hiện:** `eas build --profile preview` khi chưa `eas env:create` hai biến EXPO_PUBLIC_* → cài APK → mở app → crash hoặc màn đen.
- **Hướng fix:** Validate env trong `lib/supabase.ts` + màn `ConfigErrorScreen` thay vì crash; bọc auth bootstrap try/catch; `StartupErrorBoundary` ở `index.ts`; bỏ `newArchEnabled: false`; set EAS env (GOLIVE D5) và build lại.
- **Trạng thái:** Resolved
- **Đã fix:** `readSupabaseEnv()` + `isSupabaseConfigured`; placeholder client khi thiếu env; `App.tsx` auth gate an toàn; `components/ConfigErrorScreen.tsx`, `components/StartupErrorBoundary.tsx`; dedupe quyền Android trong `app.json`; `.env.example` cho dev local.
- **Tham chiếu build:** `docs/BUILD_APK_GUIDE.md` §7 (env EAS Cloud vs export Local).

---

### [KI-030] EAS Local build không đọc file `.env`

- **Mức độ:** High (build / runtime)
- **File liên quan:** `build.sh`, `.env`, `lib/supabase.ts`, `docs/BUILD_APK_GUIDE.md` §4.3 / §7
- **Mô tả:** `eas build --local` copy project sang `/tmp/` — **không** tự embed biến từ `.env`. Quên `export EXPO_PUBLIC_SUPABASE_*` trước build → APK thiếu env → crash hoặc màn "Chưa cấu hình kết nối" (sau KI-029: không crash native nữa).
- **Cách tái hiện:** Build local trong WSL không export env → cài APK → mở app.
- **Hướng fix:** Export env mỗi lần build (hoặc dùng `build.sh`); EAS Cloud dùng `eas env:create` (một lần). Chi tiết: **BUILD_APK_GUIDE.md**.
- **Trạng thái:** Mitigated
- **Ghi chú:** Runtime đã có `ConfigErrorScreen`; vận hành build vẫn phải export / script.

---

### [KI-031] EAS Local — Gradle `OutOfMemoryError: Metaspace`

- **Mức độ:** High (build)
- **File liên quan:** WSL2 `~/.wslconfig`, `~/.gradle/gradle.properties`, `docs/BUILD_APK_GUIDE.md` §4.3 / §6 / §7
- **Mô tả:** Build Android native trong WSL2 hết Metaspace/RAM → Gradle fail giữa chừng.
- **Cách tái hiện:** `eas build --local` trên máy WSL RAM thấp hoặc thiếu `org.gradle.jvmargs` / `.wslconfig`.
- **Hướng fix:** Tăng `memory` trong `.wslconfig`; tạo `~/.gradle/gradle.properties` (`-Xmx12g`, `MaxMetaspaceSize=2g`, `org.gradle.daemon=false`); xóa `~/.gradle/caches` nếu corrupt rồi build lại.
- **Trạng thái:** Mitigated
- **Đã fix:** Cấu hình `~/.gradle/gradle.properties` (`org.gradle.jvmargs`, `org.gradle.daemon=false`) + `.wslconfig` `memory=16GB`; build local thành công. Tham chiếu: BUILD_APK_GUIDE.md §7.

---

### [KI-032] `build.sh` CRLF — script im lặng trên WSL

- **Mức độ:** Medium (build)
- **File liên quan:** `build.sh`, `docs/BUILD_APK_GUIDE.md` §7
- **Mô tả:** File tạo/sửa trên Windows có line ending CRLF → Linux không chạy được shebang; `./build.sh` không output, không báo lỗi rõ.
- **Cách tái hiện:** Tạo `build.sh` bằng Notepad/Windows → chạy trong Ubuntu.
- **Hướng fix:** `sed -i 's/\r//' build.sh` hoặc lưu LF trong editor; giữ script chỉ chạy trong WSL.
- **Trạng thái:** Mitigated
- **Đã fix:** `sed -i 's/\r//' build.sh` — script chạy bình thường trên WSL.

---

### [KI-033] Gradle cache corrupt — `metadata.bin` / journal lock

- **Mức độ:** Medium (build)
- **File liên quan:** `~/.gradle`, `docs/BUILD_APK_GUIDE.md` §6 / §7
- **Mô tả:** Cache Gradle corrupt sau build bị ngắt (OOM, Ctrl+C) → `Could not read workspace metadata`, `Timeout waiting to lock journal cache`, v.v.
- **Cách tái hiện:** Build local fail giữa chừng → build lại báo lỗi cache/lock.
- **Hướng fix:** `pkill -f gradle` + xóa lock; hoặc `rm -rf ~/.gradle/caches` / toàn bộ `~/.gradle` rồi **tạo lại** `gradle.properties` (tránh OOM lần sau — xem KI-031).
- **Trạng thái:** Mitigated
- **Đã fix:** `rm -rf ~/.gradle/caches` khi cache corrupt; build lại thành công (giữ `gradle.properties` — xem KI-031).

---

### [KI-034] Project trên OneDrive — `git init exited with non-zero code: 128` (WSL)

- **Mức độ:** Medium (build)
- **File liên quan:** đường dẫn project, `docs/BUILD_APK_GUIDE.md` §7
- **Mô tả:** EAS local trong WSL gọi `git` trên thư mục sync OneDrive → lỗi quyền `chmod` / git init.
- **Cách tái hiện:** Clone/project nằm trong OneDrive Desktop/Documents → `eas build --local`.
- **Hướng fix:** Chuyển repo ra ổ local (vd. `E:\projects\`), tắt backup OneDrive cho thư mục đó.
- **Trạng thái:** Resolved
- **Đã fix:** Đã chuyển project sang ổ `E:\projects\chino-warehouse` (ngoài OneDrive sync).

---

### [KI-035] `eas build --local` chạy trên Windows CMD/PowerShell

- **Mức độ:** Medium (build)
- **File liên quan:** `docs/BUILD_APK_GUIDE.md` §7
- **Mô tả:** Flag `--local` chỉ hỗ trợ môi trường Unix-like (WSL2/Linux/macOS), không chạy trực tiếp trên Windows host.
- **Cách tái hiện:** `eas build --profile preview --platform android --local` trong CMD/PowerShell.
- **Hướng fix:** Mở Ubuntu (`wsl -d Ubuntu`), `cd` sang mount path project, export env, build lại; hoặc dùng EAS Cloud trên Windows.
- **Trạng thái:** Resolved
- **Đã fix:** Build local chạy trong WSL2 Ubuntu (`wsl -d Ubuntu`) thay vì CMD/PowerShell; APK v1.0 build và cài máy thật OK.

---

### [KI-001] critical (≤1 thùng) hiển thị màu vàng thay vì đỏ

- **Mức độ:** Critical
- **File liên quan:** `types/index.ts` (`EXPIRY_COLORS`), `stores/themeStore.ts`
- **Mô tả:** `getCombinedStatus` trả về `'critical'` cho ≤1 thùng, nhưng `EXPIRY_COLORS.critical` = `#FACC15` (vàng) và `themeStore.statusCritical` cũng vàng — không khớp **REQUIREMENTS.md §5** (0–1 thùng phải **đỏ** `#EF4444`).
- **Cách tái hiện:** Tạo lô với `quantity_boxes === 1`, mở bản đồ / danh sách / chi tiết — chấm màu critical hiện vàng.
- **Hướng fix:** `EXPIRY_COLORS.critical` → `#EF4444`; `themeStore.statusCritical` → `#EF4444` (và biến thể light nếu cần).
- **Trạng thái:** Resolved
- **Đã fix:** `EXPIRY_COLORS.critical` = `#EF4444`; dark `statusCritical` = `#EF4444`, light `statusCritical` = `#DC2626` (cùng tông đỏ với `statusExpired`).

---

### [KI-002] F17 Realtime chưa verify

- **Mức độ:** High
- **File liên quan:** `stores/warehouseStore.ts`, có thể mở rộng `App.tsx` / các screen
- **Mô tả:** Không thấy Supabase Realtime subscription trong store; các thiết bị có thể không tự đồng bộ nếu không refresh / không refetch.
- **Cách tái hiện:** Hai máy mở cùng màn hình; đổi tồn trên máy A — quan sát máy B có cập nhật trong vài giây hay không.
- **Hướng fix:** Kiểm tra spec F17; thêm `supabase.channel(...).on('postgres_changes', ...)` và cập nhật Zustand khi có sự kiện.
- **Trạng thái:** Resolved
- **Đã fix:** Supabase Realtime hoạt động đúng — thiết bị B tự cập nhật trong vài giây khi thiết bị A thay đổi dữ liệu, không cần reload.
- **Ghi chú (Phase 3 / C1):** `MapScreen` — subscription `zones` + `inventory_entries` (`private: true`, debounce 2s → `fetchZones` + `fetchInventoryByLocation`). Không có mã KI riêng cho C1; xem `WORKLOG.md`.

---

### [KI-003] Tab bar colors hardcode, không theo themeStore

- **Mức độ:** Medium
- **File liên quan:** `App.tsx`
- **Mô tả:** Tab bar `backgroundColor: '#1a1a1a'`, active `#22C55E`, inactive `#666` — hardcode, không dùng `colors` từ `themeStore`. Light mode sẽ lệch.
- **Cách tái hiện:** Bật theme sáng trong Cài đặt — thanh tab vẫn tối / không đồng bộ palette.
- **Hướng fix:** bọc navigator bằng provider theme hoặc đọc `useThemeStore` trong container tab và map màu động.
- **Trạng thái:** Resolved
- **Ghi chú:** Light theme đã implement — `themeStore` default `isDark: false`; `LoginScreen` và tất cả màn hình dùng `colors` từ `useThemeStore`. Tab bar `App.tsx` vẫn hardcode màu tối (cần fix riêng nếu muốn tab bar theo theme).

---

### [KI-004] Đổi kho không xóa kết quả tìm kiếm

- **Mức độ:** Low
- **File liên quan:** `screens/MapScreen.tsx`
- **Mô tả:** Khi bấm chọn kho khác (`setSelectedLocation`), không gọi `clearSearch` — vi phạm **REQUIREMENTS.md §7.1** (đổi kho → xóa kết quả tìm).
- **Cách tái hiện:** Tìm sản phẩm trên kho A → chuyển sang kho B — panel kết quả / highlight zone cũ vẫn có thể còn.
- **Hướng fix:** Khi đổi `selectedLocationId`, gọi `clearSearch()` hoặc tương đương reset state tìm kiếm.
- **Trạng thái:** Resolved
- **Đã fix:** `pickLocation` (sheet chọn kho) gọi `clearSearch()` rồi mới `setSelectedLocation(id)` và đóng sheet; comment trong code ghi nhận KI-004. Luồng đổi kho trên Map chỉ qua sheet này nên kết quả tìm / highlight luôn được reset khi đổi kho.

---

### [KI-005] Add sản phẩm / lô không refresh UI ngay

- **Mức độ:** Medium
- **File liên quan:** `screens/AddInventoryScreen.tsx`, `screens/ProductDetailScreen.tsx`, `stores/warehouseStore.ts`
- **Mô tả:** Sau khi thêm sản phẩm hoặc lô hàng mới, danh sách không tự cập nhật — phải chuyển sang màn hình khác rồi quay lại mới thấy. Riêng chi tiết SP: sau **Thêm hàng** → `goBack()` về `ProductDetailScreen`, danh sách lô (`lots` local) không refetch nên không thấy lô mới.
- **Cách tái hiện:** (1) Thêm SP mới → tab Sản phẩm không thấy SP. (2) Từ chi tiết SP → Thêm lô → quay lại chi tiết — không thấy lô mới.
- **Hướng fix:** Tránh race `fetchProducts` trên `AddInventoryScreen`; refetch chi tiết khi màn focus (`useFocusEffect` + `loadData`).
- **Trạng thái:** Resolved
- **Đã fix:** (1) `AddInventoryScreen`: chỉ `fetchProducts()` khi `products.length === 0` — tránh response cũ ghi đè sau `addProduct`. (2) `addInventoryEntry` trong store vẫn merge `inventoryEntries` đúng. (3) `ProductDetailScreen`: `useFocusEffect` gọi `loadData()` mỗi lần màn được focus — cập nhật `lots` sau khi thêm lô từ stack.

---

### [KI-006] Không sửa được số thùng về 0 từ ProductDetailScreen

- **Mức độ:** Medium
- **File liên quan:** `screens/ProductDetailScreen.tsx`
- **Mô tả:** Đã fix được nhập 0 ở `ZoneDetailSheet` nhưng `ProductDetailScreen` vẫn chặn giá trị 0.
- **Trạng thái:** Resolved
- **Đã fix:** `handleSaveLot` chấp nhận số nguyên `quantity_boxes >= 0` (đồng bộ với `ZoneDetailSheet`); `loadData` không còn lọc `.gt('quantity_boxes', 0)` (xem KI-007).
- **Xác minh code (inline sửa lô):** Trong `handleSaveLot`, điều kiện từ chối là `quantity < 0` hoặc không phải số nguyên (`quantity !== Math.floor(quantity)`), không còn `quantity < 1` — nhập **0** hợp lệ. Tham chiếu: `screens/ProductDetailScreen.tsx` (hàm `handleSaveLot`, validation ngay trước `updateInventoryEntry`).

---

### [KI-007] Lô 0 thùng bị xóa khỏi app thay vì giữ lại

- **Mức độ:** High
- **File liên quan:** `stores/warehouseStore.ts`, `screens/ProductDetailScreen.tsx`, `components/ZoneDetailSheet.tsx` (dữ liệu qua `fetchInventoryByZone`)
- **Mô tả:** Khi cập nhật lô về 0 thùng, lô biến mất khỏi UI do truy vấn Supabase lọc `quantity_boxes > 0`, không phải do xóa record trong DB.
- **Hướng fix:** Bỏ `.gt('quantity_boxes', 0)` trên `fetchInventoryByZone` và `searchProducts`; `ProductDetailScreen.loadData` tải mọi lô; lô 0 thùng hiển thị dòng `Lô này đã hết hàng` + nút **Xóa lô** (xóa DB).
- **Trạng thái:** Resolved
- **Đã fix:** Bỏ lọc `quantity_boxes > 0` ở store và `ProductDetailScreen`; banner hết hàng + **Xóa lô** trên lô 0 thùng; ẩn nút 🗑️ hàng loạt khi 0 thùng để tránh trùng với **Xóa lô**. `NotificationsScreen`: dùng cờ "có lô có vấn đề" thay vì `issueBoxes === 0` để không bỏ sót SP chỉ còn lô 0 thùng.

---

### [KI-008] ProductsScreen — bật "Có vấn đề" gây TypeError `.has` of undefined *(trước đây ghi nhận là KI-006)*

- **Mức độ:** High (runtime)
- **File liên quan:** `screens/ProductsScreen.tsx`
- **Mô tả:** `filteredProducts` (`useMemo`) gọi `productIdsWithIssueLot.has(...)` trong khi `productIdsWithIssueLot` được khai báo **sau** cùng hook — temporal dead zone: biến `undefined` tại thời điểm closure chạy.
- **Cách tái hiện (bản lỗi):** Bật toggle **Có vấn đề** — crash ngay.
- **Hướng fix:** Đặt thứ tự hook: `selectedZoneSet` → `totalBoxesByProduct` → `productIdsWithIssueLot` → rồi mới `filteredProducts`; hoặc gỡ toggle / filter (đã làm trong code sau đó).
- **Trạng thái:** Resolved

---

### [KI-009] ZoneDetailSheet không cập nhật sau khi edit từ ProductDetailScreen

- **Mức độ:** Medium
- **File liên quan:** `components/ZoneDetailSheet.tsx`, `screens/ProductDetailScreen.tsx`
- **Mô tả:** Sau khi sửa thông tin lô (số thùng, hạn...) từ `ProductDetailScreen`, mở lại `ZoneDetailSheet` thì dữ liệu vẫn hiện cũ — phải tắt mở lại app hoặc chuyển màn hình mới thấy cập nhật.
- **Hướng fix:** `ZoneDetailSheet` cần refetch hoặc lắng nghe store update khi được mở lại.
- **Trạng thái:** Closed
- **Ghi chú:** Không còn liên quan — nút `i` điều hướng sang `ProductDetailScreen` đã bị xóa khỏi `ZoneDetailSheet`. Stale data không ảnh hưởng UX nữa.

---

### [KI-010] BarcodeScanner: sau quét không đóng modal / không chạy navigate

- **Mức độ:** High
- **File liên quan:** `screens/BarcodeScannerScreen.tsx`
- **Mô tả:** Sau khi quét mã, màn scanner đôi khi không tự đóng và luồng `navigate('Tabs', …)` (locate / search / thêm hàng) không hoàn tất đúng — thường do `goBack()` gọi quá sớm trong cùng tick với nested navigation (root stack: Tabs + BarcodeScanner modal).
- **Hướng fix:** Hoãn `goBack()` sau `navigate('Tabs', …)`; reset lock khi màn focus; tránh `useCallback` phụ thuộc state lock gây stale handler.
- **Trạng thái:** Resolved
- **Đã fix:** `navigateTabsThenCloseModal` + `scheduleDismissModal` (delay ~160ms); `useFocusEffect` reset `processingRef` / UI lock; xử lý thất bại locate / search reset ref để quét lại.

---

### [KI-011] BarcodeScanner (search): không có nút Huỷ / từ chối thêm thủ công — kẹt quét hoặc nhầm tab

- **Mức độ:** Medium
- **File liên quan:** `screens/BarcodeScannerScreen.tsx`, `screens/ProductsScreen.tsx`
- **Mô tả:** Khi quét không ra lô, dialog chỉ có **Thêm thủ công** / **Quét lại**: không có lựa chọn rõ ràng để đóng scanner và về màn đã mở camera; **Thêm thủ công** luôn `navigate` tới tab `Products` → `AddInventory` dù có truyền `returnTab` sau này. Trên Android, bỏ qua dialog (tap ngoài nếu `cancelable`) có thể để `isScanLocked` vẫn true → cảm giác "kẹt".
- **Đã fix:** Thêm nút **Huỷ** (`goBack` + mở khóa); **Thêm thủ công** dùng `returnTab || 'Products'`; `Alert` `cancelable: true`; `ProductsScreen` truyền `returnTab: 'Products'` khi mở scanner.
- **Rà soát màn dùng scanner:** `MapScreen` (mode `locate`, dialog khác — không nhánh AddInventory). `ZoneDetailSheet` / `ProductDetailScreen` / `AddInventoryScreen` chỉ dùng `onScanFillBarcode` (không qua dialog "thêm thủ công"). Chỉ luồng quét tìm lô mặc định trên tab Sản phẩm gặp dialog này.
- **Trạng thái:** Resolved

---

### [KI-012] SEC-08 — Realtime subscription chạy dưới role anon (chưa xác thực)

- **Mức độ:** High (security)
- **File liên quan:** `screens/SettingsScreen.tsx` (dòng 57–79), `screens/DiscontinuedProductsScreen.tsx` (dòng 56–78)
- **Mô tả:** Hai subscription `postgres_changes` lắng nghe bảng `products` và `inventory_entries` đang chạy dưới role `anon`, không có `private: true`. Bất kỳ ai có `anon_key` đều có thể mở websocket và nhận Realtime updates từ hai màn hình này.
- **Tại sao chưa fix:** Fix yêu cầu `private: true` trên channel config + RLS policy cho role `authenticated` trên `realtime.messages`. Phase 1 không có auth — toàn bộ user đang dùng role `anon`, không có JWT token. Áp dụng fix ngay sẽ ngắt Realtime hoàn toàn trên 2 màn hình này.
- **Lưu ý thêm:** Các màn hình khác trong app cũng có Realtime subscription tương tự (F17) — cần audit và fix đồng loạt khi auth được implement, không fix rời từng màn.
- **Hướng fix (khi có auth — Phase 3):** Thêm `config: { private: true }` vào tất cả `.channel()` calls; tạo RLS policy `authenticated_users_can_receive` và `authenticated_users_can_broadcast` trên `realtime.messages`.
- **Trạng thái:** Resolved
- **Đã fix:** Thêm `config: { private: true }` vào channel `SettingsScreen` (dòng 59) và `DiscontinuedProductsScreen` (dòng 58); migration `20260513_realtime_rls_sec08.sql` tạo RLS policy `authenticated_users_can_receive` + `authenticated_users_can_broadcast` trên `realtime.messages`.

---

### [KI-013] SEC-01 — Credentials hardcode trong backup.mjs

- **Mức độ:** Critical (security)
- **File liên quan:** `backup.mjs`
- **Mô tả:** `backup.mjs` chứa Supabase URL thật và publishable key đã commit vào Git.
- **Trạng thái:** Resolved
- **Đã fix:** Rotate Supabase anon key trên Dashboard; sửa `backup.mjs` thay bằng `process.env`; xóa khỏi Git history bằng `git filter-repo`.

---

### [KI-014] SEC-02 — RLS policy allow_all anon

- **Mức độ:** Critical (security)
- **File liên quan:** `supabase/migrations/schema.sql`
- **Mô tả:** 8 bảng có policy `USING (true) WITH CHECK (true)` cho role `anon` — bất kỳ ai có anon key đều đọc/ghi/xóa tự do.
- **Trạng thái:** Resolved
- **Đã fix:** Xóa toàn bộ policy `allow_all`; tạo policy `authenticated_only` `FOR ALL TO authenticated USING (auth.uid() IS NOT NULL)` — thực hiện đồng thời với triển khai Auth (A3–A7).

---

### [KI-015] SEC-03 — EXPO_PUBLIC_* bundle vào APK

- **Mức độ:** Critical (architectural)
- **File liên quan:** `.env`, JS bundle
- **Mô tả:** Anon key nhúng trong JS bundle. Đây là architectural reality của mọi app Supabase client-direct.
- **Trạng thái:** Mitigated
- **Ghi chú:** Vô hại vì SEC-02 đã xử lý — anon key không dùng được gì khi RLS yêu cầu JWT authenticated. Không cần fix thêm.

---

### [KI-016] SEC-04 — Không có Authentication

- **Mức độ:** High (security)
- **File liên quan:** `App.tsx`, `screens/LoginScreen.tsx`, `lib/supabase.ts`
- **Mô tả:** App không có màn hình login, mọi user full quyền.
- **Trạng thái:** Resolved
- **Đã fix:** A3–A7 đã implement hoàn chỉnh — `LoginScreen`, `lib/supabase.ts` (`persistSession: false`, không dùng SecureStore cho auth), auth gate `App.tsx`, signOut Settings.

---

### [KI-017] SEC-05 — Input validation thiếu

- **Mức độ:** High
- **File liên quan:** Nhiều screens (`AddInventoryScreen`, `ProductDetailScreen`, `OrderDetailScreen`, ...)
- **Mô tả:** `notes`, `barcode`, `product_name` không có giới hạn độ dài. Cần `maxLength` trên UI và kiểm tra type trước khi gửi DB.
- **Trạng thái:** Resolved
- **Hướng fix:** Thêm `maxLength` vào `TextInput` liên quan (`product_name` <= 200, tên khác <= 100, `barcode` <= 50, `notes` <= 500); validate trước khi gọi Supabase (SEC-05).

---

### [KI-018] SEC-06 — Error message lộ thông tin schema

- **Mức độ:** High
- **File liên quan:** `stores/warehouseStore.ts`, các screens hiển thị `error?.message`
- **Mô tả:** `error?.message` từ Supabase truyền thẳng ra UI, có thể chứa tên bảng, constraint, foreign key.
- **Trạng thái:** Resolved
- **Hướng fix:** Wrap error Supabase bằng generic message qua `getErrorMessage`; log chi tiết `console.error` trong store (SEC-06).

---

### [KI-019] SEC-07 — Không có rate limiting client

- **Mức độ:** High
- **File liên quan:** `screens/BarcodeScannerScreen.tsx`
- **Mô tả:** Barcode scanner không có debounce đủ mạnh, có thể tạo hàng trăm request/giây.
- **Trạng thái:** Resolved
- **Đã fix:** debounce 600ms + success overlay 800ms trong `BarcodeScannerScreen`.

---

### [KI-020] SEC-09 — Không có Authorization / RBAC

- **Mức độ:** Medium
- **File liên quan:** RLS policies, `App.tsx`, `stores/authStore.ts`, `screens/UserManagementScreen.tsx`
- **Mô tả:** Không phân biệt quyền manager vs nhân viên — mọi user authenticated đều có full CRUD.
- **Trạng thái:** Resolved
- **Đã fix (Phase 3 / F24):** bảng `user_profiles` (role + is_disabled); guard client guest read-only; RLS staff+ mutate (KI-055); UserManagementScreen; kick disable realtime.

---

### [KI-021] SEC-10 — Backup script (`backup.ts`)

- **Mức độ:** Medium
- **File liên quan:** `backup.ts`, `dump_schema.bat`
- **Mô tả:** Script backup JSON local cho bảng public qua Supabase Data API.
- **Trạng thái:** **Mitigated** — backup.ts bảng đầy đủ (12 bảng); auth anon+login giữ nguyên.
- **Quyết định auth (đã chốt):** Giữ **anon key + `signInWithPassword`** — xem **DECISIONS § SEC-10** (thay thế hướng fix cũ “dùng service_role”).
- **Đã fix:**
  - Phân trang `.range(from, from+999)` + `order('id')`, page 1000 — tránh giới hạn ~1000 row/request (audit_logs, inventory_entries…).
  - Tên file `backup_YYYYMMDD_HHmmss.json` — không ghi đè khi chạy nhiều lần/ngày.
  - Comment: bổ sung bảng mới vào mảng `tables`; phạm vi không gồm Storage F08.
  - Phase 4 H1: thêm `product_barcodes`, `internal_notes`, `user_profiles` (12 bảng).
- **Caveat:** Khi **RBAC (SEC-09)** — user không full SELECT có thể backup thiếu; cần tài khoản admin hoặc cân nhắc lại service_role server-side.
- **Ghi chú (dump schema):** `dump_schema.bat` — snapshot DDL qua Session Pooler; tách khỏi backup dữ liệu.

---

### [KI-022] SEC-11 — Audit Log

- **Mức độ:** Medium
- **File liên quan:** `supabase/migrations/20260513_add_audit_logs.sql`, `supabase/migrations/20260513_enrich_audit_trigger.sql`, `screens/AuditLogScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/SettingsScreen.tsx`, `stores/warehouseStore.ts`, `types/index.ts`, `App.tsx`
- **Mô tả:** Migration `20260513_add_audit_logs.sql`: bảng `audit_logs` (gồm `location_id` FK → locations) + trigger `audit_trigger_fn` (SECURITY DEFINER, lookup `location_id` từ zones cho inventory_entries) trên `inventory_entries` và `products` + RLS authenticated SELECT only + 4 index. Store: `fetchAuditLogs` (filter kho + loại + người + sản phẩm, cursor-based pagination), `fetchLatestAuditEntry`, `fetchAuditLogsForProduct`. UI: `AuditLogScreen` (4 filter: kho/loại/người/sản phẩm — disable kho khi loại = Sản phẩm; pagination 10/trang, cache in-memory), section Lịch sử thay đổi trong `ProductDetailScreen` (10 entries + nút Xem tất cả), card Lịch sử thay đổi trong `SettingsScreen` (subtitle = entry mới nhất).
- **Trạng thái:** Resolved
- **Giải pháp:** Đã implement đầy đủ — xem `DECISIONS.md` (SEC-11).
- **Đã fix:** Trigger v2 (`20260513_enrich_audit_trigger.sql`) nhúng `_product_name`, `_zone_name`, `_location_name` vào JSONB; display logic `formatAuditEntry()` render human-readable. Các field phụ (expiry_date, barcode, notes, is_price_reduced, category) → generic "Sửa lô" / "Sửa sản phẩm" — sẽ chi tiết hóa sau.

---

### [KI-023] SEC-12 — console.log trong production

- **Mức độ:** Low
- **File liên quan:** `stores/warehouseStore.ts`, nhiều screens
- **Mô tả:** 8+ `console.log`/`console.error` trong store và screens — leak thông tin khi build production.
- **Trạng thái:** **Resolved** — mọi `console.*` có `__DEV__` guard (trừ backup CLI + ErrorBoundary).
- **Đã fix (Phase 4 H2):** wrap ~55 chỗ trong stores/screens/utils; giữ `backup.ts` CLI + `StartupErrorBoundary` log production.

---

### [KI-024] SEC-13 — Dependency audit

- **Mức độ:** Low
- **File liên quan:** `package.json`
- **Mô tả:** Cần chạy `npm audit` định kỳ; `@supabase/supabase-js` là bề mặt tấn công chính.
- **Trạng thái:** **Mitigated** — `npm audit fix` done; transitive vulns (expo/ws) chờ major upgrade.
- **Đã fix (Phase 4 H3):** `npm audit fix` (không `--force`); còn 13 moderate (postcss/uuid qua expo) — cần `expo@57` breaking change.

---

### [KI-025] SEC-14 — .env coverage trong .gitignore

- **Mức độ:** Low
- **File liên quan:** `.gitignore`
- **Mô tả:** Các file `.env.production`, `.env.staging` tạo sau này phải được ignore.
- **Trạng thái:** **Resolved** — `.gitignore` cover `.env.*`.
- **Đã fix (Phase 4 H4):** pattern `.env` / `.env.*` / `.env*.local`.

---

### [KI-026] SEC-11 — Realtime chưa implement cho AuditLogScreen

- **Mức độ:** Low
- **Mô tả:** `AuditLogScreen` không subscribe Realtime — user phải ra vào lại màn để thấy thay đổi mới nhất. Realtime phức tạp khi kết hợp pagination: insert mới vào page 0 trong khi user đang xem page 2 cần xử lý logic "có N thay đổi mới" riêng.
- **Trạng thái:** Deferred
- **Hướng fix (khi làm):** Subscribe `audit_logs` INSERT; nếu user đang ở page 0 thì prepend vào cache; nếu ở page khác thì hiện banner "Có X thay đổi mới — về trang đầu".

---

### [KI-028] Auto-logout: inactivity 20 phút + kill app → phải login lại

- **Mức độ:** Enhancement
- **File liên quan:** `lib/supabase.ts`, `App.tsx`, `screens/LoginScreen.tsx`
- **Mô tả:** Session auth lưu memory-only (kill app = mất session); inactivity timer 20 phút dùng timestamp + setInterval 30s khi foreground + AppState check khi active. Toast chỉ hiện khi auto-logout do inactivity.
- **Trạng thái:** Resolved
- **Đã fix:** Memory-only storage trong `supabase.ts`; `AppState` listener + `setInterval` + `isAutoLogoutRef` trong `App.tsx`; `useEffect(session)` reset timer khi login/logout.

---

### [KI-027] AuditLogScreen — dropdown UX fixes

- **Mức độ:** Medium
- **File liên quan:** `screens/AuditLogScreen.tsx`
- **Mô tả:** 3 vấn đề UX: (1) dropdown inline trong ScrollView không scroll bằng tay được do conflict touch event, (2) dropdown Người trống khi chưa có audit log — thiếu placeholder rõ ràng, (3) dropdown không searchable và không có camera scan cho filter Sản phẩm.
- **Trạng thái:** Resolved
- **Giải pháp:** (1) Đổi tất cả 4 dropdown sang Modal-based (`SearchableDropdownModal`) với FlatList bên trong — không conflict touch event. (2) Placeholder "Tất cả (chưa có lịch sử)" khi chưa có user names. (3) TextInput tìm kiếm (auto-focus) trong mỗi Modal dropdown + icon 📷 trên filter Sản phẩm → navigate `BarcodeScanner`, lookup `searchByBarcode` → set `filterProductId`.

---

### [KI-036] AddInventoryScreen — không pre-fill tên SP từ ô tìm kiếm

- **Mức độ:** Medium
- **File liên quan:** `screens/AddInventoryScreen.tsx`
- **Mô tả:** Bấm **Tạo sản phẩm mới** sau khi gõ tên tìm kiếm không thấy kết quả → field tên SP mới trống, phải gõ lại.
- **Trạng thái:** Resolved
- **Đã fix:** `openCreateProductForm()` gán `searchQuery.trim()` vào `newProductName` khi mở form tạo SP.

---

### [KI-037] Bàn phím che TextInput cuối màn hình

- **Mức độ:** Medium
- **File liên quan:** `screens/AddInventoryScreen.tsx`, `screens/OrderDetailScreen.tsx`
- **Mô tả:** Tap ô nhập ở cuối màn (ghi chú lô, ghi chú đặt hàng) → bàn phím che mất field.
- **Trạng thái:** Resolved
- **Đã fix:** `KeyboardAvoidingView` (`padding` iOS / `height` Android) + `keyboardShouldPersistTaps="handled"`; `scrollToEnd` / scroll khi focus field cuối.

---

### [KI-038] ProductDetailScreen — thiếu xóa sản phẩm

- **Mức độ:** Medium
- **File liên quan:** `screens/ProductDetailScreen.tsx`, `stores/warehouseStore.ts`
- **Mô tả:** Không có nút xóa SP; store thiếu `deleteProduct`.
- **Trạng thái:** Resolved
- **Đã fix:** `deleteProduct(productId)` — block nếu còn `inventory_entries` liên kết; nút **Xóa sản phẩm** + confirm dialog trên `ProductDetailScreen`.

---

### [KI-039] Performance / caching — fetch thừa khi re-focus màn hình

- **Mức độ:** Medium
- **File liên quan:** Nhiều screens (`useFocusEffect`, `useEffect` mount)
- **Mô tả:** Một số màn hình fetch lại dữ liệu không cần thiết khi re-focus, gây load chậm.
- **Hướng fix (Phase 4):** Xác định các `useFocusEffect` đang fetch thừa; thêm TTL cache hoặc điều kiện skip fetch khi data còn mới.
- **Trạng thái:** Resolved
- **Đã fix:** TTL 30s trên 8 màn (InternalNotes, StockCheck, LocationManagement, Discontinued, ProductDetail [reset khi đổi productId], ZoneLayoutEditor, OrderList, UserManagement). Settings/Dashboard đã có TTL từ trước.

---

### [KI-040] Performance — ProductsScreen fetch toàn bộ sản phẩm 1 lần

- **Mức độ:** Medium
- **File liên quan:** `stores/warehouseStore.ts` (`fetchProducts`), `screens/ProductsScreen.tsx` (`filteredProducts`, pagination client)
- **Mô tả:** Hiện tại `fetchProducts()` không có limit, load toàn bộ `products` về store. Với quy mô vài trăm SP thì ổn. Nếu lên vài nghìn SP: load chậm lúc đầu; tốn RAM; `useMemo` filter lag khi gõ search.
- **Hướng fix (Phase 4):** Cursor-based pagination từ DB giống `AuditLogScreen`, kết hợp server-side filter theo search/kho/zone. Cần refactor `fetchProducts` + `filteredProducts` useMemo + pagination bar.
- **Trạng thái:** Mitigated (hybrid)
- **Đã fix:** `fetchProductsPage` — search `.ilike` server-side + debounce 300ms + max 200; barcode digits → `product_barcodes`; zone/stock/special vẫn filter local; UI page ←→ giữ. `fetchProducts` full vẫn dùng cho Notifications/Dashboard/Notes. **(KI-066)** List Mode/Kho không còn giao `productsPage` trước — list theo SP có lô trong scope inventory. Tăng limit 200 → 1000 (tháng 7/2026).

---

### [KI-041] Bàn phím che bottom sheet thêm/sửa kho trên APK (LocationManagementScreen)

- **Mức độ:** Medium
- **File liên quan:** `app.json`, `screens/LocationManagementScreen.tsx`
- **Mô tả:** Modal tạo/sửa kho (RN `Modal` + bottom sheet) — bàn phím che field nhập trên APK standalone. `edgeToEdgeEnabled: true` → Android không tự resize window khi bàn phím mở. `ScrollView` + `scrollToEnd` onFocus **không đủ** một mình trong Modal context.
- **Root cause:** `edgeToEdgeEnabled` + giới hạn resize window trong RN Modal trên APK.
- **Hướng fix:** `softwareKeyboardLayoutMode: pan` + `KeyboardAvoidingView` trong modal.
- **Trạng thái:** Resolved
- **Đã fix:** `app.json` — `"softwareKeyboardLayoutMode": "pan"`; `LocationManagementScreen` — `KeyboardAvoidingView` (`padding` iOS / `height` Android) trong `modalBox`, giữ `ScrollView` + `scrollToEnd` onFocus.

---

### [KI-042] SafeAreaView không đồng nhất toàn app

- **Mức độ:** Medium
- **File liên quan:** `App.tsx`, `screens/ProductsScreen.tsx`, `screens/NotificationsScreen.tsx`, `screens/OrderListScreen.tsx`, `screens/OrderDetailScreen.tsx`, các màn đang dùng `SafeAreaView`, `components/ZoneDetailSheet.tsx`
- **Mô tả:** `App.tsx` không có `SafeAreaProvider`. Bốn màn thiếu safe area: `ProductsScreen`, `NotificationsScreen`, `OrderListScreen`, `OrderDetailScreen`. Các màn khác import `SafeAreaView` từ `react-native` thay vì `react-native-safe-area-context`.
- **Hướng fix:** `SafeAreaProvider` + chuẩn hóa import + 4 màn thiếu + `useSafeAreaInsets` trên sheet.
- **Trạng thái:** Resolved
- **Đã fix:** `SafeAreaProvider` bọc Login + `NavigationContainer`; toàn bộ `screens/*` dùng `SafeAreaView` từ `react-native-safe-area-context`; 4 màn thiếu đã thêm; `OrderDetailScreen`: `SafeAreaView` trong `KeyboardAvoidingView`; `ZoneDetailSheet`: `paddingBottom: Math.max(insets.bottom, 12)`.

---

### [KI-043] ZoneDetailSheet — modal chuyển lô không scroll + thiếu margin nút

- **Mức độ:** Low
- **File liên quan:** `components/ZoneDetailSheet.tsx`
- **Mô tả:** Modal **Chuyển lô hàng** không có `ScrollView` → không scroll vùng chọn zone/tầng đích khi bàn phím hoặc danh sách dài. Nút Hủy/Xác nhận (`editActions`) sát field phía trên, thiếu `marginTop`.
- **Hướng fix:** Bọc nội dung modal trong `ScrollView`; thêm `marginTop` cho `editActions`.
- **Trạng thái:** Resolved
- **Đã fix:** Nội dung chọn zone/tầng trong `ScrollView` (`maxHeight` 360); `editActions` fixed dưới modal với `marginTop: 16`.

---

### [KI-044] Format nhập hạn chưa DD/MM/YYYY ở ZoneDetailSheet

- **Mức độ:** Medium
- **File liên quan:** `components/ZoneDetailSheet.tsx`
- **Mô tả:** Ô nhập hạn sử dụng trong ZoneDetailSheet chưa dùng format DD/MM/YYYY text input. User bị nhầm format.
- **Hướng fix:** Đổi sang TextInput với placeholder DD/MM/YYYY, validate format, auto-fill ngày 1 nếu chỉ nhập MM/YYYY.
- **Trạng thái:** Resolved
- **Đã fix:** Inline edit lô: `isoExpiryToDisplay` / `parseDisplayDateToIso` / `isValidDisplayDate`; label DD/MM/YYYY; MM/YYYY → lưu ngày 01; xóa `isValidIsoDate` (YYYY-MM-DD).

---

### [KI-045] ProductsScreen: barcode scan X clear không restore + thiếu barcode text search

- **Mức độ:** High
- **File liên quan:** `screens/ProductsScreen.tsx`, `stores/warehouseStore.ts`
- **Mô tả:** (1) Sau khi quét barcode lọc ra SP, bấm X → list không restore về đầy đủ. (2) Khi xóa từng ký tự, list không mở dần ra. (3) Ô search chưa hỗ trợ gõ mã vạch để tìm SP (chỉ tìm theo tên).
- **Hướng fix:** Fix clear state khi X; incremental restore khi xóa ký tự; thêm barcode text search (so với `inventory_entries.barcode`).
- **Trạng thái:** Resolved
- **Đã fix:** `clearSearch` thêm `setSelectedZoneId(null)`; `filteredProducts` match tên hoặc `inventoryEntries.barcode` (store đã load qua `fetchAllInventoryEntries` / `fetchInventoryByZone`).

---

### [KI-046] Zone overlap race condition khi tạo zone

- **Mức độ:** High
- **File liên quan:** `screens/MapScreen.tsx`, `stores/warehouseStore.ts`
- **Mô tả:** Khi tạo zone bị lag hoặc double-tap → zone bị đặt chồng lên zone đã có, phải xóa thủ công và đặt lại.
- **Hướng fix:** Debounce/lock nút tạo zone; validate server-side không có zone cells trùng tọa độ trước khi INSERT.
- **Trạng thái:** Resolved
- **Đã fix:** `MapScreen` — `isSavingZone` chống double-tap nút Lưu; `hasSelectedCellsOverlap()` kiểm tra client-side trước mở modal và trước `addZone`/`updateZone`.

---

### [KI-047] MapScreen text search không hỗ trợ barcode

- **Mức độ:** Medium
- **File liên quan:** `screens/MapScreen.tsx`, `stores/warehouseStore.ts`
- **Mô tả:** Thanh search trên MapScreen chỉ tìm theo tên SP (`normalizeText`). Gõ mã vạch không trả về kết quả.
- **Hướng fix:** Trong `searchProducts`, nếu query khớp `inventory_entries.barcode` thì cũng trả về SP/lô tương ứng.
- **Trạng thái:** Resolved
- **Đã fix:** `handleSearch` merge `searchProducts` + `searchInventoryByBarcode` (dedupe theo entry id); `searchInventoryByBarcode` dùng `ilike` partial match.

---

### [KI-048] Thiếu conflict detection khi nhiều user cùng sửa

- **Mức độ:** Medium
- **File liên quan:** `stores/warehouseStore.ts`, `screens/ProductDetailScreen.tsx`, `components/ZoneDetailSheet.tsx`
- **Mô tả:** Không có cơ chế phát hiện khi 2 user cùng sửa 1 record (`inventory_entries`, `zones`, `products`). User sau ghi đè mà không biết.
- **Hướng fix:** Optimistic locking với `updated_at` — so sánh khi Save, Alert nếu có người sửa trước.
- **Trạng thái:** Resolved
- **Đã fix:** Thêm `products.updated_at` + trigger auto-update; tạo helper `utils/conflictUtils.ts` để so sánh snapshot `updated_at` khi Save và Alert “Có xung đột” trước khi ghi đè. Áp dụng cho:
  - `components/ZoneDetailSheet.tsx` (lưu lô `inventory_entries`)
  - `screens/ProductDetailScreen.tsx` (lưu lô + warning_days/threshold/category trên `products`)

---

### [KI-049] schema.sql lệch DB production (pg_dump audit 2026-05-30)

- **Mức độ:** Medium
- **File liên quan:** `supabase/migrations/schema.sql`, `supabase/db_dump_schema/schema_dump_20260530_185715.sql`, migrations KI-049
- **Mô tả:** Drift giữa DB và `schema.sql` (audit function, index, nullable, is_deferred).
- **Trạng thái:** **Resolved** (verify dump `20260530_185715` — public schema khớp logic)
- **Đã xử lý:**
  - Repo: `schema.sql` v3.8 correction + migrations index / is_archived / is_deferred.
  - Supabase: apply migration → dump mới xác nhận 4 điểm drift đã khớp.
- **Verify:** `schema_dump_20260530_185715.sql` vs `schema.sql` — không còn lệch nhóm 1/2/3 trong `public`.

---

### [KI-050] toggleDeferred — dead path (is_deferred)

- **Mức độ:** Low
- **File liên quan:** `stores/warehouseStore.ts`, `types/index.ts`, `20260511_add_product_is_deferred.sql`
- **Mô tả:** `toggleDeferred` vẫn ghi `products.is_deferred` qua Supabase nhưng UI không gọi (tab Để sau đã bỏ) — dead path; dọn khi nào quyết retire feature.
- **Trạng thái:** Resolved
- **Đã fix:** Xóa `toggleDeferred` store + field `is_deferred` khỏi type Product. Cột DB `products.is_deferred` **giữ** backward compat (orphan; có thể DROP migration sau). `schema.sql` ghi chú DEPRECATED.

---

### [KI-051] F08 — image_url không cache-bust sau upload ghi đè

- **Mức độ:** Medium
- **File liên quan:** `utils/imageUtils.ts`, `stores/warehouseStore.ts`, `screens/ProductsScreen.tsx`, `screens/ProductDetailScreen.tsx`
- **Mô tả:** Path Storage cố định `{productId}.jpg`; `getPublicUrl` lưu DB không có query version → sau đổi ảnh CDN + cache RN `Image` có thể vẫn hiện ảnh cũ.
- **Trạng thái:** **Resolved**
- **Đã fix:** `uploadProductImage` return `${publicUrl}?v=${Date.now()}`; `updateProductImage` lưu URL đã kèm `?v` vào DB. URL cũ không có `?v` giữ nguyên — lần upload sau tự có.

---

### [KI-052] F08 — xóa ảnh: Storage trước DB (URL hỏng nếu DB fail)

- **Mức độ:** Low
- **File liên quan:** `screens/ProductDetailScreen.tsx`, `stores/warehouseStore.ts`, `utils/imageUtils.ts`
- **Mô tả:** `handleDeleteImage` gọi `deleteProductImage` rồi `removeProductImage` — Storage xóa OK nhưng DB update lỗi → `image_url` trỏ file không còn.
- **Trạng thái:** **Resolved**
- **Đã fix:** `handleDeleteImage` gọi `removeProductImage` trước, `deleteProductImage` sau. `deleteProduct` giữ nguyên (xóa row SP).

---

### [KI-053] MapScreen — Realtime crash: cannot add postgres_changes callbacks after subscribe()

- **Mức độ:** High
- **File liên quan:** `screens/MapScreen.tsx`
- **Mô tả:** Effect Realtime deps gồm `fetchZones`/`fetchInventoryByLocation`; `useWarehouseStore()` không selector → mọi thay đổi store (kể cả `isLoading`) re-render → channel tear down/rebuild liên tục khi app lag; `removeChannel` async → Supabase throw khi ghi đè channel chưa đóng xong.
- **Trạng thái:** **Resolved**
- **Đã fix:** `fetchZonesRef` / `fetchInventoryByLocationRef` + effect sync ref mỗi render; Realtime `scheduleRefresh` gọi qua ref; dependency array chỉ `[selectedLocationId]`.

---
