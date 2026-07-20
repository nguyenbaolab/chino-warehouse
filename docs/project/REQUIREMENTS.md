# Tài liệu Yêu cầu Sản phẩm (REQUIREMENTS)

**Ứng dụng:** Chino's Warehouse — Quản lý Kho Hàng Nội Bộ
**Cửa hàng:** Chino's Boba Tea & Asian Market | Joensuu, Finland
**Phiên bản:** 1.3.35 | Tháng 7/2026

> **v1.3.37** — D1: `inventory_entries.discount_percent` NUMERIC(5,2) 0–100 NULL; schema v5.2 (UI D2–D4 sau).
> **v1.3.36** — F34 C2: ProductDetail save qty = 0 → Alert nếu lô trong picking draft/in_progress (Giữ nguyên / Xóa khỏi đơn).
> **v1.3.35** — Phase 5 Closed; Phase 6 Planning: F27 carry, Picking UX (B1–B5), Products picking (C1–C2), Hàng giảm giá (D1–D4), SearchableDropdown (E1–E2), Settings redesign (F1). Xem `PLAN_6.md`.
> **v1.3.34** — Products: Mode Tất cả (catalog đủ) default; qty theo location type (cách A); ProductDetail tên kho không phụ thuộc appMode
> **v1.3.33** — ProductsScreen FilterModal: bỏ Mode «Tất cả»; bắt buộc Kho/Siêu thị; qty unit theo filterMode local *(superseded bởi v1.3.34)*
> **v1.3.32** — F34: revert `in_progress` → `draft` (Quay lại chỉnh sửa); giữ `is_picked`
> **v1.3.31** — F37 Biometric login (vân tay / Face ID) + SecureStore credentials; persistSession vẫn false
> **v1.3.30** — C-part2 F35 Done: ExpiryAlert 6 section danh sách entries; tap → ProductDetail
> **v1.3.29** — F35 fix: daily 4 mốc exact-day; 3 notification riêng; ExpiryAlert 6 section counts
> **v1.3.28** — C-part1 F35: expo-notifications + app_settings + ExpiryAlertScreen (admin toggle/time); C-part2 danh sách chưa
> **v1.3.27** — B3 F34 confirm trừ tồn batch; F34 Done
> **v1.3.26** — B2 F34 PickingDetailScreen + store actions + tab switcher Orders
> **v1.3.25** — B1 F34 schema picking_lists + picking_list_items; schema v5.0
> **v1.3.24** — Closeout Phase 4: SUMMARY_4, HANDOFF_4, TESTCASES_4; F36 Done; B1 F27 carry → Phase 5; tạo PLAN_5.
> **v1.3.23** — Group H Done (H1–H4): SEC-12 wrap __DEV__ ~55 chỗ; SEC-14 .gitignore .env.*; SEC-10 backup.ts thêm 3 bảng; SEC-13 npm audit fix.
> **v1.3.22** — Group A Done: KI-039 TTL 30s trên 8 màn; KI-040 Products search server-side + giảm payload; KI-050 xóa toggleDeferred dead path.
> **v1.3.21** — F32 Done (Group D): products.ignore_expiry_warning / ignore_stock_warning; 2 switch ProductDetail; Notifications + Dashboard skip SP có flag.
> **v1.3.20** — C4 Done: màn Kiểm hàng (Settings) — list market entries is_special, tick is_checked, Reset batch; StockCheckScreen + route.
> **v1.3.19** — C3 fix: date range mode hiện mọi lô trong khoảng [Từ, Đến]; nút ➜ kích hoạt / ✕ tắt; checkbox expired/warning disable khi date range active.
> **v1.3.18** — C3 Done: date range Từ/Đến trên tab Sắp hết hạn (lots expired luôn hiện, lots warning filter theo range).
> **v1.3.17** — FilterModal shared (Products/Notifications/Dashboard): filter Mode + Kho + Zone + nút Reset; AuditLog thêm filter Mode; ProductsScreen 4 toggles luôn hiện (không swap theo mode).
> **v1.3.16** — C2 Done: mode switcher Warehouse ↔ Market; dynamic tab label, qty unit, toggle; fetchLocations filter by type.
> **v1.3.15** — C1 Done: rollback shelf tables; migration `locations.type` + `is_special` + `is_checked`; schema v4.1; types cleanup.
> **v1.3.14** — Redesign F36: Market mode (`locations.type`) thay Shelf tables; F34/F35 → Phase 5; Notifications date range + dropdown Kho/Siêu thị. Xem `DECISIONS.md`, `PLAN_4.md` Group C.
> **v1.3.13** — F33 Dropped (`is_on_shelf`); C2 bỏ; kho và kệ tách hoàn toàn. Xem `DECISIONS.md`, `PLAN_4.md` Group C.
> **v1.3.12** — C1 Shelf Management schema: `shelf_zones` / `shelf_items` / `shelf_zone_items` (migration `20260718_create_shelf_tables.sql`, schema v4.0); F36 In progress — **sau này rollback** (v1.3.14). Xem `PLAN_4.md` Group C.
> **v1.3.11** — Khởi động Phase 4: tạo `PLAN_4.md` (Groups A–H: F27 mở rộng, Shelf F33+F36, F32–F35, F21/F25/F26 optional, SEC-10/12/13/14, KI-039/040/050). Xem `docs/phases/phase-4/PLAN_4.md`.
> **v1.3.10** — Closeout Phase 3: F28 Done; F27 mở rộng vẫn Partial → Phase 4; sync SUMMARY_3 / HANDOFF_3 / TESTCASES_3. Xem `docs/phases/phase-3/SUMMARY_3.md`.
> **v1.3.9** — Group F thêm F7 (barcode tự điền khi chọn SP sau quét AddInventory), F8 (dời lô bằng map toàn màn hình); F36 Shelf Management → Phase 4 (cùng F33 `is_on_shelf`). Xem `PLAN_3.md` Group F + §9 Deferred.
> **v1.3.8** — Ghi nhận Group F Phase 3 (F1 navigation scanner, F2 block xóa lô, F3 sync `is_archived`, F4 tap kho→Map, F5 filter chưa ảnh, F31 Internal Notes); sửa F07 xóa lô; thêm F32–F35 Phase 4 (per-SP warning, `is_on_shelf`, picking list, push notification). Xem `PLAN_3.md` Group F + §9 Deferred.
> **v1.3.7** — Chốt scope Phase 3: bugs A1–A5, UX B1–B8, Realtime + conflict, F27/F28/F08 hoàn thiện, F23 Dashboard, F24 RBAC đầy đủ; F19 Dropped; F21/F25/F26 → Phase 4.
> **v1.3** — Cập nhật từ PRD v1.2: sync với các quyết định thiết kế thực tế sau quá trình phát triển Phase 1.
> **v1.3.1** — Đồng bộ cột **Trạng thái** §6 theo closeout Phase 1 (F15/F18/F27/F28).
> **v1.3.2** — Đồng bộ docs sau Phase 2 (F20, F29, fix Thông báo): CONTEXT, REQUIREMENTS §6/§9/§11, KNOWN_ISSUES, DECISIONS.
> **v1.3.3** — Chốt design **F27 mở rộng** (2 tab trong list, list active, số thùng để trống, PDF tổng hợp, nhóm category) và **F30** category 2 cấp; cập nhật §6 §8 §9, DECISIONS, PLAN — **chưa implement code**.
> **v1.3.4** — Chi tiết design **F30**: card Settings **"X nhóm · Y loại"**, màn **Quản lý phân loại** (accordion), `ProductDetail` / `AddInventory` theo luồng dropdown; **DECISIONS** + **CONTEXT** (route, store, types) — **chưa implement code**.
> **v1.3.5** — Triển khai code **F30** (migration, store, `CategoryManagementScreen`, gán phân loại trên `ProductDetailScreen` / `AddInventoryScreen`); §6 F30 **Done**.
> **v1.3.6** — Sync Phase 2: F21 Phase→Phase 3; F22 Partial (SEC-11); F24 Partial (auth cơ bản done); REQUIREMENTS đồng bộ thực tế tổng kết Phase 2.
> Xem §11 để biết những thay đổi so với v1.2.

