# WORKLOG

Nhật ký thay đổi có ý nghĩa (DEV ghi sau mỗi task theo `docs/project/WORKFLOW.md`).

---

## [tháng 5/2026] — B2: wire barcode actions + audit CONFLICT RPC

- **Migration:** `20260531120000_audit_barcode_conflict.sql` — `audit_logs.action` + `CONFLICT`; RPC `log_barcode_conflict` (SECURITY DEFINER).
- **Store:** normalize `.trim().toLowerCase()` cho 3 actions B1; thêm `logBarcodeConflict`.
- **UI:** `BarcodeScannerScreen` — `lookupProductByBarcode` → Alert "Hàng đã hết"; `AddInventoryScreen` / `ProductDetailScreen` / `ZoneDetailSheet` — `checkBarcodeConflict` + `logBarcodeConflict` + `upsertProductBarcode`.
- **schema.sql** v3.10.
- **Files:** migration, schema, store, types, 4 UI files, CONTEXT, DECISIONS, REQUIREMENTS.

---

## [tháng 5/2026] — B1: bảng `product_barcodes` + store actions barcode

- **Migration:** `20260531100000_create_product_barcodes.sql` — CREATE TABLE, INDEX, RLS, backfill từ `inventory_entries.barcode`, mở rộng `audit_logs.table_name` CHECK, trigger `audit_product_barcodes`.
- **schema.sql** v3.9 — DDL only (không backfill).
- **Types:** `ProductBarcode`; `AuditLog.table_name` + `product_barcodes`.
- **Store:** `lookupProductByBarcode`, `checkBarcodeConflict`, `upsertProductBarcode` (chưa wire UI).
- **Sanity pre-backfill:** query conflict barcode→nhiều SP — **0 row** (verify qua Studio sau login; anon API không đọc được row).
- **Backfill stats:** chạy migration trên Supabase Studio → verify `SELECT COUNT(*) FROM product_barcodes` vs `SELECT COUNT(DISTINCT (product_id, barcode)) FROM inventory_entries WHERE barcode IS NOT NULL AND barcode != ''`.
- **Files:** migration, `schema.sql`, `types/index.ts`, `stores/warehouseStore.ts`, `CONTEXT.md`, `DECISIONS.md`, `REQUIREMENTS.md`.

---

## [tháng 5/2026] — feat(ProductsScreen): toggle "Chỉ hết lô"

- **UI:** Toggle cạnh "Hiện sản phẩm đã ẩn" — cùng style `TouchableOpacity` + emoji ✅/⬜; hàng wrap khi chật.
- **Logic:** `showOutOfStockOnly` — sau search/kho/zone, giữ SP có `totalBoxes === 0` trong scope (`totalBoxesByProduct`); reset `currentPage` khi đổi toggle.
- **Files:** `screens/ProductsScreen.tsx`, `docs/project/CONTEXT.md`, `docs/project/REQUIREMENTS.md`.

---

## [tháng 5/2026] — fix(MapScreen): Realtime crash do unstable effect dependencies

- **Nguyên nhân:** `useEffect` Realtime deps `[selectedLocationId, fetchZones, fetchInventoryByLocation]` + `useWarehouseStore()` không selector → re-render liên tục (vd. `isLoading`) tear down/rebuild channel; `removeChannel` async → lỗi `cannot add postgres_changes callbacks after subscribe()`.
- **Fix:** `fetchZonesRef` / `fetchInventoryByLocationRef` giữ stable reference; Realtime effect deps chỉ `[selectedLocationId]`.
- **KI-053** → Resolved.

---

## [tháng 5/2026] — refactor(ProductsScreen): bỏ dòng barcode khỏi card lô hàng

- Card lô trong `renderProductItem` chỉ còn dòng dot + Hạn + thùng; xóa `lotBarcodeLine`.

---

## [tháng 5/2026] — fix F08: KI-051 cache-bust + KI-052 đảo thứ tự xóa ảnh

- **KI-051:** `uploadProductImage` return `${publicUrl}?v=${Date.now()}` → URL đổi mỗi upload, invalidate CDN/cache.
- **KI-052:** `ProductDetailScreen.handleDeleteImage` — `removeProductImage` (null DB) trước, `deleteProductImage` (Storage) sau.
- **Store:** `updateProductImage` / `removeProductImage` sync `inventoryEntries[].product.image_url`.
- `deleteProduct` giữ nguyên (xóa row, không broken URL).

---

## [tháng 5/2026] — audit F08 product images (read-only)

- Rà soát cache-busting, egress thumbnail, xóa ảnh, upload, RLS, crop, UX lỗi.
- Phát hiện: **KI-051** (cache stale sau đổi ảnh), **KI-052** (thứ tự xóa Storage/DB).

---

## [tháng 5/2026] — chốt DECISIONS SEC-10: backup anon + user login

- **DECISIONS:** entry chính thức — anon + `signInWithPassword`, không `service_role`; thay thế hướng fix cũ KI-021.

---

## [tháng 5/2026] — fix(backup.ts): phân trang Data API + timestamp file + docs

- **backup.ts:** `.range` page 1000, order `id`; `backup_YYYYMMDD_HHmmss.json`; comment phạm vi (không Storage) + kỷ luật mảng `tables`.
- **KI-021:** Mitigated — giữ anon+user login; caveat RBAC.
- **DECISIONS:** entry SEC-10 backup (chính thức).

---

## [tháng 5/2026] — verify drift: DB khớp schema.sql (dump 20260530_185715)

- **KI-049 → Resolved:** so sánh logic public schema sau apply migration; drift đã sạch (nhóm 4 ngoài phạm vi dump).

---

## [tháng 5/2026] — KI-049 Phần 4: giữ is_deferred (hướng A)

- **Quyết định:** giữ cột `products.is_deferred` (DECISIONS); apply `20260511_add_product_is_deferred.sql` trên Supabase.
- **Migration** đã idempotent (`ADD COLUMN IF NOT EXISTS`); không sửa `schema.sql`.
- **KI-050:** ghi nhận `toggleDeferred` dead path (UI không gọi).

---

## [tháng 5/2026] — đồng bộ schema sau audit drift (KI-049, Phần 1–3)

- **schema.sql v3.8:** correction body `audit_trigger_fn` v2 enrich (SEC-11).
- **Migration** `20260530190000_sync_missing_indexes.sql` — 3 index thiếu trên DB.
- **Migration** `20260530190100_products_is_archived_not_null.sql` — `is_archived NOT NULL`.
- **Phần 4 (is_deferred):** grep codebase — chờ quyết định (xem báo cáo chat).

---

## [tháng 5/2026] — audit schema: drift giữa DB thật và schema.sql (dump 20260530)

- **So sánh** `schema_dump_20260530_183554.sql` vs `supabase/migrations/schema.sql` (public only).
- **Drift:** `audit_trigger_fn` v2 trên DB vs v1 trong schema.sql; thiếu trên DB: `products.is_deferred`, 3 index; xem KI-049.

---

## [tháng 5/2026] — fix: escape ngoặc trong dump_schema.bat

- **dump_schema.bat:** `^(` / `^)` trong `echo` bên trong khối `if` — tránh lỗi cmd ". was unexpected at this time."

---

## [tháng 5/2026] — ops: dump_schema.bat Session Pooler + ổn định pg_dump

- **dump_schema.bat:** Session Pooler (HOST/USER placeholder + comment Dashboard); tạo `supabase/db_dump_schema/`; timestamp PowerShell; `--schema=public`; check `pg_dump --version`; bỏ echo password gây hiểu nhầm.
- **Docs:** `CONTEXT.md` §9; `KNOWN_ISSUES.md` ghi chú gần KI-021.

---

## [tháng 5/2026] — feat(Notifications): tap tên SP → ProductDetail cả 2 tab

- **renderLowStockItem / renderExpiryItem:** tên SP bọc `TouchableOpacity` → `ProductDetail` với `productId`.

---

## [tháng 5/2026] — fix(AuditLog): fetch zones trước inventory khi chọn kho

- **AuditLogScreen:** `fetchZones` rồi `fetchInventoryByLocation` khi `filterLocationId` đổi.

---

## [tháng 5/2026] — fix(AuditLog): fetch inventory khi chọn kho để dropdown SP có dữ liệu

- **AuditLogScreen:** gọi `fetchInventoryByLocation(filterLocationId)` khi chọn kho.

---

## [tháng 5/2026] — refactor(AuditLog): bỏ filter Loại; layout 2 hàng; fix query kho+SP

- **AuditLogScreen:** xóa dropdown Loại; hàng 1 Kho+Người, hàng 2 Sản phẩm full width.
- **fetchAuditLogs:** bỏ `filterType`; fix OR `filterProductId` tách `inventory_entries` / `products`.

---

## [tháng 5/2026] — F28: migration discontinued_reason; type Product; store setProductDiscontinued nhận reason

- **Migration** `20260530002000_f28_add_discontinued_reason.sql`; `schema.sql` v3.5.
- **types/index.ts:** `Product.discontinued_reason?`.
- **warehouseStore:** `setProductDiscontinued(productId, isDiscontinued, reason?)` — ghi/clear `discontinued_reason`; `toggleDiscontinued` giữ signature (chưa truyền reason).

---

## [tháng 5/2026] — fix(AuditLog): dropdown SP lọc theo kho đã chọn

- **AuditLogScreen:** `productOptions` khi có `filterLocationId` — chỉ SP có ≥1 lô trong kho (`entry.zone.location_id`).

---

## [tháng 5/2026] — fix(AuditLog): lọc kho chỉ inventory_entries

- **fetchAuditLogs:** bỏ OR với `products` khi `filterLocationId` + loại Tất cả; chỉ `inventory_entries` theo `location_id`.

---

## [tháng 5/2026] — fix(AuditLog): loadUserNames select changed_by_name limit 1000

- **AuditLogScreen:** dropdown Người — query `audit_logs` chỉ cột `changed_by_name`, limit 1000; không fetch 50 record đầy đủ qua `fetchAuditLogs`.

---

## [tháng 5/2026] — fix(statusUtils): SP không có lô → màu xám

- **getWorstDisplayColorForEntries:** `entries.length === 0` trả `colors.sub` thay vì `colors.statusOk`.

---

## [tháng 5/2026] — fix(statusUtils): getDisplayColor context ok → statusOk

- **statusUtils:** lô không có issue visible (`visible.length === 0`) trả `colors.statusOk` thay vì `colors.sub`.

---

## [tháng 5/2026] — fix: thumbnail vuông 64×64, meta line, crop sau chụp

- **ProductsScreen:** thumbnail cố định 64×64; gộp tổng thùng + category một dòng; `itemRow` `alignItems: 'center'`.
- **imageUtils:** crop vuông center sau `launchCameraAsync` (`manipulateAsync`).

---

## [tháng 5/2026] — fix: layout card ProductsScreen + camera crop vuông

- **ProductsScreen:** ảnh `flex: 1` fit chiều cao card; tổng thùng xuống dòng riêng; barcode lô tách dòng.
- **imageUtils:** `launchCameraAsync` dùng `cameraPickerOptions` (`allowsEditing`, `aspect: [1,1]`, `quality: 1`).

---

## [tháng 5/2026] — F08: AddInventoryScreen ô ảnh optional khi tạo SP mới

- **AddInventoryScreen:** preview ảnh local trong form tạo SP; sau `addProduct` upload + `updateProductImage`; `ImageViewerModal` preview.

---

## [tháng 5/2026] — F08: ProductDetailScreen image block + upload + xóa ảnh

- **ProductDetailScreen:** block ảnh 120×120 trước infoBox, upload/đổi/xóa ảnh, zoom `ImageViewerModal`; sync store + local state.

---

## [tháng 5/2026] — F08: fix upload FileSystem.readAsStringAsync (expo-file-system/legacy)

- **imageUtils:** `uploadProductImage` đọc file qua `FileSystem.readAsStringAsync` (`expo-file-system/legacy`) + `Uint8Array` thay `fetch(file://).blob()` — Expo Go Android không hỗ trợ fetch `file://` URI.
- **Package:** cài thêm `expo-file-system` (chưa có trong project trước đó).

---

## [tháng 5/2026] — F08: custom ImageViewerModal thay react-native-image-viewing

- **Gỡ** `react-native-image-viewing` (package lỗi).
- **Mới:** `components/ImageViewerModal.tsx` — Modal + Animated + PanResponder (pinch zoom, pan, double-tap reset).
- **ProductsScreen:** dùng `ImageViewerModal`.

---

## [tháng 5/2026] — F08: ProductsScreen thumbnail 64×64 + upload + zoom

- **ProductsScreen:** thumbnail trái card, upload qua `pickImage`/`uploadProductImage`, zoom `react-native-image-viewing`, đổi ảnh từ viewer.

---

## [tháng 5/2026] — F08: warehouseStore image actions

