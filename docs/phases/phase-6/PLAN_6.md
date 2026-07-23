# Phase 6 — Kế hoạch

**Trạng thái:** Planning | Tháng 7/2026

---

## 1. Tổng quan / Mục tiêu Phase 6

Phase 6 hoàn thiện F27 mở rộng (carry từ Phase 3), cải thiện UX picking,
thêm tính năng giảm giá, searchable dropdown, và redesign Settings/Notifications.

**Nguồn tham chiếu:** `SUMMARY_5.md`, `HANDOFF_5.md`, `REQUIREMENTS.md` v1.3.34,
`KNOWN_ISSUES.md`, `DECISIONS.md`.

---

## 2. Group A — F27 mở rộng (carry Phase 3→6)

### A1 — 2 tab + PDF tổng hợp (bắt buộc)

- **Files:** `screens/OrderListScreen.tsx`, `screens/OrderDetailScreen.tsx`,
  `stores/warehouseStore.ts`
- **Tham chiếu:** `REQUIREMENTS.md` §6 F27, `DECISIONS.md` list đặt hàng 2 tab
- **Mô tả:**
  - Mỗi list: tab **Hàng trong kho** / **Hàng mới**
  - Một list **active**; auto tạo + popup đặt tên nếu chưa có
  - SP từ Sắp hết hàng → tab Hàng trong kho, ô số thùng trống, bắt buộc điền trước Confirm
  - Nhóm theo category + **Chưa phân loại**
  - Tab Hàng mới: tên, phân loại, số thùng, ghi chú
  - Flow: **Draft → Confirm → Xuất PDF (gộp 2 tab) → Đã đặt**

---

## 3. Group B — Picking cải thiện

### B1 — Tab "Lấy hàng" lên trước + đổi tên

- **File:** `screens/OrderListScreen.tsx`, `App.tsx`
- **Mô tả:** Tab con trên OrderListScreen: đổi thứ tự Lấy hàng / Đặt hàng;
  đổi label tab dưới thành "Lấy hàng" tạm thời

### B2 — Quét mã barcode trên PickingDetailScreen

- **File:** `screens/PickingDetailScreen.tsx`
- **Mô tả:** Nút 📷 cạnh thanh tìm kiếm → BarcodeScanner → tìm lô theo barcode
  → thêm vào đơn

### B3 — Dropdown tối đa 5 kết quả + scroll

- **File:** `screens/PickingDetailScreen.tsx`
- **Mô tả:** Giới hạn 5 kết quả trong dropdown tìm kiếm lô;
  ScrollView trong dropdown để scroll xem thêm

### B4 — Default số lượng = 1

- **File:** `screens/PickingDetailScreen.tsx`
- **Mô tả:** Ô nhập qty khi thêm lô auto điền 1; user tự sửa nếu cần

### B5 — Modal chọn nhiều lô cùng lúc

- **File:** `screens/PickingDetailScreen.tsx`
- **Mô tả:** Khi SP có nhiều lô ở nhiều zone, hiện modal list tất cả lô
  (zone · tầng · còn X); user tick lô muốn lấy + nhập qty từng lô → thêm tất cả 1 lần

---

## 4. Group C — ProductsScreen picking integration

### C1 — Nút 🛒 trên card SP

- **File:** `screens/ProductsScreen.tsx`, `stores/warehouseStore.ts`
- **Mô tả:**
  - Nút 🛒 góc dưới phải mỗi card SP
  - Chưa có draft → tự tạo "Đơn lấy hàng [ngày]"
  - Có 1 draft → thêm vào luôn
  - Có 2+ draft → dropdown chọn draft
  - SP có nhiều lô → modal chọn lô + qty (default 1)
  - SP có 1 lô → modal nhập qty (default 1) luôn

### C2 — Cảnh báo lô trong picking khi qty về 0

- **File:** `screens/ProductDetailScreen.tsx`
- **Mô tả:** Khi save qty = 0, kiểm tra lô đó có trong picking draft/in_progress
  không → Alert 2 nút: **Giữ nguyên** / **Xóa khỏi đơn lấy hàng**

---

## 5. Group D — Hàng giảm giá

### D1 — Migration discount_percent

- **File:** `supabase/migrations/`, `supabase/migrations/schema.sql`
- **Mô tả:** Thêm cột `discount_percent NUMERIC(5,2)` vào `inventory_entries`;
  nullable; update `schema.sql` + `types/index.ts`

### D2 — NotificationsScreen cải thiện layout + % giảm giá

- **File:** `screens/NotificationsScreen.tsx`
- **Mô tả:**
  - Redesign card: tên SP đầy đủ (không cắt), spacing rõ hơn
  - Hiện `discount_percent` khi có (ví dụ «Giảm 20%» cạnh badge)
  - Layout badge / qty / Chi tiết không chen chúc

