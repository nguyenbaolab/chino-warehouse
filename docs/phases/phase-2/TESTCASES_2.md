# Phase 2 — Test Cases

**Phiên bản:** Tháng 5/2026
**Tổng:** 50 test cases (TC-201 → TC-250)

---

## Nhóm AUTH (TC-201 → TC-210)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-201 | Login đúng credentials | Mở app → nhập email + password đúng → bấm Đăng nhập | Vào app, thấy tab Kho (bản đồ zone) |
| TC-202 | Login sai password | Nhập email đúng + password sai → bấm Đăng nhập | Hiện lỗi "Email hoặc mật khẩu không đúng", không vào app |
| TC-203 | Login email không tồn tại | Nhập email chưa đăng ký + bất kỳ password → bấm Đăng nhập | Hiện lỗi, không vào app |
| TC-204 | Đăng xuất thủ công | Login → tab Cài đặt → kéo xuống → bấm Đăng xuất | Về màn LoginScreen, không hiện Alert "Hết phiên" |
| TC-205 | Kill app → mở lại | Login → tắt app hoàn toàn (swipe kill) → mở lại | Về màn LoginScreen (không vào thẳng app, không giữ session) |
| TC-206 | Auto-logout 20 phút | Login → để app foreground 20 phút không chạm màn hình | Hiện Alert "Phiên đăng nhập đã hết hạn" → về LoginScreen |
| TC-207 | Background ngắn (< 20 phút) | Login → switch sang app khác 5 phút → quay lại | Vẫn vào được app, không cần login lại |
| TC-208 | Background dài (> 20 phút) | Login → switch sang app khác > 20 phút → quay lại | Hiện Alert "Phiên đăng nhập đã hết hạn" → về LoginScreen |
| TC-209 | Token refresh liên tục | Login → dùng app liên tục 1+ giờ (chạm màn hình thường xuyên) | Không bị logout, session vẫn hoạt động bình thường |
| TC-210 | 2 thiết bị cùng login | Login cùng tài khoản trên 2 thiết bị | Cả 2 hoạt động bình thường, không conflict |

---

## Nhóm MULTI-KHO F20 (TC-211 → TC-220)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-211 | Tạo kho mới | Cài đặt → Quản lý kho → + → nhập tên + grid size → Lưu | Kho mới xuất hiện trong danh sách, có thể chọn trên MapScreen |
| TC-212 | Tăng grid size | Sửa kho → tăng grid_rows hoặc grid_cols | Lưu thành công, bản đồ mở rộng |
| TC-213 | Giảm grid size (zone bị cắt) | Tạo zone ở góc xa → sửa kho giảm grid nhỏ hơn tọa độ zone | Block + thông báo lỗi (zone bị cắt ra ngoài) |
| TC-214 | Xóa kho không có hàng | Tạo kho trống (không zone/lô) → xóa kho | Xóa thành công, biến mất khỏi danh sách |
| TC-215 | Xóa kho còn inventory | Kho có zone + lô (kể cả lô 0 thùng) → xóa kho | Block + thông báo lý do (còn inventory_entries) |
| TC-216 | Chuyển kho trên MapScreen | Bấm tên kho trên thanh header → chọn kho khác trong sheet | Bản đồ load zone + inventory của kho mới |
| TC-217 | Chuyển kho clear search | Tìm SP trên kho A → chuyển sang kho B | Kết quả tìm kiếm / highlight zone bị xóa (KI-004) |
| TC-218 | Filter kho trên ProductsScreen | Tab Sản phẩm → dropdown Kho → chọn một kho cụ thể | Chỉ hiện SP có lô trong zone của kho đó |
| TC-219 | Filter kho trên NotificationsScreen | Tab Thông báo → dropdown Kho → chọn một kho | Lọc áp dụng cho cả tab Sắp hết hạn và Sắp hết hàng |
| TC-220 | Tất cả kho trên Products | Tab Sản phẩm → dropdown → Tất cả kho | Hiện toàn bộ SP (`fetchAllInventoryEntries`), không phụ thuộc `store.zones` |

---

## Nhóm ZONE LAYOUT EDITOR F29 (TC-221 → TC-226)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-221 | Mở Layout Editor | Tab Kho → bấm nút ▦ (Sắp xếp) | Mở màn ZoneLayoutEditorScreen, hiện tiles zone + lưới |
| TC-222 | Kéo zone sang vị trí trống | Tap tile zone → tap vị trí trống trên grid | Zone đặt vào vị trí mới (footprint preview hiện đúng kích thước) |
| TC-223 | Kéo zone chồng lên zone khác | Tap tile → tap vị trí đã có zone khác chiếm | Highlight đỏ (collision), không cho Confirm |
| TC-224 | Preview | Đặt zone xong → bấm Preview | Hiện map thật (giống MapScreen) với vị trí mới |
| TC-225 | Confirm | Preview OK → bấm Confirm | Lưu `batchUpdateZoneCells` → quay về MapScreen → vị trí zone mới |
| TC-226 | Cancel | Đặt zone → bấm Cancel / Back | Quay về MapScreen, vị trí zone giữ nguyên như trước |

---

