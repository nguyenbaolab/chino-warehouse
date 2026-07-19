# Phase 4 — Test Cases

---

## TC-401: Market mode switcher
1. Mở app → MapScreen header hiện "Chino's Warehouse"
2. Tap header → dropdown hiện 2 option
3. Chọn "Chino's Market" → header đổi, tab Map đổi "Siêu thị"
4. Location selector chỉ hiện locations `type=market`
5. Tạo kho mới trong market mode → type = market (verify DB)
6. Đổi lại Warehouse → locations filter đúng

## TC-402: Qty label dynamic
1. Warehouse mode → mọi qty hiện "thùng"
2. Market mode → mọi qty hiện "sản phẩm"
3. Kiểm tra: ZoneDetailSheet, AddInventory, ProductDetail, Notifications, MapSearch, BarcodeScan, AuditLog

## TC-403: FilterModal (Products/Notifications/Dashboard)
1. Mở Products → nút "Lọc" hiện
2. Tap → FilterModal mở: Mode (Tất cả/Kho/Siêu thị), dropdown Kho, dropdown Zone
3. Chọn Mode = Siêu thị → dropdown Kho chỉ hiện market locations
4. Chọn Kho → Zone enable, hiện zones của kho đó
5. Badge "Lọc (2)" hiện đúng count
6. "Xóa bộ lọc" → reset tất cả
7. Lặp lại cho Notifications + Dashboard

## TC-404: ProductsScreen 4 toggles
1. 4 toggles luôn hiện bất kể mode: Chỉ SP đã ẩn, Chỉ hết lô, Hàng đặc biệt, Chưa có ảnh
2. Bật "Hàng đặc biệt" → chỉ SP có lô is_special trong kết quả
3. Bật "Chỉ hết lô" → chỉ SP không còn lô (qty = 0)
4. Kết hợp toggle + FilterModal → filter chồng đúng

## TC-405: AuditLogScreen filter Mode
1. Mở AuditLog → có button Mode
2. Chọn "Siêu thị" → dropdown Kho chỉ hiện market locations
3. Audit entries filter theo kho đã chọn

## TC-406: Notifications date range
1. Tab Sắp hết hạn → row Từ/Đến hiện (DD/MM/YYYY)
2. Nhập range → bấm ➜ → chỉ hiện lô có expiry_date trong range (kể cả ok)
3. Checkbox Hết hạn/Sắp hết hạn disable khi date range active
4. Bấm ✕ → quay về mặc định, checkbox hoạt động
5. Nhập ngày invalid → Alert, không kích hoạt

## TC-407: StockCheckScreen (Kiểm hàng)
1. Settings → card Kiểm hàng → mở StockCheckScreen
2. Hiện list market entries is_special = true
3. Tap checkbox → is_checked toggle (verify DB)
4. Nút Reset → Alert confirm → tất cả is_checked = false
5. Guest: checkbox + Reset disabled
6. Subtitle trên Settings card hiện X/Y đúng

## TC-408: F32 ignore warning per SP
1. ProductDetail → section Chi tiết → 2 Switch hiện
2. Bật "Bỏ qua cảnh báo hết hạn" → SP không hiện trong tab Sắp hết hạn + Dashboard expiry count
3. Bật "Bỏ qua cảnh báo hết hàng" → SP không hiện trong tab Sắp hết hàng + Dashboard stock count
4. Tắt switch → SP hiện lại

## TC-409: Warning toggles global (Settings)
1. Settings → tắt "Cảnh báo hết hạn" → tab Sắp hết hạn hiện "Cảnh báo hết hạn đã tắt"
2. Map chấm zone chỉ tính stock
3. Tắt "Cảnh báo hết hàng" → tab Sắp hết hàng hiện empty + Map chỉ tính expiry
4. Tắt cả 2 → Map chấm xám + cả 2 tab trống

## TC-410: TTL cache (A1)
1. Mở InternalNotes → quay lại Settings → mở lại InternalNotes trong <30s → không fetch lại
2. Đợi >30s → mở lại → fetch mới
3. ProductDetail: mở SP A → quay lại → mở SP B → force fetch (khác productId)

## TC-411: Products hybrid search (A2)
1. Gõ search → debounce 300ms → server query .ilike
2. Gõ barcode digits → match từ product_barcodes
3. Pagination ← → hoạt động đúng

## TC-412: LocationManagement dropdown mode
1. Settings → Quản lý kho → dropdown Tất cả/Kho/Siêu thị
2. "Tất cả" hiện mọi location + badge type
3. "Kho" chỉ hiện warehouse locations
4. Tạo kho trong market mode → type = market, hiện trong Siêu thị filter

## TC-413: Security
1. Build production APK → `console.log` không leak (grep bundle hoặc logcat)
2. `.gitignore`: tạo `.env.production` → confirm git status ignored
3. `backup.ts`: chạy → output 12 bảng đủ trong JSON