- **Store:** `updateProductImage`, `removeProductImage`; `deleteProduct` gọi `deleteProductImage` trước khi xóa DB.

---

## [tháng 5/2026] — F08: tạo utils/imageUtils.ts

- **Code:** `pickImage`, `uploadProductImage`, `deleteProductImage` — picker, compress (expo-image-manipulator), Storage bucket `product-images`.
- **Package:** thêm `expo-image-manipulator` (compress JPEG 80%, max 1200px).

---

## [tháng 5/2026] — F08: cài packages ảnh + migration Storage

- **Packages:** `expo-image-picker`, `react-native-image-viewing` (expo install).
- **Migration:** `20260530001000_f08_product_images_storage.sql` — bucket `product-images` (public read) + RLS authenticated insert/update/delete.
- **Schema:** `schema.sql` v3.4 — section Storage Buckets.

---

## [tháng 5/2026] — ProductDetailScreen: gộp nút Ẩn/Xóa SP thành 1 hàng

- **Layout:** `productActionsRow` — Ẩn/Khôi phục + Xóa SP cạnh nhau `flex: 1`, gap 10.

---

## [tháng 5/2026] — Ẩn/Khôi phục SP tại ProductDetail; xóa edit modal ProductsScreen

- **ProductDetailScreen:** nút Ẩn/Khôi phục (trước Xóa SP), `handleArchiveToggle` + Alert xác nhận, `supabase` + sync store, `goBack()` sau khi ok.
- **ProductsScreen:** xóa nút ✏️ card + modal Sửa sản phẩm (edit/archive trong modal).

---

## [tháng 5/2026] — docs: F08 design confirmed + cập nhật PLAN_3, REQUIREMENTS, DECISIONS, CONTEXT, HANDOFF_3

- **Docs:** F08 ảnh SP — Storage `product-images`, 3 màn upload, compress, zoom; checklist D3; 5 DECISIONS entries; chưa implement code.

---

## [tháng 5/2026] — ZoneDetailSheet: tap tên SP → ProductDetail

- **Code:** Header group — `TouchableOpacity` navigate `ProductDetail` + `productId` (khi không edit tên); nút ✏️ giữ nguyên.

---

## [tháng 5/2026] — fix(ProductDetailScreen): snapshot useRef + Ghi đè đóng edit

- **Code:** `productSnapshotRef`, `lotSnapshotsRef` thay `useState`; `checkConflict` đọc ref mới; Ghi đè ngưỡng đóng edit mode khi save OK.

---

## [tháng 5/2026] — fix(ProductDetailScreen): handleSaveThresholds 1 query

- **Code:** Gộp `warning_days` + `low_warning_boxes` → `handleSaveThresholds` / `doSaveThresholds` (1 `checkConflict`, 1 UPDATE); fix false positive conflict khi save tuần tự.

---

## [tháng 5/2026] — ProductDetailScreen B6: ngưỡng ✏️/✕/✓

- **Code:** Section Chi tiết — `warning_days` + `low_warning_boxes` chỉ sửa khi bấm ✏️; một nút ✕/✓ lưu cả hai; bỏ 2 nút Lưu riêng và `isSavingProduct`.

---

## [tháng 5/2026] — fix: expiry TextInput keyboardType default

- **Code:** `ZoneDetailSheet`, `ProductDetailScreen` — ô hạn DD/MM/YYYY dùng `keyboardType="default"` (bỏ numeric). `AddInventoryScreen` ô hạn không có numeric, không đổi.

---

## [tháng 5/2026] — ProductDetailScreen: hạn lô DD/MM/YYYY (dateUtils)

- **Code:** Tách `utils/dateUtils.ts` từ ZoneDetailSheet; `ProductDetailScreen` inline edit lô dùng pattern A1 (display/parse/validate); ZoneDetailSheet import chung.

---

## [tháng 5/2026] — fix(ProductDetailScreen): Xem lai dong edit + loadData

- **Code:** 5 Alert conflict — "Xem lại" đóng `editingLotId`/category pickers và gọi `loadData()` (bỏ fetch supabase thủ công).

---

## [tháng 5/2026] — fix(ZoneDetailSheet): Xem lai dong edit + reload zone

- **Code:** Alert conflict `handleSaveLot` — "Xem lại" đóng inline edit và gọi `reloadCurrentZoneInventory()` (bỏ fetch supabase thủ công).

---

## [tháng 5/2026] — fix(conflict): Xem lai tu dong load data moi nhat

- **Code:** `ZoneDetailSheet`, `ProductDetailScreen` — nút "Xem lại" trong Alert conflict fetch DB và cập nhật form/snapshot (lỗi mạng → Alert nhỏ).

---

## [tháng 5/2026] — fix(ZoneDetailSheet): KAV behavior padding + bottom inset

- **Code:** `KeyboardAvoidingView` `behavior="padding"` (bỏ `height` trên Android trong Modal); `paddingBottom: Math.max(insets.bottom + 8, 24)`.

---

## [tháng 5/2026] — .cursorrules: Quy tắc Schema (migration + schema.sql)

- **Rule:** Mỗi migration mới trong `supabase/migrations/` bắt buộc đồng bộ `schema.sql` (DDL/section, bump version, changelog đầu file).

---

## [tháng 5/2026] — schema: re-number v2.x → v3.x

- **Docs:** `supabase/migrations/schema.sql` — header `3.3`; changelog Phase 3 (v3.0–v3.3) tách khỏi nhãn v2.5–v2.8; mốc Phase 3 bắt đầu = SEC-11 v2.

---

## [tháng 5/2026] — A5 fix — trigger auto-update updated_at cho inventory_entries + zones

- **Migration:** `supabase/migrations/20260529123000_add_updated_at_triggers.sql` — `BEFORE UPDATE` trigger gán `updated_at = now()` cho `inventory_entries` và `zones` (bổ sung cho A5; `products` đã có từ migration trước).
- **Schema:** `supabase/migrations/schema.sql` v2.8 — đồng bộ 2 trigger trong section AUTO-UPDATE TRIGGERS (A5).
- **Kiểm tra:** `utils/conflictUtils.ts` — so sánh `new Date(...).getTime()` với ISO từ DB đã đúng; không đổi code.

---

## [tháng 5/2026] — C1 fix — zones publication migration + skip self-refresh

- **Migration:** `supabase/migrations/20260528120000_add_zones_to_realtime.sql` — `ALTER PUBLICATION supabase_realtime ADD TABLE zones;` (zone changes không fire Realtime trước đây vì bảng chưa trong publication; `inventory_entries` đã có).
- **Code:** `MapScreen` — `ownMutationRef` + `markOwnMutation()` (3s) bỏ qua `scheduleRefresh` khi mutation local; gọi trước `saveZone` / `deleteZone`; truyền `markOwnMutation` sang `ZoneLayoutEditor` và `ZoneDetailSheet` (`onBeforeMutation` trước `confirmMoveLot`).
- **Docs:** `HANDOFF_3.md` note C1.

---

## [tháng 5/2026] — A5: conflict detection optimistic locking (updated_at)

- **Migration:** `supabase/migrations/20260529122000_add_updated_at_to_products.sql` — thêm `products.updated_at` + trigger auto-update.
- **Code:** `utils/conflictUtils.ts` (`checkConflict`) — so sánh snapshot `updated_at` với DB và tra `audit_logs` để lấy `changed_by_name`.
- **UI:** 
  - `components/ZoneDetailSheet.tsx` — check conflict khi lưu lô (`inventory_entries`).
  - `screens/ProductDetailScreen.tsx` — check conflict khi lưu lô (`inventory_entries`) và khi lưu thông tin sản phẩm (`warning_days`, `low_warning_boxes`, category).

---

## [tháng 5/2026] — Realtime: C1 — MapScreen zones + inventory_entries

- **Code:** `screens/MapScreen.tsx` — Supabase Realtime (`private: true`), debounce 2s, refetch `fetchZones` + `fetchInventoryByLocation` khi đổi kho / có event.
- **Docs:** `CONTEXT.md` §3, `HANDOFF_3.md` (tick C1). Ghi chú: không có KI riêng cho C1 (xem WORKLOG).

---

## [tháng 5/2026] — UX: B8 mở rộng warning toggles toàn app

- **Code:** `utils/statusUtils.ts` (`getDisplayColor`, `getDisplayColorForEntry`, …); Products, Map, ZoneDetailSheet, ProductDetail, Notifications; `App.tsx` `loadWarningSettings`.
- **Docs:** `CONTEXT.md` §4b, `REQUIREMENTS.md`, `HANDOFF_3.md` (mô tả B8).

---

## [tháng 5/2026] — UX: B7 refine — highlight 1s, reset map khi đóng sheet

- **Code:** `ZoneDetailSheet` highlight nhóm SP 1000ms; `MapScreen.closeZoneDetail` — nếu mở từ search (`autoScrollProductId`) thì xóa highlight zone + panel search khi đóng.

---

## [tháng 5/2026] — UX: B7 — Map search result → tự mở ZoneDetailSheet + scroll SP

- **Code:** `MapScreen` — `autoScrollProductId`, `focusSearchResultLot` mở sheet; `ZoneDetailSheet` — `scrollToProductId`, scroll + highlight 1.5s.
- **Docs:** `CONTEXT.md` §3, `HANDOFF_3.md` (tick B7).

---

## [tháng 5/2026] — UX: B6 refine — đổi UX nút sửa tên SP

- **Code:** `ZoneDetailSheet` — nút ✏️/✕/✓ trên hàng action mỗi lô; tên SP header chỉ `Text`/`TextInput`; lưu chỉ khi bấm ✓ (không blur).
- **Docs:** `HANDOFF_3.md` (mô tả B6).

---

## [tháng 5/2026] — UX: B6 — sửa tên SP inline tại ZoneDetailSheet

- **Code:** `warehouseStore.updateProductName`; `ZoneDetailSheet` — long-press tên SP → `TextInput`, blur/submit lưu; hint ✏️.
- **Docs:** `CONTEXT.md` (§4 action), `HANDOFF_3.md` (tick B6).

---

## [tháng 5/2026] — UX: B8 — toggle cảnh báo hết hạn/hết hàng (Settings + Notifications)

- **Code:** `stores/warningStore.ts` (AsyncStorage); `SettingsScreen` section Cảnh báo + 2 `Switch`; `NotificationsScreen` neutral màu + ẩn count filter khi tắt.
- **Docs:** `CONTEXT.md` (§4b `warningStore`), `HANDOFF_3.md` (tick B8).

---

## [tháng 5/2026] — UX: B1 — badge "Đã giảm giá" trên header card (NotificationsScreen)

- **Code:** `screens/NotificationsScreen.tsx` — `hasAnyPriceReduced` trên header card tab Sắp hết hạn; toggle từng lô khi expand giữ nguyên.
- **Docs:** `HANDOFF_3.md` (tick B1).

---

## [tháng 5/2026] — UX: B2 + B3 + B5 — quick fixes

- **B2:** `ZoneDetailSheet` — `availableTargetZones = zones` (cho phép chuyển lô cùng zone, khác tầng).
- **B3:** `utils/textUtils.ts` — `normalizeText` loại ký tự đặc biệt sau `toLowerCase()`.
- **B5:** `AddInventoryScreen` — cập nhật hint muted + note phía trên ô tìm SP.
- **Docs:** `HANDOFF_3.md` (tick B2, B3, B5).

---

## [tháng 5/2026] — fix: A4 / KI-047 — MapScreen search theo barcode text

- **Code:** `screens/MapScreen.tsx` — `handleSearch` merge kết quả tên + barcode, dedupe theo `entry.id`; `stores/warehouseStore.ts` — `searchInventoryByBarcode` dùng `ilike` partial.
- **Docs:** `KNOWN_ISSUES.md` (KI-047 Resolved), `HANDOFF_3.md` (tick A4).

---

## [tháng 5/2026] — fix: A3 / KI-046 — MapScreen zone overlap + anti double-tap

- **Code:** `screens/MapScreen.tsx` — `isSavingZone` + try/catch/finally trong `saveZone`; nút Lưu `disabled` + opacity 0.5; `hasSelectedCellsOverlap()` trong `confirmSelection` và `saveZone`.
- **Docs:** `KNOWN_ISSUES.md` (KI-046 Resolved), `HANDOFF_3.md` (tick A3).

---

## [tháng 5/2026] — fix: A2 / KI-045 — ProductsScreen search + clear

- **Code:** `screens/ProductsScreen.tsx` — `clearSearch()` reset `selectedZoneId`; `filteredProducts` match tên hoặc barcode từ `inventoryEntries` trong store.
- **Docs:** `KNOWN_ISSUES.md` (KI-045 Resolved), `HANDOFF_3.md` (tick A2).

---

## [tháng 5/2026] — fix: A1 / KI-044 — ZoneDetailSheet hạn DD/MM/YYYY

