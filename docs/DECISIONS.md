# DECISIONS — Quyết định thiết kế

Các quyết định quan trọng đã chốt cho Chino's Warehouse.

---

---

### FAB tạo sản phẩm trên ProductsScreen (catalog-only)

- **Ngày:** tháng 5/2026
- **Quyết định:** FAB **+** trên `ProductsScreen` mở bottom sheet tạo **chỉ** bản ghi `products` — **không** tạo `inventory_entry`. Sau lưu thành công: **reset filter kho về "Tất cả kho"** để SP mới (0 lô) hiện ngay trong list (filter theo kho ẩn SP không có lô trong kho đó).
- **Ảnh / barcode:** `addProduct` trước → `uploadProductImage` / `upsertProductBarcode` sau (cùng DECISIONS F08). Quét mã trong form: `BarcodeScanner` + `onScanFillBarcode` (modal giữ mở, không dùng route params search).
- **Conflict:** `checkBarcodeConflict` với sentinel UUID trước khi tạo SP.

---

### B2 — Wire barcode UI + audit conflict (RPC)

- **Ngày:** tháng 5/2026
- **Quyết định:** Khi gán barcode lô trùng SP khác → **block save** + Alert; ghi audit qua RPC **`log_barcode_conflict`** (SECURITY DEFINER) với `action = 'CONFLICT'` — client không INSERT `audit_logs` trực tiếp (RLS). Sau save barcode thành công → **`upsertProductBarcode`**. Quét không khớp lô → **`lookupProductByBarcode`** → Alert **"Hàng đã hết"** (có thể xem ProductDetail).
- **Normalize:** Mọi query/insert barcode trong store B1 dùng `.trim().toLowerCase()` (đồng bộ `searchByBarcode`).
- **Phạm vi:** `BarcodeScannerScreen`, `AddInventoryScreen`, `ProductDetailScreen`, `ZoneDetailSheet`.

---

### B1 — Lịch sử mã vạch per sản phẩm (`product_barcodes`)

- **Ngày:** tháng 5/2026
- **Quyết định:** Bảng `product_barcodes` lưu mọi mã vạch từng gắn với một SP; **`barcode` UNIQUE toàn hệ thống** (một mã chỉ thuộc một SP). Khi gán mã cho lô/SP mới: **`checkBarcodeConflict`** trước — nếu mã thuộc SP khác → **block** (B2 wire UI). Ghi thành công → **`upsertProductBarcode`** + audit log qua trigger `audit_product_barcodes` (cùng pattern SEC-11). Quét mã không khớp lô hiện tại → **`lookupProductByBarcode`** (B2/F10).
- **Lý do:** Mã vạch là định danh vật lý sản phẩm, không chỉ của một lô; tránh hai SP cùng mã; lịch sử quét phục vụ audit và lookup khi lô cũ đã hết.
- **Phạm vi B1:** Migration + backfill + types + store actions (UI: B2).

---

### SEC-10 — Backup script dùng anon key + user login

- **Ngày:** tháng 5/2026
- **Quyết định:** Script `backup.ts` dùng **`EXPO_PUBLIC_SUPABASE_ANON_KEY`** + **`signInWithPassword`** (tài khoản user thật / app), **KHÔNG** dùng `service_role` key trong repo hay `.env` local.
- **Lý do:**
  - Tránh ôm key full-quyền trong `.env` trên máy dev.
  - Login bằng tài khoản thật — backup phản ánh quyền user thực tế, dễ audit.
  - RLS hiện tại (`allow_all` cho mọi bảng app với `authenticated`) → user đăng nhập vẫn **SELECT đủ** mọi row; kèm phân trang `.range()` (page 1000, order `id`) để vượt giới hạn Data API ~1000 row/request.
- **Caveat (kích hoạt khi RBAC):** Khi triển khai **SEC-09 / RBAC (Phase 3)**, user thường có thể **không thấy hết row** theo policy → backup có thể thiếu. Khi đó: chạy backup bằng **tài khoản full-quyền** (admin), hoặc **cân nhắc lại `service_role`** chạy server-side (không commit key vào repo).
- **Phạm vi:** Chỉ **DB tables** trong mảng `tables` của `backup.ts` → JSON (`backup_YYYYMMDD_HHmmss.json`); **KHÔNG** backup Supabase Storage (bucket **`product-images`**, F08).
- **Thay thế KI-021:** Entry này **thay thế** hướng fix cũ của KI-021 (“dùng `service_role` key”) — quyết định chính thức là anon + user login; KI-021 ghi **Mitigated**, không còn mâu thuẫn với DECISIONS.

---

### Ẩn/Khôi phục SP chuyển sang ProductDetailScreen — xóa khỏi modal ProductsScreen

- **Ngày:** tháng 5/2026
- **Quyết định:** Ẩn/khôi phục (`is_archived`) chỉ từ `ProductDetailScreen` (nút outlined + Alert xác nhận). Xóa modal Sửa sản phẩm và nút ✏️ trên card `ProductsScreen`.
- **Lý do:** Logic tương tự trước đây trong modal; tập trung chỉnh sửa/ẩn tại màn chi tiết; card gọn hơn (chuẩn bị F08 thumbnail).

