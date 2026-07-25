# Phase 7 — Kế hoạch

**Trạng thái:** Planning | Tháng 7/2026

---

## 1. Tổng quan / Mục tiêu Phase 7

Phase 7 tập trung **đóng nợ F27 mở rộng (A1)** — feature bắt buộc đã carry từ Phase 3→4→5→6. Sau A1 ổn định, xen kẽ **optimization** và **UX polish** từ test Phase 6.

**Nguồn:** `SUMMARY_6.md`, `HANDOFF_6.md`, `REQUIREMENTS.md` §6 F27, `DECISIONS.md` (List đặt hàng 2 tab / số thùng / PDF gộp).

**Kế thừa Phase 6:** Discount + picking UX + Settings 4 sections + notes folders + schema v5.5 + perf projections.

---

## 2. Group A (bắt buộc) — F27 mở rộng

> **Ưu tiên số 1.** Không bắt đầu Group B/C lớn trước khi A1 có đường đi rõ (sau recon).

### A1 — OrderDetail 2 tab + PDF tổng hợp

- **Files:** `screens/OrderDetailScreen.tsx`, `screens/OrderListScreen.tsx`, `stores/warehouseStore.ts`, có thể `supabase/migrations/` + `types/index.ts`
- **Tham chiếu:** `REQUIREMENTS.md` §6 F27; `DECISIONS.md`:
  - List đặt hàng — 2 tab trong một list
  - Số thùng để trống đến Confirm
  - Xuất PDF tổng hợp
- **Hành vi mục tiêu:**
  - Mỗi list: tab **Hàng trong kho** / **Hàng mới**
  - Một list **active**; auto tạo + popup tên nếu chưa có
  - SP từ Sắp hết hàng → tab trong kho; ô số thùng **trống** đến Confirm
  - Nhóm theo category + **Chưa phân loại**
  - Tab Hàng mới: tên, phân loại, số thùng, ghi chú
  - Flow: **Draft → Confirm → Xuất PDF (gộp 2 tab) → Đã đặt**

#### Sub-tasks đề xuất

| # | Việc | Ghi chú |
|---|------|---------|
| A1.0 | **Recon** OrderDetail + OrderList + order store/types | Bắt buộc trước schema |
| A1.1 | Schema `order_items` (cột phân biệt tab / loại item nếu thiếu) | Chỉ thêm nếu recon chứng minh cần |
| A1.2 | Store actions CRUD / confirm / PDF data | Giữ RLS/audit hiện có |
| A1.3 | UI 2 tab trên OrderDetail | Guest xem; staff+ sửa |
| A1.4 | PDF gộp 2 tab | Có thể reuse pattern Discount PDF |

---

## 3. Group B (ưu tiên cao) — Performance Optimization

> Recon hoàn tất tháng 7/2026. 11 vấn đề đã xác định từ code thật. Làm song song với A1 hoặc trước nếu lag/đơ ảnh hưởng vận hành hàng ngày.

**Tier 1 — Impact cao, không cần rebuild APK**

### B1 — Server-side filter thay fetchAllInventoryEntries full

- **Vấn đề:** `fetchAllInventoryEntries` kéo toàn bộ 550+ lô không filter, không pagination. Được gọi từ ProductsScreen, NotificationsScreen, DiscountScreen — mỗi màn fetch full rồi filter local.
- **Files:** `stores/warehouseStore.ts`, `screens/NotificationsScreen.tsx`, `screens/DiscountScreen.tsx`, `screens/ProductsScreen.tsx`
- **Hướng fix:** Tạo function fetch chuyên biệt theo scope (expiry range cho Notifications, is_price_reduced cho Discount, location_id cho Products). Mỗi màn chỉ fetch đúng data cần hiển thị.
- **KI:** KI-075, KI-076

### B2 — Fix double-fetch trên Notifications + Discount

- **Vấn đề:** Discount: `useFocusEffect` + `useEffect [filterLocationId]` cùng gọi `fetchAllInventoryEntries` → 2 call full data mỗi lần focus. Notifications: không có TTL → fetch full mỗi lần focus.
- **Files:** `screens/NotificationsScreen.tsx`, `screens/DiscountScreen.tsx`
- **Hướng fix:** Loại bỏ duplicate call; thêm TTL cho Notifications. Giải quyết tự nhiên khi làm B1.
- **KI:** KI-076

### B3 — Projection `fetchInventoryByZone` + `fetchInventoryByLocationSilent`

- **Vấn đề:** Cả hai function còn `select('*, product:products(*), zone:zones(*)')` — kéo mọi cột 3 bảng. Trong khi `fetchAllInventoryEntries` đã projection đúng rồi.
- **Files:** `stores/warehouseStore.ts`
- **Hướng fix:** Áp dụng cùng projection của `fetchAllInventoryEntries` cho 2 function này. Drop-in fix, không đổi logic.
- **KI:** KI-077

### B4 — Fix race condition 3 function ghi đồng thời vào inventoryEntries

