# WORKLOG

Nhật ký thay đổi có ý nghĩa (DEV ghi sau mỗi task theo `docs/project/WORKFLOW.md`).

---

## Tháng 5/2026 — Hệ thống tài liệu & màu sắc

### Màu sắc (TODO #1 — Done)

- **Task:** Đơn giản hóa hệ thống màu status
- **Files thay đổi:** `types/index.ts`, `stores/themeStore.ts`
- **Kết quả:** Gộp critical + warning = vàng (`#FACC15` dark / `#EAB308` light). Bỏ màu cam khỏi status system.
- **Docs đã cập nhật:** `CONTEXT.md`, `FEATURES.md`, `USER_GUIDE.md`, `README.md`, `.cursorrules` (trước khi tái cấu trúc docs)

### Tái cấu trúc tài liệu

- **Task:** Xây dựng hệ thống docs chuyên nghiệp
- **Kết quả:** Tạo cấu trúc `docs/` với `project/REQUIREMENTS.md`, `project/CONTEXT.md`, `project/WORKFLOW.md`, `project/USER_GUIDE.md`, `DECISIONS.md`, `KNOWN_ISSUES.md`, `WORKLOG.md`, `BLOCKERS.md`, `phases/phase-1/`; cập nhật `.cursorrules`; xóa `FEATURES.md`, `CONTEXT.md` root; di chuyển requirements & user guide vào `docs/project/`.

### KI-001 — Màu critical (0–1 thùng) = đỏ

- **Task:** Fix KI-001: trạng thái `critical` hiển thị đỏ theo REQUIREMENTS §5 / DECISIONS
- **Files thay đổi:** `types/index.ts`, `stores/themeStore.ts`, `docs/KNOWN_ISSUES.md`, đồng bộ tham chiếu KI-001 (`.cursorrules`, `README.md`, `docs/project/CONTEXT.md`, `docs/project/USER_GUIDE.md`, `docs/phases/phase-1/PLAN.md`)
- **Kết quả:** `EXPIRY_COLORS.critical` = `#EF4444`; `statusCritical` dark `#EF4444`, light `#DC2626`
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md` (+ các file tham chiếu trạng thái bug)

### KI-004 — Trạng thái Deferred (chỉ docs)

- **Task:** Cập nhật KNOWN_ISSUES: KI-004 không ưu tiên fix ở Phase 1
- **Files thay đổi:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`
- **Kết quả:** KI-004 → **Deferred**; ghi chú Phase 1 một kho, không tái hiện được; F20 Phase 2; reopen khi multi-kho
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

### KI-005 — Danh sách SP/lô cập nhật ngay sau Thêm hàng

- **Task:** Fix KI-005: UI tab Sản phẩm không thấy SP mới sau khi tạo từ `AddInventoryScreen`
- **Files thay đổi:** `screens/AddInventoryScreen.tsx`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Tránh race `fetchProducts()` mount ghi đè store sau `addProduct`; `warehouseStore` `addProduct` / `addInventoryEntry` giữ nguyên (đã merge state đúng)
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### KI-005 (bổ sung) — Chi tiết SP: refetch lô khi focus

- **Task:** Sau `AddInventoryScreen` → back `ProductDetailScreen`, danh sách lô không cập nhật
- **Files thay đổi:** `screens/ProductDetailScreen.tsx`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** `loadData` bọc `useCallback`; `useFocusEffect` gọi `loadData` khi màn focus — refetch `inventory_entries` từ Supabase
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### UI — Thông báo, Sản phẩm, Chi tiết (tổng thùng + lọc Có vấn đề)

- **Task:** Card Thông báo (tổng + thùng có vấn đề); Products + ProductDetail: tổng thùng và toggle lọc
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `screens/ProductsScreen.tsx`, `screens/ProductDetailScreen.tsx`, `docs/project/CONTEXT.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Không đổi store/schema; lọc theo `getCombinedStatus` ≠ `ok`
- **Docs đã cập nhật:** `docs/project/CONTEXT.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md` (KNOWN_ISSUES: không phát hiện bug mới)

### UI — Thông báo (pill tồn/hạn) + Products (KI-008, trước đây KI-006)

- **Task:** Khôi phục pill **Sắp hết hàng** / **Hết hàng** và **Sắp hết hạn** / **Hết hạn** trên card Thông báo; màu chữ/viền pill `#EF4444` / `#FACC15`; sửa crash toggle **Có vấn đề** (thứ tự `useMemo`).
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `screens/ProductsScreen.tsx`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`, `docs/project/CONTEXT.md`
- **Kết quả:** Giữ dòng `Tổng X thùng | Y thùng có vấn đề`; `productIdsWithIssueLot` tính trước `filteredProducts` (Resolved — hiện ghi **KI-008** trong `KNOWN_ISSUES.md`)
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md` (KI-008), `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`, `docs/project/CONTEXT.md`

### UI — Thông báo (pill dưới tổng) + Sản phẩm (bỏ toggle Có vấn đề)

