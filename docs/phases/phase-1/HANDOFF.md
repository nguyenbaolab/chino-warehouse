# Phase 1 — Handoff

## Trạng thái

Chưa sẵn sàng test toàn bộ phase — còn TODO trong `PLAN.md`.

---

## Task gần nhất — Navigation, chi tiết SP, bản đồ, thông báo, số thùng

### 1) `App.tsx` — Tab bar trên stack con

**Thay đổi:** Mỗi tab (`Map`, `Products`, `Notifications`) dùng **stack riêng**: màn chính (`MapMain` / `ProductsMain` / `NotificationsMain`) + `ProductDetail` + `AddInventory`. Tab **Cài đặt** chỉ có `SettingsMain`. Root stack: `Tabs` + `BarcodeScanner` (**fullScreenModal**, không tab bar).

**Test:**

1. Từ **Kho** / **Sản phẩm** / **Thông báo** mở **Chi tiết SP** — thanh tab dưới **vẫn hiện**; **Đóng** quay về đúng tab.
2. Từ chi tiết mở **Thêm hàng** — tab bar **vẫn hiện**; Hủy/ lưu xong quay lại hợp lý.
3. Mở **BarcodeScanner** (từ Kho / Sản phẩm / Chi tiết) — **fullscreen**, **không** tab bar; đóng scanner về đúng ngữ cảnh.
4. **Locate** từ Kho: quét SP có trong hệ thống — về tab Kho, ô tìm kiếm + highlight zone (params `MapMain`).
5. **Assign** mã vạch từ Chi tiết: sau quét, về lại chi tiết đúng SP với mã đã điền (tham số `returnTab`).

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

### 4) `NotificationsScreen` — Pill tồn

**Thay đổi:** **0 thùng** → pill đỏ **Hết hàng**; **1 thùng** → pill đỏ **Còn rất ít**; ngưỡng vàng “sắp hết” theo `low_warning_boxes` (như trước). Hạn giữ **Hết hạn** / **Sắp hết hạn**.

**Test:** Card có lô 0 thùng / 1 thùng / chỉ vàng — nhãn pill tồn khớp.

---

### 5) `AddInventoryScreen` + `ZoneDetailSheet`

**Thay đổi:** Số thùng cho phép **0** (số nguyên ≥ 0), không còn bắt buộc ≥ 1.

**Test:**

1. Thêm lô với **0** thùng — lưu được (hoặc luồng cộng dồn trùng lô vẫn hợp lệ nếu backend cho).
2. Sửa lô trong sheet zone — nhập **0** — lưu được.

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

## Cập nhật docs mới (chưa implement code)

### Quyết định đã chốt (tham chiếu `docs/DECISIONS.md`)

1. Cảnh báo tồn kho xét theo **tổng thùng per sản phẩm**, không theo từng lô; logic hạn vẫn theo từng lô.
2. Lô `quantity_boxes = 0` **giữ lại**, không tự xóa; tại `ProductDetailScreen` sẽ hiển thị `Lô này đã hết hàng [Xóa lô]`.
3. `NotificationsScreen` giữ 2 pill nhưng đổi format card:
   - Dòng 1: `Còn ... thùng` (tổng tất cả lô).
   - Dòng 2: `Số thùng sắp hết hạn: ... thùng`.
   - Pill tồn theo tổng thùng; pill hạn theo lô xấu nhất.
4. Tab Thông báo có 2 tab con: **Có vấn đề / Để sau**; thao tác Để sau theo **sản phẩm**.

### Cần quyết định trước khi code

- `docs/BLOCKERS.md` đã thêm **[BLK-002]**: cần chốt nơi lưu trạng thái **Để sau** (Supabase cột/bảng mới hoặc local Zustand).

### Hướng dẫn test sau khi implement

1. Với sản phẩm có nhiều lô, thay đổi 1 lô nhưng tổng không đổi ngưỡng: pill tồn không đổi theo tổng.
2. Với sản phẩm tổng thùng vượt/ngang/dưới ngưỡng: pill tồn đổi đúng theo tổng thùng sản phẩm.
3. Đổi lô về 0 thùng: lô vẫn còn trong danh sách, hiện label hết hàng, không tự mất.
4. Tab Thông báo:
   - Tab **Có vấn đề** hiển thị đúng card format mới.
   - Bấm **Để sau** chuyển card sang tab Để sau.
   - Chuyển ngược từ Để sau về Có vấn đề hoạt động đúng.

## Sẽ cập nhật khi

DEV hoàn thành TODO trong `PLAN.md` hoặc QA xác nhận xong lượt test trên.
