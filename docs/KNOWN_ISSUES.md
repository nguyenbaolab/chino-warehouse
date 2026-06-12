# KNOWN_ISSUES — Lỗi / sai lệch đã biết

---

### [KI-055] F24 Task 2 — Guest RBAC chỉ guard client; RLS server chưa enforce

- **Mức độ:** High (security — bypass nếu hack client)
- **File liên quan:** `stores/authStore.ts`, toàn bộ màn đã guard Task 2; RLS các bảng kho (`zones`, `products`, `inventory_entries`, …)
- **Mô tả:** Task 2 ẩn/vô hiệu CRUD UI cho role `guest` ở client. Các bảng nghiệp vụ kho vẫn dùng policy `allow_all` cho `authenticated` → guest có thể gọi API trực tiếp nếu biết endpoint/key.
- **Hướng fix:** Cuối Phase 3 (trước closeout): RLS role-based cho INSERT/UPDATE/DELETE trên bảng kho; guest chỉ SELECT; staff+ full CRUD; admin policies `user_profiles` đã có.
- **Trạng thái:** Open

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
- **Hướng fix:** Chuyển repo ra ổ local (vd. `E:\personal projects\`), tắt backup OneDrive cho thư mục đó.
- **Trạng thái:** Resolved
- **Đã fix:** Đã chuyển project sang ổ `E:\personal projects\chino-warehouse` (ngoài OneDrive sync).

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
- **Trạng thái:** Resolved
- **Đã fix:** debounce 600ms + success overlay 800ms trong `BarcodeScannerScreen`.

---

### [KI-020] SEC-09 — Không có Authorization / RBAC

- **Mức độ:** Medium
- **File liên quan:** RLS policies, `App.tsx`
- **Mô tả:** Không phân biệt quyền manager vs nhân viên — mọi user authenticated đều có full CRUD.
- **Trạng thái:** Deferred — Phase 3 (F24)
- **Ghi chú:** Sẽ thiết kế khi super app integration có yêu cầu cụ thể.

---

### [KI-021] SEC-10 — Backup script (`backup.ts`)

- **Mức độ:** Medium
- **File liên quan:** `backup.ts`, `dump_schema.bat`
- **Mô tả:** Script backup JSON local cho bảng public qua Supabase Data API.
- **Trạng thái:** **Mitigated** — auth và phân trang đã fix; caveat RBAC khi SEC-09.
- **Quyết định auth (đã chốt):** Giữ **anon key + `signInWithPassword`** — xem **DECISIONS § SEC-10** (thay thế hướng fix cũ “dùng service_role”).
- **Đã fix:**
  - Phân trang `.range(from, from+999)` + `order('id')`, page 1000 — tránh giới hạn ~1000 row/request (audit_logs, inventory_entries…).
  - Tên file `backup_YYYYMMDD_HHmmss.json` — không ghi đè khi chạy nhiều lần/ngày.
  - Comment: bổ sung bảng mới vào mảng `tables`; phạm vi không gồm Storage F08.
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
- **Hướng fix (Phase 3):** Xác định các `useFocusEffect` đang fetch thừa; thêm TTL cache hoặc điều kiện skip fetch khi data còn mới.
- **Trạng thái:** Deferred — Phase 3

---

### [KI-040] Performance — ProductsScreen fetch toàn bộ sản phẩm 1 lần

- **Mức độ:** Medium
- **File liên quan:** `stores/warehouseStore.ts` (`fetchProducts`), `screens/ProductsScreen.tsx` (`filteredProducts`, pagination client)
- **Mô tả:** Hiện tại `fetchProducts()` không có limit, load toàn bộ `products` về store. Với quy mô vài trăm SP thì ổn. Nếu lên vài nghìn SP: load chậm lúc đầu; tốn RAM; `useMemo` filter lag khi gõ search.
- **Hướng fix (Phase 3):** Cursor-based pagination từ DB giống `AuditLogScreen`, kết hợp server-side filter theo search/kho/zone. Cần refactor `fetchProducts` + `filteredProducts` useMemo + pagination bar.
- **Trạng thái:** Deferred — Phase 3

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
- **Trạng thái:** Open (chấp nhận tạm — giữ store/type theo DECISIONS)

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