---

### Xóa nút ✏️ khỏi ProductsScreen card

- **Ngày:** tháng 5/2026
- **Quyết định:** Bỏ nút edit (✏️) trên card sản phẩm trong `ProductsScreen`. Mọi chỉnh sửa SP thực hiện qua `ProductDetailScreen`.
- **Lý do:** Card thêm ảnh thumbnail → không đủ chỗ; UX gọn hơn khi tập trung edit tại 1 màn duy nhất.

---

### F08 — Upload từ 3 màn (Products, Detail, AddInventory)

- **Ngày:** tháng 5/2026
- **Quyết định:** Upload ảnh được từ `ProductsScreen` (tap thumbnail card), `ProductDetailScreen` (image block), `AddInventoryScreen` (khi tạo SP mới). AddInventory: tạo SP trước lấy `productId`, rồi mới upload ảnh.
- **Lý do:** Linh hoạt — không bắt buộc phải vào Detail mới đổi ảnh được.

---

### F08 — Xóa ảnh xóa luôn trên Storage

- **Ngày:** tháng 5/2026
- **Quyết định:** Khi user xóa ảnh hoặc xóa sản phẩm → xóa file trên Supabase Storage trước, sau đó xóa/update DB.
- **Lý do:** Giữ Storage sạch; tránh file mồ côi tích lũy dài hạn.

---

### F08 — 1 ảnh/SP, path `{productId}.jpg` (ghi đè)

- **Ngày:** tháng 5/2026
- **Quyết định:** Mỗi SP 1 ảnh, lưu tại `product-images/{productId}.jpg`. Upload mới ghi đè file cũ — không tích lũy file thừa.
- **Lý do:** Đơn giản, không cần quản lý nhiều file per SP.

---

### F08 — Compress ảnh 80% JPEG max 1200px client-side

- **Ngày:** tháng 5/2026
- **Quyết định:** Compress trước khi upload — 80% quality, resize về max 1200px cạnh dài. File ~100–300KB/ảnh.
- **Lý do:** Supabase free tier 1GB Storage; cửa hàng nhỏ ~100–500 SP = 30–150MB, không lo hết dung lượng. Ảnh đủ rõ để đọc nhãn.

---

### Tìm kiếm / filter text: `normalizeText()` client-side

- **Ngày:** tháng 5/2026
- **Vấn đề:** Tìm kiếm không nhận dấu tiếng Việt và ký tự Phần Lan (ö, ä, å).
- **Các lựa chọn đã xem xét:**
  1. PostgreSQL `unaccent` extension — không xử lý đủ tiếng Việt, cần migration DB.
  2. Normalize client-side + fetch all rồi filter — fetch thừa.
  3. Normalize client-side trên data đã có trong store — **được chọn**.
- **Quyết định:** `normalizeText()` trong `utils/textUtils.ts`; filter `store.products` local trong `searchProducts` (data đã load khi mount); áp dụng tất cả filter text toàn app.
- **Lý do:** Không cần DB migration, không fetch thêm, không lag, dễ maintain.

---

### Hệ thống màu: gộp critical + warning = vàng

- **Ngày:** tháng 5/2026
- **Quyết định:** Trạng thái “cần chú ý” về tồn (sắp hết hàng theo `low_warning_boxes`) và về hạn (sắp hết hạn theo `warning_days`) dùng **cùng tông vàng** trên UI (không tách màu cam riêng cho một nhánh).
- **Lý do:** Đơn giản hơn cho người dùng — thấy vàng là biết cần kiểm tra.
- **Thay thế đã xem xét:** Màu cam riêng cho sắp hết hàng (đã loại bỏ).

---

### 0–1 thùng hardcode đỏ, không configurable

- **Ngày:** tháng 5/2026
- **Quyết định:** 0 thùng = hết hàng, 1 thùng = còn rất ít; cả hai mức đều **đỏ** theo PRD, **không** cho nhân viên chỉnh ngưỡng trên UI.
- **Lý do:** Ngưỡng nguy hiểm không nên tùy chỉnh lung tung.
- **Thay thế đã xem xét:** Cho chỉnh `low_critical_boxes` trên UI (từ chối; có thể hardcode = 1 trong logic).

### low_critical_boxes = 1 cố định trong logic, không còn UI chỉnh

- **Ngày:** tháng 5/2026
- **Quyết định:** Toàn app dùng **`low_critical_boxes = 1`** khi gọi `getCombinedStatus` / tính combined (không đọc chỉnh từ UI). **Đã gỡ hoàn toàn** block chỉnh “còn rất ít (thùng)” trên `ProductDetailScreen`. Cột DB có thể còn nhưng không còn đường cập nhật từ màn hình này.
- **Lý do:** Thống nhất PRD (0–1 thùng đỏ) và tránh nhập sai ngưỡng critical.
- **Thay thế đã xem xét:** Giữ input đồng bộ DB — từ chối.

