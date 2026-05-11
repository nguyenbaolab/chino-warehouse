# Phase 1 — Handoff

## Trạng thái

Chưa sẵn sàng test toàn bộ phase — còn TODO trong `PLAN.md`.

## Cập nhật docs mới — Barcode per lô (Phase 1)

- **Quyết định:** Barcode chuyển từ `products.barcode` sang `inventory_entries.barcode` (per lô).
- **Logic tìm kiếm:** Gõ tên → theo sản phẩm; quét barcode → theo lô.
- **Blocker:** `BLK-001` đã đóng (Resolved), không còn pending.

## Task mới — Barcode per lô (đã implement)

- **Migration:**
  - `20260511_drop_products_barcode.sql` (drop `products.barcode`)
  - `20260511_add_inventory_entries_barcode.sql` (add `inventory_entries.barcode`)
- **Type/store:** `Product` bỏ `barcode`; `InventoryEntry` thêm `barcode?`; `searchByBarcode` trả về **lô** thay vì sản phẩm.
- **UI chính:** `AddInventoryScreen` nhập barcode theo lô; `ProductDetailScreen` hiện/sửa barcode theo lô; `BarcodeScanner` còn 2 mode `locate` + `search`.
- **Locate/Search sau quét:** highlight và hiển thị theo **lô trúng barcode** (zone, tầng, số thùng, hạn, barcode).
- **Bổ sung UI:** `ProductDetailScreen` inline edit có nút 📷 cạnh field barcode lô; `ZoneDetailSheet` hiện barcode lô và bỏ nút `i`; hạn hiển thị toàn app dùng `DD/MM/YYYY` (DB vẫn `YYYY-MM-DD`).

## Task mới — Expand lô + scan barcode tại chỗ

- `MapScreen`: nút `✕` xóa text nằm trong ô tìm kiếm (sát phải), không thay đổi vị trí nút scan 📷.
- `ZoneDetailSheet`: bấm card lô để expand form inline; form có thêm field barcode + nút 📷; quét xong điền barcode vào đúng lô đang mở và giữ nguyên ngữ cảnh màn (không điều hướng sang màn khác).
- `ProductDetailScreen`: bấm card lô để mở form inline ngay (không cần bấm ✏️ mới thấy form), vẫn giữ nguyên nút ✏️.
- `BarcodeScannerScreen`: bổ sung nhánh trả dữ liệu barcode về `ZoneDetailSheet` tương tự `ProductDetailScreen`; không đổi các mode scan khác.

**Test QA:**

1. `MapScreen`: nhập text tìm kiếm, nút `✕` xuất hiện trong input; bấm `✕` xoá text; vị trí nút scan 📷 không đổi.
2. `ProductDetailScreen`: bấm vào phần nội dung card lô -> form inline mở ngay; bấm nút ✏️ vẫn mở như cũ.
3. `ProductDetailScreen`: trong form inline bấm 📷, quét barcode -> scanner đóng, barcode điền vào field của đúng lô đang sửa.
4. `ZoneDetailSheet`: bấm card lô -> form inline có field barcode + nút 📷; quét xong scanner đóng và barcode được điền vào đúng lô đang mở.
5. Verify regression: locate/search/addInventory flows đang chạy ổn như trước (không thay đổi mode khác).

## Task mới — Fix trả barcode đúng màn + ô tìm Sản phẩm

- `BarcodeScannerScreen`: thêm nhánh callback `onScanFillBarcode` để trả mã trực tiếp cho màn gọi scanner rồi đóng modal bằng `goBack()`.
- Áp dụng cho 3 màn: `ProductDetailScreen`, `AddInventoryScreen`, `ZoneDetailSheet`.
- Không navigate vòng qua `MapScreen` cho 3 luồng này.
- Không thay đổi `locate mode` và `search mode` chung đang hoạt động.
- `ProductsScreen`: nút `✕` nằm trong ô tìm kiếm (sát phải input), vị trí nút scan 📷 giữ nguyên.

**Test QA:**

1. `ProductDetailScreen`: mở inline edit lô -> bấm 📷 -> quét mã -> scanner đóng, field barcode của lô đang edit được điền.
2. `AddInventoryScreen`: bấm 📷 ở field barcode lô -> quét mã -> scanner đóng, field barcode được điền.
3. `ZoneDetailSheet`: expand lô -> bấm 📷 -> quét mã -> scanner đóng, field barcode của lô đó được điền.
4. `ProductsScreen`: nhập text, nút `✕` xuất hiện trong input; bấm `✕` xóa text; nút scan 📷 vẫn ở vị trí cũ.
5. Regression nhanh: locate/search hiện có vẫn chạy như trước.

