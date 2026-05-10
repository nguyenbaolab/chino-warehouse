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

### UI — Thông báo (pill tồn/hạn) + Products (KI-006)

- **Task:** Khôi phục pill **Sắp hết hàng** / **Hết hàng** và **Sắp hết hạn** / **Hết hạn** trên card Thông báo; màu chữ/viền pill `#EF4444` / `#FACC15`; sửa crash toggle **Có vấn đề** (thứ tự `useMemo`).
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `screens/ProductsScreen.tsx`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`, `docs/project/CONTEXT.md`
- **Kết quả:** Giữ dòng `Tổng X thùng | Y thùng có vấn đề`; `productIdsWithIssueLot` tính trước `filteredProducts` (KI-006 Resolved)
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md` (KI-006), `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`, `docs/project/CONTEXT.md`

### UI — Thông báo (pill dưới tổng) + Sản phẩm (bỏ toggle Có vấn đề)

- **Task:** Pill tồn/hạn cùng một hàng ngay dưới `Tổng X thùng | Y thùng có vấn đề`; chỉ render pill đỏ/vàng khi có cảnh báo; xóa toggle **Có vấn đề** khỏi `ProductsScreen` (giữ toggle ở `ProductDetailScreen`); loại bỏ hoàn toàn đường filter `.has` trên Products.
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `screens/ProductsScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
- **Kết quả:** Không còn `TypeError` từ `.has` trên Products; lọc lô có vấn đề chỉ còn ở chi tiết SP
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF.md`
