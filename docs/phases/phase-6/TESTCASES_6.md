# Phase 6 — Test Cases

---

## Group B — Picking UX (B1–B5)

### TC-601: Tab bottom «Lấy hàng» trước «Đặt hàng»
- **Bước:** Đăng nhập → nhìn bottom tabs và tab con Orders
- **Kết quả:** Bottom label **Lấy hàng**; trong Orders, tab con **Lấy hàng** đứng trước **Đặt hàng**

### TC-602: Quét barcode trên PickingDetail
- **Bước:** Mở picking draft → bấm 📷 → quét mã SP có lô
- **Kết quả:** Gợi ý / chọn đúng SP; có thể thêm lô vào đơn

### TC-603: Dropdown suggestions tối đa 20 + scroll
- **Bước:** PickingDetail → gõ tên khớp nhiều SP
- **Kết quả:** Tối đa 20 gợi ý; list scroll được (không cắt cứng 5)

### TC-604: Default qty = 1 khi thêm lô
- **Bước:** Thêm lô mới vào picking draft qua LotPicker / flow thêm
- **Kết quả:** Qty mặc định = **1**

### TC-605: Modal chọn nhiều lô (B5)
- **Bước:** Chọn SP có nhiều lô → tick nhiều lô → Thêm
- **Kết quả:** Tất cả lô đã tick được thêm vào picking list

### TC-606: Edit qty lô trong draft
- **Bước:** Picking draft → sửa số lượng một item → lưu
- **Kết quả:** Qty cập nhật trên UI và store/DB

### TC-607: Hoàn thành ghi completed_at
- **Bước:** Picking in_progress → tick lô → Hoàn thành
- **Kết quả:** Status `completed`; header hiện ngày hoàn thành (`completed_at`)

---

## Group C — Products picking (C1–C2)

### TC-608: Nút 🛒 trên card Products
- **Bước:** Tab Sản phẩm (staff+) → bấm 🛒 góc card
- **Kết quả:** Chọn/tạo draft picking → mở `LotPickerModal`

### TC-609: 🛒 không làm phình chiều cao card
- **Bước:** So sánh layout card có/không 🛒
- **Kết quả:** Nút absolute; chiều cao card không tăng bất thường

### TC-610: C2 — save qty = 0 khi lô trong picking
- **Bước:** Lô đang trong picking draft/in_progress → ProductDetail set qty = 0 → Lưu
- **Kết quả:** Alert: Huỷ / Giữ nguyên trong đơn / Xóa khỏi đơn; Huỷ thì không lưu qty

### TC-611: C2 — Xóa khỏi đơn rồi save
- **Bước:** Chọn «Xóa khỏi đơn lấy hàng» → confirm
- **Kết quả:** Item picking bị xóa; qty lô = 0 được lưu

---

## Group D — Hàng giảm giá (D1–D4 + UI mở rộng)

### TC-612: D1 — cột discount_percent
- **Bước:** Gán `%` cho lô giảm giá → kiểm tra DB / reload app
- **Kết quả:** `discount_percent` lưu đúng (0–100 hoặc null)

### TC-613: D2 — card Notifications + badge %
- **Bước:** Tab Thông báo → Sắp hết hạn → SP có lô `is_price_reduced` + %
- **Kết quả:** Card 3 hàng; badge «Giảm X%» hoặc «Giảm giá»; expand lô nhập/sửa % inline

### TC-614: Notifications — hạn gần nhất dưới «Còn X»
- **Bước:** Card có nhiều lô hạn khác nhau
- **Kết quả:** Hiện dòng «Hạn: …» theo hạn gần nhất; không còn icon ▴▾

### TC-615: Notifications — sort card theo earliestExpiry ASC
- **Bước:** Nhiều card hết hạn/sắp hết
- **Kết quả:** Card sắp xếp theo hạn gần nhất tăng dần

### TC-616: Notifications — badge giảm giá xếp dọc
- **Bước:** Card có badge tồn + badge giảm giá
- **Kết quả:** Badges xếp **column** (không chen ngang)

