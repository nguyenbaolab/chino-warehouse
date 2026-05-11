# WORKLOG

Nhật ký thay đổi có ý nghĩa (DEV ghi sau mỗi task theo `docs/project/WORKFLOW.md`).

---

## [tháng 5/2026] — Task 4/4: LocationManagementScreen + filter kho

- Tạo LocationManagementScreen: danh sách kho, card có tên + grid size + số sản phẩm, tạo/sửa/xóa kho có validate.
- SettingsScreen: thêm card Quản lý kho.
- ProductsScreen + NotificationsScreen: thêm dropdown filter theo kho.
- CONTEXT.md: cập nhật cấu trúc file + navigation + store actions.

📌 Nhắc upload lại lên Claude Project Knowledge: `docs/project/CONTEXT.md` — màn hình mới, navigation, store actions; `docs/KNOWN_ISSUES.md` — KI-004 Resolved.

---

## [tháng 5/2026] — Task 3/4: MapScreen selector + fix KI-004

- MapScreen: thay pill bằng selector có dropdown sheet, hiện tên kho + grid size, nút Thêm kho mới.
- Fix KI-004: clear search khi đổi location.
- KNOWN_ISSUES.md: KI-004 → Resolved.

---

## [tháng 5/2026] — Task 2/4: Update types + store cho multi-kho

- types/index.ts: thêm grid_rows, grid_cols vào Location type.
- warehouseStore: thêm addLocation, updateLocation (có validate grid shrink), deleteLocation (có validate còn hàng).

---

## [tháng 5/2026] — Task 1/4: Migration grid_rows/grid_cols + docs

- Tạo migration: thêm grid_rows, grid_cols (default 6) vào bảng locations.
- DECISIONS.md: thêm 2 quyết định — Tab Đặt hàng không filter theo kho, Location card hiện số sản phẩm.
- Chuẩn bị cho Task 2: update types + store.

---

## [tháng 5/2026] — Cập nhật tài liệu Phase 2: multi-kho + zone editor

**Task:** Update docs trước khi implement Phase 2 features mới.

**Thay đổi:**
- REQUIREMENTS.md: mở rộng mô tả F20 (multi-kho + grid size configurable), thêm F29 (Zone Layout Editor), thêm grid_rows/grid_cols vào data model §8.1, cập nhật §9 màn hình.
- DECISIONS.md: thêm 4 quyết định mới — multi-kho products global, grid size per location, xóa kho block nếu còn hàng, zone move dùng Compact Layout Editor (F29).
- PLAN.md: cập nhật scope F20, thêm F29 vào danh sách tính năng Phase 2.

**Trạng thái:** Done — chờ implement.

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

### Docs — KNOWN_ISSUES: KI-002 Resolved, KI-009 mới

- **Task:** Cập nhật `KNOWN_ISSUES.md`: KI-002 (F17 Realtime) → Resolved với mô tả đã fix; thêm KI-009 (ZoneDetailSheet stale sau khi sửa lô từ ProductDetailScreen, Open).
- **Files thay đổi:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`
- **Kết quả:** Không đổi code; chỉ đồng bộ tài liệu theo QA / backlog.
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

### Docs — Barcode Phase 1 + BLK-001 ghi chú

- **Task:** `DECISIONS.md`: thêm quyết định Barcode Phase 1 (1 SP = 1 barcode, `products.barcode`), giới hạn và kế hoạch Phase 2 / BLK-001. `BLOCKERS.md`: bổ sung ghi chú Phase 1 và reopen khi Phase 2.
- **Files thay đổi:** `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/WORKLOG.md`
- **Kết quả:** Không đổi code.
- **Docs đã cập nhật:** `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/WORKLOG.md`

### Docs — KNOWN_ISSUES: KI-003 → Deferred

- **Task:** Cập nhật `KNOWN_ISSUES.md` (KI-003): trạng thái **Deferred**; ghi chú chỉ ảnh hưởng light mode, team dùng dark mode, reopen khi Phase 2 cần light mode.
- **Files thay đổi:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`
- **Kết quả:** Không đổi code.
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

### Docs — KNOWN_ISSUES: KI-003 → Closed

- **Task:** Cập nhật `KNOWN_ISSUES.md` (KI-003): trạng thái **Closed**; ghi chú không cần fix — chỉ dark mode, light mode ngoài scope Phase 1.
- **Files thay đổi:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`
- **Kết quả:** Không đổi code.
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

### AddInventoryScreen — Field mã vạch + quét + cập nhật `products.barcode`

- **Task:** Thêm field mã vạch dưới chọn SP: điền sẵn từ sản phẩm, nhập tay / quét camera (`BarcodeScanner` mode `addInventory`), khi Lưu nếu đổi thì `updateBarcode`.
- **Files thay đổi:** `screens/AddInventoryScreen.tsx`, `screens/BarcodeScannerScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Không phát hiện bug mới ghi trong KNOWN_ISSUES.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### KI-010 — BarcodeScanner: đóng modal + nested navigate ổn định

