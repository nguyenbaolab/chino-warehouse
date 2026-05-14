# Tài liệu Yêu cầu Sản phẩm (REQUIREMENTS)

**Ứng dụng:** Chino's Warehouse — Quản lý Kho Hàng Nội Bộ
**Cửa hàng:** Chino's Boba Tea & Asian Market | Joensuu, Finland
**Phiên bản:** 1.3.5 | Tháng 5/2026

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
| F07 | Màn hình chi tiết sản phẩm | Tên, mã vạch, tất cả zone+tầng đang chứa, số thùng, hạn (màu), ghi chú, ảnh (Phase 2). Nút sửa/xóa lô. | P1 | MVP | Done |
| F08 | Hình ảnh sản phẩm | Thêm/xem ảnh sản phẩm. Chụp trực tiếp hoặc chọn từ thư viện. Lưu trên Supabase Storage. | P2 | Phase 2 | Not started |
| F09 | Tìm kiếm sản phẩm | Tìm theo tên. Kết quả hiện thẻ sản phẩm + bản đồ tự highlight zone. Tap vào thẻ → mở chi tiết. | P1 | MVP | Done |
| F10 | Quét mã vạch | Camera quét mã vạch → kết quả như tìm kiếm tên. Không nhận ra → nút 'Thêm thủ công'. 3 mode: search / assign / locate. | P1 | MVP | Done |
| F11 | Quản lý tồn kho theo thùng | Đơn vị: thùng nguyên. Thùng đang dở vẫn tính 1. Chỉ cập nhật khi bỏ hẳn. Một sản phẩm có thể ở nhiều zone. | P1 | MVP | Done |
| F12 | Theo dõi hạn sử dụng | Mỗi lô có hạn riêng. Màu sắc theo §5. Hiển thị xuyên suốt toàn app. | P1 | MVP | Done |
| F13 | Ghi chú sản phẩm & lô hàng | Ghi chú tự do cho sản phẩm (nhà cung cấp, bảo quản...) và cho từng lô (ngày nhập, tình trạng...). | P1 | MVP | Done |
| F14 | Thêm sản phẩm mới | Thêm sản phẩm: tên (bắt buộc), mã vạch (tuỳ chọn), ghi chú. | P1 | MVP | Done |
| F15 | Thêm lô hàng vào kho | Gán sản phẩm vào zone + tầng + kho: số thùng, hạn sử dụng, ghi chú, **barcode theo lô (optional)** ngay tại AddInventoryScreen. | P1 | MVP | Done |
| F16 | Sửa / Xóa lô hàng | Cập nhật số thùng, hạn, ghi chú. Xóa khi hết hàng. Truy cập từ màn hình chi tiết (F07). | P1 | MVP | Done |
| F17 | Đồng bộ thời gian thực | Mọi thay đổi đẩy lên cloud ngay. Tất cả thiết bị thấy cập nhật trong vài giây (Supabase Realtime). | P1 | MVP | Done |
| F18 | Thông báo trong app | Tab Thông báo tách thành 2 tab con **Sắp hết hạn / Sắp hết hàng**. Tab Sắp hết hạn có toggle **Đã giảm giá** theo sản phẩm sắp hết hạn; sản phẩm hết hạn hiển thị đỏ nhạt + nhãn `Hết hạn rồi`, tap mở `ProductDetailScreen`. Tab Sắp hết hàng có nút **Thêm vào danh sách nhập** và **Không nhập nữa**. | P2 | MVP+ | Done |
| F19 | Chuyển hàng giữa khu vực | Chuyển hàng từ kho lên siêu thị hoặc giữa các kho: trừ thùng ở nguồn, cộng thùng ở đích. | P2 | Phase 2 | Not started |
| F20 | Bản đồ nhiều khu vực | Dropdown selector thay thế pill "Kho" trên MapScreen để chuyển đổi giữa các kho (bottom sheet: tên + grid size, ✓ kho đang chọn, nút Thêm kho mới → Cài đặt). Tạo kho mới: nhập tên + grid size (rows × cols, không giới hạn max). Sau khi tạo vẫn cho đổi grid size — tăng thoải mái, giảm chỉ được nếu không có zone nào bị cắt ra ngoài. Xóa kho: block nếu còn **bất kỳ** bản ghi `inventory_entries` nào trong zones của kho đó (kể cả lô 0 thùng chưa xóa thủ công). Tab Sản phẩm / Thông báo: dropdown lọc theo kho (không chọn = logic riêng từng màn — xem CONTEXT §3). Tab Đặt hàng không có dropdown kho. Quản lý kho (đổi tên, xóa) trong Settings → Quản lý kho. Fix KI-004 (đổi kho → clear search). | P2 | Phase 2 | Done |
| F21 | Chế độ offline | Lưu dữ liệu cục bộ, queue thay đổi khi mất mạng, tự đồng bộ khi có mạng trở lại. | P3 | Phase 3 | Not started |
| F22 | Lịch sử cập nhật | Log: ai cập nhật gì, lúc nào. (Đã có SEC-11 Audit Log implement chức năng này — xem `KNOWN_ISSUES.md` KI-022 và `DECISIONS.md`) | P3 | Phase 3 | Partial |
| F23 | Trang tổng quan | Tổng số SKU, hàng sắp hết, lô sắp hết hạn. | P3 | Phase 3 | Not started |
| F24 | Auth & Super app integration | Đăng nhập, tích hợp vào hệ thống app nội bộ lớn hơn (kho, chấm công, chia ca...). Phân quyền chủ/nhân viên. Chi tiết thiết kế khi có yêu cầu cụ thể. (Phase 2 đã implement auth cơ bản: email/password login, session management, auto-logout. Super app integration và RBAC → Phase 3) | P4 | Phase 3 | Partial |
| F25 | Báo cáo / Xuất dữ liệu | Xuất dữ liệu tồn kho, lịch sử. | P4 | Phase 3 | Not started |
| F26 | Kiểm kho | Cho phép nhân viên đối chiếu và cập nhật lại số lượng thực tế trong kho. Chọn zone → đi từng tầng → nhập số thùng đếm được → lưu lại. Có thể hiện diff so với số hiện tại trước khi confirm. | P2 | Phase 2 | Not started |
| F27 | Tab Đặt hàng | **Phần đã giao (Phase 1+):** quản lý nhiều list, CRUD item, trạng thái draft/confirmed/placed. **Mở rộng (design v1.3.3 — chưa code):** List đặt hàng có 2 loại: list **active** (hàng trong kho — sản phẩm tự nhảy vào từ tab Sắp hết hàng) và list **tự tạo** (hàng mới — chị tự ghi tay). Trong mỗi list có 2 tab: **Hàng trong kho** (trái) / **Hàng mới** (phải). Chỉ tồn tại **1 list active** tại một thời điểm; nếu chưa có → app tự tạo, hiện popup đặt tên (mặc định theo ngày, cho đổi). Sản phẩm nhảy vào list: ô số thùng **để trống**, bắt buộc điền hết trước khi Confirm. Nhóm sản phẩm theo **category** trong list; sản phẩm chưa phân loại → nhóm **Chưa phân loại**. Xuất **PDF tổng hợp** cả 2 tab (Hàng trong kho + Hàng mới). Luồng trạng thái: **Draft → Confirm → Xuất PDF → Đã đặt** (cả list chuyển trạng thái). Tab Hàng mới: fields gồm tên sản phẩm, phân loại, số thùng, ghi chú. | P1 | Phase 1+ | Partial |
| F28 | Danh sách không nhập nữa | Mục trong Settings, hiện số lượng sản phẩm không nhập nữa; mở chi tiết gồm tên, tồn kho realtime, lý do (optional); có thể chuyển lại tab Sắp hết hàng. | P1 | Phase 1+ | Done |
| F29 | Zone Layout Editor | Màn hình riêng để sắp xếp lại vị trí zone trên lưới. Zone hiển thị dưới dạng tile nhỏ cố định (tên + màu + badge kích thước thật, ví dụ "2×1"). Kéo tile vào grid → đặt zone vào vị trí mới, bóng mờ hiện footprint thật của zone. Collision check theo tọa độ thật, báo đỏ nếu chồng chéo. Nút Preview xem map thật trước khi lưu. Confirm → lưu toàn bộ vị trí mới (`batchUpdateZoneCells`). Truy cập từ MapScreen (nút ▦) khi đang xem một kho. | P2 | Phase 2 | Done |
| F30 | Phân loại sản phẩm (Category system) | **2 cấp:** Cấp 1 (VD: Đồ khô, Đồ đông đá) + Cấp 2 (VD: Mì, sốt, …). **Quản lý** thêm/sửa/xóa trong **Settings**: card **Phân loại sản phẩm** hiển tóm tắt **"X nhóm · Y loại"**; bấm vào → màn **Quản lý phân loại** (accordion **Cấp 1** xổ ra **Cấp 2**). **Gắn vào sản phẩm**, optional **từng cấp** — chọn Cấp 1 **không** bắt buộc phải chọn Cấp 2. **Chi tiết sản phẩm** (section **Chi tiết**): dropdown Cấp 1 → chỉ sau khi chọn Cấp 1 mới hiện dropdown Cấp 2; lưu và sửa được. **AddInventoryScreen:** chọn sản phẩm có sẵn → category **chỉ đọc** (tự điền từ SP); **thêm sản phẩm mới** → dropdown Cấp 1 + Cấp 2 ngay dưới field tên sản phẩm. Phân loại sau → list đặt hàng (F27) cập nhật đúng nhóm. | P2 | Phase 2 | Done |

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
- Gõ tên: tìm theo **sản phẩm**, highlight tất cả zone có sản phẩm đó.
- Quét barcode: tìm theo **lô**, highlight zone chứa đúng lô và hiện thông tin lô đó.