- **Vấn đề:** `fetchAllInventoryEntries` (set toàn bộ), `fetchInventoryByZone` (merge theo zone_id), `fetchInventoryByLocationSilent` (merge theo zoneIdSet) có thể chạy đồng thời → ghi đè lẫn nhau → data thiếu hoặc stale.
- **Files:** `stores/warehouseStore.ts`
- **Hướng fix:** Giải quyết khi làm B1 (mỗi màn fetch scope riêng, không merge chung). Nếu vẫn giữ shared state thì cần sequence lock nhất quán hơn.
- **KI:** KI-078

### B5 — `fetchProductsPage` select * limit 1000

- **Vấn đề:** `supabase.from('products').select('*', { count: 'exact' }).limit(1000)` — kéo mọi cột products cho 1000 rows. ProductsScreen card chỉ cần một số cột nhất định.
- **Files:** `stores/warehouseStore.ts`, `screens/ProductsScreen.tsx`
- **Hướng fix:** Projection cụ thể chỉ select columns cần cho card UI.
- **KI:** KI-079

**Tier 2 — Cần rebuild APK**

### B6 — expo-image thay Image RN (disk cache)

- **Vấn đề:** Toàn bộ app dùng `Image` từ `react-native`, không cache policy. Mỗi lần component mount lại → re-download ảnh từ Supabase Storage. Ảnh hưởng: ProductsScreen, DiscountScreen, NotificationsScreen, InternalNotesScreen, LotPickerModal.
- **Files:** `screens/ProductsScreen.tsx`, `screens/DiscountScreen.tsx`, `screens/NotificationsScreen.tsx`, `screens/InternalNotesScreen.tsx`, `components/LotPickerModal.tsx`, `components/ImageViewerModal.tsx`
- **Hướng fix:** Install `expo-image`; thay `Image` từ `react-native` → `Image` từ `expo-image` với `cachePolicy="disk"`. Gần như drop-in replacement.
- **Ràng buộc:** Cần rebuild APK sau khi install package.
- **KI:** KI-080

**Tier 3 — Effort cao hơn, làm sau Tier 1+2**

### B7 — Zustand selector granular

- **Vấn đề:** ProductsScreen destructure 23 fields, MapScreen 17 fields, InternalNotesScreen + OrderDetailScreen 13 fields từ `useWarehouseStore()` không selector → bất kỳ field nào trong store thay đổi → toàn bộ component re-render. Không có `React.memo` trong toàn codebase.
- **Files:** `screens/ProductsScreen.tsx`, `screens/MapScreen.tsx`, `screens/InternalNotesScreen.tsx`, `screens/OrderDetailScreen.tsx`, và các màn còn lại
- **Hướng fix:** Chuyển sang selector cụ thể `useWarehouseStore(s => s.field)` hoặc `useShallow` cho nhóm fields liên quan. Thêm `React.memo` cho render item components.
- **KI:** KI-081

### B8 — Virtualize list lớn đang dùng ScrollView + .map

- **Vấn đề:** OrderListScreen, OrderDetailScreen, MapScreen search results, ZoneDetailSheet, LotPickerModal, FilterModal đều dùng `ScrollView + .map` — render toàn bộ DOM cùng lúc → JS thread block khi list lớn.
- **Files:** `screens/OrderListScreen.tsx`, `screens/OrderDetailScreen.tsx`, `screens/MapScreen.tsx`, `components/ZoneDetailSheet.tsx`, `components/LotPickerModal.tsx`, `components/FilterModal.tsx`
- **Hướng fix:** Chuyển sang `FlatList` hoặc `SectionList`. Ưu tiên ZoneDetailSheet và MapScreen search results.
- **KI:** KI-082

### B9 — getItemLayout + React.memo cho FlatList hiện có

- **Vấn đề:** Tất cả FlatList/SectionList hiện có (NotificationsScreen, DiscountScreen, InternalNotesScreen, ProductsScreen) đều thiếu `getItemLayout`. Không có `React.memo` nào trong toàn codebase.
- **Files:** `screens/NotificationsScreen.tsx`, `screens/DiscountScreen.tsx`, `screens/InternalNotesScreen.tsx`, `screens/ProductsScreen.tsx`
- **Hướng fix:** Thêm `getItemLayout` cho list có item chiều cao cố định. Wrap render item bằng `React.memo`.
- **KI:** KI-083

**Tier 4 — Làm sau khi Tier 1–3 ổn định**

### B10 — Consolidate fetch cascade trên ProductsScreen

- **Vấn đề:** ProductsScreen mount trigger 7+ network call cascading: fetchCategories, fetchPickingLists, fetchProducts, fetchProductsPage, locations (2 lần), fetchAllInventoryEntries, zones. Không có TTL → một số useEffect có thể trigger lại khi deps thay đổi.
- **Files:** `screens/ProductsScreen.tsx`
- **Hướng fix:** Gom các call locations/zones vào 1 call. Thêm `useFocusEffect` + TTL thay `useEffect` mount-once cho data cần refresh.
- **KI:** KI-084