- **Code:** `components/ZoneDetailSheet.tsx` — inline edit lô: helper `isoExpiryToDisplay`, `parseDisplayDateToIso` (DD/MM/YYYY + MM/YYYY→ngày 1), `isValidDisplayDate`; lưu ISO qua `updateInventoryEntry`; xóa `isValidIsoDate`.
- **Docs:** `KNOWN_ISSUES.md` (KI-044 Resolved), `HANDOFF_3.md` (tick A1).

---

## [tháng 5/2026] — docs: Tạo skeleton docs/phases/phase-3/ (HANDOFF_3, SUMMARY_3, TESTCASES_3, USER_GUIDE_3)

- **Tạo:** `HANDOFF_3.md` (skeleton + checklist A1–E2 + KI open + §8 local từ HANDOFF_2), `SUMMARY_3.md`, `TESTCASES_3.md` (TC-301 → TC-365, 58 cases), `USER_GUIDE_3.md` (tính năng mới Phase 3, tiếng Việt)
- **Đã có:** `PLAN_3.md`
- **Cập nhật:** `CONTEXT.md` §2 — `phase-3/` đủ 5 file

---

## [tháng 5/2026] — docs: Khởi động Phase 3 — tạo PLAN_3.md, cập nhật toàn bộ docs

- **Tạo:** `docs/phases/phase-3/PLAN_3.md`
- **Cập nhật:** `REQUIREMENTS.md` (v1.3.7), `DECISIONS.md` (5 entry mới), `CONTEXT.md` (screens + store + nav), `KNOWN_ISSUES.md` (KI-044 → KI-048)

**Phase 3 scope:** 5 bugs (A1–A5), 8 UX (B1–B8), Realtime + conflict (C1), F27/F28/F08 hoàn thiện, F23 Dashboard, F24 RBAC; **F19 Dropped**; F21/F25/F26 → Phase 4.

| Group | Tasks |
|-------|-------|
| **A — Bug Fixes** | 5 (KI-044 → KI-048) |
| **B — UX** | 8 |
| **C — Realtime** | 1 |
| **D — Feature Completion** | 3 (F27, F28, F08) |
| **E — New Features** | 2 (F23, F24) |
| **Security** | 2 (SEC-05, SEC-06) |

---

## [tháng 5/2026] — docs: Tạo PLAN_3.md — khởi động Phase 3 (bản nháp đầu)

- **File mới:** `docs/phases/phase-3/PLAN_3.md` — kế hoạch Phase 3 (In progress).
- *(Superseded bởi entry trên — giữ lại để trace.)*

---

## [tháng 5/2026] — Đợt 1: KI-043 + KI-041 + FEATURE-B (Done)

| Nhóm | Trạng thái |
|------|------------|
| **KI-043** | Done — `ZoneDetailSheet` modal chuyển lô: `ScrollView` + `editActions` marginTop 16 |
| **KI-041** | Done — `app.json` `softwareKeyboardLayoutMode: pan`; KAV trong modal tạo/sửa kho |
| **FEATURE-B** | Done — `AddInventoryScreen`: `+ Tạo mới '[tên]'` cuối list gợi ý |

- **Docs:** `KNOWN_ISSUES.md`, `WORKLOG.md`, `CONTEXT.md`, `REQUIREMENTS.md`
- **Code:** `components/ZoneDetailSheet.tsx`, `app.json`, `screens/LocationManagementScreen.tsx`, `screens/AddInventoryScreen.tsx`

---

## [tháng 5/2026] — Đợt 2: KI-042 + FEATURE-A (Done)

| Nhóm | Trạng thái |
|------|------------|
| **KI-042** | Done — `SafeAreaProvider`; chuẩn hóa `SafeAreaView`; 4 màn thiếu; `ZoneDetailSheet` insets |
| **FEATURE-A** | Done — AddInventory: 📷 + `searchByBarcode` + hint + warning text |

- **Docs:** `KNOWN_ISSUES.md`, `WORKLOG.md`, `CONTEXT.md`, `REQUIREMENTS.md`
- **Code:** `App.tsx`, `components/ZoneDetailSheet.tsx`, `screens/*` (SafeArea import), `ProductsScreen`, `NotificationsScreen`, `OrderListScreen`, `OrderDetailScreen`, `AddInventoryScreen`

---

## [tháng 5/2026] — Đợt 3: FEATURE-C (Done)

| Nhóm | Trạng thái |
|------|------------|
| **FEATURE-C** | Done — `LocateIntent` + `locateIntent` store; ProductDetail 📍 → Map; bỏ chuyển lô/modal → tại PDS |

- **Đợt 3:** hoàn tất (đợt 1–3 xong)
- **Docs:** `KNOWN_ISSUES.md` (không KI mới), `WORKLOG.md`, `CONTEXT.md`, `REQUIREMENTS.md`
- **Code:** `types/index.ts`, `stores/warehouseStore.ts`, `screens/ProductDetailScreen.tsx`, `screens/MapScreen.tsx`

---

## [tháng 5/2026] — fix: LocationManagementScreen modal keyboard (Android APK) — bước trung gian

- **Bước trung gian:** Bỏ KAV; chỉ `scrollToEnd` onFocus — chưa đủ trên APK.
- **Superseded bởi:** Đợt 1 KI-041 (`softwareKeyboardLayoutMode: pan` + KAV lại).

---

## [tháng 5/2026] — docs: KI-003 Resolved, KI-019 sync phase-2, theme convention

- **KNOWN_ISSUES.md:** KI-003 Closed → **Resolved**; ghi chú light theme + tab bar hardcode.
- **HANDOFF_2.md §6:** bỏ KI-019 khỏi open; ghi chú Resolved (debounce 600ms + overlay 800ms).
- **SUMMARY_2.md §5–§7:** SEC-07/KI-019 Resolved; cập nhật đếm open/resolved.
- **CONTEXT.md §7:** default theme `isDark = false`, không hardcode dark.
- **File:** `docs/KNOWN_ISSUES.md`, `docs/phases/phase-2/HANDOFF_2.md`, `docs/phases/phase-2/SUMMARY_2.md`, `docs/project/CONTEXT.md`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — feat: NotificationsScreen — checkbox count badge + lọc hết hàng

- **Sắp hết hạn:** label `Hết hạn (X)` / `Sắp hết hạn (X)` — count card sau search, trước checkbox.
- **Sắp hết hàng:** checkbox mới `Hết hàng (X)` / `Sắp hết hàng (X)` + filter (logic giống tab hết hạn); `lowWarningBoxes` trên card.
- **Pipeline:** search → checkbox → pagination (giữ search/pagination trước đó).
- **File:** `screens/NotificationsScreen.tsx`, `docs/project/CONTEXT.md` §3, `docs/project/REQUIREMENTS.md` §7.6, `docs/WORKLOG.md`

---

## [tháng 5/2026] — feat: NotificationsScreen — search + pagination

- **Search:** `TextInput` + `normalizeText` trên tên SP (sau `expiryCardsFiltered` / `lowStockCards`); 📷 → `BarcodeScanner` → lô trong `inventoryEntriesForNotify` → `searchQuery` = tên SP.
- **Pagination:** `currentPageExpiry` / `currentPageLowStock`, slice 10/trang, `FlatList`, footer giống Products/AuditLog; reset khi search / kho / checkbox / tab.
- **Không đổi:** data flow fetch, logic tab/checkbox/expiry-lowStock.
- **File:** `screens/NotificationsScreen.tsx`, `docs/project/CONTEXT.md` §3, `docs/WORKLOG.md`

---

## [tháng 5/2026] — docs: KI-040 ProductsScreen fetch toàn bộ SP (Deferred Phase 3)

- **KNOWN_ISSUES.md:** KI-040 — performance `fetchProducts` không limit; hướng fix Phase 3: cursor pagination DB + server-side filter.
- **File:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — feat: ProductsScreen pagination (10 SP/trang, FlatList)

- **UI:** `currentPage`, `pagedProducts` slice từ `filteredProducts`; `FlatList` thay `ScrollView`+map; footer ← Trang X / Y → khi > 10 item (style AuditLog).
- **Reset trang:** `useEffect` khi `searchQuery`, `filterLocationId`, `selectedZoneId` đổi.
- **Không đổi:** logic `fetchProducts` / filter hiện tại.
- **File:** `screens/ProductsScreen.tsx`, `docs/project/CONTEXT.md` §3, `docs/WORKLOG.md`

---

## [tháng 5/2026] — feat: normalizeText() — tìm kiếm không dấu toàn app

- **Utility:** `utils/textUtils.ts` — `normalizeText()` (lowercase, thay ký tự VI/FI, NFD, strip dấu).
- **Store:** `searchProducts` — bỏ `ilike` DB; filter `store.products` local + query `inventory_entries` theo `product_id`.
- **Màn hình / component:** `ProductsScreen`, `AddInventoryScreen`, `OrderDetailScreen`, `ZoneDetailSheet`, `AuditLogScreen` (FilterPicker), `ZoneLayoutEditorScreen`.
- **Docs:** `docs/project/CONTEXT.md` (§2, §4, §7), `docs/project/REQUIREMENTS.md` (F09, §7.4), `docs/DECISIONS.md`, `docs/WORKLOG.md`.

---

## [tháng 5/2026] — feat: ZoneLayoutEditor — tìm kiếm lọc zone theo tên

- **UI:** `TextInput` trên danh sách zone scroll ngang; filter local case-insensitive; clear ✕; empty state **Không tìm thấy zone**.
- **Fix keyboard:** `KeyboardAvoidingView` (`flex: 1`, `padding` iOS / `height` Android) bọc toàn bộ nội dung trong `SafeAreaView` (header + grid + bottomPanel); `keyboardShouldPersistTaps="handled"` trên scroll ngang zone.
- **File:** `screens/ZoneLayoutEditorScreen.tsx`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — fix: LocationManagement modal tạo/sửa kho — bàn phím che input

- **Vấn đề:** Modal bottom sheet bị keyboard che field rows/cols.
- **Fix:** `KeyboardAvoidingView` (`padding` iOS / `height` Android) + `ScrollView` (`keyboardShouldPersistTaps="handled"`) bọc nội dung modal tạo và sửa kho.
- **File:** `screens/LocationManagementScreen.tsx`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — fix: MapScreen highlight zone — giữ màu lô tệ nhất

- **Vấn đề:** `buildHighlightMapFromEntries` `map.set` ghi đè — nhiều lô cùng `zone_id` → grid hiện màu entry cuối, không phải đỏ/vàng tệ nhất.
- **Fix:** `worstRankByZone` + `getEntryStatusRank` — chỉ cập nhật màu khi `rank <` rank đã lưu cho zone.
- **File:** `screens/MapScreen.tsx`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — perf: giảm lag chuyển tab (Settings TTL/debounce, Map focus guard)

- **FIX 1:** `SettingsScreen` `useFocusEffect` — `lastFetchedAt` + TTL 30s; chỉ `refreshDiscontinuedContext` / `fetchLatestAuditEntry` (và `fetchCategories` nếu L1 rỗng) khi quá TTL; cập nhật timestamp sau khi fetch xong.
- **FIX 2:** Realtime `products` / `inventory_entries` — debounce 2s trước `refreshDiscontinuedContext`; clear timer trong cleanup.
- **FIX 3:** `MapScreen` Effect #3 — `fetchInventoryByLocation` chỉ khi `isFocused === true`.
- **File:** `screens/SettingsScreen.tsx`, `screens/MapScreen.tsx`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — fix: MapScreen sort kết quả tìm kiếm đỏ → vàng → xanh (UI ghi đè)

- **Kiểm tra:** `getCombinedStatusRank` — 1=expired (tệ nhất), 4=ok; sort ascending (`rankA - rankB`) là đúng hướng.
- **Root cause:** `searchResults` đã sort đúng trước `setSearchResults`, nhưng `searchResultsByLocation` sort lại theo **tên SP/zone**; `collapsedSearchSummaries` sort theo tên → panel hiện xanh trước đỏ/vàng.
- **Fix:** `getEntryStatusRank` + `compareEntriesByStatusThenName`; nhóm theo kho / thu gọn dùng cùng thứ tự status (tie-break tên). Sort global vẫn trước `setSearchResults` (text + barcode).
- **File:** `screens/MapScreen.tsx`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — fix: sort search theo màu, light theme mặc định, keyboard & Hủy form SP

