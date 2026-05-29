# Phase 3 — TESTCASES

Test cases Phase 3: **TC-301** trở đi (Phase 1: TC-1xx / feature prefix; Phase 2: TC-2xx).  
Điền **Pass/Fail** khi chạy test thủ công trên thiết bị hoặc APK.

Tham chiếu scope: **`docs/phases/phase-3/PLAN_3.md`**.

---

## Nhóm A — Bug Fixes (TC-301 → TC-310)

### TC-301: ZoneDetailSheet — nhập hạn DD/MM/YYYY hợp lệ

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-301 |
| **Tên** | Nhập hạn DD/MM/YYYY hợp lệ → lưu đúng |
| **Điều kiện** | Đã đăng nhập staff+; mở ZoneDetailSheet; có lô đang sửa/thêm |
| **Bước thực hiện** | 1. Mở form hạn sử dụng. 2. Nhập `30/12/2026`. 3. Lưu lô. 4. Mở lại lô hoặc ProductDetail. |
| **Kết quả mong đợi** | Lưu thành công; hiển thị hạn `30/12/2026` (DB `2026-12-30`). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-302: ZoneDetailSheet — MM/YYYY tự điền ngày 1

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-302 |
| **Tên** | Nhập MM/YYYY → tự điền ngày 1 |
| **Điều kiện** | Form hạn DD/MM/YYYY đã triển khai |
| **Bước thực hiện** | 1. Nhập `12/2026`. 2. Lưu. |
| **Kết quả mong đợi** | Lưu thành công tương đương `01/12/2026`. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-303: ZoneDetailSheet — sai format hạn

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-303 |
| **Tên** | Nhập sai format → báo lỗi, không lưu |
| **Điều kiện** | Form hạn đang mở |
| **Bước thực hiện** | 1. Nhập `2026-12-30` hoặc `abc` hoặc `32/13/2026`. 2. Bấm Lưu. |
| **Kết quả mong đợi** | Alert/validation; không ghi DB; form giữ giá trị để sửa. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-304: ProductsScreen — quét barcode → X restore list

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-304 |
| **Tên** | Quét barcode → lọc → X → restore toàn bộ danh sách |
| **Điều kiện** | Tab Sản phẩm; DB có nhiều SP; một lô có barcode đã biết |
| **Bước thực hiện** | 1. Quét barcode → list chỉ còn SP khớp. 2. Bấm ✕ trong ô tìm. |
| **Kết quả mong đợi** | Danh sách trở về đầy đủ theo filter kho/zone hiện tại (không kẹt kết quả quét). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-305: ProductsScreen — xóa từng ký tự search

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-305 |
| **Tên** | Xóa từng ký tự → list mở dần |
| **Điều kiện** | Đã gõ từ khóa lọc được một phần danh sách |
| **Bước thực hiện** | 1. Gõ tên SP hẹp kết quả. 2. Xóa lần lượt từng ký tự cuối. |
| **Kết quả mong đợi** | Mỗi lần xóa, danh sách mở rộng theo query mới (incremental). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-306: ProductsScreen — gõ mã vạch text search

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-306 |
| **Tên** | Gõ mã vạch vào ô search → tìm SP |
| **Điều kiện** | Lô có `inventory_entries.barcode` = mã đã biết |
| **Bước thực hiện** | 1. Tab Sản phẩm. 2. Gõ đúng barcode vào ô tìm (không quét). |
| **Kết quả mong đợi** | Hiện SP sở hữu lô có barcode đó. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-307: MapScreen — gõ mã vạch text search

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-307 |
| **Tên** | Map search theo barcode text |
| **Điều kiện** | Lô có barcode trong kho đang chọn hoặc toàn kho |
| **Bước thực hiện** | 1. Tab Kho. 2. Gõ barcode vào ô tìm (≥2 ký tự nếu rule giữ nguyên). |
| **Kết quả mong đợi** | Panel kết quả có lô/SP khớp; zone highlight đúng màu combined status. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-308: Tạo zone — không chồng khi double-tap/lag

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-308 |
| **Tên** | Double-tap/lag không tạo zone chồng |
| **Điều kiện** | MapScreen; chế độ tạo zone |
| **Bước thực hiện** | 1. Chọn ô + lưu zone. 2. Double-tap Xác nhận nhanh hoặc mạng chậm. 3. Kiểm tra lưới. |
| **Kết quả mong đợi** | Chỉ một zone tại tọa độ; không có hai zone trùng cells; nút tạo bị lock khi đang xử lý. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-309: Conflict — user B lưu sau user A → Alert

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-309 |
| **Tên** | Hai user cùng sửa lô — Alert conflict |
| **Điều kiện** | 2 tài khoản; cùng mở một `inventory_entry`; A5 đã implement |
| **Bước thực hiện** | 1. User A mở lô, sửa số thùng, **Lưu**. 2. User B (đã mở từ trước) sửa ghi chú, **Lưu**. |
| **Kết quả mong đợi** | B thấy Alert: có người cập nhật trước (tên từ audit); nút **Ghi đè** và **Xem lại**. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-310: Conflict — Ghi đè vs Xem lại

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-310 |
| **Tên** | Chọn Ghi đè hoặc Xem lại |
| **Điều kiện** | TC-309 đã kích hoạt Alert trên user B |
| **Bước thực hiện** | 1a. B chọn **Ghi đè** → Lưu. 1b. Lặp scenario; B chọn **Xem lại**. |
| **Kết quả mong đợi** | Ghi đè: DB = giá trị B. Xem lại: không lưu; form đóng hoặc reload dữ liệu mới từ server. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