### B11 — Bootstrap data sau login

- **Vấn đề:** App.tsx sau login chỉ fetch profile + schedule notifications. Không prefetch locations/products. Tab đầu tiên user bấm vào phải fetch từ đầu → spinner chờ.
- **Files:** `App.tsx`, `stores/warehouseStore.ts`
- **Hướng fix:** Sau login thành công, prefetch song song `fetchLocations` + `fetchProducts` (critical path MapScreen). Lazy fetch phần còn lại khi user vào các tab khác.
- **KI:** KI-085

### B12 — Settings subtitle focus TTL (phát sinh recon lag) — Done

- **Vấn đề:** 3 subtitle network (`refreshStockCheckSubtitle`, `refreshDiscountSubtitle`, `refreshNotifSubtitle`) chạy lại **mọi lần** focus Settings — không TTL; nhóm discontinued/notes/audit đã có TTL 30s. Gây lag khi tap tab Cài đặt.
- **Files:** `screens/SettingsScreen.tsx`
- **Hướng fix:** Cùng pattern TTL 30s (`lastSubtitleFetchedAt`; chỉ update timestamp sau fetch OK). Biometric không TTL.
- **KI:** KI-086
- **Trạng thái:** Done

### B13 — Shared TTL store + warm-cache (Partial — sub-task 3/6)

- **Vấn đề:** TTL toàn app là `useRef` cục bộ → prefetch/warm-cache không đánh dấu đã fetch → màn vẫn refetch lần đầu.
- **Files:** `stores/warehouseStore.ts`, screens (migrate dần), sau đó `App.tsx` warm trigger
- **Sub-tasks:**
  1. **Done** — `fetchTimestamps` + `shouldRefetch` / `markFetched`; migrate **OrderListScreen** (`orderList`, `pickingList`)
  2. **Done** — migrate **DiscountScreen** (`discountScreen`; filter clear bypass TTL giữ nguyên)
  3. **Done** — migrate **NotificationsScreen** (`notificationsScreen`; filter clear bypass TTL giữ nguyên)
  4. Migrate InternalNotesScreen
  5. Migrate SettingsScreen (+ ProductsScreen inventory TTL)
  6. Warm-cache trigger (prefetch + `markFetched` sau login / idle)
- **KI:** KI-087 (Partial)
- **Trạng thái:** In progress (3/6)

---

## Thứ tự làm việc Group B

1. **B3** (projection — fix nhanh, không rủi ro)
2. **B1 + B2 + B4** (server-side filter + fix double-fetch + race condition — liên quan nhau, làm cùng lúc)
3. **B5** (fetchProductsPage projection)
4. **B6** (expo-image — rebuild APK)
5. **B7 + B9** (Zustand selector + getItemLayout — xen kẽ)
6. **B8** (virtualize list)
7. **B10 + B11** (consolidate + bootstrap — sau khi các fix trên ổn định)

---

## 4. Group C (optional) — UX nhỏ / polish

- Bug hoặc polish phát sinh khi chạy `TESTCASES_6.md`
- Không mở scope lớn (không F21/F25/F26 trừ khi user yêu cầu)

---

## 5. Thứ tự làm việc

1. **Group B Tier 1** (B3 → B1+B2+B4 → B5) — fix fetch/data layer trước
2. **Group B Tier 2** (B6 expo-image) — rebuild APK
3. **A1.0 recon** OrderDetail / OrderList
4. **A1.1–A1.4** implement F27
5. **Group B Tier 3** (B7, B8, B9) — xen kẽ với A1
6. **Group B Tier 4** (B10, B11) — sau khi Tier 1–3 ổn định
7. Chạy testcases (sẽ bổ sung `TESTCASES_7` khi implement)
8. Xen **Group C** tùy thời gian

**Không** ưu tiên F21 Offline / F25 Báo cáo / F26 Kiểm kho / Expo major / KI-026 / KI-065 trong Phase 7 trừ khi chốt lại scope.

---

## 6. Definition of Done (Phase 7 tối thiểu)

- [ ] A1 F27: 2 tab + confirm + PDF gộp hoạt động trên thiết bị thật  
- [ ] REQUIREMENTS §6 F27 → Done (hoặc Partial rõ ràng nếu cắt scope có confirm)  
- [ ] Migration (nếu có) + `schema.sql` bump **6.x**  
- [ ] WORKLOG + SUMMARY_7 / HANDOFF_7 khi close  
- [ ] Group B Tier 1 (B1–B5): fetch optimization hoạt động, không còn double-fetch, không race condition
- [ ] Group B Tier 2 (B6): expo-image installed, ảnh có disk cache, APK rebuild thành công  

---

## 7. Tài liệu liên quan

- `HANDOFF_6.md`, `SUMMARY_6.md`, `TESTCASES_6.md` (trong `docs/phases/phase-6/`)
- `PLAN_6.md` — Group A gốc (chưa làm)
- `CONTEXT.md` — Orders stack hiện tại