---

### low_warning_boxes configurable per sản phẩm

- **Ngày:** tháng 5/2026
- **Quyết định:** Mỗi sản phẩm chỉnh ngưỡng **vàng** “sắp hết hàng” riêng (mặc định **3** thùng), tại màn chi tiết sản phẩm (trong section **Chi tiết** có thể thu gọn).
- **Lý do:** Mỗi SKU có tần suất bán / dự trữ khác nhau.
- **Thay thế đã xem xét:** Một ngưỡng cố định toàn app.

---

### warning_days configurable per sản phẩm

- **Ngày:** tháng 5/2026
- **Quyết định:** Mỗi sản phẩm chỉnh số ngày cảnh báo trước hạn (mặc định **30**), tại màn chi tiết sản phẩm (trong section **Chi tiết** có thể thu gọn).
- **Lý do:** Chu kỳ nhập hàng / shelf life khác nhau giữa các loại hàng.
- **Thay thế đã xem xét:** 30 ngày cứng cho mọi sản phẩm.

---

### Màu zone = combined status

- **Ngày:** tháng 5/2026
- **Quyết định:** Chấm màu trên zone khi tìm kiếm / locate dựa trên **combined status** (tồn + hạn), lô xấu nhất trong zone quyết định màu.
- **Lý do:** Nhất quán với hệ thống màu toàn app và với PRD.
- **Thay thế đã xem xét:** Chỉ tô màu zone theo hạn.

---

### Phase 1 không có auth

- **Ngày:** tháng 5/2026
- **Quyết định:** Mở app dùng luôn, mọi người **full quyền**, không đăng nhập.
- **Lý do:** Đưa app vào vận hành nhanh, đủ cho quy mô cửa hàng nhỏ.
- **Thay thế đã xem xét:** Auth sớm — hoãn sang super app / phase sau.
- **Cập nhật sau này:** Phase 2 đã implement auth đầy đủ (LoginScreen, `persistSession: false`, inactivity timer 20 phút, signOut) — xem quyết định "Auto-logout: memory-only session + inactivity timer 20 phút" bên dưới.

---

### Super app integration — Phase 3

- **Ngày:** tháng 5/2026
- **Quyết định:** Warehouse là **một module** trong hệ app nội bộ lớn hơn (kho, chấm công, chia ca, …). Auth và phân quyền chi tiết thiết kế **sau** khi có yêu cầu cụ thể.
- **Lý do:** Lộ trình chủ cửa hàng; tránh over-engineer giai đoạn đầu.
- **Thay thế đã xem xét:** Tích hợp auth ngay trong Phase 1.

---

### Tồn kho theo tổng thùng per sản phẩm

- **Ngày:** tháng 5/2026
- **Quyết định:** Cảnh báo tồn kho (`low_warning_boxes`, critical) xét theo **tổng số thùng của tất cả lô trong cùng sản phẩm**, không xét theo từng lô riêng lẻ.
- **Logic hạn sử dụng:** Vẫn giữ theo từng lô như hiện tại.
- **Lý do:** Tổng thùng phản ánh đúng nhu cầu nhập thêm hàng ở mức sản phẩm.

---

### Lô 0 thùng được giữ lại, không tự xóa

- **Ngày:** tháng 5/2026
- **Quyết định:** Lô về `quantity_boxes = 0` vẫn tồn tại trong DB, không tự động xóa.
- **Hiển thị:** Trên `ProductDetailScreen`, lô 0 thùng hiển thị một dòng: `Lô này đã hết hàng [Xóa lô]`.
- **Vận hành:** Nhân viên chủ động bấm xóa khi muốn, không xóa tự động.
- **Notifications:** Không tạo thông báo riêng theo từng lô.

---

### NotificationsScreen — format card mới

- **Ngày:** tháng 5/2026
- **Quyết định:** Card thông báo gồm:
  - Dòng 1: `Còn ... thùng` (tổng tất cả lô của sản phẩm).
  - Dòng 2: `Số thùng sắp hết hạn: ... thùng` (tổng thùng của lô vàng/đỏ theo hạn).
  - Pill 1: trạng thái tồn kho theo **tổng thùng sản phẩm**.
  - Pill 2: trạng thái hạn theo **lô xấu nhất**.
- **Ghi chú:** Giữ nguyên 2 pill, không đổi vị trí UI.

---

### NotificationsScreen — tab Có vấn đề / Để sau

- **Ngày:** tháng 5/2026
- **Quyết định:** Tab Thông báo có 2 tab con: **Có vấn đề** và **Để sau**.
- **Luồng:** Tab Có vấn đề hiển thị danh sách sản phẩm có vấn đề; mỗi card có nút **Để sau**. Tab Để sau hiển thị sản phẩm đã đánh dấu và cho phép chuyển lại Có vấn đề.
- **Phạm vi đánh dấu:** Đánh dấu **theo sản phẩm**, không theo lô.
- **Lý do:** Giảm nhiễu thông báo và cho phép xử lý theo thứ tự ưu tiên.
- **Cập nhật sau này:** Quyết định này không còn dùng trong UI hiện tại do Notifications được restructure thành **Sắp hết hạn / Sắp hết hàng**.