## Nhóm B — UX (TC-311 → TC-320)

### TC-311: Notifications — badge Đã giảm giá không cần expand

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-311 |
| **Tên** | Toggle giảm giá → badge ngay trên card |
| **Điều kiện** | Tab Thông báo → Sắp hết hạn; card SP có lô warning |
| **Bước thực hiện** | 1. Bật **Đã giảm giá** cho lô/card. 2. Không expand card. |
| **Kết quả mong đợi** | Card hiện badge/icon/text "Đã giảm" ngay (xanh hoặc ✓). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-312: Chuyển lô — danh sách có zone hiện tại

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-312 |
| **Tên** | Modal chuyển lô có zone đang đứng |
| **Điều kiện** | ZoneDetailSheet; lô quantity > 0 |
| **Bước thực hiện** | 1. Bấm chuyển lô (→). 2. Mở dropdown zone đích. |
| **Kết quả mong đợi** | Danh sách **có** zone hiện tại của lô (không bị lọc bỏ). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-313: Chuyển lô — cùng zone khác tầng

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-313 |
| **Tên** | Chuyển cùng zone, tầng khác |
| **Điều kiện** | Zone có ≥2 tầng |
| **Bước thực hiện** | 1. Chọn zone hiện tại. 2. Chọn tầng đích khác. 3. Xác nhận. |
| **Kết quả mong đợi** | Lô đổi `tier`; vẫn cùng `zone_id`; hiển thị đúng trên sheet và Map. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-314: normalizeText — dấu phẩy

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-314 |
| **Tên** | Tìm "mi,goi" → ra "mì gói" |
| **Điều kiện** | SP tên "mì gói" (hoặc tương tự) trong DB |
| **Bước thực hiện** | 1. Tab Kho hoặc Sản phẩm. 2. Gõ `mi,goi`. |
| **Kết quả mong đợi** | Có kết quả khớp SP (dấu phẩy bị bỏ qua khi so sánh). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-315: normalizeText — dấu nháy đơn

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-315 |
| **Tên** | Tìm "mi'goi" → ra kết quả |
| **Điều kiện** | Giống TC-314 |
| **Bước thực hiện** | 1. Gõ `mi'goi`. |
| **Kết quả mong đợi** | Vẫn match SP như gõ không dấu nháy. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-316: AddInventoryScreen — hint text mới

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-316 |
| **Tên** | Hint và note AddInventory hiển thị đúng |
| **Điều kiện** | B5 đã implement |
| **Bước thực hiện** | 1. Mở Thêm hàng. 2. Đọc note trên ô tìm SP và hint dưới ô. |
| **Kết quả mong đợi** | Có câu hỏi chủ xem đã nhập chưa; có nhắc quét/tra tên trước khi tạo mới. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-317: ZoneDetailSheet — sửa tên SP inline

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-317 |
| **Tên** | Sửa tên SP tại zone sheet |
| **Điều kiện** | staff+; có SP trong zone |
| **Bước thực hiện** | 1. Chạm tên SP → TextInput. 2. Đổi tên. 3. Blur/Done. |
| **Kết quả mong đợi** | `products.name` cập nhật; list refresh; tên mới ở Products/Map search. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-318: Map scan → ZoneDetailSheet + scroll

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-318 |
| **Tên** | Bấm kết quả search → mở sheet + scroll tới SP |
| **Điều kiện** | B7 đã implement; có lô barcode trong kết quả |
| **Bước thực hiện** | 1. Quét hoặc gõ barcode trên Map. 2. Bấm một lô trong panel kết quả. |
| **Kết quả mong đợi** | ZoneDetailSheet mở zone đó; danh sách scroll tới đúng SP/lô. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-319: Settings — tắt cảnh báo hết hạn

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-319 |
| **Tên** | Tắt toggle hết hạn → không tô màu tab |
| **Điều kiện** | Có SP/lô sắp hết hạn hoặc hết hạn |
| **Bước thực hiện** | 1. Settings → tắt **Cảnh báo hết hạn**. 2. Tab Thông báo → Sắp hết hạn. |
| **Kết quả mong đợi** | Vẫn thấy SP/lô; **không** màu đỏ/vàng cảnh báo; checkbox count không đếm badge cảnh báo (theo spec). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-320: Settings — tắt cảnh báo hết hàng

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-320 |
| **Tên** | Tắt toggle hết hàng → không tô màu tab |
| **Điều kiện** | Có SP sắp hết hàng |
| **Bước thực hiện** | 1. Tắt **Cảnh báo hết hàng**. 2. Tab Sắp hết hàng. |
| **Kết quả mong đợi** | Tương tự TC-319 cho nhánh tồn kho thấp. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

