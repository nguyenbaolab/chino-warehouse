# Phase 3 — Plan

**Trạng thái:** In progress | Tháng 5/2026

---

## 1. Tổng quan

Phase 3 tập trung vào: sửa bug tồn đọng, cải tiến UX, hoàn thiện tính năng Phase 2 còn nợ (F27/F28/F08), bổ sung tính năng mới (F23 Dashboard, F24 RBAC đầy đủ), và nâng cao tính nhất quán dữ liệu realtime + conflict detection.

**F19 (chuyển hàng giữa khu vực): DROPPED — không implement.**

**Nguồn tham chiếu:** `docs/project/REQUIREMENTS.md`, `docs/project/CONTEXT.md`, `docs/DECISIONS.md`, `docs/KNOWN_ISSUES.md`, `docs/phases/phase-2/SUMMARY_2.md`, `docs/phases/phase-2/PLAN_2.md`.

**Kế thừa Phase 2:** Auth cơ bản (SEC-04), Realtime `private: true` (SEC-08), Audit Log (SEC-11), multi-kho (F20), category (F30), Zone Layout Editor (F29) — đã Done. Phase 3 hoàn thiện phần còn nợ và mở rộng vận hành.

---

## 2. Group A — Bug Fixes

### A1 — Format nhập hạn DD/MM/YYYY (KI-044)

- **File:** `components/ZoneDetailSheet.tsx`
- **Mô tả:** Ô nhập hạn sử dụng khi thêm/sửa lô trong ZoneDetailSheet đổi sang text input format DD/MM/YYYY. User gõ tay, app validate đúng format trước khi lưu. Nếu user chỉ nhập tháng/năm (MM/YYYY) thì tự điền ngày = 1.

### A2 — ProductsScreen barcode scan: X clear không restore + thiếu barcode text search (KI-045)

- **File:** `screens/ProductsScreen.tsx`, `stores/warehouseStore.ts`
- **Mô tả 3 việc:**
  1. **Bug:** Sau khi quét barcode → lọc ra sản phẩm, bấm X xóa → phải restore toàn bộ danh sách (đang bị mất).
  2. **Enhancement:** Khi xóa từng ký tự trong search bar → danh sách mở dần ra theo.
  3. **Feature:** Ô search text trên ProductsScreen hỗ trợ cả 2: gõ tên SP (đang có) **và** gõ mã vạch → tìm `inventory_entries.barcode` → trả về SP khớp.

### A3 — Zone overlap race condition khi tạo zone (KI-046)

- **File:** `screens/MapScreen.tsx` (hoặc nơi tạo zone), `stores/warehouseStore.ts`
- **Mô tả:** Khi tạo zone bị lag hoặc double-tap, zone có thể đặt chồng lên zone đã có. Cần: debounce/lock nút tạo zone khi đang xử lý, validate server-side không có zone cells trùng tọa độ trước khi INSERT, rollback nếu bị conflict.

### A4 — MapScreen search bar không tìm được theo mã vạch text (KI-047)

- **File:** `screens/MapScreen.tsx`, `stores/warehouseStore.ts` (`searchProducts`)
- **Mô tả:** Thanh search trên MapScreen hiện chỉ tìm theo tên SP (`normalizeText`). Cần thêm: nếu search query khớp với `inventory_entries.barcode` thì cũng trả về SP và lô tương ứng (tìm theo barcode text, không chỉ camera scan).

### A5 — Thiếu conflict detection khi nhiều user cùng sửa (KI-048)

- **File:** `stores/warehouseStore.ts`, screens liên quan (`ProductDetailScreen`, `ZoneDetailSheet`, `MapScreen`)
- **Mô tả:** Dùng optimistic locking với cột `updated_at`:
  - Khi load record (`inventory_entries`, `zones`, `products`), lưu `updated_at` vào local state.
  - Khi user bấm Save, so sánh `updated_at` local với `updated_at` trong DB.
  - Nếu khác nhau → có người sửa trước → hiện Alert: *"Lô/Zone/Sản phẩm này vừa được [changed_by_name] cập nhật. Bạn có muốn ghi đè không?"* với 2 nút: **Ghi đè** và **Xem lại**.
  - **Scope:** `inventory_entries` (lô hàng), `zones`, `products`.

