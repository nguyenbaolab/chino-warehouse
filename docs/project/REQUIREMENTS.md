# Tài liệu Yêu cầu Sản phẩm (REQUIREMENTS)

**Ứng dụng:** Chino's Warehouse — Quản lý Kho Hàng Nội Bộ
**Cửa hàng:** Chino's Boba Tea & Asian Market | Joensuu, Finland
**Phiên bản:** 1.3.1 | Tháng 5/2026

> **v1.3** — Cập nhật từ PRD v1.2: sync với các quyết định thiết kế thực tế sau quá trình phát triển Phase 1.
> **v1.3.1** — Đồng bộ cột **Trạng thái** §6 theo closeout Phase 1 (F15/F18/F27/F28).
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
| F01 | Dropdown chọn kho | Thanh dropdown đầu màn hình chọn kho đang xem. Phase 1 chỉ có 1 kho nhưng UI sẵn sàng cho nhiều kho. | P1 | MVP | Done |
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
| F18 | Thông báo trong app | Tab Thông báo tách thành 2 tab con **Sắp hết hạn / Sắp hết hàng**. Tab Sắp hết hạn có toggle **Đã giảm giá** theo sản phẩm sắp hết hạn; sản phẩm hết hạn hiển thị đỏ nhạt + nhãn `Hết hạn rồi`, tap mở `ProductDetailScreen`. Tab Sắp hết hàng có nút **Thêm vào danh sách nhập** và **Không nhập nữa**. | P2 | MVP+ | Partial |
| F19 | Chuyển hàng giữa khu vực | Chuyển hàng từ kho lên siêu thị hoặc giữa các kho: trừ thùng ở nguồn, cộng thùng ở đích. | P2 | Phase 2 | Not started |
| F20 | Bản đồ nhiều khu vực | Dropdown selector thay thế pill "Kho" trên MapScreen để chuyển đổi giữa các kho. Tạo kho mới: nhập tên + grid size (rows × cols, không giới hạn max). Sau khi tạo vẫn cho đổi grid size — tăng thoải mái, giảm chỉ được nếu không có zone nào bị cắt ra ngoài. Xóa kho: block nếu còn lô hàng (inventory_entries có quantity_boxes > 0 trong zones của kho đó). Tab Sản phẩm / Thông báo / Đặt hàng vẫn hiện toàn bộ sản phẩm, thêm dropdown lọc theo kho (không chọn = hiện full). Quản lý kho (đổi tên, xóa) đặt trong Settings tab. Fix KI-004 (đổi kho → clear search). | P2 | Phase 2 | In Progress |
| F21 | Chế độ offline | Lưu dữ liệu cục bộ, queue thay đổi khi mất mạng, tự đồng bộ khi có mạng trở lại. | P3 | Phase 2 | Not started |
| F22 | Lịch sử cập nhật | Log: ai cập nhật gì, lúc nào. | P3 | Phase 3 | Not started |
| F23 | Trang tổng quan | Tổng số SKU, hàng sắp hết, lô sắp hết hạn. | P3 | Phase 3 | Not started |
| F24 | Auth & Super app integration | Đăng nhập, tích hợp vào hệ thống app nội bộ lớn hơn (kho, chấm công, chia ca...). Phân quyền chủ/nhân viên. Chi tiết thiết kế khi có yêu cầu cụ thể. | P4 | Phase 3 | Not started |
| F25 | Báo cáo / Xuất dữ liệu | Xuất dữ liệu tồn kho, lịch sử. | P4 | Phase 3 | Not started |
| F26 | Kiểm kho | Cho phép nhân viên đối chiếu và cập nhật lại số lượng thực tế trong kho. Chọn zone → đi từng tầng → nhập số thùng đếm được → lưu lại. Có thể hiện diff so với số hiện tại trước khi confirm. | P2 | Phase 2 | Not started |
| F27 | Tab Đặt hàng | Quản lý danh sách đặt hàng; tự động nhận sản phẩm từ tab Sắp hết hàng; xuất PDF và lưu lịch sử theo từng list. | P1 | Phase 1+ | Done |
| F28 | Danh sách không nhập nữa | Mục trong Settings, hiện số lượng sản phẩm không nhập nữa; mở chi tiết gồm tên, tồn kho realtime, lý do (optional); có thể chuyển lại tab Sắp hết hàng. | P1 | Phase 1+ | Done |
| F29 | Zone Layout Editor | Màn hình riêng để sắp xếp lại vị trí zone trên lưới. Zone hiển thị dưới dạng tile nhỏ cố định (tên + màu + badge kích thước thật, ví dụ "2×1"). Kéo tile vào grid → đặt zone vào vị trí mới, bóng mờ hiện footprint thật của zone. Collision check theo tọa độ thật, báo đỏ nếu chồng chéo. Nút Preview xem map thật trước khi lưu. Confirm → lưu toàn bộ vị trí mới. Truy cập từ MapScreen khi đang xem một kho. | P2 | Phase 2 | Planned |

