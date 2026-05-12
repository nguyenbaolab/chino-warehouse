# Phase 1 — Tổng kết

**Phiên bản tài liệu:** closeout Phase 1 | Tháng 5/2026

---

## 1. Tổng quan Phase 1

### Mục tiêu

Đưa vào dùng thực tế một app nội bộ: tra cứu vị trí và tồn theo zone/tầng, tìm theo tên, quét barcode theo **lô**, theo dõi hạn và tồn (màu combined), thêm/sửa/xóa lô, đồng bộ cloud, tab thông báo hai nhánh (hạn / tồn thấp), tab đặt hàng dạng danh sách, và luồng “không nhập nữa” kèm màn danh sách trong Cài đặt.

### Kết quả

- MVP kho **đạt**: nhân viên có thể làm việc hàng ngày trên một kho (location) với bản đồ zone, chi tiết sản phẩm, và scanner.
- **F18** (`NotificationsScreen`) đã **Done** sau test thực tế (tháng 5/2026); trước đó từng ghi **Partial** trong closeout Phase 1. Một số hạng mục mở rộng của **F27** (PDF, nối từ Sắp hết hàng) và **F28** (field lý do riêng) vẫn **kế hoạch hóa sang Phase 2** — xem `docs/phases/phase-2/PLAN.md` và mục 3 dưới đây.
- Các tính năng **F08, F19–F21, F26** không thuộc cam kết Phase 1 — đã lên kế hoạch Phase 2 từ đầu.

---

## 2. Danh sách tính năng đã hoàn thành (Phase 1 — Done)

Theo đánh giá closeout và bảng `REQUIREMENTS.md` §6:

| Mã | Tóm tắt |
|----|---------|
| F01 | Dropdown chọn kho (UI sẵn multi-kho) |
| F02 | Bản đồ 2D zone |
| F03 | Chấm màu zone theo combined status |
| F04 | Quản lý zone (thêm/sửa/xóa có điều kiện) |
| F05 | Zone nhiều tầng |
| F06 | Danh sách SP trong zone |
| F07 | Chi tiết sản phẩm + lô |
| F09 | Tìm theo tên + highlight |
| F10 | Quét barcode (theo lô), locate/search |
| F11 | Tồn theo thùng, nhiều lô/zone |
| F12 | Hạn theo lô + màu |
| F13 | Ghi chú SP & lô |
| F14 | Thêm sản phẩm |
| F15 | Thêm lô (zone/tầng/thùng/hạn/ghi chú/**barcode lô**) |
| F16 | Sửa/xóa lô |
| F17 | Đồng bộ cloud + Realtime (theo các màn đã gắn subscription / refetch) |
| F18 | Tab Thông báo: Sắp hết hạn / Sắp hết hàng, toggle Đã giảm giá, card hết hạn, nút Thêm vào danh sách nhập + Không nhập nữa (xác nhận Done sau test thực tế) |
| F27 | Tab Đặt hàng: danh sách list, chi tiết list, CRUD item, trạng thái draft/confirmed/placed, cộng dồn khi trùng trong draft |
| F28 | Cài đặt: card + màn “Không nhập nữa”, tồn tổng thùng, **Nhập lại** (`is_discontinued`) |

---

## 3. Tính năng chưa hoàn thiện + lý do

| Hạng mục | Lý do / trạng thái |
|----------|-------------------|
| **F27 — PDF** | Nút xuất PDF còn placeholder, chưa implement generator + lưu file. |
| **F27 — “Thêm vào danh sách nhập”** | Từ tab Sắp hết hàng chỉ log/placeholder, chưa tạo/ghi item vào `order_lists`. |
| **F28 — Lý do discontinued** | Chưa có cột/field riêng; UI hiển thị “Lý do” từ `products.notes` — dễ trùng mục đích ghi chú chung. |
| **Barcode edge cases (BLK-001)** | Per lô đã chốt và code; **chờ chủ cửa hàng** xác nhận thực tế quầy/kho (trùng mã, đổi nhãn, v.v.). |

---

## 4. Quyết định thiết kế quan trọng (Phase 1)

Tóm tắt — chi tiết đầy đủ trong **[`docs/DECISIONS.md`](../../DECISIONS.md)**:

- **Màu & combined status:** đỏ cho hết hàng / hết hạn / ≤1 thùng; vàng cho nhánh “sắp”; zone theo lô xấu nhất.
- **`low_critical_boxes = 1`** cố định trong logic; không UI chỉnh critical.
- **`low_warning_boxes` / `warning_days`** configurable trên chi tiết SP.
- **Phase 1 không auth**; super app / auth hoãn Phase 3 (`DECISIONS.md`).
- **Barcode trên `inventory_entries`** (per lô), không còn barcode per sản phẩm; tìm tên vs quét lô thống nhất PRD §7.4.
- **Notifications:** hai tab Sắp hết hạn / Sắp hết hàng; `is_price_reduced` theo lô; `is_discontinued` theo sản phẩm; bỏ tab Để sau trên UI.
- **Đặt hàng:** list + item model, trạng thái draft/confirmed/placed (`DECISIONS` + migrations trong repo).

---

## 5. Known issues đã giải quyết (tham chiếu `docs/KNOWN_ISSUES.md`)

- **KI-001** — Màu critical: đã chỉnh khớp đỏ PRD.
- **KI-002** — F17 Realtime: đã bổ sung / xác minh luồng cập nhật (subscription + refetch theo màn).
- **KI-005** — Refresh sau add SP/lô: đã xử lý race + focus refetch.
- **KI-006 / KI-007** — Lô 0 thùng, query, banner xóa lô: đã Resolved.
- **KI-008** — `ProductsScreen` `.has` undefined: Resolved.
- **KI-010** — BarcodeScanner đóng modal / navigate: Resolved.

**Closed (không còn ưu tiên sửa Phase 1):** KI-003 (tab bar theme — scope dark), KI-009 (ZoneDetailSheet stale — thay đổi UX).

---

## 6. Known issues còn open / deferred

- **KI-004** — Đổi kho không xóa search: **Deferred** tới Phase 2 (multi-kho / F20); Phase 1 một kho nên ít tái hiện.
- **Theo dõi barcode (BLK-001):** chờ phản hồi chủ cửa hàng về edge cases sau khi dùng barcode per lô thực tế — xử lý bổ sung có thể vào Phase 2 (kèm multi-barcode nếu cần).

---

## 7. Chuyển sang Phase 2

- Nối **Sắp hết hàng → Đặt hàng**, **xuất PDF**, field **lý do discontinued** riêng.
- **F08, F19, F20, F21, F26** theo scope đã hoãn.
- **Barcode:** edge cases + tùy chọn **multi-barcode per sản phẩm** nếu nghiệp vụ yêu cầu.

Kế hoạch chi tiết: **`docs/phases/phase-2/PLAN.md`**.