### D3 — Màn mới "Hàng giảm giá"

- **File:** `screens/DiscountScreen.tsx` (mới), `App.tsx` (SettingsStack),
  `screens/SettingsScreen.tsx`
- **Mô tả:**
  - Grid ảnh lớn + % giảm giá nổi bật
  - Filter nhanh theo zone
  - Chỉ hiện lô có `is_price_reduced = true`
  - Tap → ProductDetail

### D4 — Xuất PDF danh sách giảm giá

- **File:** `screens/DiscountScreen.tsx`
- **Mô tả:** Nút xuất PDF danh sách hàng giảm giá để in tại quầy;
  gồm ảnh SP, tên, %, zone

---

## 6. Group E — Searchable dropdown

### E1 — Component SearchableDropdown

- **File:** `components/SearchableDropdown.tsx` (mới)
- **Mô tả:** Component dùng chung: ô search + list kết quả scroll;
  props: `options`, `value`, `onChange`, `placeholder`, `maxVisible` (default 5)

### E2 — Áp dụng toàn app

- **Files:** FilterModal, MapScreen mode sheet, AddInventoryScreen,
  ProductDetailScreen (category), ZoneDetailSheet, OrderDetailScreen,
  InternalNotesScreen
- **Mô tả:** Replace các Picker/dropdown hiện tại bằng `SearchableDropdown`
  ở những nơi có nhiều lựa chọn

---

## 7. Group F — Settings redesign

### F1 — Nhóm thành sections

- **File:** `screens/SettingsScreen.tsx`
- **Mô tả:** Nhóm cards thành 4 sections:
  - **Kho & Hàng hóa** — Quản lý kho, Phân loại, Không nhập nữa
  - **Vận hành** — Ghi chú, Kiểm hàng, Hàng giảm giá
  - **Thông báo & Cảnh báo** — Thông báo hết hạn, cảnh báo tồn kho
  - **Hệ thống** — Tổng quan, Lịch sử thay đổi, Quản lý người dùng, Bảo mật

---

## 8. Group G — Perf: Tối ưu hiệu năng

> Mục tiêu: giảm số lượng DB request, giảm RAM tiêu thụ, loại bỏ các anti-pattern đã xác nhận qua recon tháng 7/2026. Không thay đổi UI, không thay đổi schema.

### P1 — `completePicking`: đổi sequential loop → batch update

- **File:** `stores/warehouseStore.ts` hàm `completePicking` (≈ dòng 1629–1652)
- **Vấn đề:** Loop `for (const item of picked)` gọi `.update().eq('id', ...)` từng item tuần tự. Picking 20 lô = 20 request riêng lẻ.
- **Hướng fix:**
  - Gom tất cả `(inventory_entry_id, newQty)` vào một mảng.
  - Với mỗi `inventory_entry_id` **duy nhất**, vẫn cần update từng dòng vì `newQty` khác nhau per entry — dùng `Promise.all` thay `await` tuần tự để các request chạy song song thay vì nối tiếp.
  - Giữ nguyên logic tính `newQty` (cùng lô nhiều item gộp qty), logic partial fail (`in_progress` khi lỗi), và `fetchAllInventoryEntries()` sau khi trừ xong.
- **Lưu ý:** `resetMarketChecklist` đã dùng batch đúng — không cần sửa.
- **KI mới:** KI-071
- **Test:** Tạo picking list ≥ 5 lô khác nhau → Hoàn thành → qty trừ đúng hết, không lỗi partial.

---

### P2 — `fetchAllInventoryEntries`: thêm projection (bỏ `*`)

- **File:** `stores/warehouseStore.ts` hàm `fetchAllInventoryEntries` (≈ dòng 720–740)
- **Vấn đề:** Query hiện tại:
```ts
  .select('*, product:products(*), zone:zones(*)')
```
  Load **toàn bộ cột** của 3 bảng về client — bao gồm nhiều cột không dùng đến trong phần lớn màn hình.
- **Hướng fix:** Đổi select thành chỉ lấy các cột thực sự dùng:
```ts
  .select(`
    id, product_id, zone_id, quantity_boxes, expiry_date,
    tier, barcode, is_special, is_checked, discount_percent,
    is_price_reduced, updated_at,
    product:products(id, name, image_url, is_archived,
      ignore_expiry_warning, ignore_stock_warning,
      low_warning_boxes, warning_days,
      category_level1_id, category_level2_id),
    zone:zones(id, name, cells, location_id)
  `)
```
- **Quan trọng:** Kiểm tra toàn bộ nơi dùng `inventoryEntries` trong store và các màn hình — đảm bảo không có cột nào đang dùng bị bỏ sót. Nếu phát hiện cột cần thêm thì thêm vào select, **không** được bỏ cột đang dùng.
- **Không thay đổi:** tên hàm, return type, logic filter/map sau fetch.
- **KI mới:** KI-072
- **Test:** Dashboard, Notifications, DiscountScreen, StockCheckScreen, PickingDetailScreen vẫn hiển thị đúng sau thay đổi.