---

### Lưu trạng thái Để sau — `products.is_deferred` (BLK-002 Resolved)

- **Ngày:** tháng 5/2026
- **Quyết định:** Lưu cờ **Để sau** bằng cột **`is_deferred BOOLEAN NOT NULL DEFAULT false`** trên bảng **`products`** (migration `20260511_add_product_is_deferred.sql`). App cập nhật qua Supabase và `warehouseStore.toggleDeferred`.
- **Lý do:** Đồng bộ đa thiết bị, không phụ thuộc state cục bộ Zustand; một sản phẩm — một cờ.
- **Thay thế đã xem xét:** Chỉ lưu local Zustand — từ chối cho Phase 1+ thông báo.
- **Cập nhật sau này:** Sau khi bỏ tab **Để sau**, cột `is_deferred` vẫn giữ trong DB để tương thích dữ liệu cũ, nhưng **không còn dùng trong UI**.

---

### Restructure NotificationsScreen

- **Ngày:** tháng 5/2026
- **Quyết định:** Tách Notifications thành 2 tab: **Sắp hết hạn** và **Sắp hết hàng**.
- **Quyết định bổ sung:** Bỏ tab **Để sau** và thay bằng luồng xử lý trực tiếp trên từng card.
- **Sắp hết hạn:** Card sản phẩm sắp hết hạn có toggle **Đã giảm giá** theo sản phẩm/lô; card đã hết hạn hiển thị đỏ nhạt, nhãn `Hết hạn rồi`, bấm vào mở `ProductDetailScreen`.
- **Sắp hết hàng:** Card sản phẩm có 2 hành động chính: thêm vào danh sách đặt hàng hoặc đánh dấu không nhập nữa.
- **Lý do:** Luồng thao tác ngắn hơn, bám đúng nghiệp vụ vận hành hàng ngày.

---

### Tab Đặt hàng — danh sách nhập hàng

- **Ngày:** tháng 5/2026
- **Quyết định:** Thêm tab **Đặt hàng** giữa tab Sản phẩm và Thông báo.
- **Luồng:** Một tab quản lý nhiều list độc lập, mỗi list có 3 trạng thái: **Đang soạn → Đã confirm → Đã đặt hàng**.
- **Quy tắc list:** Sản phẩm thêm tay được đánh dấu ⭐; sản phẩm tự động từ kho không đánh dấu; cùng sản phẩm trong list đang soạn thì cộng dồn.
- **Hành động:** Mỗi list có nút Confirm (khóa tạm), nút Đã đặt hàng (khóa hẳn, có mở lại), và nút xuất PDF riêng.
- **Lý do:** Tách rõ luồng chuẩn bị đơn nhập, xác nhận nội bộ, và xác nhận đã đặt nhà cung cấp.
- **Cập nhật sau này:** Model này được thay thế bởi design F27 mở rộng (list active / list tự tạo, 2 tab trong mỗi list, số thùng để trống đến Confirm, PDF tổng hợp) — xem các quyết định List đặt hàng / Số thùng / Xuất PDF bên dưới.

---

### Sản phẩm không nhập nữa

- **Ngày:** tháng 5/2026
- **Quyết định:** Lưu sản phẩm không nhập nữa bằng cờ DB `is_discontinued`.
- **UI:** Hiển thị trong Settings với card tổng số lượng; màn chi tiết hiển thị tên, tồn kho thực tế realtime, lý do (optional); cho phép chuyển lại luồng Sắp hết hàng.
- **Lý do:** Giảm nhiễu cảnh báo sắp hết hàng cho các mặt hàng không còn kế hoạch nhập.

---

### ProductDetailScreen — lô hết hạn

- **Ngày:** tháng 5/2026
- **Quyết định:** Lô hết hạn hiển thị banner `Lô này đã hết hạn [Xóa lô]`, cùng pattern với lô hết hàng nhưng đổi text theo ngữ nghĩa hạn sử dụng.
- **Lý do:** Đồng nhất UX thao tác dọn lô không còn giá trị kinh doanh.

---

### Barcode chuyển sang per lô (`inventory_entries`)

- **Ngày:** tháng 5/2026
- **Quyết định:** Barcode gắn với **từng lô hàng** (`inventory_entries.barcode`), không còn per sản phẩm.
- **DB migration:** Xóa `products.barcode` (drop column), thêm `inventory_entries.barcode` (add column, optional).
- **Lý do:** Cùng một sản phẩm có thể có nhiều lô với barcode khác nhau.
- **Thay thế đã xem xét:** 1 sản phẩm 1 barcode — từ chối.

---

### Logic tìm kiếm theo barcode vs tên