## Nhóm C — Realtime (TC-321 → TC-323)

### TC-321: Realtime — thiết bị A thêm zone → B thấy ngay

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-321 |
| **Tên** | INSERT zone realtime trên Map |
| **Điều kiện** | 2 thiết bị cùng login; C1 đã bật; cùng kho |
| **Bước thực hiện** | 1. A và B mở tab Kho, cùng kho. 2. A tạo zone mới. |
| **Kết quả mong đợi** | B thấy zone xuất hiện trên lưới trong vài giây, không reload app. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-322: Realtime — A xóa zone → B thấy biến mất

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-322 |
| **Tên** | DELETE zone realtime |
| **Điều kiện** | Zone trống hàng, có thể xóa |
| **Bước thực hiện** | 1. A xóa zone. 2. B quan sát Map. |
| **Kết quả mong đợi** | Zone biến mất trên B. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-323: Realtime — A đổi tên zone → B thấy tên mới

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-323 |
| **Tên** | UPDATE zone realtime |
| **Điều kiện** | Zone tồn tại trên cả hai màn |
| **Bước thực hiện** | 1. A đổi tên zone. 2. B quan sát label trên Map. |
| **Kết quả mong đợi** | Tên mới hiện trên B. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

## Nhóm D — F27 / F28 / F08 (TC-331 → TC-345)