- **Task:** Sau quét, modal scanner phải đóng và Tabs nhận params (locate / assign / addInventory / search mặc định).
- **Files thay đổi:** `screens/BarcodeScannerScreen.tsx`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** `navigate('Tabs', …)` rồi hoãn `goBack()` (~160ms); `useFocusEffect` reset lock; ref `processingRef` chống double-scan; reset ref khi alert “không tìm thấy”.
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md` (KI-010 Resolved), `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Docs — Quyết định barcode per lô + đóng BLK-001

- **Task:** Cập nhật docs theo quyết định mới: barcode per lô (`inventory_entries.barcode`), bỏ `products.barcode`; cập nhật logic tìm kiếm barcode vs tên; BLK-001 chuyển Resolved.
- **Files thay đổi:** `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/project/REQUIREMENTS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Đồng bộ tài liệu theo hướng triển khai barcode per lô trong Phase 1.
- **Docs đã cập nhật:** `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/project/REQUIREMENTS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Barcode per lô — implement code + migration

- **Task:** Chuyển barcode từ per sản phẩm sang per lô: migration drop `products.barcode`, add `inventory_entries.barcode`; cập nhật store/type/search; cập nhật `MapScreen`, `ProductsScreen`, `ProductDetailScreen`, `AddInventoryScreen`, `BarcodeScannerScreen` (bỏ assign mode).
- **Files thay đổi:** `supabase/migrations/20260511_drop_products_barcode.sql`, `supabase/migrations/20260511_add_inventory_entries_barcode.sql`, `types/index.ts`, `stores/warehouseStore.ts`, `screens/MapScreen.tsx`, `screens/ProductsScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/AddInventoryScreen.tsx`, `screens/BarcodeScannerScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Quét barcode tìm theo `inventory_entries.barcode` và trả về lô + zone chứa lô; AddInventory ghi barcode vào lô; ProductDetail cho xem/sửa barcode theo từng lô.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### UI — Barcode scan cho lô + format hạn DD/MM/YYYY

- **Task:** `ProductDetailScreen`: thêm nút quét camera cạnh field barcode lô (inline edit) và tự điền barcode sau quét; `ZoneDetailSheet`: hiện barcode lô và bỏ nút `i`; đổi hiển thị hạn toàn app sang `DD/MM/YYYY` (không đổi format DB).
- **Files thay đổi:** `screens/ProductDetailScreen.tsx`, `components/ZoneDetailSheet.tsx`, `screens/BarcodeScannerScreen.tsx`, `types/index.ts`, `screens/MapScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Luồng quét từ ProductDetail quay lại đúng lô đang edit; hạn hiển thị đồng nhất `DD/MM/YYYY`; không đổi schema/business rule.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### UI — Expand card lô + scan barcode trả về đúng màn

- **Task:** `MapScreen`: đưa nút `✕` vào trong ô tìm (giữ nguyên nút scan camera); `ZoneDetailSheet`: expand lô thêm field barcode + nút 📷; `ProductDetailScreen`: bấm card lô để mở inline edit luôn; `BarcodeScannerScreen`: trả barcode về đúng ngữ cảnh `ProductDetailScreen` và `ZoneDetailSheet` (không đổi các mode khác).
- **Files thay đổi:** `screens/MapScreen.tsx`, `components/ZoneDetailSheet.tsx`, `screens/ProductDetailScreen.tsx`, `screens/BarcodeScannerScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Quét từ `ZoneDetailSheet`/`ProductDetailScreen` điền barcode vào đúng lô đang sửa và đóng scanner, không chuyển sang màn khác; thao tác mở edit lô nhanh hơn bằng cách bấm trực tiếp card.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Fix scanner callback + ô tìm Sản phẩm

- **Task:** `BarcodeScannerScreen`: trả barcode đúng chỗ cho `ProductDetailScreen`, `AddInventoryScreen`, `ZoneDetailSheet` theo callback tại màn gọi scanner (điền field rồi đóng scanner, không điều hướng về `MapScreen`); `ProductsScreen`: thêm nút `✕` trong input tìm kiếm (giữ nguyên vị trí nút scan).
- **Files thay đổi:** `screens/BarcodeScannerScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/AddInventoryScreen.tsx`, `components/ZoneDetailSheet.tsx`, `screens/ProductsScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Luồng scan từ 3 màn nhập barcode trực tiếp vào field đang sửa và đóng scanner bằng `goBack`; locate/search flow hiện tại không thay đổi.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Fix nút X tìm kiếm — Map + Products

