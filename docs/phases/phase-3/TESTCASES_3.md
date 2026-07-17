# Phase 3 — Test Cases

**Phiên bản:** closeout Phase 3 | Tháng 7/2026  
**Tổng:** 52 test cases (TC-301 → TC-352)  
**Format:** bảng (giống Phase 2). Điền Pass/Fail khi chạy thủ công.

Tham chiếu: `PLAN_3.md`, `SUMMARY_3.md`, `HANDOFF_3.md`.

---

## Nhóm A — Bug Fixes (TC-301 → TC-310)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-301 | Hạn DD/MM/YYYY hợp lệ | ZoneDetail → sửa lô → nhập `30/12/2026` → Lưu | Lưu OK; hiện `30/12/2026` (DB `2026-12-30`) |
| TC-302 | MM/YYYY → ngày 1 | Nhập `12/2026` → Lưu | Tương đương `01/12/2026` |
| TC-303 | Sai format hạn | Nhập `2026-12-30` hoặc chữ → Lưu | Alert lỗi; không lưu |
| TC-304 | Products quét → X restore | Quét barcode lọc SP → bấm X | List trở về đầy đủ (non-archived) |
| TC-305 | Products xóa từng ký tự | Search có kết quả → xóa dần | List mở dần theo query |
| TC-306 | Products gõ barcode text | Gõ mã vạch lô vào ô search | Hiện SP khớp barcode |
| TC-307 | Map gõ barcode text | Map search gõ mã vạch | Hiện lô / SP khớp |
| TC-308 | Zone không chồng double-tap | Tạo zone → double-tap / lag | Không tạo zone chồng ô đã chiếm |
| TC-309 | Conflict Alert | 2 user cùng sửa 1 lô; B lưu sau A | Alert xung đột |
| TC-310 | Conflict Ghi đè / Xem lại | Từ Alert chọn từng nút | Ghi đè lưu; Xem lại reload data mới |

---

## Nhóm B — UX (TC-311 → TC-320)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-311 | Badge Đã giảm giá | Toggle giảm giá trên card hạn | Badge hiện ngay, không cần expand |
| TC-312 | ZonePicker gồm zone nguồn | Chuyển lô → ZonePicker | Zone nguồn highlight; có thể chọn |
| TC-313 | Cùng zone khác tầng | Chọn cùng zone, tầng khác → confirm | Lô đổi tầng; sheet reload |
| TC-314 | normalizeText dấu phẩy | Search `mi,` vs tên có dấu phẩy | Vẫn khớp (normalize) |
| TC-315 | normalizeText nháy | Search có `'` | Vẫn khớp |
| TC-316 | AddInventory hint | Mở AddInventory | Thấy note trên + hint dưới ô tìm |
| TC-317 | Sửa tên SP ZoneDetail | ✏️ tên → đổi → ✓ | Tên cập nhật; list refresh |
| TC-318 | Map → sheet scroll | Search/locate → chọn lô | Sheet mở + scroll/highlight SP |
| TC-319 | Tắt cảnh báo hạn | Settings tắt hết hạn | Màu/badge hạn tắt; list vẫn hiện |
| TC-320 | Tắt cảnh báo hết hàng | Settings tắt hết hàng | Tương tự nhánh tồn |

---

## Nhóm C — Realtime (TC-321 → TC-323)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-321 | Realtime thêm zone | Device A thêm zone; B mở Map cùng kho | B thấy zone mới (sau debounce ≤2s) |
| TC-322 | Realtime xóa zone | A xóa zone trống | B thấy biến mất |
| TC-323 | Realtime đổi tên zone | A đổi tên | B thấy tên mới |

---

## Nhóm D — F28 / F08 (TC-324 → TC-329)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-324 | F28 Không nhập nữa + lý do | Notifications → Không nhập nữa → nhập lý do (optional) | SP discontinued; lý do lưu `discontinued_reason` |
| TC-325 | F28 Discontinued hiện lý do | Settings → Không nhập nữa | Card hiện lý do từ cột mới |
| TC-326 | F28 Nhập lại | Discontinued → Nhập lại | `is_discontinued` false; khỏi list |
| TC-327 | F08 upload ảnh Products | Tap placeholder 📷 → chụp/chọn | Thumbnail 64×64; Storage + `image_url` |
| TC-328 | F08 zoom + xóa ProductDetail | Tap ảnh → zoom; 🗑️ confirm | Zoom OK; xóa Storage + null URL |
| TC-329 | F08 ảnh AddInventory tạo SP | Tạo SP mới + chọn ảnh | Upload sau `productId`; hiện trên Products |