---

## 1. Tổng quan

Ứng dụng nội bộ cho phép nhân viên tra cứu vị trí, số lượng và hạn sử dụng hàng hoá thông qua bản đồ kho 2D — tìm kiếm bằng tên sản phẩm hoặc quét mã vạch.

Chạy trên Android và iOS (Expo Go). Không cần đăng nhập — mở app là dùng ngay. Dữ liệu đồng bộ thời gian thực trên mọi thiết bị.

**Vị trí trong hệ sinh thái:**
Chino's Warehouse là một module trong hệ thống app nội bộ lớn hơn của Chino's (dự kiến gồm: quản lý kho, chấm công, chia ca...). Phase 1 chạy độc lập. Các phase sau sẽ tích hợp vào super app chung với auth và phân quyền. Chi tiết auth/phân quyền sẽ được thiết kế khi có yêu cầu cụ thể — không thuộc scope hiện tại.

---

## 2. Bối cảnh & Vấn đề cần giải quyết

Chino's có hai không gian làm việc:

- **Phòng kho (tầng dưới):** lưu trữ hàng theo thùng, có các zone với nhiều tầng kệ.
- **Siêu thị (tầng trên):** nơi bán hàng trực tiếp cho khách.

**Vấn đề:** Khi nhân viên ở tầng trên thấy hàng sắp hết, họ phải xuống kho kiểm tra thủ công.

**Giải pháp:** Tra cứu ngay trên điện thoại — biết hàng còn không, ở zone nào, hạn sử dụng thế nào — trước khi xuống kho.

---

## 3. Mục tiêu

- Biết ngay sản phẩm đang ở zone nào, tầng kệ nào mà không cần xuống kho.
- Quét mã vạch từ tầng trên → biết ngay dưới kho còn hàng không.
- Theo dõi hạn sử dụng và tồn kho trực quan bằng màu sắc.
- Mọi cập nhật hiển thị ngay trên tất cả thiết bị trong thời gian thực.
- Thiết kế sẵn sàng cho nhiều kho (Phase 2+), dù Phase 1 chỉ dùng một phòng kho.

---

## 4. Người dùng

Chủ cửa hàng và 1–2 nhân viên.

**Phase 1:** Không đăng nhập — mở app dùng luôn, tất cả có full quyền.
**Phase tương lai:** Tích hợp auth + phân quyền khi super app được triển khai.

---

## 5. Hệ thống màu sắc chuẩn

> **Quan trọng:** Đây là bảng màu duy nhất cho toàn app. Mọi màu trạng thái phải tuân theo bảng này.

Màu trạng thái dựa trên **combined status** — kết hợp cả tồn kho lẫn hạn sử dụng.

| Mức | Điều kiện | Màu | Hex (dark / light) |
|-----|-----------|-----|-------------------|
| Hết hàng | 0 thùng | 🔴 Đỏ | `#EF4444` / `#DC2626` |
| Còn rất ít | 1 thùng | 🔴 Đỏ | `#EF4444` / `#DC2626` |
| Sắp hết hàng | ≤ `low_warning_boxes` | 🟡 Vàng | `#FACC15` / `#EAB308` |
| Hết hạn | đã hết hạn | 🔴 Đỏ | `#EF4444` / `#DC2626` |
| Sắp hết hạn | ≤ `warning_days` còn lại | 🟡 Vàng | `#FACC15` / `#EAB308` |
| Bình thường | không thuộc các mức trên | 🟢 Xanh | `#22C55E` / `#16A34A` |

**Logic ưu tiên:** Đỏ > Vàng > Xanh. Nếu một sản phẩm/lô vừa sắp hết hàng vừa sắp hết hạn → hiện vàng. Nếu hết hàng hoặc hết hạn → hiện đỏ.

**Ngưỡng cảnh báo:**
- `low_warning_boxes`: configurable per sản phẩm (mặc định 3), chỉnh trong màn hình chi tiết sản phẩm.
- `warning_days`: configurable per sản phẩm (mặc định 30 ngày), chỉnh trong màn hình chi tiết sản phẩm.

---

## 6. Danh sách tính năng & Mức độ ưu tiên

