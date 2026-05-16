# KNOWN_ISSUES — Lỗi / sai lệch đã biết

---

### [KI-029] Android crash on launch (màn đen, "has stopped working")

- **Mức độ:** Critical (runtime)
- **File liên quan:** `lib/supabase.ts`, `App.tsx`, `index.ts`, `app.json`, `eas.json` / EAS env (D5)
- **Mô tả:** APK standalone (EAS preview/production) thoát ngay khi mở nếu build **không embed** `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — `createClient(undefined, …)` ném lỗi lúc import module. Thêm: `getSession()` / `onAuthStateChange` không có try/catch; `newArchEnabled: false` lệch với Expo Go (New Arch bật) có thể gây hành vi lạ trên bản native.
- **Cách tái hiện:** `eas build --profile preview` khi chưa `eas env:create` hai biến EXPO_PUBLIC_* → cài APK → mở app → crash hoặc màn đen.
- **Hướng fix:** Validate env trong `lib/supabase.ts` + màn `ConfigErrorScreen` thay vì crash; bọc auth bootstrap try/catch; `StartupErrorBoundary` ở `index.ts`; bỏ `newArchEnabled: false`; set EAS env (GOLIVE D5) và build lại.
- **Trạng thái:** Resolved
- **Đã fix:** `readSupabaseEnv()` + `isSupabaseConfigured`; placeholder client khi thiếu env; `App.tsx` auth gate an toàn; `components/ConfigErrorScreen.tsx`, `components/StartupErrorBoundary.tsx`; dedupe quyền Android trong `app.json`; `.env.example` cho dev local.

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

---

### [KI-003] Tab bar colors hardcode, không theo themeStore

- **Mức độ:** Medium
- **File liên quan:** `App.tsx`
- **Mô tả:** Tab bar `backgroundColor: '#1a1a1a'`, active `#22C55E`, inactive `#666` — hardcode, không dùng `colors` từ `themeStore`. Light mode sẽ lệch.
- **Cách tái hiện:** Bật theme sáng trong Cài đặt — thanh tab vẫn tối / không đồng bộ palette.
- **Hướng fix:** bọc navigator bằng provider theme hoặc đọc `useThemeStore` trong container tab và map màu động.
- **Trạng thái:** Closed
- **Ghi chú:** Không cần thiết — app chỉ dùng **dark mode**; **light mode** không nằm trong scope Phase 1.

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
- **Trạng thái:** Open
- **Hướng fix:** Thêm `maxLength` vào `TextInput` liên quan (`product_name` <= 100, `barcode` <= 50, `notes` <= 500); validate trước khi gọi Supabase.

---

### [KI-018] SEC-06 — Error message lộ thông tin schema

- **Mức độ:** High
- **File liên quan:** `stores/warehouseStore.ts`, các screens hiển thị `error?.message`
- **Mô tả:** `error?.message` từ Supabase truyền thẳng ra UI, có thể chứa tên bảng, constraint, foreign key.
- **Trạng thái:** Open
- **Hướng fix:** Wrap error Supabase bằng generic message "Có lỗi xảy ra, vui lòng thử lại"; log chi tiết chỉ với `__DEV__`.

---

### [KI-019] SEC-07 — Không có rate limiting client

- **Mức độ:** High
- **File liên quan:** `screens/BarcodeScannerScreen.tsx`
- **Mô tả:** Barcode scanner không có debounce đủ mạnh, có thể tạo hàng trăm request/giây.
- **Trạng thái:** Open
- **Hướng fix:** Thêm debounce tối thiểu 500ms trên kết quả quét barcode trước khi gọi DB.

---

### [KI-020] SEC-09 — Không có Authorization / RBAC

- **Mức độ:** Medium
- **File liên quan:** RLS policies, `App.tsx`
- **Mô tả:** Không phân biệt quyền manager vs nhân viên — mọi user authenticated đều có full CRUD.
- **Trạng thái:** Deferred — Phase 3 (F24)
- **Ghi chú:** Sẽ thiết kế khi super app integration có yêu cầu cụ thể.

---

### [KI-021] SEC-10 — Backup script cần bảo mật

- **Mức độ:** Medium
- **File liên quan:** `backup.mjs` (hoặc `backup.ts`)
- **Mô tả:** `backup.mjs` sau khi fix SEC-01 cần dùng `service_role` key (không phải anon key) và chỉ chạy server-side — không bao giờ bundle vào app.
- **Trạng thái:** Open
- **Hướng fix:** Dùng `process.env.SUPABASE_SERVICE_KEY` trong backup script; thêm vào `.gitignore` nếu cần.

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
- **Trạng thái:** Open
- **Hướng fix:** Wrap bằng `__DEV__` guard hoặc tắt hoàn toàn ở production build.

---

### [KI-024] SEC-13 — Dependency audit

- **Mức độ:** Low
- **File liên quan:** `package.json`
- **Mô tả:** Cần chạy `npm audit` định kỳ; `@supabase/supabase-js` là bề mặt tấn công chính.
- **Trạng thái:** Open
- **Hướng fix:** Chạy `npm audit` trước mỗi release; update `@supabase/supabase-js` khi có patch security.

---

### [KI-025] SEC-14 — .env coverage trong .gitignore

- **Mức độ:** Low
- **File liên quan:** `.gitignore`
- **Mô tả:** Các file `.env.production`, `.env.staging` tạo sau này phải được ignore.
- **Trạng thái:** Open
- **Hướng fix:** Kiểm tra `.gitignore` có pattern `*.env*` hoặc liệt kê từng file.

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