## Task mới — Fix nút `✕` trong tìm kiếm (Map + Products)

- `MapScreen`: clear search phải có hiệu lực tức thì kể cả khi request search cũ chưa trả về.
- `ProductsScreen`: clear search reset danh sách về trạng thái ban đầu ngay khi bấm `✕`.
- Nút `✕` active theo text nhập ngay, không phụ thuộc kết quả search.

**Test QA:**

1. `MapScreen`: nhập từ khóa >= 2 ký tự rồi bấm `✕` ngay -> text mất ngay, panel kết quả biến mất, zone highlight reset.
2. `MapScreen`: thử bấm `✕` khi search đang chờ response -> không bị “nhảy lại” kết quả cũ.
3. `ProductsScreen`: nhập text bất kỳ rồi bấm `✕` -> text mất ngay, danh sách quay về trạng thái lọc ban đầu (theo zone/filter hiện tại).
4. `ProductsScreen`: sau scan barcode theo lô, bấm `✕` -> bỏ trạng thái highlight “kết quả quét barcode theo lô”.

## Cập nhật docs lớn — chuẩn bị scope tiếp theo (chưa implement code)

- `REQUIREMENTS.md` đã bổ sung định hướng mới:
  - Thêm tab **Đặt hàng** (F27) giữa Sản phẩm và Thông báo.
  - Thêm luồng **Không nhập nữa** trong Settings (F28).
  - Cập nhật F18: Notifications tách **Sắp hết hạn / Sắp hết hàng**, bỏ **Để sau**.
  - Bổ sung trường dữ liệu `inventory_entries.is_expired_acknowledged`.
- `DECISIONS.md` đã ghi nhận các quyết định mới:
  - Restructure Notifications theo 2 tab mới.
  - Quyết định tab Đặt hàng (3 trạng thái list, xuất PDF, đánh dấu ⭐ sản phẩm thêm tay).
  - Quyết định sản phẩm không nhập nữa (`is_discontinued`, tồn kho realtime trong Settings).
  - Quyết định hiển thị lô hết hạn: `Lô này đã hết hạn [Xóa lô]`.
  - Cập nhật `is_deferred`: giữ DB nhưng không dùng trong UI mới.

**Test QA cho đợt này:** Không có test runtime vì đây là cập nhật docs/định hướng, chưa có thay đổi code.

## Task mới — ProductDetail: banner lô hết hạn

- `ProductDetailScreen`: thêm banner `Lô này đã hết hạn [Xóa lô]` cho lô có `expiry_date` đã qua ngày hiện tại.
- Nút `Xóa lô` dùng cùng hành vi với lô hết hàng: xóa record lô khỏi DB.
- Nếu lô đồng thời `quantity_boxes = 0` và đã quá hạn thì hiển thị cả 2 banner.

**Test QA:**

1. Tạo/chọn lô có hạn nhỏ hơn hôm nay (ví dụ hôm qua) và `quantity_boxes > 0`: mở `ProductDetailScreen` -> thấy banner `Lô này đã hết hạn` + `Xóa lô`.
2. Bấm `Xóa lô` trên banner hết hạn -> xác nhận -> lô biến mất khỏi danh sách và DB.
3. Với lô `quantity_boxes = 0` và hạn đã qua: card hiển thị cả banner `Lô này đã hết hàng` và `Lô này đã hết hạn`.
4. Với lô chưa hết hạn: không xuất hiện banner hết hạn.

---

## Task gần nhất — Navigation, chi tiết SP, bản đồ, thông báo, số thùng

### 1) `App.tsx` — Tab bar trên stack con

**Thay đổi:** Mỗi tab (`Map`, `Products`, `Notifications`) dùng **stack riêng**: màn chính (`MapMain` / `ProductsMain` / `NotificationsMain`) + `ProductDetail` + `AddInventory`. Tab **Cài đặt** chỉ có `SettingsMain`. Root stack: `Tabs` + `BarcodeScanner` (**fullScreenModal**, không tab bar).

**Test:**