---

## Nhóm E — F23 Dashboard (TC-330 → TC-333)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-330 | Mở Dashboard | Settings → Tổng quan kho | 8 stat + pie; filter kho/zone |
| TC-331 | Stat → Notifications | Tap card sắp hết hạn/hết hàng | Push NotificationsFromDashboard đúng tab/filter |
| TC-332 | Stat → Discontinued | Tap không nhập nữa | Mở DiscontinuedProducts |
| TC-333 | Guest xem Dashboard | Login guest | Xem được; không mutate |

---

## Nhóm F24 — RBAC (TC-334 → TC-341)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-334 | Guest ẩn CRUD | Guest vào Map/Products/Orders | Không FAB/✏️/🗑️/thêm hàng |
| TC-335 | Guest xem AuditLog | Settings → Lịch sử | Xem được |
| TC-336 | Guest không User Mgmt | Settings | Không card Quản lý người dùng |
| TC-337 | Disabled block login | User `is_disabled` login | Alert + logout |
| TC-338 | Staff CRUD, không User Mgmt | Staff | CRUD OK; không User Management |
| TC-339 | Admin User Management | Admin | Thấy list + toggle guest/disabled (không tạo user) |
| TC-340 | Super_admin tạo / cấp Admin | Super_admin | Tạo tài khoản + cấp/thu Admin |
| TC-341 | Super_admin không tự disable | Thử vô hiệu hóa chính mình | Không cho phép |

---

## Nhóm SEC (TC-342 → TC-343)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-342 | SEC-05 maxLength | Gõ vượt max trên tên SP / barcode / email | Không nhập quá giới hạn |
| TC-343 | SEC-06 generic error | Force lỗi mạng/DB khi lưu | Message generic VN; không lộ schema |

---

## Nhóm Group F + F31 (TC-344 → TC-352)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-344 | F1 scanner Hàng đã hết | Quét mã SP hết lô từ Map → Xem chi tiết → Đóng | Về đúng tab; stack không kẹt ProductDetail |
| TC-345 | F2 không xóa lô còn thùng | Lô qty > 0 | Không 🗑️; store reject nếu gọi |
| TC-346 | F2 xóa lô 0 thùng | Lô qty = 0 → xóa | Xóa OK |
| TC-347 | F3 ẩn archived ZoneDetail | Ẩn SP → mở zone | Không thấy lô SP đó |
| TC-348 | F4 tap kho → Map | LocationManagement tap body card | Tab Map + kho đúng |
| TC-349 | F5 filter chưa ảnh | Bật «Chưa có ảnh» | Chỉ SP không `image_url` |
| TC-350 | F7 autofill barcode | AddInventory 📷 quét → chọn SP | Ô barcode lô = mã quét; gõ tay → trống |
| TC-351 | F8 ZonePicker dời lô | ZoneDetail → → → tap zone → tầng → confirm | Lô chuyển; goBack; sheet reload |
| TC-352 | F31 Internal Notes | Tạo note SP có sẵn + tên tự do; tap card FK | Lưu OK; card custom hint; tap → ProductDetail |

---

## Deferred — F27 mở rộng (Phase 4) — không bắt buộc Pass Phase 3

| TC | Tên | Ghi chú |
|----|-----|---------|
| TC-D27-01 | 2 tab Hàng trong kho / Hàng mới | Chưa implement |
| TC-D27-02 | Một list active + popup tên | Chưa implement |
| TC-D27-03 | PDF gộp 2 tab + flow Confirm | Chưa implement |

---

## Tổng hợp

| Nhóm | TC | Cover |
|------|-----|-------|
| A Bugs | 301–310 | A1–A5 |
| B UX | 311–320 | B1–B8 |
| C Realtime | 321–323 | C1 |
| D F28/F08 | 324–329 | D2, D3 |
| E F23 | 330–333 | E1 |
| F24 RBAC | 334–341 | E2 |
| SEC | 342–343 | SEC-05/06 |
| Group F + F31 | 344–352 | F1–F8 / F31 |
| **Tổng Phase 3** | **52** | 28 task done |
| F27 deferred | D27-* | Phase 4 |