## Nhóm CATEGORY F30 (TC-227 → TC-235)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-227 | Tạo Cấp 1 + Cấp 2 | Cài đặt → Phân loại → + Thêm nhóm → nhập tên → xổ nhóm → + Thêm loại → nhập tên | Cấp 1 và Cấp 2 xuất hiện trong accordion |
| TC-228 | Sửa tên Cấp 1 | Bấm edit Cấp 1 → đổi tên → Lưu | Tên cập nhật trong danh sách và trên SP đã gán |
| TC-229 | Sửa tên Cấp 2 | Bấm edit Cấp 2 → đổi tên → Lưu | Tên cập nhật |
| TC-230 | Xóa Cấp 2 | Xóa một Cấp 2 (không SP nào dùng) | Xóa thành công, Cấp 1 vẫn còn |
| TC-231 | Xóa Cấp 1 có Cấp 2 con | Xóa Cấp 1 đang có Cấp 2 bên trong | Block + thông báo (còn L2 con hoặc SP dùng) |
| TC-232 | Gán category trong ProductDetail | Chi tiết SP → section Chi tiết → chọn Nhóm (Cấp 1) + Loại (Cấp 2) | Lưu thành công, hiện phân loại trên card SP |
| TC-233 | Chọn Cấp 1 không chọn Cấp 2 | Chi tiết SP → chọn Cấp 1 → không chọn Cấp 2 → lưu | Lưu OK (Cấp 2 optional) |
| TC-234 | Đổi Cấp 1 → Cấp 2 reset | SP đã có Cấp 1 + Cấp 2 → đổi Cấp 1 sang nhóm khác | Cấp 2 bị xóa (reset về "Không phân loại") |
| TC-235 | AddInventory: SP có sẵn vs SP mới | (a) Chọn SP có sẵn → (b) Tạo SP mới | (a) Category read-only · (b) Chọn được Cấp 1/2 trong form tạo |

---

## Nhóm AUDIT LOG SEC-11 (TC-236 → TC-245)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-236 | Thêm lô → audit INSERT | Thêm lô mới cho SP bất kỳ → vào Lịch sử thay đổi | Thấy entry INSERT inventory_entries + tên SP + zone + kho |
| TC-237 | Sửa số thùng → audit UPDATE | Sửa số thùng lô → vào Lịch sử | Entry UPDATE hiện "X → Y thùng" |
| TC-238 | Chuyển zone → audit UPDATE | Sửa zone_id lô → vào Lịch sử | Entry UPDATE hiện "zone A → zone B" |
| TC-239 | Xóa lô → audit DELETE | Xóa lô (từ banner hết hàng/hết hạn) → vào Lịch sử | Entry DELETE inventory_entries |
| TC-240 | Sửa tên SP → audit UPDATE | Đổi tên SP → vào Lịch sử | Entry UPDATE products hiện "tên A → tên B" |
| TC-241 | Filter theo kho | AuditLogScreen → dropdown Kho → chọn kho cụ thể | Chỉ hiện entries của lô thuộc zone trong kho đó |
| TC-242 | Filter Loại = Sản phẩm → Kho disabled | AuditLogScreen → Loại = Sản phẩm | Dropdown Kho bị disabled (opacity 0.4), kho reset về null |
| TC-243 | Pagination | AuditLogScreen → tạo > 10 thay đổi → bấm mũi tên phải (cũ hơn) | Trang 2 query DB; bấm mũi tên trái → trang 1 từ cache |
| TC-244 | ProductDetail: section audit | Chi tiết SP → kéo xuống cuối | Hiện đúng 10 entries liên quan SP đó + nút "Xem tất cả" |
| TC-245 | Settings card subtitle | Tạo thay đổi bất kỳ → tab Cài đặt | Card "Lịch sử thay đổi" subtitle hiện entry mới nhất (tên + action) |

---

## Nhóm SECURITY (TC-246 → TC-250)

| TC | Tên | Bước | Kết quả mong đợi |
|----|-----|------|-------------------|
| TC-246 | GET API không JWT → RLS block | Gọi Supabase API với anon key (không JWT) từ curl/Postman | 401 hoặc empty data (RLS chặn) |
| TC-247 | Realtime chỉ khi authenticated | Thiết bị chưa login mở websocket | Không nhận events; thiết bị đã login nhận events bình thường |
| TC-248 | Audit log: client không INSERT trực tiếp | Thử INSERT vào `audit_logs` từ client (Supabase JS) | Lỗi RLS (chỉ trigger INSERT được, client chỉ SELECT) |
| TC-249 | Realtime sync 2 thiết bị | 2 máy login → máy A thêm lô → quan sát máy B | Máy B thấy cập nhật trong vài giây |
| TC-250 | Tên user trong audit log | Thực hiện thay đổi → xem audit entry | Hiện đúng prefix email (phần trước @) ở cột `changed_by_name` |

---

**Ghi chú:**
- Test trên thiết bị thật (APK) ưu tiên hơn Expo Go cho nhóm AUTH và SECURITY.
- Tham chiếu: `GOLIVE_CHECKLIST_2.md` nhóm E cho smoke test sau build.
- KI còn Open: xem `KNOWN_ISSUES.md` (KI-017 → KI-025, KI-026).