- **Ngày:** tháng 5/2026
- **Quyết định:**
  - Gõ tên: tìm theo **sản phẩm**, highlight tất cả zone có sản phẩm đó.
  - Quét barcode: tìm theo **lô**, highlight zone chứa đúng lô đó và hiện thông tin lô tương ứng.
- **UI liên quan:** `ProductDetailScreen` thêm field barcode trên card lô; `AddInventoryScreen` dùng barcode per lô; `BarcodeScanner` bỏ `assign` mode.

---

### Multi-kho: products global, filter per screen

- **Ngày:** tháng 5/2026
- **Quyết định:** Tab Sản phẩm và Thông báo có dropdown lọc theo kho. MapScreen chỉ hiện zones của kho đang được chọn trong selector. Tab Đặt hàng không có dropdown kho (xem quyết định riêng).
- **Lý do:** Sản phẩm là global (cùng SKU có thể ở nhiều kho); chỉ inventory mới gắn với kho cụ thể. Lọc theo kho là optional.
- **Thay thế đã xem xét:** Mỗi tab lọc cứng theo kho đang chọn trên Map — từ chối, gây mất thông tin tổng quan.
- **Cập nhật implementation (đối chiếu code):**
  - **Thông báo — lọc theo kho:** xem mục **Thông báo — Tất cả kho** (`fetchAllInventoryEntries`) bên dưới.
  - **Sản phẩm — Tất cả kho:** `inventoryEntries` được merge qua `fetchInventoryByZone` theo **`store.zones`** (zones của kho đang chọn trên Map), không tải full mọi kho trong một query.
  - **Sản phẩm — một kho:** fetch zone theo `filterLocationId` rồi `fetchInventoryByZone` như trên.

---

### Thông báo — Tất cả kho: `fetchAllInventoryEntries`

- **Ngày:** tháng 5/2026
- **Quyết định:** Khi dropdown **Tất cả kho** (`filterLocationId === null`), `NotificationsScreen` gọi `warehouseStore.fetchAllInventoryEntries()` thay vì `Promise.all(zones.map(fetchInventoryByZone))`. Khi chọn **một kho**, fetch zone theo `filterLocationId` (Supabase) rồi `fetchInventoryByZone` từng zone; lọc UI theo tập zone đó.
- **Lý do:** `store.zones` chỉ chứa zone của kho đang chọn trên Map; fetch theo zones sẽ **thiếu** inventory các kho khác → sai cảnh báo toàn cửa hàng.
- **Thay thế đã xem xét:** Giữ fetch theo `store.zones` — từ chối sau khi phát hiện lỗi hiển thị.

---

### Grid size: per location, configurable

- **Ngày:** tháng 5/2026
- **Quyết định:** Lưu `grid_rows` và `grid_cols` trên bảng `locations` (default 6×6). Hỏi khi tạo kho mới, cho đổi lại sau. Tăng kích thước: thoải mái. Giảm kích thước: block nếu có zone nào bị cắt ra ngoài (tọa độ cells vượt quá grid mới).
- **Lý do:** Mỗi kho có layout vật lý khác nhau, không nên dùng chung một kích thước cố định.
- **Thay thế đã xem xét:** Grid size global toàn app — từ chối.

---

### Xóa kho: block nếu còn hàng

- **Ngày:** tháng 5/2026
- **Quyết định:** Trước khi xóa một location, kiểm tra toàn bộ inventory_entries trong tất cả zones thuộc location đó. Nếu có bất kỳ lô nào còn tồn tại trong DB (kể cả quantity_boxes = 0 chưa được xóa thủ công) → block xóa và hiện thông báo rõ lý do.
- **Lý do:** Tránh mất dữ liệu tồn kho, nhất quán với quy tắc xóa zone (§7.1 REQUIREMENTS).
- **Thay thế đã xem xét:** Xóa cascade toàn bộ — từ chối.

---

### Zone move: Compact Layout Editor (F29)

- **Ngày:** tháng 5/2026
- **Quyết định:** Dùng màn hình Layout Editor riêng biệt thay vì drag trực tiếp trên map chính. Mỗi zone hiển thị dưới dạng tile nhỏ cố định (không phụ thuộc kích thước thật) kèm badge kích thước. Kéo tile vào grid → collision check theo tọa độ thật, không phải theo tile. Có nút Preview trước khi Confirm.
- **Lý do:** Map chính khi kho đầy không còn chỗ trống để kéo thả zone kích thước thật — gây khó thao tác.
- **Thay thế đã xem xét:** Drag zone kích thước thật trên map (Option A) — từ chối vì cramped; Swap 2 zone (Option C) — từ chối vì không đủ linh hoạt khi zone kích thước khác nhau; Zoom out + drag (Option E) — từ chối vì touch target quá nhỏ.

---

### Tab Đặt hàng: không filter theo kho