- **FIX 1 (MapScreen):** `sortSearchResultsByStatusRank` — sort kết quả `searchProducts` / `searchInventoryByBarcode` theo `getCombinedStatusRank` (đỏ → vàng → xanh) trước `setSearchResults`.
- **FIX 2:** `themeStore` default `isDark: false`; `loadTheme` chỉ dark khi AsyncStorage `theme === 'dark'`. `LoginScreen`: KAV + ScrollView, toggle mật khẩu 👁/🙈. Thêm KAV cho màn/modal có TextInput: `ProductDetailScreen`, `LocationManagementScreen`, `CategoryManagementScreen`, `ProductsScreen` (modal sửa), `AuditLogScreen` (FilterPicker), `ZoneDetailSheet`, `MapScreen` (modal zone).
- **FIX 3:** `AddInventoryScreen` — nút **Hủy** cạnh **Tạo và chọn sản phẩm** (`closeCreateProductForm`, không lưu).
- **File đã sửa:** `screens/MapScreen.tsx`, `stores/themeStore.ts`, `screens/LoginScreen.tsx`, `screens/AddInventoryScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/LocationManagementScreen.tsx`, `screens/CategoryManagementScreen.tsx`, `screens/ProductsScreen.tsx`, `screens/AuditLogScreen.tsx`, `components/ZoneDetailSheet.tsx`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — fix: MapScreen highlight barcode, panel thu gọn, fetchInventoryByLocation

- **FIX 1:** Effect #2 barcode — `setHighlightedZones(buildHighlightMapFromEntries(results, colors))` sau search (không `setSelectedLocation`).
- **FIX 2:** Khôi phục `isSearchPanelExpanded` + nút Chi tiết/Thu gọn; thu gọn = `collapsedSearchSummaries`, chi tiết = ScrollView nhóm theo kho.
- **FIX 3:** `fetchInventoryByLocation` — 1 query Supabase per kho, 1 lần merge `inventoryEntries`; MapScreen Effect #3 thay `Promise.all(fetchInventoryByZone)`.
- **File đã sửa:** `stores/warehouseStore.ts`, `screens/MapScreen.tsx`, `docs/project/CONTEXT.md`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — fix: MapScreen locate barcode — không auto đổi kho, tất cả lô cùng mã

- **Root cause:** Effect #2 (locate barcode) gọi `searchByBarcode` (mutate `inventoryEntries`/`products`) + `setSelectedLocation` ngay → xung đột với Effect #3 (`fetchInventoryByZone` toàn bộ zone) → freeze; `setSearchResults([entry])` chỉ 1 lô.
- **Fix:** Thêm `searchInventoryByBarcode` (query `.eq('barcode')`, return mảng, không ghi store). Locate barcode: chỉ `setSearchQuery` + `setSearchResults` (mọi lô, mọi kho), không highlight / không `setSelectedLocation` — user bấm lô → `focusSearchResultLot` như text search. Revert mutation trong `searchByBarcode` (chỉ return data cho scanner khác).
- **File đã sửa:** `stores/warehouseStore.ts`, `screens/MapScreen.tsx`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — fix: MapScreen search — revert store merge, stop locate effect loop

- **Root cause:** `searchProducts` merge kết quả vào `inventoryEntries` / `products` → MapScreen re-render liên tục; `useEffect` locate phụ thuộc `inventoryEntries` + `products` → chạy lại sau mỗi search / đổi kho → lag, nhảy kho, thiếu kết quả hiển thị.
- **Fix:** `searchProducts` chỉ `return` data (revert merge). Panel kết quả chỉ dùng local `searchResults`. Locate: `searchByBarcode` + ref `lastLocateAtRef` (bỏ deps store); highlight từ `entry.product` trong kết quả local.
- **File đã sửa:** `stores/warehouseStore.ts`, `screens/MapScreen.tsx`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — feat: MapScreen tìm kiếm toàn kho + kết quả nhóm theo kho

- **`searchProducts`:** Xác nhận query không lọc `selectedLocationId`; merge kết quả vào store (`inventoryEntries`, `products`) để dùng khi đổi kho / locate.
- **`MapScreen`:** Panel kết quả nhóm theo kho (header đậm + lô: SP, zone, tầng, thùng, hạn); bấm lô → `setSelectedLocation` + highlight zone (`highlightedZones`) + đóng panel. Locate barcode: tự chuyển kho nếu lô thuộc kho khác.
- **Docs:** `CONTEXT.md` §3, `REQUIREMENTS.md` §7.4 + §9; `KNOWN_ISSUES.md` KI-039 (Deferred Phase 3).
- **File đã sửa:** `stores/warehouseStore.ts`, `screens/MapScreen.tsx`, `docs/project/CONTEXT.md`, `docs/project/REQUIREMENTS.md`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — fix: 4 bug UX (pre-fill tên SP, barcode debounce, xóa SP, bàn phím)

- **BUG 1:** `AddInventoryScreen` — pre-fill `newProductName` từ `searchQuery` khi bấm **Tạo sản phẩm mới**.
- **BUG 2:** `BarcodeScannerScreen` — debounce 600ms (cùng mã liên tục) + overlay xác nhận 800ms trước navigate/callback.
- **BUG 3:** `warehouseStore.deleteProduct` (block nếu còn `inventory_entries`) + nút **Xóa sản phẩm** trên `ProductDetailScreen`.
- **BUG 4:** `KeyboardAvoidingView` trên `AddInventoryScreen`, `OrderDetailScreen` (ô ghi chú cuối màn).
- **Docs:** KI-019 Resolved; KI-036–KI-038; `CONTEXT.md` §3 §4; `REQUIREMENTS.md` F14 + màn chi tiết SP.
- **File đã sửa:** `screens/AddInventoryScreen.tsx`, `screens/BarcodeScannerScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/OrderDetailScreen.tsx`, `stores/warehouseStore.ts`, `docs/KNOWN_ISSUES.md`, `docs/project/CONTEXT.md`, `docs/project/REQUIREMENTS.md`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — milestone: APK v1.0 build + cài điện thoại thành công