### 7.5 Ngưỡng cảnh báo
- `low_warning_boxes`: mặc định 3, configurable per sản phẩm tại màn hình chi tiết.
- `warning_days`: mặc định 30, configurable per sản phẩm tại màn hình chi tiết.
- 0–1 thùng: luôn đỏ, không configurable.

### 7.6 Thông báo
- Tab Thông báo tách thành 2 tab: **Sắp hết hạn** và **Sắp hết hàng**.
- Tab **Sắp hết hạn**:
  - Sản phẩm sắp hết hạn có toggle **Đã giảm giá**.
  - Sản phẩm đã hết hạn hiển thị nền đỏ nhạt + nhãn `Hết hạn rồi`.
  - Tap card mở `ProductDetailScreen`.
- Tab **Sắp hết hàng**:
  - Card sản phẩm có nút **Thêm vào danh sách nhập**.
  - Có nút **Không nhập nữa** để chuyển sang danh sách không nhập nữa trong Settings.
- Không còn tab **Để sau** trong UI.

---

## 8. Mô hình dữ liệu

### 8.1 Location (Kho)
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | UUID | Khoá chính |
| name | String | Tên kho (ví dụ: 'Kho', 'Siêu thị') |
| description | String | Ghi chú tuỳ chọn |
| created_at | Timestamp | Tự sinh |
| grid_rows | Integer | Số hàng của lưới (mặc định 6) |
| grid_cols | Integer | Số cột của lưới (mặc định 6) |

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
| image_url | String | URL ảnh (Phase 2, Supabase Storage) |
| notes | String | Ghi chú chung |
| warning_days | Integer | Ngưỡng cảnh báo hạn (mặc định 30) |
| low_warning_boxes | Integer | Ngưỡng cảnh báo tồn (mặc định 3) |
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
| quantity_boxes | Integer | Số thùng nguyên |
| barcode | String | Mã vạch của lô (optional) |
| expiry_date | Date | Hạn sử dụng của lô này |
| is_expired_acknowledged | Boolean | Đã đánh dấu giảm giá cho lô/sản phẩm hết hạn hay chưa |
| notes | String | Ghi chú lô hàng |
| updated_at | Timestamp | Tự cập nhật |