| Mã | Tính năng | Mô tả | Ưu tiên | Phase | Trạng thái |
|----|-----------|-------|---------|-------|------------|
| F01 | Dropdown chọn kho | Chọn kho đang xem trên bản đồ: Phase 1 một kho; Phase 2+ **bottom sheet** (tên + kích thước lưới, Thêm kho mới) thay pill cố định. | P1 | MVP | Done |
| F02 | Bản đồ 2D kho hàng | Lưới 2D hiển thị các zone. Tap vào zone để xem danh sách sản phẩm. Mặc định 6×6. | P1 | MVP | Done |
| F03 | Chấm màu trên zone | Khi tìm kiếm/quét mã, zone chứa sản phẩm hiện chấm màu theo combined status của lô xấu nhất. Biến mất khi đóng kết quả. | P1 | MVP | Done |
| F04 | Quản lý zone linh hoạt | Thêm zone, đổi tên, đổi số tầng, di chuyển vị trí. Xóa zone chỉ được khi không còn hàng. | P1 | MVP | Done |
| F05 | Zone nhiều tầng kệ | Zone có nhiều tầng kệ (Tầng 1 = thấp nhất). Tap vào zone → tabs từng tầng. | P1 | MVP | Done |
| F06 | Danh sách sản phẩm trong zone | Tap vào zone → danh sách tên sản phẩm + số thùng + chấm màu. Tap tên → mở chi tiết (F07). | P1 | MVP | Done |
| F07 | Màn hình chi tiết sản phẩm | Tên, mã vạch, tất cả zone+tầng đang chứa, số thùng, hạn (màu), ghi chú, ảnh (Phase 2). Mỗi lô: **✏️** sửa inline · **📍** vị trí trên bản đồ (cross-tab Map qua `locateIntent` store — highlight zone + search expanded) · **🗑️** xóa (**chỉ khi `quantity_boxes = 0`** — banner "Lô này đã hết hàng [Xóa lô]" / hết hạn tương tự). **Không** chuyển lô tại màn này (chuyển lô chỉ ở `ZoneDetailSheet`). | P1 | MVP | Done *(xóa lô: chỉ 0 thùng — fix F2 Phase 3)* |
| F08 | Hình ảnh sản phẩm | Thêm/xem ảnh SP: chụp (`expo-image-picker`) hoặc chọn thư viện; compress 80% JPEG, max 1200px cạnh dài; upload bucket `product-images`, path `{productId}.jpg` (ghi đè); lưu public URL vào `products.image_url`; xóa ảnh / xóa SP → xóa file Storage; zoom pinch full-screen (`ImageViewerModal`); 3 màn: **ProductsScreen** (thumbnail 64×64), **ProductDetailScreen** (block ảnh + đổi/xóa), **AddInventoryScreen** (optional khi tạo SP mới — tạo SP trước rồi upload). | P2 | Phase 3 | Done |
| F09 | Tìm kiếm sản phẩm | Tìm theo tên. Kết quả hiện thẻ sản phẩm + bản đồ tự highlight zone. Tap vào thẻ → mở chi tiết. Tìm kiếm không phân biệt dấu: gõ không dấu vẫn ra kết quả (ví dụ: `mi` → `mì`); hỗ trợ ký tự Phần Lan ö/ä/å → o/a/a. Áp dụng toàn bộ app. **ProductsScreen:** toggle **Chỉ sản phẩm đã ẩn** — tắt: chỉ SP `is_archived = false`; bật: chỉ SP `is_archived = true` (không lẫn SP bình thường). Toggle **Chỉ hết lô** — intersection với search/scan; chỉ hiện SP có tổng `quantity_boxes = 0` trong scope kho/zone đang chọn (độc lập toggle ẩn SP). Toggle **Chỉ chưa có ảnh** — chỉ SP `image_url` null/rỗng (Phase 3 F5). | P1 | MVP | Done *(filter ảnh: F5 Phase 3)* |
| F10 | Quét mã vạch | Camera quét mã vạch → kết quả như tìm kiếm tên. Không nhận ra → nút 'Thêm thủ công'. 3 mode: search / assign / locate. **B2:** không khớp lô (`searchByBarcode`) → `lookupProductByBarcode` → Alert **"Hàng đã hết"** (mô tả tồn / không còn lô với mã) + **Xem chi tiết** (`ProductDetail` trên tab **`returnTab`**, reset stack — Phase 3 F1); vẫn không có → Alert Không tìm thấy. | P1 | MVP | Done *(navigation F1 Phase 3)* |
| F11 | Quản lý tồn kho theo thùng | Đơn vị: thùng nguyên. Thùng đang dở vẫn tính 1. Chỉ cập nhật khi bỏ hẳn. Một sản phẩm có thể ở nhiều zone. | P1 | MVP | Done |
| F12 | Theo dõi hạn sử dụng | Mỗi lô có hạn riêng. Màu sắc theo §5. Hiển thị xuyên suốt toàn app. | P1 | MVP | Done |
| F13 | Ghi chú sản phẩm & lô hàng | Ghi chú tự do cho sản phẩm (nhà cung cấp, bảo quản...) và cho từng lô (ngày nhập, tình trạng...). | P1 | MVP | Done |
| F14 | Thêm sản phẩm mới | Thêm sản phẩm: tên (bắt buộc), mã vạch (tuỳ chọn), ghi chú. **ProductsScreen FAB +:** bottom sheet tạo SP catalog-only (không lô); gợi ý tên khi gõ (`normalizeText`, max 8) — chọn SP đã có → cảnh báo + block **Lưu**; hint tra tên/mã trước khi tạo; **📷** mã vạch → `lookupProductByBarcode` → cảnh báo mã trùng + block **Lưu**; ảnh/category/barcode optional; sau lưu reset **Tất cả kho**. **AddInventory:** inline form tạo SP khi nhập kho. **Xóa sản phẩm:** chỉ khi không còn `inventory_entries` (`ProductDetailScreen` + `deleteProduct`). | P1 | MVP | Done |
| F15 | Thêm lô hàng vào kho | Gán sản phẩm vào zone + tầng + kho: số thùng, hạn, ghi chú, **barcode lô (optional)**. Ô tìm SP: **📷** — `searchByBarcode` (lô còn) hoặc fallback **`lookupProductByBarcode`** (`product_barcodes`, kể SP hết lô) → điền tên vào ô tìm (user tự chọn từ gợi ý, không auto-select) + hint tránh trùng tên · **+ Tạo mới '[tên]'** cuối gợi ý · không kết quả → **Tạo sản phẩm mới**. **F7 (Phase 3):** sau quét barcode, khi user **bấm chọn** SP từ dropdown → ô barcode lô **tự điền** mã vừa quét; gõ tên thủ công → barcode giữ trống. **B2:** trước save barcode → `checkBarcodeConflict` (block + Alert + audit `CONFLICT` qua RPC); sau save OK → `upsertProductBarcode`. Cùng pattern trên **ProductDetail** / **ZoneDetailSheet** inline edit lô. | P1 | MVP | Done *(barcode autofill: F7 Phase 3)* |
| F16 | Sửa / Xóa / Chuyển lô hàng | Cập nhật số thùng, hạn, ghi chú. Xóa khi hết hàng. Truy cập từ màn hình chi tiết (F07). **Chuyển lô** tại `ZoneDetailSheet`: **F8 (Phase 3)** — chọn zone đích bằng **map toàn màn hình** (tap zone → chọn tầng → confirm), thay list dropdown. | P1 | MVP | Done *(dời lô map: F8 Phase 3)* |
| F17 | Đồng bộ thời gian thực | Mọi thay đổi đẩy lên cloud ngay. Tất cả thiết bị thấy cập nhật trong vài giây (Supabase Realtime). | P1 | MVP | Done |
| F18 | Thông báo trong app | Tab Thông báo tách thành 2 tab con **Sắp hết hạn / Sắp hết hàng**. Tab Sắp hết hạn: toggle **Đã giảm giá**; **date range** Từ (mặc định hôm nay) — Đến (mặc định +30 ngày); dropdown **Tất cả / Kho / Siêu thị** (`location.type`). Tab Sắp hết hàng: checkbox hết/sắp hết + nút **Thêm vào danh sách nhập** / **Không nhập nữa**; chỉ dropdown type (không date range). | P2 | MVP+ | Done *(Phase 4 C3: date range + type filter)* |
| F19 | Chuyển hàng giữa khu vực | Chuyển hàng từ kho lên siêu thị hoặc giữa các kho: trừ thùng ở nguồn, cộng thùng ở đích. **(Dropped — không phù hợp nghiệp vụ thực tế, không implement)** | P2 | — | Dropped |
| F20 | Bản đồ nhiều khu vực | Dropdown selector thay thế pill "Kho" trên MapScreen để chuyển đổi giữa các kho (bottom sheet: tên + grid size, ✓ kho đang chọn, nút Thêm kho mới → Cài đặt). Tạo kho mới: nhập tên + grid size (rows × cols, không giới hạn max). Sau khi tạo vẫn cho đổi grid size — tăng thoải mái, giảm chỉ được nếu không có zone nào bị cắt ra ngoài. Xóa kho: block nếu còn **bất kỳ** bản ghi `inventory_entries` nào trong zones của kho đó (kể cả lô 0 thùng chưa xóa thủ công). Tab Sản phẩm / Thông báo: dropdown lọc theo kho (không chọn = logic riêng từng màn — xem CONTEXT §3). Tab Đặt hàng không có dropdown kho. Quản lý kho (đổi tên, xóa) trong Settings → Quản lý kho. Fix KI-004 (đổi kho → clear search). | P2 | Phase 2 | Done |
| F21 | Chế độ offline | Lưu dữ liệu cục bộ, queue thay đổi khi mất mạng, tự đồng bộ khi có mạng trở lại. | P3 | Phase 5 | Not started *(PLAN_5 Group D — optional)* |
| F22 | Lịch sử cập nhật | Log: ai cập nhật gì, lúc nào. (Đã có SEC-11 Audit Log implement chức năng này — xem `KNOWN_ISSUES.md` KI-022 và `DECISIONS.md`) | P3 | Phase 3 | Partial |
| F23 | Trang tổng quan | Màn hình tổng quan truy cập từ Settings. Hiển thị: tổng SKU, tổng kho, số SP sắp hết hàng/hết hàng, số lô sắp hết hạn/đã hết hạn, số SP không nhập nữa. Pie chart tồn/hạn; navigate stat cards. | P3 | Phase 3 | Done |
| F24 | Auth & RBAC | Phase 2: auth cơ bản (email/password, auto-logout). Phase 3 RBAC đầy đủ: role `super_admin` / `admin` / `staff` / `guest` (+ disabled); `super_admin` tạo tài khoản; màn **User Management**; guest read-only (UI + RLS); guest xem AuditLog + Dashboard; `disabled` block login. Bảng `user_profiles`. | P4 | Phase 3 | Done |
| F25 | Báo cáo / Xuất dữ liệu | Xuất dữ liệu tồn kho, lịch sử. | P4 | Phase 5 | Not started *(PLAN_5 Group D — optional)* |
| F26 | Kiểm kho | Cho phép nhân viên đối chiếu và cập nhật lại số lượng thực tế trong kho. Chọn zone → đi từng tầng → nhập số thùng đếm được → lưu lại. Có thể hiện diff so với số hiện tại trước khi confirm. | P2 | Phase 5 | Not started *(PLAN_5 Group D — optional)* |
| F27 | Tab Đặt hàng | **Phần đã giao (Phase 1+):** quản lý nhiều list, CRUD item, trạng thái draft/confirmed/placed. **Mở rộng (design v1.3.3):** List đặt hàng có 2 loại: list **active** (hàng trong kho) và list **tự tạo** (hàng mới). Trong mỗi list có 2 tab: **Hàng trong kho** / **Hàng mới**. Một list active; số thùng để trống đến Confirm; nhóm category; **PDF tổng hợp** 2 tab; Draft → Confirm → Xuất PDF → Đã đặt. | P1 | Phase 1+ | Partial *(B1 carry → Phase 5)* |
| F28 | Danh sách không nhập nữa | Mục trong Settings, hiện số lượng sản phẩm không nhập nữa; mở chi tiết gồm tên, tồn kho realtime, lý do (`discontinued_reason`, optional); có thể chuyển lại tab Sắp hết hàng. | P1 | Phase 1+ | Done |
| F29 | Zone Layout Editor | Màn hình riêng để sắp xếp lại vị trí zone trên lưới. Zone hiển thị dưới dạng tile nhỏ cố định (tên + màu + badge kích thước thật, ví dụ "2×1"). Kéo tile vào grid → đặt zone vào vị trí mới, bóng mờ hiện footprint thật của zone. Collision check theo tọa độ thật, báo đỏ nếu chồng chéo. Nút Preview xem map thật trước khi lưu. Confirm → lưu toàn bộ vị trí mới (`batchUpdateZoneCells`). Truy cập từ MapScreen (nút ▦) khi đang xem một kho. | P2 | Phase 2 | Done |
| F30 | Phân loại sản phẩm (Category system) | **2 cấp:** Cấp 1 (VD: Đồ khô, Đồ đông đá) + Cấp 2 (VD: Mì, sốt, …). **Quản lý** thêm/sửa/xóa trong **Settings**: card **Phân loại sản phẩm** hiển tóm tắt **"X nhóm · Y loại"**; bấm vào → màn **Quản lý phân loại** (accordion **Cấp 1** xổ ra **Cấp 2**). **Gắn vào sản phẩm**, optional **từng cấp** — chọn Cấp 1 **không** bắt buộc phải chọn Cấp 2. **Chi tiết sản phẩm** (section **Chi tiết**): dropdown Cấp 1 → chỉ sau khi chọn Cấp 1 mới hiện dropdown Cấp 2; lưu và sửa được. **AddInventoryScreen:** chọn sản phẩm có sẵn → category **chỉ đọc** (tự điền từ SP); **thêm sản phẩm mới** → dropdown Cấp 1 + Cấp 2 ngay dưới field tên sản phẩm. Phân loại sau → list đặt hàng (F27) cập nhật đúng nhóm. | P2 | Phase 2 | Done |
| F31 | Ghi chú nội bộ (Internal Notes) | Màn **Ghi chú** trong Settings (card entry). Bảng `internal_notes` (`product_id` nullable, `custom_product_name`, reason, created_by, created_at). UI card: ảnh SP 64×64 + tên + lý do (hoặc placeholder + tên tự do + dòng "Sản phẩm chưa có trong hệ thống"). FAB (+) → bottom sheet: autocomplete SP có sẵn **hoặc** gõ tên tự do + lý do. Tap card có `product_id` → ProductDetail; card tên tự do không navigate. Sửa/xóa ghi chú. **RBAC:** guest xem; staff+ sửa/xóa mọi ghi chú. **Tách biệt** F27 Đặt hàng. | P2 | Phase 3 | Done |
| F32 | Cảnh báo per sản phẩm | Cột `products.ignore_expiry_warning` / `ignore_stock_warning` (BOOLEAN default false). 2 switch trên ProductDetail section Chi tiết. Khi bật → SP không hiện trong Notifications / Dashboard cảnh báo tương ứng. | P3 | Phase 4 | Done |
| F33 | Lô "Đã lên kệ" (`is_on_shelf`) | **Dropped.** Không thêm cột `inventory_entries.is_on_shelf`. Siêu thị dùng **Market mode** (F36 redesign) — cùng schema inventory, không cờ link từ lô kho. | P2 | Phase 4 | Dropped |
| F34 | Giỏ hàng / Picking list | Tạo đơn lấy hàng từ kho: thêm SP vào giỏ (autocomplete tối đa **20** gợi ý + ScrollView, ảnh **hoặc quét barcode 📷** → **Modal chọn nhiều lô** tick + **qty mặc định 1** → «Thêm X lô»), chỉnh số lượng, nhóm theo kho/zone/tầng, checklist tick khi lấy xong, OK → trừ `quantity_boxes`. Schema `picking_lists`, `picking_list_items`. Màn hình mới. Tab Orders: label bottom **Lấy hàng**; tab con default **Lấy hàng** trước, **Đặt hàng** sau. **ProductsScreen:** nút **🛒** trên card (staff+) → chọn/tạo draft → `LotPickerModal`. **C2:** ProductDetail save qty = 0 → Alert nếu lô trong picking draft/in_progress (Giữ nguyên / Xóa khỏi đơn). **Revert:** khi `in_progress`, staff+ có thể «Quay lại chỉnh sửa» → `draft` (giữ nguyên `is_picked`; không revert từ `completed`). | P2 | Phase 5 | Done |
| F35 | Push notification (local) | `expo-notifications` — **3 notification riêng** (daily/weekly/monthly). **Daily:** 4 mốc exact-day. **Weekly/Monthly:** range. Settings admin → `app_settings`. **Màn Cảnh báo hết hạn:** 6 section (4 mốc đếm ngược + tuần + tháng), danh sách entries (không trùng section), collapsible, tap → ProductDetail. KI-062 nội dung tĩnh. | P3 | Phase 5 | Done |
| F36 | Market mode (ex Shelf Management) | **Redesign:** không còn 3 bảng `shelf_*`. Cột `locations.type` (`warehouse` \| `market`); reuse `zones` + `inventory_entries`. Mode switcher header Warehouse ↔ Market. Qty cùng cột — UI **«thùng»** / **«sản phẩm»**. Market: toggle **Hàng đặc biệt** (`is_special`); Settings **Kiểm hàng** checklist (`is_checked`) + Reset. RBAC giống kho. | P2 | Phase 4 | Done |
| F37 | Đăng nhập sinh trắc học | Vân tay / Face ID tự bật sau login password đầu. Credentials lưu SecureStore. Toggle tắt trong Settings. Giữ `persistSession: false` + timer 20 phút. Password sai → xoá credentials + fallback form. | P2 | Phase 5 | Done |