1. Từ **Kho** / **Sản phẩm** / **Thông báo** mở **Chi tiết SP** — thanh tab dưới **vẫn hiện**; **Đóng** quay về đúng tab.
2. Từ chi tiết mở **Thêm hàng** — tab bar **vẫn hiện**; Hủy/ lưu xong quay lại hợp lý.
3. Mở **BarcodeScanner** (từ Kho / Sản phẩm / Chi tiết) — **fullscreen**, **không** tab bar; đóng scanner về đúng ngữ cảnh.
4. **Locate** từ Kho: quét SP có trong hệ thống — scanner **tự đóng** trong ~1 giây; về tab Kho, ô tìm kiếm + highlight zone (params `MapMain`).
5. **Search** từ tab Sản phẩm: quét barcode lô — scanner **tự đóng**; lọc/hiển thị theo đúng lô quét.
6. **Thêm hàng** (vẫn dùng `mode: 'search'` + `addInventoryParams`): quét từ field barcode lô — scanner đóng, quay lại **Thêm hàng** với mã đã điền.
7. **Không còn assign mode**: barcode không gắn per sản phẩm, chỉ theo lô.

*(KI-010 Resolved — `BarcodeScannerScreen`: hoãn `goBack` sau `navigate('Tabs')`.)*

---

### 2) `ProductDetailScreen`

**Thay đổi:** `getCombinedStatus` dùng **`low_critical_boxes = 1` cố định**; không còn UI chỉnh critical. **Mã vạch**, **warning_days**, **low_warning_boxes** nằm trong một khối **Chi tiết** / **Thu gọn** (mặc định thu gọn; nhãn + mũi tên ▾ / ▴). Giữ toolbar **Tổng … thùng** + **Có vấn đề** + **Thêm lô**.

**Test:**

1. Mở chi tiết — chỉ thấy tên + ghi chú (nếu có) + nút **Chi tiết**; bấm mở — chỉnh barcode / ngày / ngưỡng vàng; **Thu gọn** đóng lại.
2. Lọc **Có vấn đề** và danh sách lô vẫn đúng (combined dùng critical = 1).

---

### 3) `MapScreen` — Kết quả tìm

**Thay đổi:** Sau khi tìm được kết quả (≥ 2 ký tự), panel kết quả **mặc định thu gọn**. Header có **Chi tiết** + ▾ / **Thu gọn** + ▴ (cùng hàng với số lượng kết quả).

**Test:**

1. Gõ từ khóa hợp lệ — panel thu gọn, bấm **Chi tiết** mở danh sách (tối đa 5 dòng như cũ).
2. **Thu gọn** — lại dạng tóm tắt theo SP.
3. Xóa ô tìm — panel reset hợp lý.

---

### 4) `NotificationsScreen` — F18 (tab + format card + Để sau)

**Thay đổi:** Hai tab **Có vấn đề / Để sau**; card: dòng **Còn … thùng**, **Số thùng sắp hết hạn: …**; pill tồn theo **tổng thùng** SP, pill hạn theo **lô xấu nhất** (chỉ render khi đỏ/vàng); nút **Để sau** / **Có vấn đề** gọi `toggleDeferred`. DB: `products.is_deferred` (migration `20260511_add_product_is_deferred.sql`).

**Test:** Xem mục **F18 — Thông báo** bên dưới.

---

### 5) `AddInventoryScreen` + `ZoneDetailSheet`

**Thay đổi:** Số thùng cho phép **0** (số nguyên ≥ 0), không còn bắt buộc ≥ 1. **Thêm hàng:** sau khi chọn SP, có field **Mã vạch sản phẩm** (điền sẵn từ `products.barcode`), nhập tay hoặc **📷** (`BarcodeScanner` mode `addInventory`); khi **Lưu**, nếu mã khác DB thì gọi `updateBarcode`.

**Test:**

1. Thêm lô với **0** thùng — lưu được (hoặc luồng cộng dồn trùng lô vẫn hợp lệ nếu backend cho).
2. Sửa lô trong sheet zone — nhập **0** — lưu được.
3. **Mã vạch Thêm hàng:** chọn SP có sẵn barcode — field khớp; sửa tay → Lưu — kiểm tra tab Sản phẩm / chi tiết SP barcode mới; quét 📷 → quay lại field đã điền; xóa hết mã → Lưu — barcode trên SP null (nếu backend cho).

---

## Task cũ — KI-005 (đã fix trước đó)

Xem `docs/KNOWN_ISSUES.md` (KI-005 Resolved): race `fetchProducts` trên `AddInventoryScreen`; `ProductDetail` refetch khi focus.

---

## Đã fix — KI-006 / KI-007 (lô 0 thùng)