- **Kết quả:** EAS Local (WSL2) build APK preview thành công; cài lên thiết bị Android thật, app mở và chạy bình thường (D8 go-live).
- **Môi trường đã xác nhận:** Project trên `E:\personal projects\`; WSL2 Ubuntu + `build.sh`; `~/.gradle/gradle.properties` + `.wslconfig` `memory=16GB`; export `EXPO_PUBLIC_*` trước build.
- **KNOWN_ISSUES:** KI-031–KI-033 → Mitigated; KI-034–KI-035 → Resolved.
- **File đã sửa:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — docs: BUILD_APK_GUIDE.md + build.sh (EAS Cloud & Local WSL2)

- **Tạo:** `docs/BUILD_APK_GUIDE.md` — hướng dẫn build APK end-to-end: EAS Cloud (Windows), EAS Local (WSL2 + Android SDK/Java/Gradle), set env (`eas env:create` / export), xóa cache Gradle, mục 7 lỗi thường gặp, quy trình build lần sau, FAQ.
- **Tạo:** `build.sh` — script tự động export env + `eas build --local` + copy APK vào `apk/`.
- **Đồng bộ docs:** `CONTEXT.md` §1 (tham chiếu BUILD_APK_GUIDE), §2 (file tree); `KNOWN_ISSUES.md` KI-030–KI-035 (lỗi build chưa ghi trước đó).
- **File đã sửa:** `docs/BUILD_APK_GUIDE.md` (mới), `build.sh` (mới), `docs/project/CONTEXT.md`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — fix: Android crash on launch (auth gate, Supabase env, New Arch)

- **Nguyên nhân:** APK EAS thường thiếu `EXPO_PUBLIC_*` nếu chưa D5 (`eas env:create`) → `createClient` với url/key `undefined` crash lúc import; `App.tsx` `getSession()` không try/catch; `newArchEnabled: false` lệch Expo Go.
- **Fix:** `lib/supabase.ts` — `readSupabaseEnv()`, `isSupabaseConfigured`, client placeholder khi thiếu env; `App.tsx` — bootstrap auth async + try/catch + `ConfigErrorScreen`; `index.ts` — `StartupErrorBoundary`; `app.json` — bỏ `newArchEnabled: false`, dedupe permissions; `.env.example`.
- **Cần làm sau fix code:** Set EAS env (D5) → `eas build --profile preview --platform android` lại → D8.
- **File đã sửa:** `lib/supabase.ts`, `App.tsx`, `index.ts`, `app.json`, `components/ConfigErrorScreen.tsx` (mới), `components/StartupErrorBoundary.tsx` (mới), `.env.example` (mới), `docs/KNOWN_ISSUES.md` (KI-029), `docs/WORKLOG.md`

---

## [tháng 5/2026] — docs: fix 3 thiếu sót CONTEXT.md

- **§4:** thêm nhóm Actions audit log (`fetchAuditLogs`, `fetchLatestAuditEntry`, `fetchAuditLogsForProduct`)
- **§5:** thêm `AuditLog`, `OrderList`, `OrderItem` vào danh sách Types
- **§3:** thêm `AuditLog` vào 4 stacks (Map/Products/Notifications/Settings)
- **File đã sửa:** `CONTEXT.md`, `WORKLOG.md`

---

## [tháng 5/2026] — docs: fix 5 lỗi nhỏ sau review tổng kết Phase 2

- **CONTEXT §2:** thêm `SUMMARY_2.md` vào file tree phase-2/
- **TESTCASES_2 TC-231:** sửa expected result (CASCADE + SET NULL, không Block)
- **REQUIREMENTS §10:** Offline Phase 2 → Phase 3
- **PLAN_2 §4:** cập nhật mô tả HANDOFF_2/TESTCASES_2 (đã đầy đủ)
- **SUMMARY_2 §7:** thêm `DiscontinuedProductsScreen`/`OrderListScreen`/`OrderDetailScreen`
- **File đã sửa:** `CONTEXT.md`, `TESTCASES_2.md`, `REQUIREMENTS.md`, `PLAN_2.md`, `SUMMARY_2.md`, `WORKLOG.md`

---

## [tháng 5/2026] — docs: SUMMARY_2.md + rewrite USER_GUIDE.md

- **SUMMARY_2:** tổng kết đầy đủ Phase 2 (features done, tính năng → Phase 3, decisions quan trọng, security 14 SEC tổng kết, KI open, số liệu Phase 2, lộ trình Phase 3).
- **USER_GUIDE:** rewrite phản ánh Phase 2 — thêm §2 Đăng nhập (auto-logout, kill app), §3 cập nhật multi-kho + Zone Layout Editor, §4 thêm filter kho/zone + category, §5 thêm phân loại + lịch sử thay đổi, §7 rewrite Cài đặt (quản lý kho, phân loại, audit log, discontinued, đăng xuất), §9 cập nhật gợi ý lỗi auth.
- **File đã tạo/sửa:** `docs/phases/phase-2/SUMMARY_2.md`, `docs/project/USER_GUIDE.md`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — docs: tạo HANDOFF_2.md + TESTCASES_2.md đầy đủ

- **HANDOFF_2:** tổng quan Phase 2, features done (F20/F29/F30/Auth/SEC-08/SEC-11/Auto-logout), 15 migration files, breaking changes (auth bắt buộc, persistSession: false, Realtime private, expo-updates), files thêm/sửa, known issues open (9 KI), checklist bàn giao, hướng dẫn local.
- **TESTCASES_2:** 50 test cases (TC-201→TC-250) nhóm Auth (10), F20 Multi-kho (10), F29 Zone Layout Editor (6), F30 Category (9), SEC-11 Audit Log (10), Security (5).
- **File đã tạo:** `docs/phases/phase-2/HANDOFF_2.md`, `docs/phases/phase-2/TESTCASES_2.md`

---

## [tháng 5/2026] — docs: fix 7 file sai lệch chuẩn bị tổng kết Phase 2

- **GOLIVE_CHECKLIST_2:** rewrite A3/A4 (persistSession: false thay SecureStore), D hoàn toàn (EAS thay gradlew/adb), thêm E6/E7/E8 (auto-logout, kill app, background).
- **KNOWN_ISSUES KI-016:** sửa mô tả fix (persistSession: false thay SecureStore).
- **CONTEXT §1:** sửa expo-secure-store + Supabase Auth (`persistSession: false` thay "memory-only").
- **DECISIONS:** thêm supersede note cho "Phase 1 không có auth".
- **PLAN_2:** cập nhật trạng thái → "đang tổng kết", thêm auth/EAS done, F21 deferred Phase 3, auto-logout done trong §5.
- **REQUIREMENTS v1.3.6:** F21 Phase→Phase 3, F22 Partial (SEC-11), F24 Partial (auth cơ bản done).
- **WORKFLOW:** tất cả references Phase 1 → Phase 2 (PLAN_2, HANDOFF_2, TESTCASES_2, SUMMARY_2).
- **File đã sửa:** `GOLIVE_CHECKLIST_2.md`, `KNOWN_ISSUES.md`, `CONTEXT.md`, `DECISIONS.md`, `PLAN_2.md`, `REQUIREMENTS.md`, `WORKFLOW.md`, `WORKLOG.md`

---

## [tháng 5/2026] — chore: update .cursorrules Phase 2 + tạo USER_GUIDE_2.md

- **`.cursorrules`:** Rewrite toàn bộ — thêm Auth (persistSession: false), quy tắc WORKLOG (entry ở ĐẦU FILE), quy tắc đặt tên file theo phase (suffix _N), cập nhật tính năng đã hoàn thành (Phase 1 + Phase 2), tính năng chưa làm (Phase 2 còn lại), sửa handoff reference sang `HANDOFF_2.md`.
- **`docs/phases/phase-2/USER_GUIDE_2.md`:** Tạo mới — hướng dẫn sử dụng Phase 2 cho nhân viên dùng APK: cài app, đăng nhập & bảo mật (auto-logout 20 phút, kill app), các tab, tính năng mới (multi-kho, zone editor, phân loại 2 cấp, lịch sử thay đổi, quản lý kho), cài đặt, màu sắc, đồng bộ, liên hệ sự cố.
- **File đã sửa:** `.cursorrules`, `docs/phases/phase-2/USER_GUIDE_2.md` (mới), `docs/project/CONTEXT.md` §2, `docs/WORKLOG.md`

---

## [tháng 5/2026] — chore: đổi tên file phase docs thêm số suffix (_1, _2)

- **Phase 1:** `PLAN.md` → `PLAN_1.md`, `SUMMARY.md` → `SUMMARY_1.md`, `HANDOFF.md` → `HANDOFF_1.md`, `TESTCASES.md` → `TESTCASES_1.md`, `USER_GUIDE.md` → `USER_GUIDE_1.md`.
- **Phase 2:** `PLAN.md` → `PLAN_2.md`, `GOLIVE_CHECKLIST.md` → `GOLIVE_CHECKLIST_2.md`, `HANDOFF.md` → `HANDOFF_2.md`, `TESTCASES.md` → `TESTCASES_2.md`.
- **References updated:** `CONTEXT.md` §2, `WORKLOG.md`, `WORKFLOW.md`, `README.md`, `USER_GUIDE.md`, `PLAN_1.md`, `SUMMARY_1.md`, `PLAN_2.md`.

---

## [tháng 5/2026] — fix: supabase.ts — đổi sang persistSession: false

- **`lib/supabase.ts`:** Xóa `memoryStorage` object và `auth.storage`. Đổi `persistSession: true` → `false`. Lý do: `persistSession: true` + storage luôn trả null gây `autoRefreshToken` đọc storage thấy null → clear session → query mất JWT → RLS block. `persistSession: false` = session thuần trong RAM của Supabase client, không đụng storage, behavior vẫn đúng (kill app = logout).

---

## [tháng 5/2026] — feat: auto-logout — memory session + inactivity 20 phút

- **`lib/supabase.ts`:** Xóa `ExpoSecureStoreAdapter` (SecureStore), thay bằng `memoryStorage` → sau đó đổi sang `persistSession: false` (xem entry trên).
- **`App.tsx`:** Thêm inactivity timer: `INACTIVITY_LIMIT_MS` = 20 phút, `CHECK_INTERVAL_MS` = 30s. Refs: `lastActivityRef`, `intervalRef`, `isAutoLogoutRef`. `useEffect(session)`: start timer khi có session, stop + hiện Alert khi auto-logout. `AppState` listener: check inactivity ngay khi active, stop timer khi background. Wrap navigator trong `<View onTouchStart/onTouchEnd={updateActivity}>`.
- **`screens/LoginScreen.tsx`:** Comment ghi nhận App.tsx useEffect(session) tự reset timer sau login thành công.
- **Docs:** `DECISIONS.md` (auto-logout decision), `CONTEXT.md` §1 (expo-secure-store + Supabase Auth updated), `KNOWN_ISSUES.md` (KI-028 Resolved).
- **File đã sửa:** `lib/supabase.ts`, `App.tsx`, `screens/LoginScreen.tsx`, `docs/DECISIONS.md`, `docs/project/CONTEXT.md`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — Enrich audit log display — trigger nhúng tên SP/zone/kho, UI hiện thông tin rõ ràng

- Migration `20260513_enrich_audit_trigger.sql`: `CREATE OR REPLACE FUNCTION audit_trigger_fn()` — nhúng `_product_name`, `_zone_name`, `_location_name` vào `old_data`/`new_data` JSONB cho `inventory_entries`; zone cũ lookup riêng khi `zone_id` thay đổi (UPDATE). Products giữ nguyên `to_jsonb(OLD/NEW)` không nhúng thêm.
- `AuditLogScreen.tsx`: thêm `formatAuditEntry(entry)` — render human-readable description theo bảng action × table_name; `getChangedFields()` bỏ qua key prefix `_` và `updated_at`/`created_at`. Thay layout cũ (user + table label + field list) bằng: user name + description line + timestamp.
- KI-022 updated, DECISIONS SEC-11 updated.

---

## [tháng 5/2026] — Fix 3 UX issues AuditLogScreen (KI-027)

- Dropdown Modal-based: đổi 4 inline dropdown sang `SearchableDropdownModal` (Modal + FlatList) — fix scroll conflict.
- Searchable: TextInput tìm kiếm (auto-focus, case-insensitive substring) trong mỗi Modal dropdown.
- Placeholder Người: "Tất cả (chưa có lịch sử)" khi chưa có audit entries.
- Camera scan Sản phẩm: icon 📷 → BarcodeScanner → `searchByBarcode` → set `filterProductId`.

---

## [tháng 5/2026] — SEC-11 Resolved: Audit Log hoàn chỉnh (v2 — location_id + 4 filter)

- Migration `20260513_add_audit_logs.sql`: bảng `audit_logs` (gồm `location_id` FK → locations), trigger `audit_trigger_fn` (SECURITY DEFINER, lookup location_id từ zones cho inventory_entries) trên `inventory_entries` + `products`, RLS authenticated SELECT only, 4 index (`changed_at DESC`, `record_id`, `location_id`, `table_name`).
- Type `AuditLog` trong `types/index.ts` (thêm `location_id`).
- Store: `fetchAuditLogs` (cursor-based, filter kho + loại + người + sản phẩm — logic kết hợp loại + kho), `fetchLatestAuditEntry`, `fetchAuditLogsForProduct`.
- `AuditLogScreen.tsx`: 4 filter dropdown (kho/loại/người/sản phẩm) — disable kho khi loại = Sản phẩm; pagination 10/trang, cache in-memory.
- `ProductDetailScreen`: section Lịch sử thay đổi (10 entries, icon + user + nhãn loại + time + fields, nút Xem tất cả → AuditLogScreen filtered).
- `SettingsScreen`: card Lịch sử thay đổi (subtitle relative time, navigate AuditLogScreen).
- Navigation: `AuditLog` screen trong MapStack, ProductsStack, NotificationsStack, SettingsStack.
- KI-022 → Resolved.

---

## [tháng 5/2026] — Docs: thiết kế SEC-11 Audit Log

- Chốt kiến trúc: PostgreSQL trigger + bảng `audit_logs` + `changed_by_name` lưu prefix email.
- Chốt UI: `AuditLogScreen` (filter người + sản phẩm, pagination cursor-based, cache), section 10 entries trong `ProductDetailScreen` + nút Xem tất cả, card trong `SettingsScreen`.
- Deferred: Realtime cho `AuditLogScreen` → KI-026.
- Cập nhật: `CONTEXT.md`, `REQUIREMENTS.md` §9, `DECISIONS.md`, `PLAN.md` §5, `KNOWN_ISSUES.md` (KI-022 updated + KI-026 mới).

---

## [tháng 5/2026] — Bảo mật: SEC-01 Resolved + sync security docs đầy đủ

- **SEC-01 Resolved:** rotate anon key, fix `backup.mjs` dùng `process.env`, xóa khỏi Git history.
- Thêm KI-013 đến KI-025 vào `KNOWN_ISSUES.md` (tracking đầy đủ SEC-01 → SEC-14).
- `CONTEXT.md` §1: thêm ghi chú mô hình bảo mật (client-direct BaaS, RLS `authenticated_only`, Realtime `private: true`, không server backend riêng).
- `DECISIONS.md`: thêm quyết định kiến trúc client-direct + RLS.
- `PLAN.md`: thêm mục §5 Security Phase 2 (SEC-11 in progress, SEC-05/06/07/10/12/13/14 còn lại, SEC-09 deferred Phase 3).
- Tạo `docs/phases/phase-2/GOLIVE_CHECKLIST_2.md` với trạng thái từng bước C/B/A/D/E.
- **File đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/project/CONTEXT.md`, `docs/DECISIONS.md`, `docs/phases/phase-2/PLAN_2.md`, `docs/phases/phase-2/GOLIVE_CHECKLIST_2.md` (mới), `docs/WORKLOG.md`

---

## [tháng 5/2026] — Sync và fix 7 lỗi sai lệch tài liệu

- **SUMMARY.md §6:** KI-004 chuyển từ Deferred sang Resolved (fix trong Task 3/4 Phase 2).
- **SUMMARY.md §3:** Xóa dòng "Barcode edge cases (BLK-001)" — BLK-001 đã Closed hoàn toàn.
- **SUMMARY.md §7:** Sửa dòng barcode: bỏ "edge cases +", thêm ghi chú BLK-001 closed.
- **PLAN.md §2:** Đánh dấu F20, F29, F30 là **✓ Done** (gạch ngang + nhãn).
- **PLAN.md §3:** BLK-001 Closed — thay câu "chờ chủ cửa hàng" bằng "không còn edge case tồn đọng".
- **PLAN.md §2 F30:** Sửa "gán SP trên tab Sản phẩm" → "gán SP trên ProductDetailScreen và AddInventoryScreen".
- **REQUIREMENTS.md §9:** Xóa "Toggle lọc có vấn đề" khỏi ProductsScreen (đã bỏ từ code); thêm "checkbox lọc Hết hạn / Sắp hết hạn" vào Notifications.
- **DECISIONS.md:** Thêm ghi chú supersede cho mục "Tab Đặt hàng" gốc → trỏ tới F27 mở rộng.
- **File đã cập nhật:** `docs/phases/phase-1/SUMMARY_1.md`, `docs/phases/phase-2/PLAN_2.md`, `docs/project/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — SEC-08 Resolved: private channel + RLS realtime.messages

- **Fix:** Thêm `config: { private: true }` vào `.channel()` của SettingsScreen (dòng 59) và DiscontinuedProductsScreen (dòng 58).
- **Migration:** `20260513_realtime_rls_sec08.sql` — tạo policy `authenticated_users_can_receive` (SELECT) và `authenticated_users_can_broadcast` (INSERT) trên `realtime.messages` cho role `authenticated`.
- **Lý do chọn được fix đầy đủ:** Phase 2 đã có auth (LoginScreen + `signInWithPassword`); RLS các bảng đã đổi sang `authenticated`; migration Realtime là phần còn thiếu duy nhất.
- **File đã sửa:** `screens/SettingsScreen.tsx`, `screens/DiscontinuedProductsScreen.tsx`, `supabase/migrations/20260513_realtime_rls_sec08.sql`, `docs/KNOWN_ISSUES.md`, `docs/BLOCKERS.md`, `docs/WORKLOG.md`
- **Tham chiếu:** KI-012 Resolved, BLK-003 Resolved

---

## [tháng 5/2026] — SEC-08: Phân tích và document lỗi Realtime subscription chưa xác thực

- **Phân tích:** Xác nhận `SettingsScreen` (dòng 57–79) và `DiscontinuedProductsScreen` (dòng 56–78) đang subscribe Realtime `postgres_changes` trên `products` + `inventory_entries` dưới role `anon`, không có `private: true`.
- **Kết luận:** Fix (thêm `private: true` + RLS `authenticated`) không áp dụng được cho Phase 1 vì toàn bộ user đang dùng `anon` — sẽ ngắt Realtime. Các màn hình khác trong app cũng có subscription tương tự, cần fix đồng loạt.
- **Hành động:** Document vào `KNOWN_ISSUES.md` (KI-012) và `BLOCKERS.md` (BLK-003); defer sang Phase 3 cùng F24 (Auth).
- **File đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/BLOCKERS.md`, `docs/WORKLOG.md`

---

## [tháng 5/2026] — Authentication A3–A7

- **A3:** Cài `expo-secure-store` (đã có sẵn / cài qua `npx expo install`).
- **A4:** `lib/supabase.ts` — thêm `ExpoSecureStoreAdapter` vào `createClient` auth config: `storage`, `autoRefreshToken`, `persistSession`, `detectSessionInUrl: false`.
- **A5:** Tạo `screens/LoginScreen.tsx` — email + password, `signInWithPassword`, hiện lỗi nếu sai credentials, dùng `useThemeStore()` cho màu, comment tiếng Việt. Không có link đăng ký / quên mật khẩu (tài khoản do admin tạo tay).
- **A6:** `App.tsx` — auth gate: `getSession()` khi mount, subscribe `onAuthStateChange`; `session === null` → `<LoginScreen />`; loading → `<ActivityIndicator />`; có session → navigation hiện tại (giữ nguyên toàn bộ NavigationContainer + stacks + tabs).
- **A7:** `screens/SettingsScreen.tsx` — nút **Đăng xuất** cuối màn, gọi `supabase.auth.signOut()`; style: nền đỏ nhạt, text đỏ, border đỏ, tách biệt rõ với card cài đặt phía trên.
- **Docs:** `CONTEXT.md` §1 (thêm expo-secure-store + Supabase Auth), §2 (thêm `LoginScreen.tsx`), §3 (ghi chú auth gate); `WORKLOG.md`.
- **File thay đổi:** `lib/supabase.ts`, `screens/LoginScreen.tsx` (mới), `App.tsx`, `screens/SettingsScreen.tsx`, `docs/project/CONTEXT.md`, `docs/WORKLOG.md`.