### TC-331: F27 — list có 2 tab Hàng trong kho / Hàng mới

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-331 |
| **Tên** | Order detail 2 tab |
| **Điều kiện** | D1 đã implement |
| **Bước thực hiện** | 1. Mở một order list. |
| **Kết quả mong đợi** | Thấy tab **Hàng trong kho** (trái) và **Hàng mới** (phải). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-332: F27 — chỉ một list active

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-332 |
| **Tên** | Một list active duy nhất |
| **Điều kiện** | Có cơ chế list active |
| **Bước thực hiện** | 1. Tạo/kích hoạt list A active. 2. Thử tạo list B active. |
| **Kết quả mong đợi** | Chỉ một list mang trạng thái active; list cũ không còn active. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-333: F27 — chưa có active → popup đặt tên

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-333 |
| **Tên** | Auto tạo list + popup tên |
| **Điều kiện** | Không có list active |
| **Bước thực hiện** | 1. Thêm SP từ Sắp hết hàng vào đặt hàng (hoặc flow kích hoạt active). |
| **Kết quả mong đợi** | Popup đặt tên (mặc định theo ngày, cho sửa); tạo list active. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-334: F27 — SP từ Sắp hết hàng, ô thùng trống

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-334 |
| **Tên** | Số thùng để trống khi nhảy vào list |
| **Điều kiện** | List active; tab Hàng trong kho |
| **Bước thực hiện** | 1. Notifications → Thêm vào danh sách nhập. 2. Mở item trong list. |
| **Kết quả mong đợi** | Item ở tab Hàng trong kho; ô số thùng **trống** (chưa điền). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-335: F27 — bắt buộc điền thùng trước Confirm

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-335 |
| **Tên** | Confirm block nếu thiếu số thùng |
| **Điều kiện** | List draft có item thùng trống |
| **Bước thực hiện** | 1. Bấm Confirm khi còn ô trống. |
| **Kết quả mong đợi** | Không confirm; báo lỗi yêu cầu điền đủ. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-336: F27 — nhóm theo category + Chưa phân loại

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-336 |
| **Tên** | Group category trong list |
| **Điều kiện** | SP có và không có category |
| **Bước thực hiện** | 1. Mở list có nhiều SP. |
| **Kết quả mong đợi** | Nhóm theo L1/category; SP không phân loại ở **Chưa phân loại**. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-337: F27 — tab Hàng mới nhập tay

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-337 |
| **Tên** | Thêm item Hàng mới |
| **Điều kiện** | List draft |
| **Bước thực hiện** | 1. Tab Hàng mới → thêm dòng: tên, phân loại, số thùng, ghi chú. |
| **Kết quả mong đợi** | Lưu được; hiển thị đúng tab. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-338: F27 — PDF gộp 2 tab

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-338 |
| **Tên** | Xuất PDF tổng hợp |
| **Điều kiện** | List đã Confirm; có item cả 2 tab |
| **Bước thực hiện** | 1. Xuất PDF. 2. Mở file. |
| **Kết quả mong đợi** | Một file chứa nội dung **Hàng trong kho** và **Hàng mới**. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-339: F27 — luồng Draft → Confirm → PDF → Đã đặt

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-339 |
| **Tên** | Full order list lifecycle |
| **Điều kiện** | List draft đủ dữ liệu |
| **Bước thực hiện** | 1. Confirm. 2. Xuất PDF. 3. Đánh dấu Đã đặt. |
| **Kết quả mong đợi** | Trạng thái list chuyển đúng từng bước; không quay lại draft. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-340: F28 — cột discontinued_reason

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-340 |
| **Tên** | Migration discontinued_reason |
| **Điều kiện** | D2 migration đã chạy |
| **Bước thực hiện** | 1. Kiểm tra Supabase `products.discontinued_reason`. |
| **Kết quả mong đợi** | Cột tồn tại, nullable TEXT. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-341: F28 — modal lý do khi Không nhập nữa

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-341 |
| **Tên** | Nhập lý do optional |
| **Điều kiện** | Notifications Sắp hết hàng |
| **Bước thực hiện** | 1. Bấm Không nhập nữa. 2. Nhập lý do (hoặc để trống). 3. Xác nhận. |
| **Kết quả mong đợi** | Lưu vào `discontinued_reason`, không ghi đè `notes` chung. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-342: F28 — DiscontinuedProducts hiện lý do

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-342 |
| **Tên** | Màn discontinued hiển thị lý do |
| **Điều kiện** | SP có `discontinued_reason` |
| **Bước thực hiện** | 1. Settings → Sản phẩm không nhập nữa. |
| **Kết quả mong đợi** | Dòng **Lý do:** từ cột mới (không phải `notes` trừ khi trống reason). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-343: F08 — upload ảnh từ camera/thư viện

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-343 |
| **Tên** | Thêm ảnh SP |
| **Điều kiện** | D3; bucket `product-images` |
| **Bước thực hiện** | 1. ProductDetail → thêm ảnh (chụp hoặc thư viện). |
| **Kết quả mong đợi** | Upload thành công; `products.image_url` có URL; ảnh hiển thị. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-344: F08 — xem ảnh ProductDetail

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-344 |
| **Tên** | Hiển thị ảnh đã upload |
| **Điều kiện** | SP có `image_url` |
| **Bước thực hiện** | 1. Mở ProductDetail. |
| **Kết quả mong đợi** | Ảnh load đúng; không placeholder lỗi. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-345: F08 — thay ảnh xóa ảnh cũ

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-345 |
| **Tên** | Upload ảnh mới thay ảnh cũ |
| **Điều kiện** | SP đã có ảnh |
| **Bước thực hiện** | 1. Upload ảnh khác. |
| **Kết quả mong đợi** | URL mới trên product; ảnh cũ không còn dùng (xóa Storage hoặc orphan theo spec). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