- **Ngày:** tháng 5/2026
- **Quyết định:** Tab Đặt hàng không có dropdown lọc theo kho. Chỉ Products và Notifications có filter theo kho.
- **Lý do:** Order list không gắn trực tiếp với kho cụ thể — một đơn nhập có thể gồm hàng từ nhiều kho.

---

### Location card trong Settings: hiển thị số sản phẩm

- **Ngày:** tháng 5/2026
- **Quyết định:** Card location trong LocationManagementScreen hiển thị: tên kho, grid size (ví dụ "6 × 6"), và số sản phẩm (distinct product_id từ inventory_entries → zones thuộc location đó, kể cả lô 0 thùng chưa xóa).
- **Lý do:** Giúp nhân viên biết kho nào đang chứa bao nhiêu SKU trước khi thao tác xóa hay sửa.

---

### Category gắn sản phẩm, không gắn lô (F30)

- **Ngày:** tháng 5/2026
- **Quyết định:** Phân loại (`category_level1_id` / `category_level2_id`) gắn trên **`products`**, **không** gắn trên `inventory_entries` / lô hàng.
- **Lý do:** Một SKU một phân loại nghiệp vụ; lô chỉ là tồn theo thời điểm.
- **Tham chiếu:** `REQUIREMENTS.md` §8.

---

### Phân loại 2 cấp — cả hai cấp đều optional (F30)

- **Ngày:** tháng 5/2026
- **Quyết định:** Cấp 1 và Cấp 2 **đều optional**; không bắt buộc phân loại khi tạo hoặc sửa sản phẩm. Chọn Cấp 1 **không** bắt buộc phải chọn Cấp 2. Sản phẩm chưa gán đủ thông tin hiển thị trong list đặt hàng dưới nhóm **Chưa phân loại** (F27).
- **Lý do:** Linh hoạt vận hành; tránh chặn nhập hàng khi chưa kịp chuẩn hóa danh mục.

---

### AddInventoryScreen — category chỉ khi thêm sản phẩm mới (F30)

- **Ngày:** tháng 5/2026
- **Quyết định:** Khi **chọn sản phẩm có sẵn**, hiển thị category **read-only** (điền từ SP), **không** cho chỉnh category trên màn thêm lô. Khi **thêm sản phẩm mới**, hiện dropdown Cấp 1 + Cấp 2 ngay dưới field tên sản phẩm (cả hai optional theo quyết định trên).
- **Lý do:** Tránh đổi taxonomy nhầm khi chỉ đang nhập lô cho SKU đã có; tạo SP mới là điểm hợp lý để gán category lần đầu.

---

### Quản lý category trong Settings (F30)

- **Ngày:** tháng 5/2026
- **Quyết định:** CRUD category 2 cấp đặt trong **Settings** (card tóm tắt + màn **Quản lý phân loại**), **không** đặt luồng quản lý category trong màn **danh sách sản phẩm** (Products list).
- **Lý do:** Tách cấu hình danh mục khỏi thao tác tra cứu hàng ngày; gán SP vẫn ở chi tiết SP / AddInventory theo `REQUIREMENTS.md` §9.
- **Tham chiếu:** `REQUIREMENTS.md` §6 F30, §9.

---

### List đặt hàng — 2 tab trong một list (F27 mở rộng)

- **Ngày:** tháng 5/2026
- **Quyết định:** Mỗi list có hai tab: **Hàng trong kho** (trái — auto từ Sắp hết hàng) và **Hàng mới** (phải — nhập tay: tên, phân loại, số thùng, ghi chú). Hai loại list: **active** (nhận hàng từ kho) và **tự tạo** (hàng mới); chỉ **một list active** tại một thời điểm, app tự tạo + popup đặt tên nếu chưa có.
- **Lý do:** Tách rõ hàng đã có SKU trong kho vs hàng mới cần nhập tên; một luồng list thống nhất.
- **Tham chiếu:** `REQUIREMENTS.md` §6 F27, §9.

---

### Số thùng trong list để trống đến khi Confirm (F27 mở rộng)

- **Ngày:** tháng 5/2026
- **Quyết định:** Sản phẩm **nhảy** vào list (từ Sắp hết hàng) **không** điền sẵn số thùng; ô số thùng để trống — **bắt buộc điền đủ** trước khi **Confirm** list.
- **Lý do:** Số thùng đặt thực tế do chị quyết định khi soạn đơn, không suy từ tồn kho tự động.
- **Thay thế đã xem xét:** Prefill từ gợi ý tồn — không chốt trong design hiện tại.

---

### Xuất PDF tổng hợp (F27 mở rộng)

- **Ngày:** tháng 5/2026
- **Quyết định:** Một file **PDF gộp** cả nội dung tab **Hàng trong kho** và tab **Hàng mới** sau bước phù hợp trong luồng (Draft → Confirm → **Xuất PDF** → Đã đặt — xem `REQUIREMENTS.md` §6 F27).
- **Lý do:** Một đơn nhập một bản in, đủ thông tin cả hai nguồn dòng hàng.
- **Thay thế đã xem xét:** Hai file PDF riêng — từ chối cho luồng chốt hiện tại.