---

## 7. Quy tắc nghiệp vụ

### 7.1 Bản đồ & Zone
- Lưới mặc định 6×6. Có thể cuộn ngang/dọc nếu cần nhiều hơn.
- Tap vào zone → danh sách sản phẩm trong zone đó (theo từng tầng nếu có).
- Xóa zone chỉ được khi zone đó không còn lô hàng nào (`quantity_boxes > 0`).
- Đổi kho (selector / sheet F01) → bản đồ tải lại, kết quả tìm kiếm bị xoá.

### 7.2 Chấm màu trên zone
- Chỉ xuất hiện khi có kết quả tìm kiếm hoặc quét mã đang active.
- Màu dựa trên **combined status** của lô xấu nhất trong zone (xem §5).
- Nếu sản phẩm có trong nhiều zone → tất cả zone đó đều hiện chấm màu.
- Biến mất khi đóng kết quả hoặc tìm kiếm mới.

### 7.3 Tồn kho theo thùng
- Đơn vị duy nhất: thùng nguyên.
- Thùng đang dùng dở vẫn tính là 1 thùng.
- Chỉ cập nhật số lượng khi bỏ hẳn thùng đó đi.
- Một sản phẩm có thể có nhiều lô ở nhiều zone/tầng cùng lúc.

### 7.4 Mã vạch
- Hàng có mã vạch: quét → tra cứu theo **lô hàng**.
- Hàng không có mã vạch: tìm tên thủ công. Không bắt buộc phải có mã vạch.
- Quét không nhận ra → hiện nút 'Thêm thủ công'.
- Gõ tên trên **MapScreen**: `searchProducts` tìm **toàn bộ kho** (filter tên SP bằng `normalizeText` trên `store.products`, không phân biệt dấu); kết quả hiển thị **nhóm theo kho** (tên kho + danh sách lô: zone, tầng, số thùng, hạn). Bấm một lô → chuyển sang kho đó, highlight zone tương ứng, đóng panel kết quả. Khi đang xem một kho, chấm màu vẫn áp dụng cho mọi zone khớp trên lưới kho hiện tại (zone kho khác chỉ hiện sau khi chuyển kho hoặc bấm lô trong kết quả).
- Quét barcode: tìm theo **lô**, highlight zone chứa đúng lô và hiện thông tin lô đó.