### TC-617: Notifications — sort lô trong expand theo hạn ASC
- **Bước:** Expand card → xem danh sách lô
- **Kết quả:** Lô sort theo `expiry_date` ASC

### TC-618: D3 — DiscountScreen grid lô giảm giá
- **Bước:** Settings → Hàng giảm giá
- **Kết quả:** Chỉ lô `is_price_reduced`; section theo tháng hết hạn; card ảnh + % 

### TC-619: Discount — filter Mode/Kho/Zone
- **Bước:** ⚙️ → chọn mode/kho/zone
- **Kết quả:** List chỉ còn lô trong scope; filterBar «Đang lọc»

### TC-620: Discount — search tên + clear ✕
- **Bước:** Gõ tên trên search bar → ✕
- **Kết quả:** Lọc theo `normalizeText`; ✕ xóa query, hiện lại full list scoped

### TC-621: Discount — quét barcode → search
- **Bước:** 📷 trên search bar → quét mã SP có trong catalog
- **Kết quả:** `searchQuery` = tên SP; list lọc theo tên

### TC-622: Discount — barcode không khớp
- **Bước:** Quét mã không tồn tại
- **Kết quả:** Alert «Không tìm thấy»

### TC-623: Discount — thêm SP (＋) search tên
- **Bước:** ＋ → tìm SP → chọn → tick lô → (optional %) → Áp dụng
- **Kết quả:** Lô `is_price_reduced = true`; hiện trên grid

### TC-624: Discount — thêm SP quét barcode trong modal
- **Bước:** Modal ＋ → 📷 → quét
- **Kết quả:** Chọn đúng SP, nhảy bước chọn lô

### TC-625: Discount — sort theo hạn rồi tên
- **Bước:** Nhiều lô cùng tháng, hạn khác nhau
- **Kết quả:** Trong section: hạn ASC, cùng hạn thì tên SP

### TC-626: Discount — PDF xuất
- **Bước:** 📄 với list không rỗng
- **Kết quả:** PDF có ảnh, tên, %, hạn **DD/MM/YYYY**; share sheet mở

### TC-627: Discount — PDF thumb không lệch ảnh
- **Bước:** Xuất PDF nhiều SP có ảnh
- **Kết quả:** Ảnh đúng từng dòng (cache theo `entry.id`, không collision)

### TC-628: Settings subtitle Hàng giảm giá
- **Bước:** Có N lô giảm giá → vào Settings
- **Kết quả:** «N lô đang giảm giá» hoặc «Chưa có lô giảm giá»

### TC-629: Modal ✏️ sửa % trên Discount card
- **Bước:** ✏️ trên card → nhập % hợp lệ → Lưu
- **Kết quả:** Badge cập nhật; DB `discount_percent` đúng

---

## Group E — Searchable dropdown (scope thu gọn)

### TC-630: FilterModal search Kho/Zone
- **Bước:** Products/Notifications/Discount → FilterModal → gõ tên kho/zone
- **Kết quả:** List Kho/Zone lọc theo `normalizeText`

### TC-631: InternalNotes gợi ý SP 20 + scroll
- **Bước:** Tạo/sửa note → gõ tên SP
- **Kết quả:** Tối đa 20 gợi ý; scroll được

### TC-632: AddInventory Zone search
- **Bước:** AddInventory → chọn zone với nhiều zone
- **Kết quả:** Có ô search zone; list scroll

---

## Group F — Settings 4 sections

### TC-633: Bốn section headers
- **Bước:** Mở Settings
- **Kết quả:** Headers: Kho & Hàng hóa · Vận hành · Thông báo & Cảnh báo · Hệ thống (capitalize)

### TC-634: Không còn info box zone
- **Bước:** Settings scroll
- **Kết quả:** Không còn box «Bấm + Zone…»

### TC-635: Card Hàng giảm giá trong Vận hành
- **Bước:** Section Vận hành → Hàng giảm giá
- **Kết quả:** Navigate DiscountScreen