---

### SEC-11 — Audit Log: thiết kế kỹ thuật và UI

**Ngày:** tháng 5/2026

**Kỹ thuật:**
- Implementation: PostgreSQL trigger (SECURITY DEFINER) ghi vào bảng `audit_logs` sau mỗi INSERT/UPDATE/DELETE trên `inventory_entries` và `products` — không thể bypass từ client.
- `location_id`: trigger lookup `zones.location_id` cho inventory_entries; NULL cho products (không gắn kho cụ thể). FK → `locations(id) ON DELETE SET NULL`.
- Tên user: trigger lưu `split_part(auth.jwt() ->> 'email', '@', 1)` vào cột `changed_by_name TEXT` ngay lúc ghi — không join `auth.users` runtime (không accessible từ client).
- RLS `audit_logs`: authenticated chỉ được SELECT; INSERT chỉ qua trigger.
- Pagination: cursor-based dùng `changed_at` (tránh skip record khi có insert mới).

**UI — 2 điểm truy cập:**
- `ProductDetailScreen`: section 10 entries gần nhất (static, không pagination) + nút "Xem tất cả" → `AuditLogScreen` filtered theo product.
- `SettingsScreen`: card "Lịch sử thay đổi" subtitle = entry mới nhất → `AuditLogScreen` toàn bộ.

**AuditLogScreen — 4 filter kết hợp:**
- [1] Kho — disabled khi loại = Sản phẩm (vì products không gắn kho).
- [2] Loại thay đổi — Lô hàng / Sản phẩm / Tất cả. Chọn Sản phẩm → reset kho, disable dropdown kho.
- [3] Người thay đổi — distinct `changed_by_name` từ 50 entries gần nhất.
- [4] Sản phẩm — lọc `record_id` hoặc `new_data/old_data->>'product_id'` cho inventory_entries.
- **Logic kết hợp kho + loại:** nếu filterType = inventory_entries: lọc `table_name` + `location_id`; nếu filterType = products: chỉ `table_name`, bỏ qua `location_id`; nếu tất cả + có kho: `(inventory_entries AND location_id = X) OR products`.
- Pagination: 10/trang, nút phải (cũ hơn) query DB, nút trái (mới hơn) từ cache.
- Cache: local state, clear khi unmount.

**Trigger v2 — enriched JSONB:** trigger nhúng `_product_name`, `_zone_name`, `_location_name` vào cột `old_data`/`new_data` JSONB (prefix `_` = metadata display, không phải data gốc). Khi `zone_id` thay đổi (UPDATE inventory_entries), `old_data._zone_name` = tên zone cũ, `new_data._zone_name` = tên zone mới. UI dùng `formatAuditEntry()` để render human-readable description theo action × table_name.

**Realtime:** không implement ở màn `AuditLogScreen` — audit log là historical data, user vào để tra cứu; realtime insert khi đang xem page cũ gây UX phức tạp (deferred → KI-026).

---

### Auto-logout: memory-only session + inactivity timer 20 phút

- **Ngày:** tháng 5/2026
- **Quyết định:** Session auth chỉ lưu trong RAM (memory-only storage) — kill app = mất session = phải login lại. Inactivity timer 20 phút dùng timestamp-based check: `setInterval` 30s khi foreground + check ngay khi app quay lại foreground (`AppState` listener). Toast "Phiên đăng nhập đã hết hạn" chỉ hiện khi auto-logout do inactivity, không hiện khi user tự bấm đăng xuất hoặc kill app.
- **Lý do:** Bảo mật cho app nội bộ — tránh session còn sống trên thiết bị sau khi nhân viên rời đi; background ngắn (switch app) vẫn giữ session vì RAM chưa bị clear.
- **Thay thế đã xem xét:** SecureStore persist session (bỏ — kill app vẫn giữ session); server-side session timeout (quá phức tạp cho client-direct BaaS).

---

### Kiến trúc bảo mật: Client-direct Supabase + RLS (không có server backend riêng)

- **Ngày:** tháng 5/2026
- **Quyết định:** Không thêm server backend (Node/Python) — dùng Supabase Auth + RLS làm tầng bảo mật duy nhất.
- **Lý do:** App nội bộ quy mô nhỏ (~3 user), không public. Supabase thiết kế cho mô hình client-direct — an toàn khi Auth + RLS cấu hình đúng. Thêm server backend chỉ cần thiết khi: app public, cần tích hợp hệ thống ngoài (ERP), hoặc business logic phức tạp không encode được bằng RLS.
- **Hệ quả:** Anon key bundle trong APK nhưng vô hại; mọi security phụ thuộc vào RLS + Auth đúng; RBAC thêm vào Phase 3 khi super app có yêu cầu.

---

### Truyền locate intent qua Zustand store thay vì navigation params