### 7.5 Ngưỡng cảnh báo
- `low_warning_boxes`: mặc định 3, configurable per sản phẩm tại màn hình chi tiết.
- `warning_days`: mặc định 30, configurable per sản phẩm tại màn hình chi tiết.
- 0–1 thùng: luôn đỏ, không configurable.

### 7.6 Thông báo
- Tab Thông báo tách thành 2 tab: **Sắp hết hạn** và **Sắp hết hàng**.
- Dropdown **Kho** (Tất cả / từng kho); thanh **tìm kiếm** tên SP (`normalizeText`) + quét barcode; **pagination** 10 SP/trang (client).
- Tab **Sắp hết hạn**:
  - Checkbox **Hết hạn (X)** / **Sắp hết hạn (X)** — `X` = số card sau search có ít nhất một lô hết hạn / sắp hết hạn (`warning_days` per SP). Lọc: cả hai tắt hoặc cả hai bật → hiện tất cả; chỉ một bật → chỉ lô/cards thuộc loại đó.
  - Toggle **Đã giảm giá** / **Chưa giảm giá** theo lô; card hết hạn nền đỏ nhạt; tap lô/card → `ProductDetailScreen`.
  - **Dropdown** Tất cả / Kho / Siêu thị — filter theo `locations.type` (Phase 4 C3).
  - **Date range** Từ (mặc định hôm nay) — Đến (mặc định hôm nay +30 ngày); lọc theo `expiry_date` trong khoảng (Phase 4 C3).
- Tab **Sắp hết hàng**:
  - Checkbox **Hết hàng (X)** / **Sắp hết hàng (X)** — `X` = số card sau search với `totalBoxes === 0` / `totalBoxes > 0` và ≤ `low_warning_boxes`. Lọc cùng quy ước hai checkbox như tab hết hạn.
  - Card có nút **Thêm vào danh sách nhập** và **Không nhập nữa** (Settings).
  - **Dropdown** Tất cả / Kho / Siêu thị — **không** date range.
- Không còn tab **Để sau** trong UI.

---

## 8. Mô hình dữ liệu

