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
- **Trạng thái:** Resolved
- **Đã fix:** Supabase Realtime hoạt động đúng — thiết bị B tự cập nhật trong vài giây khi thiết bị A thay đổi dữ liệu, không cần reload.

---

### [KI-003] Tab bar colors hardcode, không theo themeStore

- **Mức độ:** Medium
- **File liên quan:** `App.tsx`
- **Mô tả:** Tab bar `backgroundColor: '#1a1a1a'`, active `#22C55E`, inactive `#666` — hardcode, không dùng `colors` từ `themeStore`. Light mode sẽ lệch.
- **Cách tái hiện:** Bật theme sáng trong Cài đặt — thanh tab vẫn tối / không đồng bộ palette.
- **Hướng fix:** bọc navigator bằng provider theme hoặc đọc `useThemeStore` trong container tab và map màu động.
- **Trạng thái:** Closed
- **Ghi chú:** Không cần thiết — app chỉ dùng **dark mode**; **light mode** không nằm trong scope Phase 1.

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

### [KI-006] Không sửa được số thùng về 0 từ ProductDetailScreen

- **Mức độ:** Medium
- **File liên quan:** `screens/ProductDetailScreen.tsx`
- **Mô tả:** Đã fix được nhập 0 ở `ZoneDetailSheet` nhưng `ProductDetailScreen` vẫn chặn giá trị 0.
- **Trạng thái:** Resolved
- **Đã fix:** `handleSaveLot` chấp nhận số nguyên `quantity_boxes >= 0` (đồng bộ với `ZoneDetailSheet`); `loadData` không còn lọc `.gt('quantity_boxes', 0)` (xem KI-007).
- **Xác minh code (inline sửa lô):** Trong `handleSaveLot`, điều kiện từ chối là `quantity < 0` hoặc không phải số nguyên (`quantity !== Math.floor(quantity)`), không còn `quantity < 1` — nhập **0** hợp lệ. Tham chiếu: `screens/ProductDetailScreen.tsx` (hàm `handleSaveLot`, validation ngay trước `updateInventoryEntry`).

---

### [KI-007] Lô 0 thùng bị xóa khỏi app thay vì giữ lại

- **Mức độ:** High
- **File liên quan:** `stores/warehouseStore.ts`, `screens/ProductDetailScreen.tsx`, `components/ZoneDetailSheet.tsx` (dữ liệu qua `fetchInventoryByZone`)
- **Mô tả:** Khi cập nhật lô về 0 thùng, lô biến mất khỏi UI do truy vấn Supabase lọc `quantity_boxes > 0`, không phải do xóa record trong DB.
- **Hướng fix:** Bỏ `.gt('quantity_boxes', 0)` trên `fetchInventoryByZone` và `searchProducts`; `ProductDetailScreen.loadData` tải mọi lô; lô 0 thùng hiển thị dòng `Lô này đã hết hàng` + nút **Xóa lô** (xóa DB).
- **Trạng thái:** Resolved
- **Đã fix:** Bỏ lọc `quantity_boxes > 0` ở store và `ProductDetailScreen`; banner hết hàng + **Xóa lô** trên lô 0 thùng; ẩn nút 🗑️ hàng loạt khi 0 thùng để tránh trùng với **Xóa lô**. `NotificationsScreen`: dùng cờ “có lô có vấn đề” thay vì `issueBoxes === 0` để không bỏ sót SP chỉ còn lô 0 thùng.

---

### [KI-008] ProductsScreen — bật "Có vấn đề" gây TypeError `.has` of undefined *(trước đây ghi nhận là KI-006)*

- **Mức độ:** High (runtime)
- **File liên quan:** `screens/ProductsScreen.tsx`
- **Mô tả:** `filteredProducts` (`useMemo`) gọi `productIdsWithIssueLot.has(...)` trong khi `productIdsWithIssueLot` được khai báo **sau** cùng hook — temporal dead zone: biến `undefined` tại thời điểm closure chạy.
- **Cách tái hiện (bản lỗi):** Bật toggle **Có vấn đề** — crash ngay.
- **Hướng fix:** Đặt thứ tự hook: `selectedZoneSet` → `totalBoxesByProduct` → `productIdsWithIssueLot` → rồi mới `filteredProducts`; hoặc gỡ toggle / filter (đã làm trong code sau đó).
- **Trạng thái:** Resolved

---

### [KI-009] ZoneDetailSheet không cập nhật sau khi edit từ ProductDetailScreen

- **Mức độ:** Medium
- **File liên quan:** `components/ZoneDetailSheet.tsx`, `screens/ProductDetailScreen.tsx`
- **Mô tả:** Sau khi sửa thông tin lô (số thùng, hạn...) từ `ProductDetailScreen`, mở lại `ZoneDetailSheet` thì dữ liệu vẫn hiện cũ — phải tắt mở lại app hoặc chuyển màn hình mới thấy cập nhật.
- **Hướng fix:** `ZoneDetailSheet` cần refetch hoặc lắng nghe store update khi được mở lại.
- **Trạng thái:** Closed
- **Ghi chú:** Không còn liên quan — nút `i` điều hướng sang `ProductDetailScreen` đã bị xóa khỏi `ZoneDetailSheet`. Stale data không ảnh hưởng UX nữa.

---

### [KI-010] BarcodeScanner: sau quét không đóng modal / không chạy navigate

- **Mức độ:** High
- **File liên quan:** `screens/BarcodeScannerScreen.tsx`
- **Mô tả:** Sau khi quét mã, màn scanner đôi khi không tự đóng và luồng `navigate('Tabs', …)` (locate / search / thêm hàng) không hoàn tất đúng — thường do `goBack()` gọi quá sớm trong cùng tick với nested navigation (root stack: Tabs + BarcodeScanner modal).
- **Hướng fix:** Hoãn `goBack()` sau `navigate('Tabs', …)`; reset lock khi màn focus; tránh `useCallback` phụ thuộc state lock gây stale handler.
- **Trạng thái:** Resolved
- **Đã fix:** `navigateTabsThenCloseModal` + `scheduleDismissModal` (delay ~160ms); `useFocusEffect` reset `processingRef` / UI lock; xử lý thất bại locate / search reset ref để quét lại.

---