**Thay đổi code:** `stores/warehouseStore.ts` — bỏ `.gt('quantity_boxes', 0)` trên `fetchInventoryByZone` và `searchProducts`. `screens/ProductDetailScreen.tsx` — tải mọi lô; validation lưu số thùng ≥ 0; lô 0 thùng: một hàng **Lô này đã hết hàng** + **Xóa lô** (gọi `deleteInventoryEntry`); giữ zone / hạn / ghi chú; ẩn nút 🗑️ cạnh lô khi 0 thùng (chỉ dùng **Xóa lô**). `screens/NotificationsScreen.tsx` — vẫn hiện card khi có lô combined ≠ ok dù tổng “thùng có vấn đề” = 0. `ZoneDetailSheet` không có lọc ẩn cục bộ — danh sách đồng bộ theo store sau fix.

**Test QA:**

1. **ZoneDetailSheet:** Mở một zone có lô, sửa số thùng về **0**, Lưu — lô vẫn hiện trong danh sách tầng (0 thùng, hạn như cũ).
2. **ProductDetailScreen:** Mở cùng sản phẩm — thấy lô 0 thùng; trên cùng thẻ lô có dòng **Lô này đã hết hàng** và **Xóa lô**; zone / tầng / hạn / ghi chú vẫn đúng.
3. **ProductDetailScreen:** Sửa lô inline, nhập **0**, Lưu — thành công; banner hết hàng xuất hiện.
4. **Map / tìm kiếm:** Tìm tên SP chỉ còn lô 0 thùng — vẫn có kết quả và highlight zone (nếu có).
5. **Xóa lô:** Bấm **Xóa lô** trên lô 0 thùng — xác nhận — record biến mất khỏi DB và UI.
6. **Thông báo:** Sản phẩm chỉ còn các lô 0 thùng (combined ≠ ok) — card vẫn xuất hiện, pill **Hết hàng** (tổng 0 thùng | 0 thùng có vấn đề vẫn hợp lệ).

**Ghi chú:** KI-006 (validation 0 thùng ở chi tiết SP) và KI-007 được đóng trong cùng lượt — xem `docs/KNOWN_ISSUES.md`. Mục Resolved cũ TypeError `.has` trên ProductsScreen là **KI-008**.

---

## F18 — Thông báo (đã implement)

**Chuẩn bị:** Chạy migration Supabase `20260511_add_product_is_deferred.sql` (cột `products.is_deferred`). `fetchProducts` / `fetchInventoryByZone` tự nhận cột mới qua `select *`.

**Test QA:**

1. Tab **Có vấn đề:** chỉ SP `is_deferred = false` và có ít nhất một lô combined ≠ `ok`; card có dòng **Còn X thùng**, **Số thùng sắp hết hạn: Y thùng** (Y = tổng thùng các lô có hạn cảnh báo/hết); pill tồn theo **tổng** thùng SP; pill hạn theo **xấu nhất** (Hết hạn ưu tiên trên Sắp hết hạn); pill chỉ hiện khi đỏ/vàng.
2. Bấm **Để sau** trên card — SP chuyển sang tab **Để sau**, biến mất khỏi Có vấn đề; reload app — trạng thái giữ (Supabase).
3. Tab **Để sau:** liệt kê mọi SP `is_deferred = true`; bấm **Có vấn đề** — cờ tắt, SP quay lại Có vấn đề nếu vẫn còn lỗi combined.
4. Tap tên / vùng card (không phải nút tab) — mở **Chi tiết SP** như cũ.
5. SP chỉ có lô ổn (không combined issue) — không có trong Có vấn đề; nếu đánh dấu Để sau rồi sửa hết lỗi, vẫn thấy trong Để sau cho đến khi bấm **Có vấn đề**.

## Sẽ cập nhật khi

DEV hoàn thành TODO trong `PLAN.md` hoặc QA xác nhận xong lượt test trên.

## Hướng dẫn test docs (sau khi implement code)

1. Chạy migration: drop `products.barcode`, add `inventory_entries.barcode`.
2. AddInventory: nhập barcode per lô và lưu được theo từng lô khác nhau cho cùng sản phẩm.
3. ProductDetail: card lô hiển thị barcode của đúng lô.
4. Quét barcode: chỉ highlight zone chứa đúng lô có barcode đó (không phải toàn bộ zone của sản phẩm).
5. Tìm theo tên: vẫn highlight tất cả zone có sản phẩm.
6. ProductDetail inline edit: bấm 📷 cạnh barcode lô, quét mã xong scanner đóng và input barcode được điền vào đúng lô đang sửa.
7. ZoneDetailSheet: card lô có dòng barcode (nếu có), không còn nút `i`.
8. Kiểm tra các màn Map/Products/ProductDetail/ZoneDetail: hạn hiển thị `DD/MM/YYYY`, không đổi format lưu DB.