### 8.1 Location (Kho / Siêu thị)
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Khoá chính |
| name | String | Tên kho (ví dụ: 'Kho', 'Siêu thị') |
| description | String | Ghi chú tuỳ chọn |
| created_at | Timestamp | Tự sinh |
| grid_rows | Integer | Số hàng của lưới (mặc định 6) |
| grid_cols | Integer | Số cột của lưới (mặc định 6) |
| type | TEXT | **Phase 4 C1 Done:** `'warehouse'` \| `'market'` — NOT NULL DEFAULT `'warehouse'`. Market mode reuse cùng Location/Zone/Inventory. |

### 8.2 Zone
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Khoá chính |
| location_id | UUID | Khoá ngoại → Location |
| name | String | Tên zone (ví dụ: 'A', 'Khu lạnh') |
| cells | ZoneCell[] | Mảng {row, col} — 1-indexed |
| color | String | Màu hiển thị trên bản đồ |
| tier_count | Integer | Số tầng kệ (tối thiểu 1) |
| notes | String | Ghi chú |
| updated_at | Timestamp | Tự cập nhật |

### 8.3 Product (Sản phẩm)

Bảng `products` — thêm FK optional tới phân loại (F30):

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Khoá chính |
| name | String | Tên sản phẩm |
| image_url | String | Public URL ảnh từ Supabase Storage bucket `product-images` (`product-images/{productId}.jpg`); null nếu chưa có ảnh |
| notes | String | Ghi chú chung |
| warning_days | Integer | Ngưỡng cảnh báo hạn (mặc định 30) |
| low_warning_boxes | Integer | Ngưỡng cảnh báo tồn (mặc định 3) |
| ignore_expiry_warning | Boolean | **F32 Done:** bỏ qua cảnh báo hết hạn cho SP (default false) |
| ignore_stock_warning | Boolean | **F32 Done:** bỏ qua cảnh báo hết hàng cho SP (default false) |
| is_archived | Boolean | True = đã ẩn (không xóa cứng) |
| created_at | Timestamp | Tự sinh |
| category_level1_id | UUID | Optional. FK → `product_categories_l1` |
| category_level2_id | UUID | Optional. FK → `product_categories_l2` (thuộc cấp 1 tương ứng) |

### 8.4 `product_categories_l1` (Phân loại cấp 1 — F30)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Khoá chính |
| name | String | Tên nhóm cấp 1 (VD: Đồ khô, Đồ đông đá) |

### 8.5 `product_categories_l2` (Phân loại cấp 2 — F30)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Khoá chính |
| level1_id | UUID | FK → `product_categories_l1` |
| name | String | Tên nhóm cấp 2 (VD: Mì, sốt, …) |

### 8.6 Inventory Entry (Lô hàng)
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Khoá chính |
| product_id | UUID | Khoá ngoại → Product |
| zone_id | UUID | Khoá ngoại → Zone |
| tier | Integer | Tầng kệ (1 = thấp nhất) |
| quantity_boxes | Integer | Số lượng — UI label **«thùng»** (warehouse) / **«sản phẩm»** (market); không thêm cột qty riêng |
| barcode | String | Mã vạch của lô (optional) |
| expiry_date | Date | Hạn sử dụng của lô này |
| is_price_reduced | Boolean | Đã giảm giá (Notifications) |
| is_special | Boolean | **Phase 4 C1 Done:** hàng đặc biệt trên market (default false) |
| is_checked | Boolean | **Phase 4 C1 Done:** checklist Kiểm hàng (default false); chủ yếu market + `is_special` |
| discount_percent | Numeric(5,2) | **D1 Done (schema v5.2):** % giảm giá 0–100; NULL = không giảm giá (UI D2–D4) |
| notes | String | Ghi chú lô hàng |
| updated_at | Timestamp | Tự cập nhật |

### 8.7 `product_barcodes` (Lịch sử mã vạch SP — B1)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Khoá chính |
| product_id | UUID | FK → `products` (ON DELETE CASCADE) |
| barcode | String | **UNIQUE** toàn hệ thống — một mã chỉ thuộc một SP |
| first_scanned_at | Timestamp | Lần đầu ghi nhận mã cho SP |
| last_scanned_at | Timestamp | Lần quét/gán gần nhất |

### 8.8 `user_profiles` (RBAC — F24, Phase 3)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | = `auth.uid()`, FK → `auth.users` |
| role | TEXT | `'super_admin'` / `'admin'` / `'staff'` / `'guest'` |
| is_disabled | BOOLEAN | Default `false`. `true` = blocked tại login |
| last_login_at | TIMESTAMP | Cập nhật khi login thành công |
| created_at | TIMESTAMP | Tự sinh |

> Migration: `20260601000000_add_user_profiles.sql`, `20260601000100_add_user_profiles_to_audit.sql`. Cột `discontinued_reason` trên `products` (F28): `20260530002000_f28_add_discontinued_reason.sql`.

### 8.9–8.11 Shelf tables — **Đã xóa**

> **Đã xóa** — migration `20260719_rollback_shelf_add_market_columns.sql` (DROP `shelf_zone_items` / `shelf_items` / `shelf_zones`). File tạo gốc `20260718_create_shelf_tables.sql` giữ trong lịch sử migrations. Thay bằng `locations.type` + `inventory_entries.is_special` / `is_checked` (schema **v4.1**). Xem `DECISIONS.md` Redesign F36.

### 8.12 `picking_lists` (F34 — đơn lấy hàng)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Khoá chính |
| title | String | Tên đơn lấy hàng |
| status | TEXT | `'draft'` \| `'in_progress'` \| `'completed'` — DEFAULT `'draft'` |
| created_at | Timestamp | Tự sinh |
| updated_at | Timestamp | Tự cập nhật |

> Migration: `20260720_create_picking_tables.sql`. Schema **v5.0**. Không audit trigger (giống order). Scope UI: warehouse only.

### 8.13 `picking_list_items` (F34 — dòng trong đơn lấy hàng)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Khoá chính |
| picking_list_id | UUID | FK → `picking_lists` ON DELETE CASCADE |
| inventory_entry_id | UUID | FK → `inventory_entries` ON DELETE CASCADE — gắn đúng lô |
| product_id | UUID | FK → `products` ON DELETE CASCADE |
| zone_id | UUID | FK → `zones` ON DELETE CASCADE |
| tier | Integer | Tầng kệ |
| quantity_boxes | Integer | Số lượng lấy (> 0) |
| is_picked | Boolean | Checklist đã lấy (default false) |
| notes | String | Ghi chú tuỳ chọn |
| created_at | Timestamp | Tự sinh |
| updated_at | Timestamp | Tự cập nhật |

> Confirm đơn → trừ `inventory_entries.quantity_boxes` theo batch (không trừ khi tick `is_picked`). Có thể revert `in_progress` → `draft` để sửa checklist (giữ `is_picked`). Xem `DECISIONS.md` F34.

### 8.14 `app_settings` (F35 — shared notification config)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Khoá chính |
| notification_enabled | Boolean | Bật/tắt local notification (default true) |
| notification_time | TEXT | Giờ hàng ngày `HH:MM` (default `'11:00'`) |
| updated_at | Timestamp | Tự cập nhật |