- **Task:** Pill tồn/hạn cùng một hàng ngay dưới `Tổng X thùng | Y thùng có vấn đề`; chỉ render pill đỏ/vàng khi có cảnh báo; xóa toggle **Có vấn đề** khỏi `ProductsScreen` (giữ toggle ở `ProductDetailScreen`); loại bỏ hoàn toàn đường filter `.has` trên Products.
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `screens/ProductsScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Không còn `TypeError` từ `.has` trên Products; lọc lô có vấn đề chỉ còn ở chi tiết SP
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Navigation + ProductDetail + Map + Thông báo + Thêm/Sửa lô (0 thùng)

- **Task:** Tab bar hiện trên `ProductDetail` / `AddInventory` (stack lồng trong tab); `BarcodeScanner` fullscreen modal; `ProductDetail`: hardcode `low_critical_boxes = 1`, gỡ UI ngưỡng critical, gộp mã vạch + `low_warning_boxes` + `warning_days` vào section **Chi tiết** / **Thu gọn** (mặc định thu gọn); `MapScreen`: panel kết quả tìm mặc định thu gọn sau khi tìm, nút **Chi tiết** / **Thu gọn**; `NotificationsScreen`: pill tồn **Hết hàng** (0 thùng) / **Còn rất ít** (1 thùng) đỏ; `AddInventoryScreen` + `ZoneDetailSheet`: cho phép **0 thùng** (số nguyên ≥ 0).
- **Files thay đổi:** `App.tsx`, `screens/BarcodeScannerScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/MapScreen.tsx`, `screens/NotificationsScreen.tsx`, `screens/AddInventoryScreen.tsx`, `components/ZoneDetailSheet.tsx`, `docs/DECISIONS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** `returnTab` cho luồng gán mã vạch sau quét; navigate lồng `Tabs` → tab → `MapMain` / `ProductDetail` / `AddInventory`
- **Docs đã cập nhật:** `docs/DECISIONS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Docs — KI mới (0 thùng) + đổi mã KI cũ

- **Task:** Ghi nhận **KI-006** (ProductDetail không cho sửa về 0 thùng), **KI-007** (lô 0 thùng biến mất khỏi app); đổi mã mục Resolved cũ ProductsScreen `.has` thành **KI-008**; cập nhật `HANDOFF.md`.
- **Files thay đổi:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Truy vết KI-006/007 theo lỗi 0 thùng; lịch sử TypeError Products → KI-008
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Docs — Quyết định mới cho Notifications + tồn kho + lô 0 thùng

- **Task:** Cập nhật quyết định mới: cảnh báo tồn kho theo tổng thùng sản phẩm; lô 0 thùng giữ lại, không tự xóa; format card Thông báo mới; thêm tab con **Có vấn đề / Để sau**; cập nhật F18 và blocker lưu trạng thái Để sau.
- **Files thay đổi:** `docs/DECISIONS.md`, `docs/project/REQUIREMENTS.md`, `docs/BLOCKERS.md`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Đồng bộ docs theo hướng triển khai mới cho tab Thông báo và business logic lô 0 thùng; bổ sung blocker dữ liệu cho tab Để sau.
- **Docs đã cập nhật:** `docs/DECISIONS.md`, `docs/project/REQUIREMENTS.md`, `docs/BLOCKERS.md`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Docs — Đồng bộ CONTEXT §3 (navigation + Notifications)

- **Task:** Cập nhật `docs/project/CONTEXT.md` theo cấu trúc navigation mới (mỗi tab là 1 native stack riêng; root chỉ có `Tabs` + `BarcodeScanner`) và format card `NotificationsScreen` mới (2 dòng nội dung + 2 pill cùng hàng + tab con **Có vấn đề / Để sau**).
- **Files thay đổi:** `docs/project/CONTEXT.md`, `docs/WORKLOG.md`
- **Kết quả:** CONTEXT khớp với quyết định mới trong docs và kiến trúc route hiện tại.
- **Docs đã cập nhật:** `docs/project/CONTEXT.md`, `docs/WORKLOG.md`

### KI-007 (+ KI-006) — Giữ lô 0 thùng trong app và DB; chi tiết SP

- **Task:** Fix KI-007: lô `quantity_boxes = 0` không còn “biến mất” khỏi danh sách; fix KI-006: cho phép lưu 0 thùng từ `ProductDetailScreen`.
- **Files thay đổi:** `stores/warehouseStore.ts` (`fetchInventoryByZone`, `searchProducts`), `screens/ProductDetailScreen.tsx`, `screens/NotificationsScreen.tsx` (bỏ điều kiện `issueBoxes === 0` khi vẫn có lô combined ≠ ok), `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Không còn lọc `quantity_boxes > 0` trên các truy vấn đó; lô 0 thùng có banner **Lô này đã hết hàng** + **Xóa lô** (xóa record); `deleteZone` vẫn chỉ chặn khi còn lô có `quantity_boxes > 0`. Không đổi schema — không migration mới.
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### KI-006 — Xác minh lại validation số thùng (ProductDetailScreen)

- **Task:** Đọc lại `ProductDetailScreen.tsx` — có còn chặn nhập `quantity_boxes = 0` khi sửa lô inline không?
- **Kết quả:** Không chặn. `handleSaveLot` chỉ báo lỗi khi `quantity < 0` hoặc không phải số nguyên hữu hạn; giá trị **0** đi qua validation và được gửi lên `updateInventoryEntry`. Không thay đổi code ứng dụng.
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md` (bổ sung dòng “Xác minh code” dưới KI-006), `docs/WORKLOG.md`

### F18 — Thông báo: tab Có vấn đề / Để sau + format card + `is_deferred`

- **Task:** Implement F18: migration `products.is_deferred`, `toggleDeferred` trong store, `NotificationsScreen` hai tab + card mới + nút chuyển tab; cập nhật REQUIREMENTS F18 Done, DECISIONS / BLOCKERS BLK-002 Resolved, HANDOFF.
- **Files thay đổi:** `supabase/migrations/20260511_add_product_is_deferred.sql`, `types/index.ts`, `stores/warehouseStore.ts`, `screens/NotificationsScreen.tsx`, `docs/project/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Pill tồn theo tổng thùng SP; pill hạn theo lô xấu nhất; dòng sắp hết hạn = tổng thùng các lô có hạn warning/expired; BLK-002 đóng bằng cột DB.
- **Docs đã cập nhật:** `docs/project/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