---

## 3. Group B — UX Improvements

### B1 — "Đã giảm giá" hiển thị ngay trên card (không cần expand)

- **File:** `screens/NotificationsScreen.tsx`
- **Mô tả:** Sau khi toggle "Đã giảm giá" cho một lô trong tab Sắp hết hạn, card phải hiện visual indicator ngay lập tức (ví dụ: badge "Đã giảm" màu xanh, hoặc text gạch ngang, hoặc icon ✓) mà không cần user bấm expand xuống để thấy trạng thái.

### B2 — Chuyển lô phải bao gồm chính zone hiện tại

- **File:** `components/ZoneDetailSheet.tsx`
- **Mô tả:** Trong modal chuyển lô, danh sách zone đích phải có cả zone đang đứng (để hỗ trợ chuyển cùng zone nhưng khác tầng). Hiện đang lọc bỏ zone hiện tại.

### B3 — normalizeText bỏ qua ký tự đặc biệt

- **File:** `utils/textUtils.ts`
- **Mô tả:** Mở rộng `normalizeText()` để bỏ qua thêm: dấu phẩy (`,`), dấu nháy đơn (`'`), dấu cách thừa (trim + collapse), và các ký tự đặc biệt tương tự. Áp dụng cho cả query lẫn data khi so sánh. Không break các behavior hiện tại (tiếng Việt không dấu, ö/ä/å).

### B4 — Nhập hạn chỉ có tháng → tự điền ngày 1

- **File:** `components/ZoneDetailSheet.tsx`, `screens/AddInventoryScreen.tsx` (bất kỳ nơi nào có nhập hạn)
- **Mô tả:** Khi user nhập hạn theo format MM/YYYY (chỉ tháng năm, không có ngày), hệ thống tự điền ngày = 1 → lưu là ngày 01/MM/YYYY. Hiện hint text gợi ý.

### B5 — Cập nhật hint text ở AddInventoryScreen

- **File:** `screens/AddInventoryScreen.tsx`
- **Mô tả 2 thay đổi:**
  1. Hint cố định dưới ô tìm/chọn sản phẩm → đổi thành: *"Hỏi anh/chị chủ xem hàng đã từng được nhập chưa để tránh tạo thừa tên cho cùng 1 sản phẩm"*
  2. Note phía trên ô → thêm: *"Quét mã / tra tên sản phẩm trước để kiểm tra đã có chưa"*

### B6 — Sửa tên sản phẩm ngay tại ZoneDetailSheet

- **File:** `components/ZoneDetailSheet.tsx`, `stores/warehouseStore.ts`
- **Mô tả:** Trong bottom sheet của zone, mỗi sản phẩm trong danh sách có thể sửa tên inline (bấm vào tên → `TextInput` editable, lưu khi blur hoặc bấm Done). Chỉ sửa tên (`products.name`), không sửa field khác. Gọi store action `updateProduct` hoặc tương đương. Sau khi lưu, danh sách refresh.

### B7 — Barcode scan trên Map → tự mở ZoneDetailSheet + scroll tới sản phẩm

- **File:** `screens/MapScreen.tsx`, `components/ZoneDetailSheet.tsx`
- **Mô tả:** Hiện tại khi quét barcode trên MapScreen, bấm vào một kết quả trong panel → highlight zone + đóng panel. Cần thêm: sau khi bấm lô trong search results, tự động mở `ZoneDetailSheet` của zone đó **và** scroll xuống đúng sản phẩm/lô trong sheet.

