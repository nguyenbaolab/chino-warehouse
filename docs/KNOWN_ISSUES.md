# KNOWN_ISSUES — Lỗi / sai lệch đã biết

---

### [KI-001] critical (≤1 thùng) hiển thị màu vàng thay vì đỏ

- **Mức độ:** Critical
- **File liên quan:** `types/index.ts` (`EXPIRY_COLORS`), `stores/themeStore.ts`
- **Mô tả:** `getCombinedStatus` trả về `'critical'` cho ≤1 thùng, nhưng `EXPIRY_COLORS.critical` = `#FACC15` (vàng) và `themeStore.statusCritical` cũng vàng — không khớp **REQUIREMENTS.md §5** (0–1 thùng phải **đỏ** `#EF4444`).
- **Cách tái hiện:** Tạo lô với `quantity_boxes === 1`, mở bản đồ / danh sách / chi tiết — chấm màu critical hiện vàng.
- **Hướng fix:** `EXPIRY_COLORS.critical` → `#EF4444`; `themeStore.statusCritical` → `#EF4444` (và biến thể light nếu cần).
- **Trạng thái:** Resolved
- **Đã fix:** `EXPIRY_COLORS.critical` = `#EF4444`; dark `statusCritical` = `#EF4444`, light `statusCritical` = `#DC2626` (cùng tông đỏ với `statusExpired`).

---

### [KI-002] F17 Realtime chưa verify

- **Mức độ:** High
- **File liên quan:** `stores/warehouseStore.ts`, có thể mở rộng `App.tsx` / các screen
- **Mô tả:** Không thấy Supabase Realtime subscription trong store; các thiết bị có thể không tự đồng bộ nếu không refresh / không refetch.
- **Cách tái hiện:** Hai máy mở cùng màn hình; đổi tồn trên máy A — quan sát máy B có cập nhật trong vài giây hay không.
- **Hướng fix:** Kiểm tra spec F17; thêm `supabase.channel(...).on('postgres_changes', ...)` và cập nhật Zustand khi có sự kiện.
- **Trạng thái:** Open

---

### [KI-003] Tab bar colors hardcode, không theo themeStore

- **Mức độ:** Medium
- **File liên quan:** `App.tsx`
- **Mô tả:** Tab bar `backgroundColor: '#1a1a1a'`, active `#22C55E`, inactive `#666` — hardcode, không dùng `colors` từ `themeStore`. Light mode sẽ lệch.
- **Cách tái hiện:** Bật theme sáng trong Cài đặt — thanh tab vẫn tối / không đồng bộ palette.
- **Hướng fix:** bọc navigator bằng provider theme hoặc đọc `useThemeStore` trong container tab và map màu động.
- **Trạng thái:** Open

---

### [KI-004] Đổi kho không xóa kết quả tìm kiếm

- **Mức độ:** Low
- **File liên quan:** `screens/MapScreen.tsx`
- **Mô tả:** Khi bấm chọn kho khác (`setSelectedLocation`), không gọi `clearSearch` — vi phạm **REQUIREMENTS.md §7.1** (đổi kho → xóa kết quả tìm).
- **Cách tái hiện:** Tìm sản phẩm trên kho A → chuyển sang kho B — panel kết quả / highlight zone cũ vẫn có thể còn.
- **Hướng fix:** Khi đổi `selectedLocationId`, gọi `clearSearch()` hoặc tương đương reset state tìm kiếm.
- **Trạng thái:** Deferred
- **Ghi chú:** Phase 1 chỉ có 1 kho duy nhất, chưa có UI thêm/sửa/xóa kho (F20 — Phase 2). Không thể tái hiện lỗi này ở Phase 1. Reopen khi Phase 2 implement multi-kho.

---

### [KI-005] Add sản phẩm / lô không refresh UI ngay

- **Mức độ:** Medium
- **File liên quan:** `screens/AddInventoryScreen.tsx`, `screens/ProductDetailScreen.tsx`, `stores/warehouseStore.ts`
- **Mô tả:** Sau khi thêm sản phẩm hoặc lô hàng mới, danh sách không tự cập nhật — phải chuyển sang màn hình khác rồi quay lại mới thấy. Riêng chi tiết SP: sau **Thêm hàng** → `goBack()` về `ProductDetailScreen`, danh sách lô (`lots` local) không refetch nên không thấy lô mới.
- **Cách tái hiện:** (1) Thêm SP mới → tab Sản phẩm không thấy SP. (2) Từ chi tiết SP → Thêm lô → quay lại chi tiết — không thấy lô mới.
- **Hướng fix:** Tránh race `fetchProducts` trên `AddInventoryScreen`; refetch chi tiết khi màn focus (`useFocusEffect` + `loadData`).
- **Trạng thái:** Resolved
- **Đã fix:** (1) `AddInventoryScreen`: chỉ `fetchProducts()` khi `products.length === 0` — tránh response cũ ghi đè sau `addProduct`. (2) `addInventoryEntry` trong store vẫn merge `inventoryEntries` đúng. (3) `ProductDetailScreen`: `useFocusEffect` gọi `loadData()` mỗi lần màn được focus — cập nhật `lots` sau khi thêm lô từ stack.

---

### [KI-006] ProductsScreen — bật "Có vấn đề" gây TypeError `.has` of undefined

- **Mức độ:** High (runtime)
- **File liên quan:** `screens/ProductsScreen.tsx`
- **Mô tả:** `filteredProducts` (`useMemo`) gọi `productIdsWithIssueLot.has(...)` trong khi `productIdsWithIssueLot` được khai báo **sau** cùng hook — temporal dead zone: biến `undefined` tại thời điểm closure chạy.
- **Cách tái hiện (bản lỗi):** Bật toggle **Có vấn đề** — crash ngay.
- **Hướng fix:** Đặt thứ tự hook: `selectedZoneSet` → `totalBoxesByProduct` → `productIdsWithIssueLot` → rồi mới `filteredProducts`.
- **Trạng thái:** Resolved

---