> Migration: `20260720_create_app_settings.sql`. Schema **v5.1**. Seed 1 row. RLS: SELECT authenticated; UPDATE admin+ (`is_current_user_admin`). Không INSERT/DELETE từ client.

---

## 9. Tổng quan màn hình

| Màn hình | Mô tả | Thành phần chính |
|----------|-------|-----------------|
| Bản đồ kho (Tab) | Màn hình chính | Header dropdown **Chino's Warehouse ↔ Market** (`appMode` global) · Sheet chọn kho · ▦ · Lưới · Search · Quét |
| Zone Detail (Sheet) | Mở khi tap vào zone | Tên zone · Tabs tầng · Danh sách SP · **Chuyển lô** |
| Chi tiết sản phẩm | Tap vào sản phẩm | Tên · Ảnh · Lô · qty label động · ✏️/📍/🗑️ · Chi tiết · Lịch sử |
| Danh sách sản phẩm (Tab) | Catalog + lọc | **Luôn mọi SP** (catalog, kể cả chưa có lô); 4 toggles (ẩn / hết lô / đặc biệt / chưa ảnh); nút **Lọc** → FilterModal Mode (**Tất cả** default / Kho / Siêu thị) + Kho/Zone; qty unit theo `locations.type` từng lô («thùng» / «sản phẩm»; header tách tổng) |
| Đặt hàng (Tab con Orders) | Quản lý list đặt hàng | Danh sách list · 2 tab · PDF (Phase 4) |
| Lấy hàng (Tab Orders, tab con đầu + label bottom) | Danh sách đơn lấy hàng | Tab switcher Lấy hàng/Đặt hàng (default Lấy hàng) · Cards · Tạo đơn |
| Chi tiết đơn lấy hàng (Stack) | Thêm lô, nhóm, tick | Search SP + chọn lô · Nhóm Kho/Zone/Tầng · Checkbox is_picked |
| Thêm hàng (Stack) | Thêm lô hàng | Zone · Tầng · Số lượng · Hạn · F30 category |
| Thông báo (Tab) | Cảnh báo tồn & hạn | Nút **Lọc** → FilterModal Mode/Kho/Zone; tab Sắp hết hạn: checkbox + **date range** (➜ kích hoạt mọi lô ∈ [Từ,Đến]; ✕ về mặc định expired/warning); tab Sắp hết hàng: checkbox (không date range) |
| Cài đặt (Tab) | Tuỳ chỉnh app | Theme · cảnh báo · Quản lý kho · … · **Kiểm hàng** (C4) · **Thông báo hết hạn** (F35) · Audit · User |
| Kiểm hàng (Stack, F36 C4) | Checklist market | List `is_special` (market zones); tick `is_checked`; Reset batch; RBAC `canWrite` |
| Quét mã vạch (Fullscreen) | Camera overlay | Khung ngắm · Kết quả |
| Tổng quan kho (Stack, F23) | Dashboard | Nút **Lọc** → FilterModal; 8 stats + pie |
| Quản lý người dùng (Stack, F24) | User Management | Admin only |
| Quản lý phân loại (Stack, F30) | CRUD category 2 cấp | Accordion L1/L2 |
| Zone Layout Editor | Sắp xếp zone | Drag tiles |
| AuditLogScreen | Tra cứu lịch sử | Filter **Mode** + Kho + Người + SP · pagination |

---

## 10. Tech Stack

| Tầng | Công nghệ | Lý do |
|------|-----------|-------|
| Mobile | React Native (Expo SDK) | iOS + Android từ 1 codebase |
| Ngôn ngữ | TypeScript | An toàn kiểu dữ liệu |
| State | Zustand | Nhẹ, đơn giản |
| Backend & DB | Supabase (PostgreSQL + Realtime) | Đồng bộ thời gian thực sẵn có |
| Lưu trữ ảnh | Supabase Storage | Tích hợp sẵn (Phase 2) |
| Auth | Không (Phase 1) | Mở app dùng luôn |
| Barcode | expo-camera (CameraView) | Camera native, hỗ trợ hầu hết định dạng |
| Navigation | React Navigation (Bottom Tabs + Stack) | 5 tab (Kho, Sản phẩm, Lấy hàng, Thông báo, Cài đặt) + stack screens + modal BarcodeScanner |
| Offline | Zustand persist (Phase 4) | Cache cục bộ, sync khi có mạng |

---

## 11. Lộ trình phát triển

| Giai đoạn | Phạm vi | Mục tiêu |
|-----------|---------|----------|
| **Phase 1 – MVP** | F01–F07, F09–F18, F27–F28 | App dùng được ngay: tìm hàng, quét mã, cập nhật tồn kho; thông báo + đặt hàng + discontinued |
| **Phase 1+ → Phase 2** | PDF & nối list đặt hàng, field lý do discontinued | Ổn định và khép kín nghiệp vụ đã mở |
| **Phase 2** | Đã giao: **F20**, **F29**, **F30**, fix Thông báo. Kế hoạch / design: **F27** mở rộng (2 tab, active list, PDF tổng hợp, grouping); còn F08 ảnh, F19 chuyển hàng, F21 offline, F26 kiểm kho, … | Mở rộng vận hành đa kho, đặt hàng, phân loại |
| **Phase 3** | **Bug fixes (A1–A5):** DD/MM/YYYY hạn (KI-044), ProductsScreen barcode/X/search (KI-045), zone overlap (KI-046), Map barcode text search (KI-047), conflict detection `updated_at` (KI-048). **UX (B1–B8):** badge giảm giá, chuyển lô cùng zone, `normalizeText`, MM/YYYY→ngày 1, hint AddInventory, sửa tên ZoneDetail, Map scan→sheet scroll, toggle cảnh báo global. **Realtime (C1):** zones Realtime trên Map. **Hoàn thiện:** F27 (2 tab + PDF), F28 (`discontinued_reason`), F08 (ảnh SP). **Mới:** F23 Dashboard, F24 RBAC (`user_profiles`), **F31 Internal Notes**. **Bổ sung (Group F):** F1 navigation scanner (KI-057), F2 block xóa lô (KI-058), F3 sync `is_archived`, F4 tap kho→Map, F5 filter chưa ảnh, **F7** barcode autofill AddInventory, **F8** dời lô bằng map. **Security:** SEC-05, SEC-06. **Dropped:** F19. | Ổn định multi-user, UX vận hành, đặt hàng/PDF, RBAC, ghi chú nội bộ |
| **Phase 4** | **Closed.** **F36 Market mode** Done (C1–C4); **F32** Done; KI-039/040/050 Done; SEC-10/12/13/14 Done (H1–H4). **F27 mở rộng** carry → Phase 5. **F34/F35 / F21/F25/F26 / KI-026** → Phase 5. **F19/F33 Dropped.** Xem `SUMMARY_4.md`, `PLAN_4.md`. | Market first-class + vận hành |
| **Phase 5** | **Closed.** **F34** Picking Done; **F35** Push Done; UX/bugfixes (KI-063/064/066/068/069/070). **F27 mở rộng** carry → Phase 6. Optional F21/F25/F26 / Expo / KI-026 deferred. Xem `SUMMARY_5.md`, `HANDOFF_5.md`. | Picking + push + ổn định |
| **Phase 6** | **F27 mở rộng** (A1); Picking UX (B1–B5); Products picking (C1–C2); Hàng giảm giá (**D1 schema Done** → D2–D4); SearchableDropdown (E1–E2); Settings redesign (F1). Xem `PLAN_6.md`. | Hoàn thiện picking + giảm giá + UX |