### B8 — Global toggle bật/tắt cảnh báo trong Settings

- **File:** `screens/SettingsScreen.tsx`, `stores/warehouseStore.ts` hoặc `stores/themeStore.ts` (hoặc AsyncStorage)
- **Mô tả:** Thêm 2 toggle riêng biệt trong Settings:
  - **"Cảnh báo hết hạn"** — bật/tắt toàn bộ cảnh báo hết hạn trong app (tab Sắp hết hạn, màu đỏ/vàng theo hạn).
  - **"Cảnh báo hết hàng"** — bật/tắt toàn bộ cảnh báo hết hàng (tab Sắp hết hàng, màu đỏ/vàng theo tồn).
  - Global (áp dụng cho toàn app, không phải per user).
  - Lưu setting vào AsyncStorage để persist qua lần mở app.
  - Khi tắt cảnh báo hết hạn: tab Sắp hết hạn vẫn hiện sản phẩm nhưng không tô màu cảnh báo, không count badge. Tương tự cho tắt hết hàng.

---

## 4. Group C — Realtime & Conflict

### C1 — Realtime map update cho tất cả users

- **File:** `screens/MapScreen.tsx`, `stores/warehouseStore.ts`
- **Mô tả:** Subscribe Supabase Realtime trên bảng `zones` với `private: true`. Khi có INSERT/UPDATE/DELETE zone từ bất kỳ user nào → tất cả `MapScreen` đang mở tự fetch lại zones và re-render bản đồ. Không cần user refresh thủ công. Implement tương tự các Realtime channel đã có (xem `DECISIONS.md` + `CONTEXT.md` §1 về `private: true` + RLS).

> **Lưu ý:** A5 (optimistic locking) và C1 (realtime zones) bổ trợ nhau — realtime giảm stale UI; conflict detection xử lý ghi đè đồng thời khi hai user cùng sửa một record.

---

## 5. Group D — Feature Completion (nợ từ Phase 2)

### D1 — F27 mở rộng: 2 tab trong list + PDF tổng hợp

- **Files:** `screens/OrderListScreen.tsx`, `screens/OrderDetailScreen.tsx`, `stores/warehouseStore.ts`
- **Tham chiếu:** `REQUIREMENTS.md` §6 F27, `DECISIONS.md` "List đặt hàng — 2 tab", "Số thùng để trống đến khi Confirm", "Xuất PDF tổng hợp"
- **Mô tả:**
  - Mỗi list có 2 tab: **Hàng trong kho** (trái) / **Hàng mới** (phải).
  - Chỉ 1 list active tại một thời điểm; nếu chưa có → tự tạo + popup đặt tên.
  - Sản phẩm nhảy vào từ Sắp hết hàng → tab Hàng trong kho, ô số thùng **để trống**.
  - Bắt buộc điền đủ số thùng trước khi Confirm.
  - Nhóm theo category; sản phẩm chưa phân loại → nhóm **"Chưa phân loại"**.
  - Tab Hàng mới: tên SP, phân loại, số thùng, ghi chú (nhập tay).
  - Flow: **Draft → Confirm → Xuất PDF (gộp 2 tab) → Đã đặt**.
  - PDF: một file tổng hợp cả 2 tab.

### D2 — F28: `discontinued_reason` field riêng

- **Files:** `supabase/migrations/[timestamp]_add_discontinued_reason.sql`, `types/index.ts`, `screens/DiscontinuedProductsScreen.tsx`, `screens/NotificationsScreen.tsx`, `stores/warehouseStore.ts`
- **Mô tả:** Thêm cột `discontinued_reason TEXT` (nullable) vào bảng `products`. Bỏ việc dùng `products.notes` làm proxy lý do. UI: khi bấm "Không nhập nữa" trong `NotificationsScreen` → hiện modal nhập lý do (optional). `DiscontinuedProductsScreen` hiện lý do từ cột mới.