- **Task:** `MapScreen` + `ProductsScreen`: nút `✕` active ngay khi có text; bấm `✕` xóa text tức thì, hủy kết quả tìm đang chờ và reset về trạng thái ban đầu.
- **Files thay đổi:** `screens/MapScreen.tsx`, `screens/ProductsScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** `MapScreen` thêm cơ chế request id để bỏ qua response search cũ sau khi clear; clear trên `ProductsScreen` đồng thời bỏ cờ highlight từ scan theo lô.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Docs — KNOWN_ISSUES: KI-009 → Closed

- **Task:** Cập nhật `KNOWN_ISSUES.md` cho KI-009: chuyển trạng thái sang **Closed**.
- **Files thay đổi:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`
- **Kết quả:** Đánh dấu KI-009 không còn liên quan do đã bỏ nút `i` điều hướng từ `ZoneDetailSheet` sang `ProductDetailScreen`; stale data không còn ảnh hưởng UX theo phạm vi hiện tại.
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

### Docs lớn — định hướng mới Notifications + Tab Đặt hàng + Không nhập nữa

- **Task:** Cập nhật tài liệu yêu cầu/thiết kế cho thay đổi lớn nhiều màn hình: thêm tab Đặt hàng (F27), thêm danh sách Không nhập nữa trong Settings (F28), restructure F18 (Sắp hết hạn / Sắp hết hàng, bỏ Để sau), bổ sung trường dữ liệu `is_expired_acknowledged`, và cập nhật quyết định `is_deferred` không còn dùng trong UI.
- **Files thay đổi:** `docs/project/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Tài liệu đã đồng bộ theo scope mới; chưa thay đổi code implement (trạng thái các feature mới: planned/not started).
- **Docs đã cập nhật:** `docs/project/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### ProductDetail — Banner lô hết hạn + Xóa lô

- **Task:** `ProductDetailScreen`: thêm banner `Lô này đã hết hạn [Xóa lô]` cho lô có `expiry_date` đã qua ngày hiện tại; giữ hành vi xóa DB giống banner lô hết hàng; nếu lô vừa hết hàng vừa hết hạn thì hiển thị cả 2 banner.
- **Files thay đổi:** `screens/ProductDetailScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** UX lô hết hạn đồng nhất với lô hết hàng, thao tác dọn lô hết hạn ngay tại card lô.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Notifications restructure — Sắp hết hạn / Sắp hết hàng

- **Task:** Refactor `NotificationsScreen` bỏ tab **Có vấn đề / Để sau**, thay bằng 2 tab **Sắp hết hạn** và **Sắp hết hàng**; thêm toggle **Đã giảm giá** (`products.is_price_reduced`) cho card sắp hết hạn; card đã hết hạn hiển thị đỏ nhạt + nhãn `Hết hạn rồi`; tab sắp hết hàng thêm 2 nút **Thêm vào danh sách nhập** (placeholder log) và **Không nhập nữa** (`products.is_discontinued`).
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `stores/warehouseStore.ts`, `types/index.ts`, `supabase/migrations/20260511_add_product_is_price_reduced.sql`, `supabase/migrations/20260511_add_product_is_discontinued.sql`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Notifications chuyển sang luồng xử lý trực tiếp theo hạn/tồn; thêm 2 action store `togglePriceReduced` và `toggleDiscontinued`; sản phẩm đánh dấu không nhập nữa được ẩn khỏi tab sắp hết hàng.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Notifications — chuyển `is_price_reduced` từ Product sang InventoryEntry

- **Task:** Tạo migration chuyển cột `is_price_reduced` từ `products` sang `inventory_entries`; cập nhật tab Sắp hết hạn hiển thị theo từng lô có thể expand, mỗi lô có toggle Đã/Chưa giảm giá riêng; thêm filter bar `Hết hạn / Sắp hết hạn`; cập nhật `warehouseStore.togglePriceReduced` thao tác theo `inventory_entries`.
- **Files thay đổi:** `supabase/migrations/20260511_move_is_price_reduced_to_inventory_entries.sql`, `screens/NotificationsScreen.tsx`, `stores/warehouseStore.ts`, `types/index.ts`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Trạng thái giảm giá chuyển về cấp lô; UI tab Sắp hết hạn cho xem/toggle từng lô (màu đỏ nhạt/vàng nhạt theo loại hạn) và lọc nhanh theo loại lô.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Notifications — màu nút toggle giảm giá theo trạng thái

- **Task:** `NotificationsScreen` tab Sắp hết hạn: nút toggle `Đã/Chưa giảm giá` trong dòng lô đổi màu theo trạng thái.
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `docs/WORKLOG.md`
- **Kết quả:** `Chưa giảm giá` dùng nền mặc định; `Đã giảm giá` dùng nền xanh `#22C55E` (text trắng) để nhận diện nhanh.
- **Docs đã cập nhật:** `docs/WORKLOG.md`