---

### P3 — `fetchProducts` (full): thêm projection (bỏ `*`)

- **File:** `stores/warehouseStore.ts` hàm `fetchProducts` (≈ dòng 415–422)
- **Vấn đề:** Query hiện tại:
```ts
  .from('products').select('*').eq('is_archived', false).order('name')
```
  Load toàn bộ cột `products` — bao gồm các cột ít dùng (`is_deferred` DEPRECATED, các cột meta ít truy cập).
- **Hướng fix:** Đổi select thành:
```ts
  .select(`
    id, name, image_url, is_archived,
    ignore_expiry_warning, ignore_stock_warning,
    low_warning_boxes, warning_days,
    category_level1_id, category_level2_id,
    created_at, updated_at
  `)
```
- **Quan trọng:** Recon type `Product` trong `types/index.ts` — liệt kê tất cả cột đang có trong type, chỉ bỏ những cột **không có trong type Product** hoặc đã DEPRECATED. Nếu không chắc thì giữ lại cột đó.
- **Không thay đổi:** `fetchProductsPage` (đã có projection riêng), tên hàm, return type.
- **KI mới:** KI-073
- **Test:** AddInventory, MapScreen search, NotificationsScreen, ProductsScreen vẫn hiển thị tên + ảnh + status đúng.

---

### P4 — DB Index: thêm index `inventory_entries.expiry_date` và `products.is_archived`

- **File:** Tạo migration mới `supabase/migrations/<timestamp>_add_perf_indexes.sql`; cập nhật `supabase/migrations/schema.sql`
- **Vấn đề:** Recon schema.sql xác nhận:
  - `inventory_entries.expiry_date` — **không có index**. Tab Thông báo hết hạn và ExpiryAlertScreen query cột này mỗi lần mở.
  - `products.is_archived` — **không có index**. `fetchProducts` filter `.eq('is_archived', false)` scan toàn bảng.
  - Các cột khác (`inventory_entries.zone_id`, `inventory_entries.product_id`, `audit_logs.changed_at`) đã có index — không cần thêm.
- **Nội dung migration:**
```sql
  CREATE INDEX IF NOT EXISTS idx_inventory_entries_expiry_date
    ON inventory_entries(expiry_date);

  CREATE INDEX IF NOT EXISTS idx_products_is_archived
    ON products(is_archived);
```
- **Không thay đổi:** Code TypeScript, không cần sửa gì ngoài migration + schema.sql.
- **schema.sql:** Thêm 2 dòng CREATE INDEX vào đúng vị trí (cạnh các index của bảng tương ứng).
- **KI mới:** KI-074
- **Test:** Apply migration trên Supabase Dashboard → không lỗi.

---

## 9. Deferred / Optional

| Hạng mục | Ghi chú |
|----------|---------|
| KI-065 Custom location types | Blast radius lớn, defer Phase 7+ |
| F21 Offline mode | Optional |
| F25 Báo cáo | Optional |
| F26 Kiểm kho | Optional |
| Expo major upgrade | Optional |
| KI-026 AuditLog Realtime | Optional |

---

## 10. Tài liệu đi kèm Phase 6

| File | Mục đích |
|------|----------|
| `docs/phases/phase-6/PLAN_6.md` | File này |
| `docs/phases/phase-6/HANDOFF_6.md` | Tạo khi Phase 6 kết thúc |
| `docs/phases/phase-6/TESTCASES_6.md` | Tạo khi Phase 6 kết thúc |
| `docs/phases/phase-6/SUMMARY_6.md` | Tạo khi Phase 6 kết thúc |

---

## 11. Tóm tắt scope

| Group | Số task | Bắt buộc |
|-------|---------|----------|
| A — F27 carry | 1 | ✅ |
| B — Picking cải thiện | 5 | ✅ |
| C — Products picking | 2 | ✅ |
| D — Hàng giảm giá | 4 | ✅ |
| E — Searchable dropdown | 2 | ✅ |
| F — Settings redesign | 1 | ✅ |
| G — Perf | 4 | ✅ |
| **Tổng** | **19** | |

**Thứ tự đề xuất:** B1 → B2–B5 → C1–C2 → D1–D4 → E1–E2 → F1 → A1 → P1–P4