### D3 — F08: Hình ảnh sản phẩm

**Package mới cần thêm:**

- `expo-image-picker`: camera + chọn từ thư viện
- `react-native-image-viewing`: pinch-to-zoom full-screen

**Supabase Storage:**

- Bucket: `product-images` (public read, authenticated write/delete)
- File path: `product-images/{productId}.jpg` (ghi đè khi upload mới)
- Cần migration SQL: tạo bucket + RLS policies
- Khi xóa ảnh hoặc xóa sản phẩm: xóa file trên Storage luôn

**Upload flow (3 màn):**

- Bấm ảnh/placeholder → ActionSheet/Alert: "Chụp ảnh" / "Chọn từ thư viện" / "Hủy"
- Compress: 80% JPEG, resize max 1200px cạnh dài
- Upload → Supabase Storage → lưu URL vào `products.image_url`

**Quyền:** staff / admin / super_admin upload/xóa; guest chỉ xem

**ProductsScreen card:**

- Thêm ảnh vuông 64×64px bên trái card
- Chưa có ảnh: placeholder xám + icon 📷 → bấm → upload
- Đã có ảnh: bấm → full-screen zoom (pinch) + nút đóng
- Xóa nút ✏️ khỏi card (không cần nữa)

**ProductDetailScreen:**

- Ảnh vuông vừa, căn giữa, trong `ScrollView` phía trên tên SP
- Chưa có ảnh: placeholder xám + icon 📷 → bấm → upload
- Đã có ảnh: bấm → full-screen zoom + nút đóng
- Nút ✏️ đổi ảnh + nút 🗑️ xóa ảnh (confirm dialog trước khi xóa)
- Xóa ảnh: xóa file Storage + set `image_url = null` trong DB

**AddInventoryScreen (tạo SP mới):**

- Ô ảnh vuông nhỏ sau field tên SP mới (optional)
- Flow: tạo SP trước (lấy `productId`) → upload ảnh → update `image_url`

**Files:** `utils/imageUtils.ts`, `screens/ProductsScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/AddInventoryScreen.tsx`, `stores/warehouseStore.ts`, `supabase/migrations/[timestamp]_f08_product_images_storage.sql`

**Tasks:**

- [ ] Tạo Supabase Storage bucket + migration RLS
- [ ] Cài `expo-image-picker` + `react-native-image-viewing`
- [ ] Helper `uploadProductImage(productId, uri)`: compress + upload + return URL
- [ ] Helper `deleteProductImage(productId)`: xóa file Storage
- [ ] `warehouseStore`: `updateProductImage(productId, url)`, `removeProductImage(productId)`
- [ ] `ProductsScreen`: thêm ảnh 64×64 + zoom modal + upload; xóa nút ✏️
- [ ] `ProductDetailScreen`: thêm image block + zoom + upload + xóa
- [ ] `AddInventoryScreen`: thêm ô ảnh khi tạo SP mới
- [ ] `deleteProduct`: xóa ảnh Storage trước khi xóa SP

---

## 6. Group E — New Features

### E1 — F23: Dashboard / Tổng quan

- **File:** `screens/DashboardScreen.tsx` (mới), `App.tsx` (navigation), `screens/SettingsScreen.tsx` (entry point)
- **Mô tả:** Màn hình tổng quan truy cập từ Settings (card "Tổng quan kho"). Hiển thị:
  - Tổng số SKU (distinct products có ít nhất 1 `inventory_entry`)
  - Tổng số kho đang vận hành
  - Số sản phẩm sắp hết hàng (≤ `low_warning_boxes`)
  - Số sản phẩm hết hàng (0 thùng)
  - Số lô sắp hết hạn (≤ `warning_days`)
  - Số lô đã hết hạn
  - Số sản phẩm không nhập nữa (`is_discontinued`)
  - Dữ liệu fetch khi màn mount, **không realtime**. Không có biểu đồ — chỉ số text đơn giản với màu theo status.