---

## [tháng 5/2026] — ProductsScreen «Tất cả kho»: `fetchAllInventoryEntries` thay vì fetch theo `store.zones`

- **Vấn đề:** `filterLocationId === null` cũ dùng `Promise.all(zones.map(fetchInventoryByZone))` — `zones` chỉ là zone của **kho đang chọn trên Map**, dễ trộn / thiếu lô của kho khác khi xem **Tất cả kho**.
- **Fix:** Giống `NotificationsScreen`: `useEffect` khi `!filterLocationId` → `void fetchAllInventoryEntries()`; chọn kho cụ thể vẫn fetch theo `zonesForFilterLoc` + `fetchInventoryByZone`.
- **File:** `screens/ProductsScreen.tsx`, `docs/project/CONTEXT.md` §3, `docs/WORKLOG.md`.

---

## [tháng 5/2026] — Card sản phẩm / card lô: bỏ zone+tầng trên Products; ProductDetail hiện kho · zone · tầng

- **`ProductsScreen`:** Dòng lô trên thẻ SP chỉ còn **Hạn · số thùng · barcode** (barcode trống → `—`); bỏ `Zone … T…`.
- **`ProductDetailScreen`:** Tiêu đề card lô: **`{tên kho} · {tên zone} · Tầng {n}`** — `locations` từ store + join `zone.location_id`; `zone` từ `lot.zone` hoặc `zones` trong store; `fetchLocations` khi store chưa có kho.

---

## [tháng 5/2026] — Luồng quét + Huỷ: ProductsScreen `search`, Alert 3 nút, `returnTab` trên AddInventory + `lib/tabNavigation`

- **`ProductsScreen`:** `{ mode: 'search', returnTab: 'Products' }` — tìm lô + kết quả về `ProductsMain` (params quét giữ nguyên); không dùng `locate` (tránh nhảy Map khi tìm thấy).
- **`MapScreen`:** `{ mode: 'locate', returnTab: 'Map' }`.
- **`BarcodeScannerScreen`:** Không tìm thấy lô — locate & search — `Alert` 3 nút: **Thử lại** / **Thêm thủ công** (`AddInventory` + `returnTab` trong params) / **Huỷ** (`tabsParamsForReturnTabMain` + đóng modal). Nhánh `addInventoryParams` cũng gửi `returnTab`.
- **`lib/tabNavigation.ts`:** `tabsParamsForReturnTabMain`, `navigateToTabMainFromNestedStack` (Hủy AddInventory từ stack con).
- **`AddInventoryScreen`:** `returnTab?` + header **Huỷ** theo `returnTab`; bỏ `getHostTabName` không dùng.

---

## [tháng 5/2026] — Tab 1 lần bấm (từ tab khác) + Huỷ scanner về main theo `returnTab`

- **`App.tsx` — `stackTabPressListener`:** Stack sâu (`index > 0`) + đang **focus** tab đó → `preventDefault` + `popToTop` (target `route.state.key`). Stack sâu + **chưa** focus → `preventDefault` + `navigation.navigate(route.name)` + `popToTop` để vừa chuyển tab vừa reset stack một lần. `index === 0` → không `preventDefault`, để navigation mặc định.
- **`BarcodeScannerScreen.tsx`:** Nút **Huỷ** trong alert không tìm thấy mã: thay `goBack()` bằng `navigateTabsThenCloseModal(tabsParamsForReturnTabMain(returnTab))` — map `Map`→`MapMain`, `Products`→`ProductsMain`, `Orders`→`OrderListMain`, `Notifications`→`NotificationsMain`, `Settings`→`SettingsMain` (mặc định `Products`).

---

## [tháng 5/2026] — Tab bar: reset stack khi bấm tab (bỏ điều kiện focused) + kiểm tra luồng Fix 4

- **`App.tsx` — `stackTabPressListener`:** Bỏ kiểm tra tab đang focus; mỗi lần `tabPress` trên một tab, nếu `route.state` của stack con có `index > 0` và có `stackKey` thì `preventDefault` + `StackActions.popToTop({ target: stackKey })`. Kết quả: chuyển từ tab khác (ví dụ **Kho**) sang tab có stack đang sâu (ví dụ **Sản phẩm** đang ở `AddInventory`) vẫn pop về màn gốc của tab đó.
- **Fix 4 (kiểm tra sau Fix 3):** Luồng *Sản phẩm → quét → không thấy → **Huỷ** → sang **Kho** → bấm lại tab **Sản phẩm***: với listener mới, nếu stack Sản phẩm vẫn còn sâu (`AddInventory` / `ProductDetail`) thì lần bấm tab sẽ pop về `ProductsMain`. Trường hợp **Huỷ** chỉ `goBack()` scanner, không mở `AddInventory` → stack thường vẫn ở `ProductsMain` (không cần pop). **Chưa chạy thiết bị thật trong môi trường này** — nên xác nhận tay trên Expo; nếu vẫn kẹt `AddInventory` thì ghi lại để xử lý tiếp.

---

## [tháng 5/2026] — ProductsScreen UI (zone dropdown + category), tab bar popToTop, BarcodeScanner Huỷ

- **ProductsScreen:** Bỏ chip zone ngang; thêm hàng chọn **Zone** (cùng style hàng **Kho**) ngay dưới dropdown kho. **Tất cả kho:** hiện cảnh báo *Vui lòng chọn kho trước*, không mở danh sách. Đã chọn kho: modal **Tất cả zone** + từng zone; đổi kho → reset về **Tất cả zone**. Thẻ SP: dòng phân loại `L1 · L2` / chỉ L1 (ẩn nếu chưa gán L1); `fetchCategories` khi store category rỗng. Quét mã: truyền `returnTab: 'Products'`.
- **App.tsx:** `tabPress` — `StackActions.popToTop()` với `target: route.state.key` (stack lồng), không dùng `route.key` của tab.
- **BarcodeScannerScreen:** Dialog không tìm thấy mã: thêm **Huỷ** (`goBack` + mở khóa quét), **Thêm thủ công** dùng `returnTab`; `cancelable: true` (Android).
- **Tài liệu:** `docs/project/CONTEXT.md` (mô tả lọc zone); `docs/KNOWN_ISSUES.md` (KI-011 Resolved — kẹt scanner / sai tab).

---

## [tháng 5/2026] — F30 Task 3/3 hoàn thành — F30 Done

- `warehouseStore`: action `updateProductCategory` (Supabase `products` + đồng bộ `products` / `inventoryEntries`).
- `ProductDetailScreen`: `fetchCategories` khi mount nếu `productCategoriesL1` rỗng; section **Chi tiết**: dropdown **Nhóm (Cấp 1)** / **Loại (Cấp 2)** (L2 chỉ khi đã chọn L1; đổi L1 → reset L2); lưu ngay qua store.
- `AddInventoryScreen`: `fetchCategories` khi store category rỗng; SP có sẵn → dòng **Phân loại** read-only (`Tên L1 · Tên L2` / **Chưa phân loại**); tạo SP mới → dropdown Cấp 1/2 dưới field tên, lưu cùng `addProduct`.
- `REQUIREMENTS.md` §6 F30 **Done**, v1.3.5; `CONTEXT.md` §3 §4.

---

## [tháng 5/2026] — F30 Task 2/3: CategoryManagementScreen + Settings card

- `CategoryManagementScreen`: accordion Cấp 1 / Cấp 2, modal thêm/sửa tên, Alert xóa + hiện lỗi từ store, `fetchCategories` khi mount, nút **+ Thêm nhóm** / **+ Thêm loại**.
- `SettingsScreen`: hai card ngang (Quản lý kho + Phân loại sản phẩm), tóm tắt nhóm/loại, `fetchCategories` khi focus nếu store category rỗng, điều hướng `CategoryManagement`.
- `App.tsx`: route `CategoryManagement` trong `SettingsStack`.
- `CONTEXT.md` §3 UI: Settings + CategoryManagement + sửa dòng MapScreen.

---

## [tháng 5/2026] — F30 Task 1/3: migration + types + store

- Migration: `20260512143000_create_product_categories.sql` (bảng `product_categories_l1` / `product_categories_l2` + RLS), `20260512143001_add_category_to_products.sql` (`products.category_level1_id`, `category_level2_id`, FK SET NULL).
- `types/index.ts`: `ProductCategoryL1`, `ProductCategoryL2`; `Product` thêm `category_level1_id`, `category_level2_id`.
- `warehouseStore`: state `productCategoriesL1` / `productCategoriesL2`; actions `fetchCategories`, `addCategoryL1`, `updateCategoryL1`, `deleteCategoryL1` (chặn còn L2 con hoặc SP dùng cấp 1), `addCategoryL2`, `updateCategoryL2`, `deleteCategoryL2` (chặn SP dùng cấp 2); sau xóa L1/L2 gọi `fetchProducts()` để đồng bộ FK SET NULL.
- `CONTEXT.md` §4: state/actions F30 đã implement (bỏ nhãn design-only).

---

## [tháng 5/2026] — Chốt design F30 category (v1.3.4, docs only)

- **F30:** Category 2 cấp — card Settings **X nhóm · Y loại**, màn **Quản lý phân loại** (accordion); `ProductDetail` / `AddInventory` theo luồng dropdown; schema §8; **DECISIONS** (gắn SP không lô, optional 2 cấp, AddInventory chỉ SP mới, CRUD trong Settings).
- **CONTEXT:** §2 `CategoryManagementScreen`, §3 `CategoryManagement` route, §4 store category actions, §5 types `ProductCategoryL1` / `ProductCategoryL2`.
- **Chưa implement code.**

---

## [tháng 5/2026] — Chốt design F27 mở rộng + F30 (docs only)

- **F27:** 2 tab trong list (Hàng trong kho / Hàng mới), list active + list tự tạo, số thùng để trống đến Confirm, nhóm theo category, PDF tổng hợp cả 2 tab, luồng Draft → Confirm → Xuất PDF → Đã đặt.
- **F30:** Category 2 cấp, quản lý trong Settings, optional trên sản phẩm; `REQUIREMENTS.md` §6 §8 §9, `DECISIONS.md`, `docs/phases/phase-2/PLAN_2.md`.
- **Chưa implement code** — chỉ cập nhật tài liệu (v1.3.3).

---

## [tháng 5/2026] — F18 NotificationsScreen: Partial → Done

- **F18** `NotificationsScreen`: xác nhận **Done** sau test thực tế; không phát hiện lỗi UI/UX.
- Cập nhật `REQUIREMENTS.md` §6, `docs/phases/phase-2/PLAN_2.md` §1, `docs/phases/phase-1/SUMMARY_1.md`.

---

## [tháng 5/2026] — Audit và sync toàn bộ docs Phase 2

- Đối chiếu code thực tế với CONTEXT.md, REQUIREMENTS.md, KNOWN_ISSUES.md, DECISIONS.md sau khi hoàn thành F20, F29, fix NotificationsScreen filter.
- Cập nhật các chỗ còn thiếu hoặc chưa khớp.

📌 Nhắc upload lại lên Claude Project Knowledge: `docs/project/CONTEXT.md`, `docs/project/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/KNOWN_ISSUES.md`

---

## [tháng 5/2026] — Fix NotificationsScreen filter Tất cả kho

- Root cause: store.zones chỉ chứa zones của kho đang chọn trên Map nên fetch theo zones → thiếu inventory của các kho khác.
- Fix: thêm fetchAllInventoryEntries (fetch toàn bộ, không lọc zone) vào store; NotificationsScreen gọi action này khi filterLocationId = null thay vì fetch theo store.zones.

---

## [tháng 5/2026] — F29 Zone Layout Editor

- Tạo ZoneLayoutEditorScreen: compact tile bottom panel, tap-to-place, footprint preview, collision detection, `batchUpdateZoneCells`.
- MapScreen: thêm nút Sắp xếp (icon lưới) cạnh nút + Zone.
- App.tsx: thêm route `ZoneLayoutEditor` vào MapStack.
- CONTEXT.md: cập nhật §2 §3 §4.