## Nhóm E — F23 Dashboard (TC-346 → TC-350)

### TC-346: Dashboard — tổng SKU

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-346 |
| **Tên** | Tổng SKU đúng |
| **Điều kiện** | E1; biết số SKU thực tế từ DB |
| **Bước thực hiện** | 1. Settings → Tổng quan kho. 2. So sánh với đếm distinct products có ≥1 entry. |
| **Kết quả mong đợi** | Số SKU khớp. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-347: Dashboard — sắp hết hàng / hết hàng

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-347 |
| **Tên** | Đếm SP tồn thấp |
| **Điều kiện** | Có SP ≤ `low_warning_boxes` và SP 0 thùng |
| **Bước thực hiện** | 1. Đọc hai số trên Dashboard. 2. Đối chiếu Notifications tab Sắp hết hàng. |
| **Kết quả mong đợi** | Khớp logic combined tồn (theo ngưỡng từng SP). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-348: Dashboard — lô hạn

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-348 |
| **Tên** | Đếm lô sắp hết hạn / hết hạn |
| **Điều kiện** | Có lô warning/expired |
| **Bước thực hiện** | 1. So sánh với tab Sắp hết hạn. |
| **Kết quả mong đợi** | Số lô khớp định nghĩa `warning_days` / expired. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-349: Dashboard — không nhập nữa

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-349 |
| **Tên** | Đếm discontinued |
| **Điều kiện** | Có SP `is_discontinued` |
| **Bước thực hiện** | 1. So với Settings card discontinued count. |
| **Kết quả mong đợi** | Số khớp. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-350: Dashboard — fetch khi mount

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-350 |
| **Tên** | Không cache stale |
| **Điều kiện** | Dashboard đang mở |
| **Bước thực hiện** | 1. Ghi số SKU. 2. Thiết bị khác thêm SP+lô. 3. Rời và vào lại Dashboard. |
| **Kết quả mong đợi** | Số tăng/cập nhật sau khi vào lại màn. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

## Nhóm F — F24 RBAC (TC-351 → TC-365)