### Notifications — điều hướng từ card lô hết hạn

- **Task:** Bỏ nút `Hết hạn rồi — mở chi tiết sản phẩm`; thay bằng tương tác bấm trực tiếp lên dòng lô hết hạn để mở `ProductDetailScreen`.
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `docs/WORKLOG.md`
- **Kết quả:** Card lô hết hạn gọn hơn, chạm vào bất kỳ vị trí trong dòng lô hết hạn đều điều hướng sang chi tiết sản phẩm.
- **Docs đã cập nhật:** `docs/WORKLOG.md`

### Notifications — điều hướng từ mọi card lô hạn

- **Task:** Mở rộng tương tác điều hướng cho toàn bộ card lô trong tab Sắp hết hạn (cả lô sắp hết hạn và lô đã hết hạn): bấm bất kỳ chỗ nào trên dòng lô đều mở `ProductDetailScreen`.
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `docs/WORKLOG.md`
- **Kết quả:** Hành vi card lô đồng nhất, không còn phân biệt điều hướng giữa 2 loại lô theo hạn.
- **Docs đã cập nhật:** `docs/WORKLOG.md`

### OrderDetail / OrderList — đổi tên list, xóa list, card item 2 dòng + inline edit

- **Task:** `OrderDetailScreen`: list **draft** — bấm tiêu đề → `TextInput`, lưu khi blur / Done; nút **Xóa list** + `Alert` xác nhận (2 dòng copy theo spec), confirm gọi `deleteOrderList` rồi `navigate('OrderListMain')`; card item 2 dòng (⭐ + tên | dòng 2: số thùng | ghi chú | Xóa), bấm dòng mở chỉnh sửa inline (lưu blur / Done / bấm lại dòng). `OrderListScreen`: `useFocusEffect` refetch `fetchOrderLists` khi màn focus.
- **Files thay đổi:** `screens/OrderDetailScreen.tsx`, `screens/OrderListScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Không đổi schema/store API; xóa list vẫn dùng `deleteOrderList` (đã xóa items + list trên DB và store).
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Navigation + tab Đặt hàng + order list workflow

- **Task:** `App.tsx` thêm tab **Đặt hàng** (giữa Sản phẩm và Thông báo), thêm stack riêng `OrderListMain` / `OrderDetail`, và bật hành vi `tabPress` popToTop khi bấm lại tab đang mở từ màn con; tạo `OrderListScreen` + `OrderDetailScreen`; bổ sung store actions cho `order_lists`/`order_items`; thêm migration tạo 2 bảng mới.
- **Files thay đổi:** `App.tsx`, `screens/OrderListScreen.tsx`, `screens/OrderDetailScreen.tsx`, `stores/warehouseStore.ts`, `types/index.ts`, `supabase/migrations/20260511_add_order_lists_and_items.sql`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Có luồng đặt hàng cơ bản theo list với 3 trạng thái (draft/confirmed/placed), CRUD item/list, cộng dồn sản phẩm trùng trong list đang soạn, và nút placeholder xuất PDF.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Settings F28 — Sản phẩm không nhập nữa + màn danh sách

- **Task:** Card **Sản phẩm không nhập nữa** trong `SettingsScreen` (số lượng theo store + Supabase Realtime); stack `DiscontinuedProductsScreen` liệt kê `is_discontinued`, tồn tổng thùng (0 → `Hết hàng`), dòng lý do từ `products.notes` nếu có, nút **Nhập lại** (`setProductDiscontinued(..., false)`). Store: `fetchDiscontinuedProducts`, `refreshDiscontinuedContext`, `setProductDiscontinued`, `toggleDiscontinued` dùng chung cập nhật một chiều.
- **Files thay đổi:** `screens/SettingsScreen.tsx`, `screens/DiscontinuedProductsScreen.tsx`, `stores/warehouseStore.ts`, `App.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Luồng F28 khép kín từ Cài đặt; đồng bộ `products` + `inventory_entries` qua Realtime (khi Supabase bật replication cho 2 bảng).
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`

### Docs — Tổng kết Phase 1 & chuẩn bị Phase 2

- **Task:** Viết lại `docs/phases/phase-1/PLAN.md` theo trạng thái thực tế (Done / Partial F18 / Deferred F08,F19–F21,F26 / Out of scope F22–F25); tạo `docs/phases/phase-1/SUMMARY.md` (tổng quan, danh sách done & nợ, quyết định, KI, chuyển Phase 2); tạo `docs/phases/phase-2/PLAN.md`, `HANDOFF.md`, `TESTCASES.md` (placeholder); cập nhật `REQUIREMENTS.md` §6 (F15/F18/F27/F28); bump ghi chú phiên bản PRD 1.3.1.
- **Files thay đổi:** `docs/phases/phase-1/PLAN.md`, `docs/phases/phase-1/SUMMARY.md`, `docs/phases/phase-2/PLAN.md`, `docs/phases/phase-2/HANDOFF.md`, `docs/phases/phase-2/TESTCASES.md`, `docs/project/REQUIREMENTS.md`, `docs/WORKLOG.md`
- **Kết quả:** Phase 1 được đóng gói tài liệu; Phase 2 có skeleton plan và file handoff/test chờ điền.
- **Docs đã cập nhật:** `docs/WORKLOG.md`

### Docs — Phase 1 TESTCASES: F10 per lô + F17/F18/F27/F28

- **Task:** Sửa **TC-F10-01/02** theo barcode **per lô** (`inventory_entries.barcode`): quét đúng → highlight zone + thông tin lô; quét sai → dialog thêm thủ công / quét lại. Bổ sung test cases **F17** (Realtime hai thiết bị), **F18** (tab Sắp hết hạn/hết hàng, toggle giảm giá per lô, filter, Không nhập nữa), **F27** (đặt hàng list lifecycle), **F28** (Settings discontinued + Nhập lại). Cập nhật phần mở đầu file test.
- **Files thay đổi:** `docs/phases/phase-1/TESTCASES.md`, `docs/WORKLOG.md`
- **Kết quả:** QA có checklist thủ công khớp implementation hiện tại.
- **Docs đã cập nhật:** `docs/WORKLOG.md`

### Docs — Phase 1 USER_GUIDE (chủ + nhân viên)

- **Task:** Tạo `docs/phases/phase-1/USER_GUIDE.md` — hướng dẫn tiếng Việt ngắn gọn cho chủ cửa hàng và nhân viên: giới thiệu, Expo Go/WiFi, các tab, tác vụ (tìm hàng, zone, thêm SP/lô, cập nhật, xóa lô, thông báo hai tab, đặt hàng, không nhập nữa), màu sắc, lưu ý Realtime/đăng nhập/thùng; ví dụ Chino's Boba Tea & Asian Market.
- **Files thay đổi:** `docs/phases/phase-1/USER_GUIDE.md`, `docs/WORKLOG.md`
- **Kết quả:** Tài liệu vận hành cho người không chuyên kỹ thuật.
- **Docs đã cập nhật:** `docs/WORKLOG.md`

### Docs — USER_GUIDE: nút Thêm vào danh sách nhập (Phase 1 vs 2)

- **Task:** Sửa một đoạn trong `docs/phases/phase-1/USER_GUIDE.md` (mục Sắp hết hàng): ghi rõ nút **Thêm vào danh sách nhập** chưa hoạt động trong Phase 1; Phase 2 sẽ kết nối với tab Đặt hàng.
- **Files thay đổi:** `docs/phases/phase-1/USER_GUIDE.md`, `docs/WORKLOG.md`
- **Kết quả:** Người đọc không kỳ vọng sai về nút placeholder.
- **Docs đã cập nhật:** `docs/WORKLOG.md`

### Docs — BLK-001 Closed hoàn toàn

- **Task:** Cập nhật `docs/BLOCKERS.md`: BLK-001 đóng hẳn — ghi nhận trùng barcode 2 lô (hiện cả 2 zone), đổi nhãn lô = 2 lô khác nhau, lô không barcode (nhập tay), và kết luận không còn edge case cần xử lý thêm trong phạm vi blocker.
- **Files thay đổi:** `docs/BLOCKERS.md`, `docs/WORKLOG.md`
- **Kết quả:** Tài liệu blocker đồng bộ với xác nhận nghiệp vụ; tách rõ optional Phase 2 (multi-barcode) khỏi BLK-001.
- **Docs đã cập nhật:** `docs/WORKLOG.md`