### E2 — F24: RBAC — Phân quyền đầy đủ

- **Files:** `supabase/migrations/[timestamp]_add_user_profiles.sql`, `screens/UserManagementScreen.tsx` (mới), `screens/SettingsScreen.tsx`, `stores/warehouseStore.ts` hoặc store mới, `App.tsx` (guard theo role), tất cả screens có nút thêm/sửa/xóa

**Schema mới — bảng `user_profiles`:**

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID | = `auth.uid()` (FK → `auth.users`) |
| `role` | TEXT | `'super_admin'` / `'admin'` / `'staff'` / `'guest'` |
| `is_disabled` | BOOLEAN | `true` = không đăng nhập được |
| `last_login_at` | TIMESTAMP | cập nhật khi login thành công |
| `created_at` | TIMESTAMP | tự sinh |

**Role hierarchy:**

- **super_admin** (chủ cửa hàng): không thể bị tắt, không thể bị hạ quyền, có thể tạo tài khoản mới trong app, có thể cấp/thu quyền admin cho người khác, có thể toggle guest/disabled cho tất cả trừ chính mình.
- **admin** (do super_admin phân): không tạo tài khoản được, có thể xem màn User Management, có thể toggle guest/disabled cho staff và guest (không thể đụng super_admin và admin khác), không thể tự thu quyền admin của mình.
- **staff** (mặc định khi tạo): full CRUD mọi tính năng, không vào được User Management.
- **guest** (chỉ xem): không thêm/sửa/xóa bất kỳ gì (inventory, zones, products, orders, categories, locations), **CÓ** thể xem AuditLog, **CÓ** thể xem Dashboard.
- **disabled:** blocked ngay tại login (kiểm tra `is_disabled` sau khi auth thành công → đăng xuất + thông báo *"Tài khoản đã bị vô hiệu hóa"*).

**Tạo tài khoản (chỉ super_admin):**

- Màn UserManagement có nút **"+ Tạo tài khoản"**.
- Nhập email + password → gọi Supabase Admin API (cần `service_role` key — xử lý qua Edge Function hoặc RPC với `SECURITY DEFINER`).
- Sau khi tạo → tự tạo bản ghi `user_profiles` với `role = 'staff'`.

**Màn hình UserManagementScreen:**

- Truy cập từ Settings → card **"Quản lý người dùng"** (chỉ hiện với admin và super_admin).
- Danh sách tất cả users: email, role hiện tại, lần đăng nhập cuối (`last_login_at`), trạng thái.
- Mỗi user (trừ chính mình và super_admin): có 2 toggle: **[Chuyển Guest ↔ Staff]** và **[Vô hiệu hóa ↔ Kích hoạt]**.
- Super_admin thêm: nút **[Cấp Admin ↔ Thu quyền Admin]** cho staff/guest.
- Nút **"+ Tạo tài khoản"** chỉ hiện với super_admin.

**Guard trong app:**

- Sau login: đọc `user_profiles` → lưu role vào store.
- Nếu `is_disabled = true` → đăng xuất ngay + Alert.
- Nếu `role = guest`: ẩn/disable tất cả nút thêm/sửa/xóa, ẩn FAB, ẩn nút ✏️/🗑️ trong các màn.
- Ở màn Settings: ẩn card **"Quản lý người dùng"** với `role = staff` và `guest`.

> **Tham chiếu:** SEC-09 (KI-020) deferred từ Phase 2 → implement trong E2.

---

## 7. Group F — Bổ sung

### F1 — Fix navigation sau quét barcode "Hàng đã hết" (Bug — KI-057)