---

## Group G — Performance (P1–P4, S1–S2)

### TC-636: P1 completePicking song song
- **Bước:** Picking ≥ 5 lô khác nhau → Hoàn thành
- **Kết quả:** Trừ tồn đúng hết; không lỗi partial bất thường

### TC-637: P2/P3 projection fetch
- **Bước:** Dashboard / Map / Products load inventory + products
- **Kết quả:** Dữ liệu đủ cho UI (tên, qty, hạn, zone, status); app không crash thiếu field

### TC-638: P4 indexes (smoke)
- **Bước:** Filter/sort theo hạn; list products archived
- **Kết quả:** Query vẫn đúng (migration index đã apply)

### TC-639: S1 Dashboard stats
- **Bước:** Mở Dashboard với nhiều SP/lô
- **Kết quả:** Số liệu stock/expiry đúng như trước Map lookup

### TC-640: S2 Map search debounce
- **Bước:** Gõ nhanh trên Map search
- **Kết quả:** Không spam request mỗi ký tự; sau ~300ms có kết quả; clear &lt; 2 ký tự instant

### TC-641: Tab lazy mount
- **Bước:** Login → chỉ ở Map → chưa mở Products
- **Kết quả:** Products chưa mount (không fetch nặng ngay); lần đầu bấm tab mới load

---

## Ngoài scope — Internal Notes folders

### TC-642: List folder tầng 1
- **Bước:** Settings → Ghi chú
- **Kết quả:** List folder (ít nhất «Chung»); badge số note

### TC-643: Tạo folder (+ Folder header)
- **Bước:** + Folder → đặt tên → lưu
- **Kết quả:** Folder mới hiện; không xóa được «Chung»

### TC-644: Long-press folder sửa/xóa
- **Bước:** Long-press folder thường → sửa tên / xóa
- **Kết quả:** Sửa OK; xóa folder → notes `folder_id` null về Chung

### TC-645: FAB tầng 1 vs tầng 2
- **Bước:** Tầng 1 FAB; vào folder → FAB
- **Kết quả:** Tầng 1 tạo folder (hoặc theo UX hiện tại); tầng 2 tạo note trong folder đang mở

### TC-646: Chuyển note sang folder khác
- **Bước:** Sửa note → đổi folder → lưu
- **Kết quả:** Note hiện đúng folder mới; badge count cập nhật

### TC-647: Ảnh đính kèm note
- **Bước:** Tạo/sửa note → chọn/chụp ảnh → lưu
- **Kết quả:** Card ưu tiên ảnh note; Storage `notes/`

---

## Ngoài scope — Toggle giảm giá + % (market)

### TC-648: ZoneDetailSheet — Switch Giảm giá + %
- **Bước:** Map Market → edit lô → bật Giảm giá → nhập % → Lưu
- **Kết quả:** `is_price_reduced` + `discount_percent`; 💥 trên tên nhóm nếu có

### TC-649: ZoneDetailSheet — tắt Giảm giá clear %
- **Bước:** Bật + nhập % → tắt Switch
- **Kết quả:** Ô % ẩn/clear; save → không còn giảm giá

### TC-650: ProductDetail — badge ⭐ / 💥
- **Bước:** Lô market special và/hoặc giảm giá
- **Kết quả:** Badge read-only đúng icon; Switch chỉ khi `locType === market`

### TC-651: Validate % 0–100
- **Bước:** Nhập 101 hoặc chữ → Lưu
- **Kết quả:** Alert không hợp lệ; không ghi DB

---

## Ngoài scope — LoginScreen icon

### TC-652: Logo app trên Login
- **Bước:** Logout → màn Login
- **Kết quả:** Hiện `adaptive-icon.png` (không emoji 📦); tên «Chino's Store» bên dưới

---

## Ghi chú

- TC-6xx dùng chung thiết bị/staff+ trừ khi ghi guest.
- Migration Phase 6 (v5.2–v5.5) phải đã apply trên Supabase trước khi test D/folders/perf.