📌 Nhắc upload lại lên Claude Project Knowledge: `docs/project/CONTEXT.md`

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
- **Files thay đổi:** `types/index.ts`, `stores/themeStore.ts`, `docs/KNOWN_ISSUES.md`, đồng bộ tham chiếu KI-001 (`.cursorrules`, `README.md`, `docs/project/CONTEXT.md`, `docs/project/USER_GUIDE.md`, `docs/phases/phase-1/PLAN_1.md`)
- **Kết quả:** `EXPIRY_COLORS.critical` = `#EF4444`; `statusCritical` dark `#EF4444`, light `#DC2626`
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md` (+ các file tham chiếu trạng thái bug)

### KI-004 — Trạng thái Deferred (chỉ docs)

- **Task:** Cập nhật KNOWN_ISSUES: KI-004 không ưu tiên fix ở Phase 1
- **Files thay đổi:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`
- **Kết quả:** KI-004 → **Deferred**; ghi chú Phase 1 một kho, không tái hiện được; F20 Phase 2; reopen khi multi-kho
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

### KI-005 — Danh sách SP/lô cập nhật ngay sau Thêm hàng

- **Task:** Fix KI-005: UI tab Sản phẩm không thấy SP mới sau khi tạo từ `AddInventoryScreen`
- **Files thay đổi:** `screens/AddInventoryScreen.tsx`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Tránh race `fetchProducts()` mount ghi đè store sau `addProduct`; `warehouseStore` `addProduct` / `addInventoryEntry` giữ nguyên (đã merge state đúng)
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### KI-005 (bổ sung) — Chi tiết SP: refetch lô khi focus

- **Task:** Sau `AddInventoryScreen` → back `ProductDetailScreen`, danh sách lô không cập nhật
- **Files thay đổi:** `screens/ProductDetailScreen.tsx`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** `loadData` bọc `useCallback`; `useFocusEffect` gọi `loadData` khi màn focus — refetch `inventory_entries` từ Supabase
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### UI — Thông báo, Sản phẩm, Chi tiết (tổng thùng + lọc Có vấn đề)

- **Task:** Card Thông báo (tổng + thùng có vấn đề); Products + ProductDetail: tổng thùng và toggle lọc
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `screens/ProductsScreen.tsx`, `screens/ProductDetailScreen.tsx`, `docs/project/CONTEXT.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Không đổi store/schema; lọc theo `getCombinedStatus` ≠ `ok`
- **Docs đã cập nhật:** `docs/project/CONTEXT.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md` (KNOWN_ISSUES: không phát hiện bug mới)

### UI — Thông báo (pill tồn/hạn) + Products (KI-008, trước đây KI-006)

- **Task:** Khôi phục pill **Sắp hết hàng** / **Hết hàng** và **Sắp hết hạn** / **Hết hạn** trên card Thông báo; màu chữ/viền pill `#EF4444` / `#FACC15`; sửa crash toggle **Có vấn đề** (thứ tự `useMemo`).
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `screens/ProductsScreen.tsx`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`, `docs/project/CONTEXT.md`
- **Kết quả:** Giữ dòng `Tổng X thùng | Y thùng có vấn đề`; `productIdsWithIssueLot` tính trước `filteredProducts` (Resolved — hiện ghi **KI-008** trong `KNOWN_ISSUES.md`)
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md` (KI-008), `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`, `docs/project/CONTEXT.md`

### UI — Thông báo (pill dưới tổng) + Sản phẩm (bỏ toggle Có vấn đề)

- **Task:** Pill tồn/hạn cùng một hàng ngay dưới `Tổng X thùng | Y thùng có vấn đề`; chỉ render pill đỏ/vàng khi có cảnh báo; xóa toggle **Có vấn đề** khỏi `ProductsScreen` (giữ toggle ở `ProductDetailScreen`); loại bỏ hoàn toàn đường filter `.has` trên Products.
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `screens/ProductsScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Không còn `TypeError` từ `.has` trên Products; lọc lô có vấn đề chỉ còn ở chi tiết SP
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Navigation + ProductDetail + Map + Thông báo + Thêm/Sửa lô (0 thùng)

- **Task:** Tab bar hiện trên `ProductDetail` / `AddInventory` (stack lồng trong tab); `BarcodeScanner` fullscreen modal; `ProductDetail`: hardcode `low_critical_boxes = 1`, gỡ UI ngưỡng critical, gộp mã vạch + `low_warning_boxes` + `warning_days` vào section **Chi tiết** / **Thu gọn** (mặc định thu gọn); `MapScreen`: panel kết quả tìm mặc định thu gọn sau khi tìm, nút **Chi tiết** / **Thu gọn**; `NotificationsScreen`: pill tồn **Hết hàng** (0 thùng) / **Còn rất ít** (1 thùng) đỏ; `AddInventoryScreen` + `ZoneDetailSheet`: cho phép **0 thùng** (số nguyên ≥ 0).
- **Files thay đổi:** `App.tsx`, `screens/BarcodeScannerScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/MapScreen.tsx`, `screens/NotificationsScreen.tsx`, `screens/AddInventoryScreen.tsx`, `components/ZoneDetailSheet.tsx`, `docs/DECISIONS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** `returnTab` cho luồng gán mã vạch sau quét; navigate lồng `Tabs` → tab → `MapMain` / `ProductDetail` / `AddInventory`
- **Docs đã cập nhật:** `docs/DECISIONS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Docs — KI mới (0 thùng) + đổi mã KI cũ

- **Task:** Ghi nhận **KI-006** (ProductDetail không cho sửa về 0 thùng), **KI-007** (lô 0 thùng biến mất khỏi app); đổi mã mục Resolved cũ ProductsScreen `.has` thành **KI-008**; cập nhật `HANDOFF.md`.
- **Files thay đổi:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Truy vết KI-006/007 theo lỗi 0 thùng; lịch sử TypeError Products → KI-008
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Docs — Quyết định mới cho Notifications + tồn kho + lô 0 thùng

- **Task:** Cập nhật quyết định mới: cảnh báo tồn kho theo tổng thùng sản phẩm; lô 0 thùng giữ lại, không tự xóa; format card Thông báo mới; thêm tab con **Có vấn đề / Để sau**; cập nhật F18 và blocker lưu trạng thái Để sau.
- **Files thay đổi:** `docs/DECISIONS.md`, `docs/project/REQUIREMENTS.md`, `docs/BLOCKERS.md`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Đồng bộ docs theo hướng triển khai mới cho tab Thông báo và business logic lô 0 thùng; bổ sung blocker dữ liệu cho tab Để sau.
- **Docs đã cập nhật:** `docs/DECISIONS.md`, `docs/project/REQUIREMENTS.md`, `docs/BLOCKERS.md`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Docs — Đồng bộ CONTEXT §3 (navigation + Notifications)

- **Task:** Cập nhật `docs/project/CONTEXT.md` theo cấu trúc navigation mới (mỗi tab là 1 native stack riêng; root chỉ có `Tabs` + `BarcodeScanner`) và format card `NotificationsScreen` mới (2 dòng nội dung + 2 pill cùng hàng + tab con **Có vấn đề / Để sau**).
- **Files thay đổi:** `docs/project/CONTEXT.md`, `docs/WORKLOG.md`
- **Kết quả:** CONTEXT khớp với quyết định mới trong docs và kiến trúc route hiện tại.
- **Docs đã cập nhật:** `docs/project/CONTEXT.md`, `docs/WORKLOG.md`

### KI-007 (+ KI-006) — Giữ lô 0 thùng trong app và DB; chi tiết SP

- **Task:** Fix KI-007: lô `quantity_boxes = 0` không còn “biến mất” khỏi danh sách; fix KI-006: cho phép lưu 0 thùng từ `ProductDetailScreen`.
- **Files thay đổi:** `stores/warehouseStore.ts` (`fetchInventoryByZone`, `searchProducts`), `screens/ProductDetailScreen.tsx`, `screens/NotificationsScreen.tsx` (bỏ điều kiện `issueBoxes === 0` khi vẫn có lô combined ≠ ok), `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Không còn lọc `quantity_boxes > 0` trên các truy vấn đó; lô 0 thùng có banner **Lô này đã hết hàng** + **Xóa lô** (xóa record); `deleteZone` vẫn chỉ chặn khi còn lô có `quantity_boxes > 0`. Không đổi schema — không migration mới.
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### KI-006 — Xác minh lại validation số thùng (ProductDetailScreen)

- **Task:** Đọc lại `ProductDetailScreen.tsx` — có còn chặn nhập `quantity_boxes = 0` khi sửa lô inline không?
- **Kết quả:** Không chặn. `handleSaveLot` chỉ báo lỗi khi `quantity < 0` hoặc không phải số nguyên hữu hạn; giá trị **0** đi qua validation và được gửi lên `updateInventoryEntry`. Không thay đổi code ứng dụng.
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md` (bổ sung dòng “Xác minh code” dưới KI-006), `docs/WORKLOG.md`

### F18 — Thông báo: tab Có vấn đề / Để sau + format card + `is_deferred`

- **Task:** Implement F18: migration `products.is_deferred`, `toggleDeferred` trong store, `NotificationsScreen` hai tab + card mới + nút chuyển tab; cập nhật REQUIREMENTS F18 Done, DECISIONS / BLOCKERS BLK-002 Resolved, HANDOFF.
- **Files thay đổi:** `supabase/migrations/20260511_add_product_is_deferred.sql`, `types/index.ts`, `stores/warehouseStore.ts`, `screens/NotificationsScreen.tsx`, `docs/project/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Pill tồn theo tổng thùng SP; pill hạn theo lô xấu nhất; dòng sắp hết hạn = tổng thùng các lô có hạn warning/expired; BLK-002 đóng bằng cột DB.
- **Docs đã cập nhật:** `docs/project/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

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
- **Files thay đổi:** `screens/AddInventoryScreen.tsx`, `screens/BarcodeScannerScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Không phát hiện bug mới ghi trong KNOWN_ISSUES.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### KI-010 — BarcodeScanner: đóng modal + nested navigate ổn định

- **Task:** Sau quét, modal scanner phải đóng và Tabs nhận params (locate / assign / addInventory / search mặc định).
- **Files thay đổi:** `screens/BarcodeScannerScreen.tsx`, `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** `navigate('Tabs', …)` rồi hoãn `goBack()` (~160ms); `useFocusEffect` reset lock; ref `processingRef` chống double-scan; reset ref khi alert “không tìm thấy”.
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md` (KI-010 Resolved), `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Docs — Quyết định barcode per lô + đóng BLK-001

- **Task:** Cập nhật docs theo quyết định mới: barcode per lô (`inventory_entries.barcode`), bỏ `products.barcode`; cập nhật logic tìm kiếm barcode vs tên; BLK-001 chuyển Resolved.
- **Files thay đổi:** `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/project/REQUIREMENTS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Đồng bộ tài liệu theo hướng triển khai barcode per lô trong Phase 1.
- **Docs đã cập nhật:** `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/project/REQUIREMENTS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Barcode per lô — implement code + migration

- **Task:** Chuyển barcode từ per sản phẩm sang per lô: migration drop `products.barcode`, add `inventory_entries.barcode`; cập nhật store/type/search; cập nhật `MapScreen`, `ProductsScreen`, `ProductDetailScreen`, `AddInventoryScreen`, `BarcodeScannerScreen` (bỏ assign mode).
- **Files thay đổi:** `supabase/migrations/20260511_drop_products_barcode.sql`, `supabase/migrations/20260511_add_inventory_entries_barcode.sql`, `types/index.ts`, `stores/warehouseStore.ts`, `screens/MapScreen.tsx`, `screens/ProductsScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/AddInventoryScreen.tsx`, `screens/BarcodeScannerScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Quét barcode tìm theo `inventory_entries.barcode` và trả về lô + zone chứa lô; AddInventory ghi barcode vào lô; ProductDetail cho xem/sửa barcode theo từng lô.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### UI — Barcode scan cho lô + format hạn DD/MM/YYYY

- **Task:** `ProductDetailScreen`: thêm nút quét camera cạnh field barcode lô (inline edit) và tự điền barcode sau quét; `ZoneDetailSheet`: hiện barcode lô và bỏ nút `i`; đổi hiển thị hạn toàn app sang `DD/MM/YYYY` (không đổi format DB).
- **Files thay đổi:** `screens/ProductDetailScreen.tsx`, `components/ZoneDetailSheet.tsx`, `screens/BarcodeScannerScreen.tsx`, `types/index.ts`, `screens/MapScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Luồng quét từ ProductDetail quay lại đúng lô đang edit; hạn hiển thị đồng nhất `DD/MM/YYYY`; không đổi schema/business rule.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### UI — Expand card lô + scan barcode trả về đúng màn

- **Task:** `MapScreen`: đưa nút `✕` vào trong ô tìm (giữ nguyên nút scan camera); `ZoneDetailSheet`: expand lô thêm field barcode + nút 📷; `ProductDetailScreen`: bấm card lô để mở inline edit luôn; `BarcodeScannerScreen`: trả barcode về đúng ngữ cảnh `ProductDetailScreen` và `ZoneDetailSheet` (không đổi các mode khác).
- **Files thay đổi:** `screens/MapScreen.tsx`, `components/ZoneDetailSheet.tsx`, `screens/ProductDetailScreen.tsx`, `screens/BarcodeScannerScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Quét từ `ZoneDetailSheet`/`ProductDetailScreen` điền barcode vào đúng lô đang sửa và đóng scanner, không chuyển sang màn khác; thao tác mở edit lô nhanh hơn bằng cách bấm trực tiếp card.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Fix scanner callback + ô tìm Sản phẩm