---

## 12. Thông tin cần bổ sung (Open Questions)

| Mã | Câu hỏi | Ảnh hưởng đến |
|----|---------|--------------|
| OQ1 | Kho có bao nhiêu zone? Zone nào có nhiều tầng kệ và mấy tầng? | Cấu hình lưới ban đầu |
| OQ2 | Đã có danh sách sản phẩm sẵn chưa (Excel, giấy...)? | Có thể import thay vì nhập tay |
| OQ3 | Lưới bản đồ mặc định muốn bao nhiêu ô? (Đề xuất: 6×6) | Kích thước bản đồ |
| OQ4 | Các module khác trong super app là gì? Có API chung không? | Thiết kế auth Phase 3 |

> OQ1–OQ3 không chặn việc phát triển. Có thể code xong rồi chủ cửa hàng tự cấu hình sau.

---

## 13. Thay đổi so với PRD v1.2

| Mục | v1.2 | v1.3 (hiện tại) | Lý do |
|-----|------|-----------------|-------|
| Hệ thống màu | 3 màu, chỉ dựa vào hạn sử dụng | Combined status (tồn + hạn), vàng gộp sắp hết hàng & sắp hết hạn | Đơn giản hơn cho người dùng |
| Ngưỡng cảnh báo | 30 ngày cứng | Configurable `warning_days` per sản phẩm | Linh hoạt hơn |
| Sắp hết hàng | Icon đơn giản khi ≤1 thùng | 0–1 thùng = đỏ; ≤ `low_warning_boxes` = vàng (configurable) | Rõ ràng hơn |
| Màu zone | Chỉ theo hạn | Combined status | Nhất quán với hệ thống màu |
| Tab Thông báo | Phase 2, chỉ hạn sử dụng | Phase 1+, cả tồn + hạn | Đã implement, giữ lại |
| F numbering | F01–F25 theo PRD | Giữ nguyên theo PRD | PRD là gốc chuẩn |
| Phase 2 docs | — | F20/F29 Done; mô tả xóa kho / filter Thông báo khớp code & DECISIONS (v1.3.2) | Đồng bộ sau implement |
| F27 / F30 design | — | v1.3.3: F27 mở rộng (2 tab, active list, PDF gộp, category trong list); F30 category 2 cấp + schema §8 | Chốt design, chưa code |
| F30 design v1.3.4 | — | Card **X nhóm · Y loại**, `CategoryManagementScreen`, accordion; `ProductDetail` / `AddInventory` dropdown theo cấp; DECISIONS + CONTEXT | Chốt design, chưa code |
| F30 code v1.3.5 | — | Task 3/3: `ProductDetailScreen` (Chi tiết: dropdown Cấp 1/2, `fetchCategories` khi store rỗng, `updateProductCategory`); `AddInventoryScreen` (read-only + tạo SP mới kèm category); store `updateProductCategory` | Done |
| Auth | F25 độc lập | F24 — gắn với super app integration | Định hướng hệ sinh thái rõ hơn |
| Super app | Không đề cập | Ghi nhận trong §1 và F24 | Thông tin mới từ chủ cửa hàng |
| Phase 3 scope v1.3.7 | — | PLAN_3: A1–A5, B1–B8, C1, D1–D3, E1–E2; F19 Dropped; F21/F25/F26 → Phase 4 | Chốt roadmap Phase 3 |
| Phase 3 Group F v1.3.8 | — | PLAN_3 Group F: F1 navigation (KI-057), F2 block xóa lô (KI-058), F3 `is_archived`, F4 tap kho→Map, F5 filter ảnh, F31 Internal Notes; F07 sửa xóa lô; F32–F35 → Phase 4 | Ghi nhận backlog mới |
| Phase 4 closeout v1.3.24 | — | SUMMARY_4 / HANDOFF_4 / TESTCASES_4; F36 Done; F27 carry → Phase 5; PLAN_5 | Closeout Phase 4 |
| Group A KI-039/040/050 v1.3.22 | — | TTL 30s 8 màn; fetchProductsPage hybrid; xóa toggleDeferred | Group A Done |
| F32 ignore warning flags v1.3.21 | — | ignore_expiry_warning / ignore_stock_warning; ProductDetail switches; Notifications + Dashboard skip | F32 Done |
| C4 Kiểm hàng v1.3.20 | — | Settings StockCheck: market is_special list, tick is_checked, Reset batch | C4 Done |
| C3 Date range Notifications v1.3.19 | — | Tab Sắp hết hạn: ➜ date range mode (mọi lô ∈ [from,to]); ✕ về mặc định; checkbox disable khi active | C3 Done |
| C2 Mode switcher + FilterModal v1.3.17 | — | FilterModal shared; 4 toggles Products; AuditLog Mode; catalog ≠ appMode | FilterModal |
| C2 Mode switcher v1.3.16 | — | appMode + header dropdown; tab Kho/Siêu thị; getQtyUnit; Products Hàng đặc biệt | C2 Done |
| C1 Market columns v1.3.15 | — | Rollback shelf; `locations.type` + is_special/is_checked; schema v4.1 | C1 Done |
| F36 Market mode redesign v1.3.14 | — | Rollback shelf tables; `locations.type` + is_special/is_checked; F34/F35 → Phase 5; Notifications date range | Redesign F36 |
| F33 Dropped v1.3.13 | — | Bỏ `is_on_shelf`; C2 Dropped; kho/kệ tách hoàn toàn | Quyết định vận hành cửa hàng nhỏ |
| Phase 4 C1 schema v1.3.12 | — | `shelf_zones` / `shelf_items` / `shelf_zone_items`; schema v4.0; F36 In progress (schema only) | C1 Shelf Management |
| Phase 4 kickoff v1.3.11 | — | Tạo `PLAN_4.md` Groups A–H; F27/Shelf/F32–F35 ưu tiên; G có thể defer | Khởi động Phase 4 |
| Phase 3 closeout v1.3.10 | — | SUMMARY_3/HANDOFF_3/TESTCASES_3; F28 Done; F27 mở rộng → Phase 4; PLAN_3 Closed 28/29 | Closeout Phase 3 |
| Phase 3 Group F+ v1.3.9 | — | PLAN_3 F7 barcode autofill AddInventory, F8 dời lô bằng map; F36 Shelf Management → Phase 4 (cùng F33) | UX nhập kho + chuyển lô + kệ siêu thị |