---

## 9. Tổng quan màn hình

| Màn hình | Mô tả | Thành phần chính |
|----------|-------|-----------------|
| Bản đồ kho (Tab) | Màn hình chính | Sheet chọn kho (tên + kích thước lưới, Thêm kho mới) · nút ▦ mở Zone Layout Editor · Lưới 2D zone · + Zone · Thanh tìm kiếm · Nút quét mã · Chấm màu khi có kết quả |
| Zone Detail (Sheet) | Mở khi tap vào zone | Tên zone · Tabs tầng (nếu có) · Danh sách sản phẩm + số thùng + chấm màu |
| Chi tiết sản phẩm | Tap vào sản phẩm | Tên · Mã vạch · Ảnh (Phase 2) · Tất cả zone+tầng · Số thùng · Hạn (màu) · Ghi chú · Nút sửa/xóa · Ngưỡng cảnh báo · **Chi tiết (F30):** dropdown **Cấp 1** → sau khi chọn mới hiện dropdown **Cấp 2**; lưu/sửa; cả hai cấp optional · **Section Lịch sử thay đổi:** 10 entries gần nhất (inventory + product), icon + thời gian + người + field đổi · nút Xem tất cả → AuditLogScreen |
| Danh sách sản phẩm (Tab) | Quản lý sản phẩm | Dropdown lọc theo kho (Tất cả kho / từng kho) · Danh sách sản phẩm · Tổng thùng · Chấm màu · Tìm kiếm · Thêm mới (CRUD category **không** ở màn này — xem Settings / F30) |
| Đặt hàng (Tab mới) | Quản lý list đặt hàng | Danh sách list · **list active** (hàng trong kho) vs **list tự tạo** (hàng mới) · trong chi tiết list: 2 tab **Hàng trong kho** (trái) / **Hàng mới** (phải) · một list active duy nhất; tạo mới + đặt tên (mặc định theo ngày) · nhóm theo category + nhóm **Chưa phân loại** · số thùng để trống đến khi Confirm · luồng Draft → Confirm → Xuất PDF (gộp 2 tab) → Đã đặt |
| Thêm hàng (Stack) | Thêm lô hàng | Chọn sản phẩm · Zone · Tầng · Số thùng · Hạn · Ghi chú · **F30:** SP có sẵn → category **read-only** (theo SP); **SP mới** → dropdown Cấp 1 + Cấp 2 dưới field tên |
| Thông báo (Tab) | Cảnh báo tồn kho & hạn | Dropdown kho (Tất cả kho / từng kho) · 2 tab con Sắp hết hạn / Sắp hết hàng · Sắp hết hạn: toggle Đã giảm giá · checkbox lọc Hết hạn / Sắp hết hạn · thẻ hết hạn nền đỏ nhạt + nhãn Hết hạn rồi · Sắp hết hàng: nút Thêm vào danh sách nhập + Không nhập nữa |
| Quét mã vạch (Fullscreen) | Camera overlay | Khung ngắm · Kết quả quét · Nút thêm thủ công nếu không nhận ra |
| Cài đặt (Tab) | Tuỳ chỉnh app | Theme sáng/tối · card **Quản lý kho** (F20) · card **Phân loại sản phẩm** (F30 — tóm tắt **X nhóm · Y loại** → `CategoryManagement`) · card Không nhập nữa (F28) |
| Quản lý phân loại (Stack, F30) | CRUD category 2 cấp | Accordion Cấp 1 mở ra Cấp 2 · thêm/sửa/xóa nhóm & loại |
| Zone Layout Editor | Sắp xếp lại vị trí zone trên lưới | Tile compact per zone · Badge kích thước · Drag onto grid · Footprint preview · Collision highlight · Nút Preview + Confirm |
| AuditLogScreen | Tra cứu lịch sử | Filter người thay đổi · Filter sản phẩm · Danh sách 10 entries/trang · Pagination trái(mới hơn)/phải(cũ hơn) · Cache in-memory · Tên user = prefix email |

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
| Navigation | React Navigation (Bottom Tabs + Stack) | 5 tab (Kho, Sản phẩm, Đặt hàng, Thông báo, Cài đặt) + stack screens + modal BarcodeScanner |
| Offline | Zustand persist (Phase 2) | Cache cục bộ, sync khi có mạng |

---

## 11. Lộ trình phát triển

| Giai đoạn | Phạm vi | Mục tiêu |
|-----------|---------|----------|
| **Phase 1 – MVP** | F01–F07, F09–F18, F27–F28 | App dùng được ngay: tìm hàng, quét mã, cập nhật tồn kho; thông báo + đặt hàng + discontinued |
| **Phase 1+ → Phase 2** | PDF & nối list đặt hàng, field lý do discontinued | Ổn định và khép kín nghiệp vụ đã mở |
| **Phase 2** | Đã giao: **F20**, **F29**, **F30**, fix Thông báo. Kế hoạch / design: **F27** mở rộng (2 tab, active list, PDF tổng hợp, grouping); còn F08 ảnh, F19 chuyển hàng, F21 offline, F26 kiểm kho, … | Mở rộng vận hành đa kho, đặt hàng, phân loại |
| **Phase 3** | F22–F25: Lịch sử, tổng quan, super app + auth, báo cáo. | Quản lý toàn diện |

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