- **Vấn đề:** Quét barcode → Alert **"Hàng đã hết"** → **"Xem chi tiết"** → `navigateTabsThenCloseModal` hardcode tab **`Products` → `ProductDetail`**. Đóng ProductDetail → user về tab Kho thay vì tab/scanner gốc; chuyển sang tab Sản phẩm → ProductDetail vẫn kẹt trên stack.
- **Files:** `screens/BarcodeScannerScreen.tsx` (L149–183 `openProductOutOfStockAlert`, L93–100 `navigateTabsThenCloseModal`), `screens/ProductDetailScreen.tsx` (back / stack reset).
- **Yêu cầu fix:**
  1. **"Xem chi tiết"** navigate về đúng tab gốc (`returnTab`) — nested stack `{ screen: returnTab, params: { screen: 'ProductDetail', params: { productId, fromScanner: true, returnTab } } }` (hoặc tương đương), **không** hardcode `Products`.
  2. Đóng ProductDetail sau flow scanner → **reset stack** tab đó về màn gốc (`ProductsMain` / `MapMain` / …) — không để `ProductDetail` kẹt khi chuyển tab.
- **KNOWN_ISSUES:** KI-057 (High).

### F2 — Block xóa lô khi còn thùng (Bug — KI-058)

- **Vấn đề:** Lô còn `quantity_boxes > 0` mà nút 🗑️ vẫn hiện và cho xóa — cả `ProductDetailScreen` lẫn `ZoneDetailSheet`. Doc mâu thuẫn: F07 ghi "xóa khi còn thùng", F16 ghi "xóa khi hết hàng".
- **Files:** `screens/ProductDetailScreen.tsx`, `components/ZoneDetailSheet.tsx`, `stores/warehouseStore.ts` (`deleteInventoryEntry`).
- **Yêu cầu fix:**
  1. Nút 🗑️ xóa lô **chỉ hiện/hoạt động** khi `quantity_boxes === 0`.
  2. `deleteInventoryEntry` **reject** nếu `quantity_boxes > 0` (fetch + validate trước DELETE).
  3. Lô 0 thùng: giữ banner **"Lô này đã hết hàng [Xóa lô]"** (và banner hết hạn tương tự).
- **Doc (đã cập nhật):** REQUIREMENTS F07/F16 thống nhất; DECISIONS "Block xóa lô khi còn thùng".
- **KNOWN_ISSUES:** KI-058 (High).

### F3 — Đồng bộ `is_archived` giữa các màn

- **Vấn đề:** SP ẩn (`is_archived = true`) trên ProductsScreen vẫn hiện lô ở `ZoneDetailSheet`.
- **Files:** `components/ZoneDetailSheet.tsx` (filter entries theo `product.is_archived`).
- **Yêu cầu:**
  - **ZoneDetailSheet:** không hiện lô của SP `is_archived = true` (ban đầu ẩn hẳn, không toggle).
  - **MapScreen search:** `searchProducts` đã filter `!p.is_archived` — **giữ nguyên**.
  - **AddInventory gợi ý:** **KHÔNG** filter — vẫn gợi ý SP archived (có thể nhập lô mới).
  - **NotificationsScreen:** **KHÔNG** thay đổi.
- **DECISIONS:** scope đồng bộ `is_archived` (xem DECISIONS.md).

### F4 — Tap tên kho → navigate MapScreen

- **Vấn đề:** `LocationManagementScreen` — bấm card kho chỉ có icon ✏️ mở modal sửa.
- **Files:** `screens/LocationManagementScreen.tsx`, `stores/warehouseStore.ts` (`setSelectedLocation`), `App.tsx` (tab Map).
- **Yêu cầu:**
  - Tap **tên kho** (hoặc vùng chính card, không phải ✏️/🗑️) → chuyển tab **Map** + `setSelectedLocation(locationId)`.
  - Icon ✏️ / 🗑️ giữ nguyên.
  - Tiền lệ: `ProductDetailScreen` — `navigation.getParent()?.navigate('Map')` + `setLocateIntent`.

### F5 — Filter SP chưa có ảnh