- **Task:** `BarcodeScannerScreen`: trả barcode đúng chỗ cho `ProductDetailScreen`, `AddInventoryScreen`, `ZoneDetailSheet` theo callback tại màn gọi scanner (điền field rồi đóng scanner, không điều hướng về `MapScreen`); `ProductsScreen`: thêm nút `✕` trong input tìm kiếm (giữ nguyên vị trí nút scan).
- **Files thay đổi:** `screens/BarcodeScannerScreen.tsx`, `screens/ProductDetailScreen.tsx`, `screens/AddInventoryScreen.tsx`, `components/ZoneDetailSheet.tsx`, `screens/ProductsScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Luồng scan từ 3 màn nhập barcode trực tiếp vào field đang sửa và đóng scanner bằng `goBack`; locate/search flow hiện tại không thay đổi.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Fix nút X tìm kiếm — Map + Products

- **Task:** `MapScreen` + `ProductsScreen`: nút `✕` active ngay khi có text; bấm `✕` xóa text tức thì, hủy kết quả tìm đang chờ và reset về trạng thái ban đầu.
- **Files thay đổi:** `screens/MapScreen.tsx`, `screens/ProductsScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** `MapScreen` thêm cơ chế request id để bỏ qua response search cũ sau khi clear; clear trên `ProductsScreen` đồng thời bỏ cờ highlight từ scan theo lô.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Docs — KNOWN_ISSUES: KI-009 → Closed

- **Task:** Cập nhật `KNOWN_ISSUES.md` cho KI-009: chuyển trạng thái sang **Closed**.
- **Files thay đổi:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`
- **Kết quả:** Đánh dấu KI-009 không còn liên quan do đã bỏ nút `i` điều hướng từ `ZoneDetailSheet` sang `ProductDetailScreen`; stale data không còn ảnh hưởng UX theo phạm vi hiện tại.
- **Docs đã cập nhật:** `docs/KNOWN_ISSUES.md`, `docs/WORKLOG.md`

### Docs lớn — định hướng mới Notifications + Tab Đặt hàng + Không nhập nữa

- **Task:** Cập nhật tài liệu yêu cầu/thiết kế cho thay đổi lớn nhiều màn hình: thêm tab Đặt hàng (F27), thêm danh sách Không nhập nữa trong Settings (F28), restructure F18 (Sắp hết hạn / Sắp hết hàng, bỏ Để sau), bổ sung trường dữ liệu `is_expired_acknowledged`, và cập nhật quyết định `is_deferred` không còn dùng trong UI.
- **Files thay đổi:** `docs/project/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Tài liệu đã đồng bộ theo scope mới; chưa thay đổi code implement (trạng thái các feature mới: planned/not started).
- **Docs đã cập nhật:** `docs/project/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### ProductDetail — Banner lô hết hạn + Xóa lô

- **Task:** `ProductDetailScreen`: thêm banner `Lô này đã hết hạn [Xóa lô]` cho lô có `expiry_date` đã qua ngày hiện tại; giữ hành vi xóa DB giống banner lô hết hàng; nếu lô vừa hết hàng vừa hết hạn thì hiển thị cả 2 banner.
- **Files thay đổi:** `screens/ProductDetailScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** UX lô hết hạn đồng nhất với lô hết hàng, thao tác dọn lô hết hạn ngay tại card lô.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Notifications restructure — Sắp hết hạn / Sắp hết hàng

- **Task:** Refactor `NotificationsScreen` bỏ tab **Có vấn đề / Để sau**, thay bằng 2 tab **Sắp hết hạn** và **Sắp hết hàng**; thêm toggle **Đã giảm giá** (`products.is_price_reduced`) cho card sắp hết hạn; card đã hết hạn hiển thị đỏ nhạt + nhãn `Hết hạn rồi`; tab sắp hết hàng thêm 2 nút **Thêm vào danh sách nhập** (placeholder log) và **Không nhập nữa** (`products.is_discontinued`).
- **Files thay đổi:** `screens/NotificationsScreen.tsx`, `stores/warehouseStore.ts`, `types/index.ts`, `supabase/migrations/20260511_add_product_is_price_reduced.sql`, `supabase/migrations/20260511_add_product_is_discontinued.sql`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Notifications chuyển sang luồng xử lý trực tiếp theo hạn/tồn; thêm 2 action store `togglePriceReduced` và `toggleDiscontinued`; sản phẩm đánh dấu không nhập nữa được ẩn khỏi tab sắp hết hàng.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Notifications — chuyển `is_price_reduced` từ Product sang InventoryEntry

- **Task:** Tạo migration chuyển cột `is_price_reduced` từ `products` sang `inventory_entries`; cập nhật tab Sắp hết hạn hiển thị theo từng lô có thể expand, mỗi lô có toggle Đã/Chưa giảm giá riêng; thêm filter bar `Hết hạn / Sắp hết hạn`; cập nhật `warehouseStore.togglePriceReduced` thao tác theo `inventory_entries`.
- **Files thay đổi:** `supabase/migrations/20260511_move_is_price_reduced_to_inventory_entries.sql`, `screens/NotificationsScreen.tsx`, `stores/warehouseStore.ts`, `types/index.ts`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Trạng thái giảm giá chuyển về cấp lô; UI tab Sắp hết hạn cho xem/toggle từng lô (màu đỏ nhạt/vàng nhạt theo loại hạn) và lọc nhanh theo loại lô.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

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
- **Files thay đổi:** `screens/OrderDetailScreen.tsx`, `screens/OrderListScreen.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Không đổi schema/store API; xóa list vẫn dùng `deleteOrderList` (đã xóa items + list trên DB và store).
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Navigation + tab Đặt hàng + order list workflow

- **Task:** `App.tsx` thêm tab **Đặt hàng** (giữa Sản phẩm và Thông báo), thêm stack riêng `OrderListMain` / `OrderDetail`, và bật hành vi `tabPress` popToTop khi bấm lại tab đang mở từ màn con; tạo `OrderListScreen` + `OrderDetailScreen`; bổ sung store actions cho `order_lists`/`order_items`; thêm migration tạo 2 bảng mới.
- **Files thay đổi:** `App.tsx`, `screens/OrderListScreen.tsx`, `screens/OrderDetailScreen.tsx`, `stores/warehouseStore.ts`, `types/index.ts`, `supabase/migrations/20260511_add_order_lists_and_items.sql`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Có luồng đặt hàng cơ bản theo list với 3 trạng thái (draft/confirmed/placed), CRUD item/list, cộng dồn sản phẩm trùng trong list đang soạn, và nút placeholder xuất PDF.
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Settings F28 — Sản phẩm không nhập nữa + màn danh sách

- **Task:** Card **Sản phẩm không nhập nữa** trong `SettingsScreen` (số lượng theo store + Supabase Realtime); stack `DiscontinuedProductsScreen` liệt kê `is_discontinued`, tồn tổng thùng (0 → `Hết hàng`), dòng lý do từ `products.notes` nếu có, nút **Nhập lại** (`setProductDiscontinued(..., false)`). Store: `fetchDiscontinuedProducts`, `refreshDiscontinuedContext`, `setProductDiscontinued`, `toggleDiscontinued` dùng chung cập nhật một chiều.
- **Files thay đổi:** `screens/SettingsScreen.tsx`, `screens/DiscontinuedProductsScreen.tsx`, `stores/warehouseStore.ts`, `App.tsx`, `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`
- **Kết quả:** Luồng F28 khép kín từ Cài đặt; đồng bộ `products` + `inventory_entries` qua Realtime (khi Supabase bật replication cho 2 bảng).
- **Docs đã cập nhật:** `docs/WORKLOG.md`, `docs/phases/phase-1/HANDOFF_1.md`

### Docs — Tổng kết Phase 1 & chuẩn bị Phase 2

- **Task:** Viết lại `docs/phases/phase-1/PLAN_1.md` theo trạng thái thực tế (Done / Partial F18 / Deferred F08,F19–F21,F26 / Out of scope F22–F25); tạo `docs/phases/phase-1/SUMMARY_1.md` (tổng quan, danh sách done & nợ, quyết định, KI, chuyển Phase 2); tạo `docs/phases/phase-2/PLAN_2.md`, `HANDOFF.md`, `TESTCASES.md` (placeholder); cập nhật `REQUIREMENTS.md` §6 (F15/F18/F27/F28); bump ghi chú phiên bản PRD 1.3.1.
- **Files thay đổi:** `docs/phases/phase-1/PLAN_1.md`, `docs/phases/phase-1/SUMMARY_1.md`, `docs/phases/phase-2/PLAN_2.md`, `docs/phases/phase-2/HANDOFF_2.md`, `docs/phases/phase-2/TESTCASES_2.md`, `docs/project/REQUIREMENTS.md`, `docs/WORKLOG.md`
- **Kết quả:** Phase 1 được đóng gói tài liệu; Phase 2 có skeleton plan và file handoff/test chờ điền.
- **Docs đã cập nhật:** `docs/WORKLOG.md`

### Docs — Phase 1 TESTCASES: F10 per lô + F17/F18/F27/F28

- **Task:** Sửa **TC-F10-01/02** theo barcode **per lô** (`inventory_entries.barcode`): quét đúng → highlight zone + thông tin lô; quét sai → dialog thêm thủ công / quét lại. Bổ sung test cases **F17** (Realtime hai thiết bị), **F18** (tab Sắp hết hạn/hết hàng, toggle giảm giá per lô, filter, Không nhập nữa), **F27** (đặt hàng list lifecycle), **F28** (Settings discontinued + Nhập lại). Cập nhật phần mở đầu file test.
- **Files thay đổi:** `docs/phases/phase-1/TESTCASES_1.md`, `docs/WORKLOG.md`
- **Kết quả:** QA có checklist thủ công khớp implementation hiện tại.
- **Docs đã cập nhật:** `docs/WORKLOG.md`

### Docs — Phase 1 USER_GUIDE (chủ + nhân viên)

- **Task:** Tạo `docs/phases/phase-1/USER_GUIDE_1.md` — hướng dẫn tiếng Việt ngắn gọn cho chủ cửa hàng và nhân viên: giới thiệu, Expo Go/WiFi, các tab, tác vụ (tìm hàng, zone, thêm SP/lô, cập nhật, xóa lô, thông báo hai tab, đặt hàng, không nhập nữa), màu sắc, lưu ý Realtime/đăng nhập/thùng; ví dụ Chino's Boba Tea & Asian Market.
- **Files thay đổi:** `docs/phases/phase-1/USER_GUIDE_1.md`, `docs/WORKLOG.md`
- **Kết quả:** Tài liệu vận hành cho người không chuyên kỹ thuật.
- **Docs đã cập nhật:** `docs/WORKLOG.md`

### Docs — USER_GUIDE: nút Thêm vào danh sách nhập (Phase 1 vs 2)

- **Task:** Sửa một đoạn trong `docs/phases/phase-1/USER_GUIDE_1.md` (mục Sắp hết hàng): ghi rõ nút **Thêm vào danh sách nhập** chưa hoạt động trong Phase 1; Phase 2 sẽ kết nối với tab Đặt hàng.
- **Files thay đổi:** `docs/phases/phase-1/USER_GUIDE_1.md`, `docs/WORKLOG.md`
- **Kết quả:** Người đọc không kỳ vọng sai về nút placeholder.
- **Docs đã cập nhật:** `docs/WORKLOG.md`

### Docs — BLK-001 Closed hoàn toàn

- **Task:** Cập nhật `docs/BLOCKERS.md`: BLK-001 đóng hẳn — ghi nhận trùng barcode 2 lô (hiện cả 2 zone), đổi nhãn lô = 2 lô khác nhau, lô không barcode (nhập tay), và kết luận không còn edge case cần xử lý thêm trong phạm vi blocker.
- **Files thay đổi:** `docs/BLOCKERS.md`, `docs/WORKLOG.md`
- **Kết quả:** Tài liệu blocker đồng bộ với xác nhận nghiệp vụ; tách rõ optional Phase 2 (multi-barcode) khỏi BLK-001.
- **Docs đã cập nhật:** `docs/WORKLOG.md`