---

## 7. Quy tắc nghiệp vụ

### 7.1 Bản đồ & Zone
- Lưới mặc định 6×6. Có thể cuộn ngang/dọc nếu cần nhiều hơn.
- Tap vào zone → danh sách sản phẩm trong zone đó (theo từng tầng nếu có).
- Xóa zone chỉ được khi zone đó không còn lô hàng nào (`quantity_boxes > 0`).
- Đổi kho (dropdown F01) → bản đồ tải lại, kết quả tìm kiếm bị xoá.

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

### 8.4 Inventory Entry (Lô hàng)
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
| Bản đồ kho (Tab) | Màn hình chính | Dropdown selector chọn kho · Lưới 2D zone · Thanh tìm kiếm · Nút quét mã · Chấm màu khi có kết quả |
| Zone Detail (Sheet) | Mở khi tap vào zone | Tên zone · Tabs tầng (nếu có) · Danh sách sản phẩm + số thùng + chấm màu |
| Chi tiết sản phẩm | Tap vào sản phẩm | Tên · Mã vạch · Ảnh (Phase 2) · Tất cả zone+tầng · Số thùng · Hạn (màu) · Ghi chú · Nút sửa/xóa · Ngưỡng cảnh báo |
| Danh sách sản phẩm (Tab) | Quản lý sản phẩm | Danh sách tất cả sản phẩm · Dropdown lọc theo kho (optional) · Tổng thùng · Chấm màu · Tìm kiếm · Toggle lọc có vấn đề · Thêm mới |
| Đặt hàng (Tab mới) | Quản lý list đặt hàng | Danh sách tất cả list (đang soạn / đã confirm / đã đặt hàng) · card từng list · sản phẩm tự động từ Sắp hết hàng + sản phẩm thêm tay (⭐) · cảnh báo khi thêm tên chưa có trong kho · cộng dồn nếu trùng sản phẩm trong list đang soạn · nút Confirm (khóa tạm) · nút Đã đặt hàng (khóa hẳn, có mở lại) · nút Xuất PDF riêng |
| Thêm hàng (Stack) | Thêm lô hàng | Chọn sản phẩm · Zone · Tầng · Số thùng · Hạn · Ghi chú |
| Thông báo (Tab) | Cảnh báo tồn kho & hạn | 2 tab con Sắp hết hạn / Sắp hết hàng · Sắp hết hạn: toggle Đã giảm giá, thẻ hết hạn nền đỏ nhạt + nhãn Hết hạn rồi · Sắp hết hàng: nút Thêm vào danh sách nhập + Không nhập nữa |
| Quét mã vạch (Fullscreen) | Camera overlay | Khung ngắm · Kết quả quét · Nút thêm thủ công nếu không nhận ra |
| Cài đặt (Tab) | Tuỳ chỉnh app | Theme sáng/tối · card vào danh sách Không nhập nữa (F28) |
| Zone Layout Editor | Sắp xếp lại vị trí zone trên lưới | Tile compact per zone · Badge kích thước · Drag onto grid · Footprint preview · Collision highlight · Nút Preview + Confirm |

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
| Navigation | React Navigation (Bottom Tabs + Stack) | 4 tab chính + stack screens |
| Offline | Zustand persist (Phase 2) | Cache cục bộ, sync khi có mạng |

---

## 11. Lộ trình phát triển

| Giai đoạn | Phạm vi | Mục tiêu |
|-----------|---------|----------|
| **Phase 1 – MVP** | F01–F07, F09–F17, F27–F28 (MVP); F18 partial | App dùng được ngay: tìm hàng, quét mã, cập nhật tồn kho; thông báo + đặt hàng + discontinued |
| **Phase 1+ → Phase 2** | Hoàn thiện F18, PDF & nối list đặt hàng, field lý do discontinued | Ổn định và khép kín nghiệp vụ đã mở |
| **Phase 2** | F08: Ảnh. F19–F21: Chuyển hàng, nhiều kho, offline. | Hỗ trợ đầy đủ luồng kho → siêu thị |
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
| Auth | F25 độc lập | F24 — gắn với super app integration | Định hướng hệ sinh thái rõ hơn |
| Super app | Không đề cập | Ghi nhận trong §1 và F24 | Thông tin mới từ chủ cửa hàng |