- **Files:** `screens/ProductsScreen.tsx`
- **Yêu cầu:**
  - Toggle **"Chỉ chưa có ảnh"** (hoặc **"Chưa có ảnh"**) cạnh toggle **Hiện SP đã ẩn** / **Chỉ hết lô**.
  - Filter: `image_url === null` hoặc `image_url === ''`.
  - Mục đích: tiện tìm SP chưa chụp ảnh để bổ sung (F08).

### F6 — Internal Notes (Ghi chú nội bộ)

- **Mô tả:** Màn Settings — ghi chú nhanh về SP (cần nhập thêm, khách yêu cầu, hàng bán chạy, …). **Tách biệt hoàn toàn** F27 Đặt hàng.

**Schema — bảng `internal_notes`:**

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID | PK, `gen_random_uuid()` |
| `product_id` | UUID | FK → `products(id)`, NOT NULL |
| `reason` | TEXT | Lý do / ghi chú, NOT NULL |
| `created_by` | UUID | FK → `auth.users(id)` |
| `created_at` | TIMESTAMPTZ | default `now()` |

**Màn `InternalNotesScreen`:**

- Settings → card **"Ghi chú"** → route `InternalNotes` (SettingsStack).
- UI card giống ProductsScreen: ảnh SP 64×64 trái, tên SP + lý do phải.
- FAB **(+)** → bottom sheet: chọn SP (autocomplete tên, **chỉ SP đã có** — không tạo SP mới) → nhập lý do → lưu.
- Mỗi card: sửa lý do + xóa ghi chú.
- **RBAC:** guest chỉ xem; staff+ sửa/xóa **mọi** ghi chú (không giới hạn người tạo).

**Files (dự kiến):** migration `internal_notes`, `screens/InternalNotesScreen.tsx`, `stores/warehouseStore.ts` (CRUD), `App.tsx` / SettingsStack, `screens/SettingsScreen.tsx` (card entry).

### F7 — Barcode tự điền khi chọn SP sau quét (AddInventoryScreen)

- **Vấn đề:** Quét barcode trên `AddInventoryScreen` → tìm thấy SP → hiện tên trong dropdown gợi ý → bấm chọn SP → ô barcode lô vẫn trống, phải nhập/quét lại.
- **Files:** `screens/AddInventoryScreen.tsx` — flow `handleProductBarcodeScan` → dropdown chọn SP → set barcode field.
- **Yêu cầu:**
  1. Khi user quét barcode → SP hiện trong dropdown → user **bấm chọn** SP đó → ô barcode lô **tự điền** mã vừa quét.
  2. Chỉ tự điền khi user **chủ động bấm chọn** SP từ dropdown — **không** tự điền trước khi chọn.
  3. Gõ tên thủ công (không quét) → ô barcode giữ trống — không đổi behavior hiện tại.

### F8 — Dời lô hàng bằng map toàn màn hình

- **Vấn đề:** `ZoneDetailSheet` chuyển lô dùng list dropdown (ScrollView chọn zone đích + tầng). Nhiều zone → khó biết zone nào ở đâu.
- **Files:** `components/ZoneDetailSheet.tsx` (modal chuyển lô), `screens/MapScreen.tsx` (layout map tái sử dụng / tham khảo).
- **Yêu cầu:**
  1. Thay flow chọn zone đích: thay list dropdown → mở **map toàn màn hình** (layout giống MapScreen) hiện tất cả zone của kho hiện tại.
  2. User tap zone đích trên map → hiện **list tầng** của zone đó → chọn tầng → xác nhận chuyển.
  3. Flow: bấm **"Chuyển lô"** trên ZoneDetailSheet → map chọn zone → tap zone → chọn tầng → confirm → lô chuyển sang zone/tầng mới.
- **DECISIONS:** dời lô bằng map thay dropdown (UX nhiều zone).

---

## 8. Security (carry từ Phase 2)