### TC-351: Guest — không nút CRUD

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-351 |
| **Tên** | Guest read-only UI |
| **Điều kiện** | Login `guest` |
| **Bước thực hiện** | 1. Duyệt Kho, Sản phẩm, Thông báo, Đặt hàng, Cài đặt (trừ user mgmt). |
| **Kết quả mong đợi** | Không thấy FAB, ✏️, 🗑️, + Zone, Thêm hàng, v.v. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-352: Guest — xem AuditLog

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-352 |
| **Tên** | Guest vào AuditLog |
| **Điều kiện** | Login guest |
| **Bước thực hiện** | 1. Settings → Lịch sử thay đổi. |
| **Kết quả mong đợi** | Vào được; đọc được danh sách; không filter bị chặn. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-353: Guest — không User Management

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-353 |
| **Tên** | Ẩn card Quản lý người dùng |
| **Điều kiện** | Login guest |
| **Bước thực hiện** | 1. Mở Settings. |
| **Kết quả mong đợi** | Không có card **Quản lý người dùng**; navigate trực tiếp bị chặn nếu có. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-354: Disabled — block login

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-354 |
| **Tên** | Tài khoản disabled |
| **Điều kiện** | `user_profiles.is_disabled = true` |
| **Bước thực hiện** | 1. Đăng nhập email/password hợp lệ. |
| **Kết quả mong đợi** | Alert *Tài khoản đã bị vô hiệu hóa*; signOut; không vào Tabs. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-355: Staff — full CRUD, không User Management

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-355 |
| **Tên** | Staff quyền mặc định |
| **Điều kiện** | Login staff |
| **Bước thực hiện** | 1. Thêm/sửa lô. 2. Settings. |
| **Kết quả mong đợi** | CRUD bình thường; **không** card User Management. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-356: Admin — thấy card User Management

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-356 |
| **Tên** | Admin thấy user mgmt |
| **Điều kiện** | Login admin |
| **Bước thực hiện** | 1. Settings. |
| **Kết quả mong đợi** | Có card **Quản lý người dùng**. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-357: Admin — danh sách users + last login

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-357 |
| **Tên** | User list metadata |
| **Điều kiện** | Login admin |
| **Bước thực hiện** | 1. Mở User Management. |
| **Kết quả mong đợi** | Mỗi user: email, role, `last_login_at`, trạng thái. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-358: Admin — toggle staff → guest

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-358 |
| **Tên** | Chuyển guest |
| **Điều kiện** | Có user staff test |
| **Bước thực hiện** | 1. Admin toggle Guest. 2. User đó login lại. |
| **Kết quả mong đợi** | User mới chỉ read-only (TC-351). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-359: Admin — vô hiệu hóa user

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-359 |
| **Tên** | Disable user |
| **Điều kiện** | User staff không phải super_admin |
| **Bước thực hiện** | 1. Admin bật Vô hiệu hóa. 2. User login. |
| **Kết quả mong đợi** | TC-354. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-360: Admin — không nút tạo tài khoản

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-360 |
| **Tên** | Admin không create user |
| **Điều kiện** | Login admin |
| **Bước thực hiện** | 1. User Management. |
| **Kết quả mong đợi** | **Không** có **+ Tạo tài khoản**. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-361: Super_admin — nút tạo tài khoản

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-361 |
| **Tên** | Super_admin create user UI |
| **Điều kiện** | Login super_admin |
| **Bước thực hiện** | 1. User Management. |
| **Kết quả mong đợi** | Có **+ Tạo tài khoản**. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-362: Super_admin — tạo user → staff

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-362 |
| **Tên** | Tạo tài khoản mới |
| **Điều kiện** | Edge Function / RPC hoạt động |
| **Bước thực hiện** | 1. Tạo email+password mới. 2. Login tài khoản mới. |
| **Kết quả mong đợi** | Login OK; `user_profiles.role = staff`. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-363: Super_admin — cấp Admin

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-363 |
| **Tên** | Promote to admin |
| **Điều kiện** | User staff |
| **Bước thực hiện** | 1. Super_admin cấp Admin. 2. User login. |
| **Kết quả mong đợi** | Thấy User Management (TC-356). |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-364: Super_admin — không bị admin toggle

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-364 |
| **Tên** | Bảo vệ super_admin |
| **Điều kiện** | Login admin (không phải super) |
| **Bước thực hiện** | 1. Tìm dòng super_admin trong list. |
| **Kết quả mong đợi** | Không có toggle guest/disabled/admin trên super_admin. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

### TC-365: Super_admin — không tự vô hiệu hóa

| Mục | Nội dung |
|-----|----------|
| **Mã** | TC-365 |
| **Tên** | Không self-disable |
| **Điều kiện** | Login super_admin |
| **Bước thực hiện** | 1. Tìm chính mình trong User Management. |
| **Kết quả mong đợi** | Không toggle Vô hiệu hóa / không hạ quyền chính mình. |
| **Pass/Fail** | [ ] Pass [ ] Fail |

---

## Tổng hợp

| Nhóm | Phạm vi TC | Số lượng |
|------|------------|----------|
| A — Bug Fixes | TC-301 → TC-310 | 10 |
| B — UX | TC-311 → TC-320 | 10 |
| C — Realtime | TC-321 → TC-323 | 3 |
| D — F27/F28/F08 | TC-331 → TC-345 | 15 |
| E — F23 Dashboard | TC-346 → TC-350 | 5 |
| F — F24 RBAC | TC-351 → TC-365 | 15 |
| **Tổng** | TC-301 → TC-365 | **58** |