- **Ngày:** tháng 5/2026
- **Vấn đề:** Từ `ProductDetailScreen` (stack tab Sản phẩm / Thông báo / …) cần mở tab **Kho** với kho + zone + search đã set sẵn.
- **Các lựa chọn đã xem xét:**
  1. Nested navigate + merge params xuống `MapMain` — dễ lỗi với bottom tabs và nhiều stack.
  2. Global event bus — thêm abstraction không cần thiết.
  3. **`locateIntent` trong `warehouseStore`** — **được chọn**.
- **Quyết định:** `setLocateIntent({ productName, locationId, zoneId, productColor })`; `MapScreen` đọc khi focus, áp dụng highlight + search + panel expanded, rồi `clearLocateIntent`.
- **Lý do:** Cross-tab trong React Navigation không truyền params sạch; store đơn giản, một nguồn sự thật, Map tự clear sau xử lý.

---

### Xóa chuyển lô khỏi ProductDetailScreen, giữ ở ZoneDetailSheet

- **Ngày:** tháng 5/2026
- **Quyết định:** Gỡ nút **→**, modal chuyển lô, `openMoveLot` / `confirmMoveLot` khỏi `ProductDetailScreen`. Chuyển lô vẫn đầy đủ trong `ZoneDetailSheet` (ngữ cảnh đúng zone trên bản đồ). Slot giữa ✏️ và 🗑️ dùng nút **📍** (vị trí trên Map).
- **Lý do:** Tránh duplicate UX chuyển lô; tính năng “tìm vị trí hàng trên bản đồ” có giá trị hơn tại màn chi tiết SP.
- **Thay thế đã xem xét:** Giữ cả hai nơi — từ chối (trùng chức năng, chiếm chỗ UI).

---

### F19 Dropped — không implement chuyển hàng giữa khu vực

- **Ngày:** tháng 5/2026
- **Quyết định:** Tính năng F19 "chuyển hàng giữa khu vực" bị loại bỏ hoàn toàn khỏi roadmap.
- **Lý do:** Nghiệp vụ thực tế không cần — khi chuyển hàng lên tầng trên thì chỉ cần xóa lô ở kho là đủ; không cần theo dõi hàng ở siêu thị theo lô.

---

### Conflict Detection — Optimistic Locking với `updated_at`

- **Ngày:** tháng 5/2026
- **Quyết định:** Dùng optimistic locking (so sánh `updated_at`) để phát hiện khi 2 user cùng sửa cùng 1 record (`inventory_entries`, `zones`, `products`). Khi user A load record → ghi nhớ `updated_at`. Khi A bấm Save → so sánh `updated_at` local với DB. Nếu DB mới hơn → Alert cảnh báo có người sửa trước với tên người đó (`changed_by_name` từ `audit_logs`). User chọn: **Ghi đè** hoặc **Xem lại**.
- **Lý do:** Tránh mất dữ liệu trong môi trường multi-user; đơn giản hơn pessimistic locking, phù hợp app nội bộ quy mô nhỏ.
- **Thay thế đã xem xét:** Pessimistic locking (lock record khi edit) — từ chối vì phức tạp và có thể gây deadlock nếu user không lưu.

---

### RBAC — 5 Role hierarchy

- **Ngày:** tháng 5/2026
- **Quyết định:** 5 role: **super_admin** (owner — cứng, không thể bị tắt, tạo account trong app, cấp quyền), **admin** (quản lý user, không tạo account), **staff** (full CRUD, default khi tạo), **guest** (read-only, có xem AuditLog và Dashboard), **disabled** (bị block tại login). Thông tin role lưu trong bảng `user_profiles`. Guard client-side (ẩn/disable UI) + RLS server-side.
- **Lý do:** Phân tầng quyền hạn phù hợp cửa hàng nhỏ với chủ và nhân viên; guest hữu ích khi muốn cho người xem tạm thời không chỉnh được gì; disabled cần cho trường hợp nhân viên nghỉ việc.

---

### Global Warning Toggles — 2 toggle riêng, lưu AsyncStorage

- **Ngày:** tháng 5/2026
- **Quyết định:** Thêm 2 toggle trong Settings để bật/tắt cảnh báo hết hạn và cảnh báo hết hàng. Global (áp dụng toàn app, không per user, không per sản phẩm). Lưu vào AsyncStorage để persist. Khi tắt cảnh báo: vẫn hiện sản phẩm trong tab tương ứng nhưng không tô màu đỏ/vàng cảnh báo, không hiện count badge cảnh báo.
- **Lý do:** Cho phép tắt thông báo theo mùa hoặc khi cần focus vào công việc khác mà không bị nhiễu.

---

### Format nhập hạn — DD/MM/YYYY text input

- **Ngày:** tháng 5/2026
- **Quyết định:** Ô nhập hạn sử dụng dùng text input format **DD/MM/YYYY** thay vì date picker native. Validate format trước khi lưu. Nếu nhập **MM/YYYY** (thiếu ngày) → tự điền ngày = 1.
- **Lý do:** Linh hoạt hơn date picker native (không phụ thuộc OS), nhập nhanh hơn cho user quen thao tác.