| Mã | KI | Mô tả | Mức độ |
|----|-----|-------|--------|
| SEC-05 | KI-017 | Thêm `maxLength` vào tất cả `TextInput` | High |
| SEC-06 | KI-018 | Wrap error message Supabase → generic message | High |

---

## 9. Deferred → Phase 4

| Hạng mục | Ghi chú |
|----------|---------|
| **F19** | **DROPPED** — không implement (không phù hợp nghiệp vụ thực tế) |
| **F21** | Offline mode |
| **F25** | Báo cáo / Xuất dữ liệu |
| **F26** | Kiểm kho |
| **F32** | Toggle cảnh báo **per sản phẩm** — `ignore_expiry_warning` / `ignore_stock_warning` trên `products`; 2 switch trên ProductDetail section Chi tiết; ẩn SP khỏi Notifications/Dashboard tương ứng |
| **F33** | Lô **"Đã lên kệ"** — cột `inventory_entries.is_on_shelf`; lô 0 thùng → nút "Đã lên kệ" cạnh "Xóa lô"; ẩn khỏi Map/ZoneDetail nhưng giữ expiry → Notifications vẫn cảnh báo hạn. **Liên quan F36** Shelf Management (hàng trên kệ siêu thị). |
| **F34** | **Giỏ hàng / Picking list** — schema `picking_lists`, `picking_list_items`; tạo đơn lấy hàng, autocomplete SP + ảnh, nhóm kho/zone/tầng, checklist tick, OK → trừ `quantity_boxes` |
| **F35** | **Push notification** — `expo-notifications` local scheduled 11h sáng; check lô sắp hết hạn → thông báo OS (vd. "3 lô sắp hết hạn trong 7 ngày") |
| **F36** | **Shelf Management** — màn Settings "Hàng đang bán"; schema `shelf_items` / `shelf_zones` / `shelf_zone_items`; 2 tab (Tất cả / Hàng đặc biệt); qty cá thể (không phải thùng); toggle giảm giá độc lập kho; checklist reset thủ công. Gộp nghiệp vụ với F33 `is_on_shelf`. |
| **SEC-10** | Backup script `service_role` (KI-021) |
| **SEC-12** | `console.log` guard (KI-023) |
| **SEC-13** | Dependency audit (KI-024) |
| **SEC-14** | `.env.*` gitignore (KI-025) |
| **KI-039** | `useFocusEffect` fetch thừa — TTL cache |
| **KI-040** | `ProductsScreen` `fetchProducts` không limit — cursor pagination DB |

---

## 10. Tài liệu đi kèm Phase 3

| File | Mục đích |
|------|----------|
| `docs/phases/phase-3/PLAN_3.md` | File này |
| `docs/phases/phase-3/HANDOFF_3.md` | Tạo khi Phase 3 kết thúc |
| `docs/phases/phase-3/TESTCASES_3.md` | Tạo khi Phase 3 kết thúc |
| `docs/phases/phase-3/SUMMARY_3.md` | Tạo khi Phase 3 kết thúc |

---

## 11. Tóm tắt scope (đếm task)

| Group | Số task | Mã |
|-------|---------|-----|
| **A — Bug Fixes** | 5 | A1–A5 (KI-044 → KI-048) |
| **B — UX Improvements** | 8 | B1–B8 |
| **C — Realtime** | 1 | C1 |
| **D — Feature Completion** | 3 | D1 (F27), D2 (F28), D3 (F08) |
| **E — New Features** | 2 | E1 (F23), E2 (F24) |
| **F — Bổ sung** | 8 | F1 (KI-057), F2 (KI-058), F3–F8 |
| **Security** | 2 | SEC-05, SEC-06 |
| **Tổng task implement** | **29** | |

**Dropped / không làm Phase 3:** F19.

**Deferred Phase 4:** F21, F25, F26, **F32–F36**, SEC-10/12/13/14, KI-039, KI-040.
