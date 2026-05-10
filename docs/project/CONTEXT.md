# Chino's Warehouse — CONTEXT

Tài liệu kỹ thuật cho Cursor (và dev) khi đọc/ghi code. Business đầy đủ: **`REQUIREMENTS.md`**. Quy trình làm việc: **`WORKFLOW.md`**.

---

## §1 Tech Stack

- **React Native** (Expo SDK), **TypeScript**
- **Zustand** — state client (`warehouseStore`, `themeStore`)
- **Supabase** — PostgreSQL + Realtime (backend)
- **React Navigation** — Bottom Tabs + Native Stack
- **expo-camera** — `CameraView`, quét barcode

---

## §2 Cấu trúc file & thư mục (hiện tại)

```
assets/
components/
  ZoneDetailSheet.tsx
docs/
  project/
    REQUIREMENTS.md
    CONTEXT.md
    USER_GUIDE.md
    WORKFLOW.md
  phases/
    phase-1/
      PLAN.md
      TESTCASES.md
      HANDOFF.md
      SUMMARY.md
  DECISIONS.md
  WORKLOG.md
  BLOCKERS.md
  KNOWN_ISSUES.md
lib/
  supabase.ts
screens/
  AddInventoryScreen.tsx
  BarcodeScannerScreen.tsx
  MapScreen.tsx
  NotificationsScreen.tsx
  ProductDetailScreen.tsx
  ProductsScreen.tsx
  SettingsScreen.tsx
stores/
  themeStore.ts
  warehouseStore.ts
supabase/migrations/
types/
  index.ts
App.tsx
.cursorrules
README.md
```

*Nếu thêm / xóa / đổi tên file → cập nhật lại mục này.*

---

## §3 Navigation structure

- **Root:** `NavigationContainer` → **Native Stack** (`headerShown: false`).
- **Stack screens (thứ tự):** `Tabs` → `AddInventory` → `ProductDetail` → `BarcodeScanner`.
- **Bottom tabs:** `Map` (nhãn **Kho**) → `Products` (**Sản phẩm**) → `Notifications` (**Thông báo**) → `Settings` (**Cài đặt**).
- **BarcodeScanner:** fullscreen, **không** có bottom tab bar.
- **ZoneDetailSheet:** component / sheet trên `MapScreen`, **không** phải route riêng.

**Danh sách / lọc (UI):**

- **NotificationsScreen:** mỗi card theo SP — pill tồn (**Sắp hết hàng** / **Hết hàng**) và pill hạn (**Sắp hết hạn** / **Hết hạn**) với màu `#EF4444` / `#FACC15`; dòng `Tổng X thùng | Y thùng có vấn đề` (Y = tổng thùng các lô có `getCombinedStatus` ≠ `ok`); tap → `ProductDetail`.
- **ProductsScreen:** mỗi card hiện **tổng thùng**; toggle **Có vấn đề** chỉ giữ SP có ít nhất một lô đỏ/vàng (`combined` ≠ `ok`).
- **ProductDetailScreen:** thanh **Tổng … thùng** + toggle **Có vấn đề** lọc danh sách lô; refetch khi focus (`useFocusEffect` + `loadData`).

---

## §4 Store — `warehouseStore.ts`

**State:** `locations`, `selectedLocationId`, `zones`, `products`, `inventoryEntries`, `isLoading`.

**Actions chính:** `setSelectedLocation`, `fetchLocations`, `fetchZones`, `fetchProducts`, `fetchInventoryByZone`, `searchProducts`, `searchByBarcode`, `addProduct`, `addInventoryEntry`, `updateInventoryEntry`, `deleteInventoryEntry`, `updateBarcode`, `updateProductStockThresholds`, `addZone`, `updateZone`, `deleteZone`.

---

## §5 Types & logic chính (`types/index.ts`)

- **Types:** `Location`, `ZoneCell`, `Zone`, `Product`, `InventoryEntry`, `ExpiryStatus`, `ExpiryColor`, `CombinedStatus`
- **Hàm:** `getExpiryStatus`, `getExpiryColor`, `getExpiryColorHex`, `getCombinedStatus`, `getCombinedStatusRank`, `formatExpiryDate`
- **Hằng màu:** `EXPIRY_COLORS` (map `CombinedStatus` → hex), `ZONE_COLORS` (preset màu zone trên bản đồ)

*Lưu ý triển khai:* `Product` trong code có thể có thêm trường DB (ví dụ `low_critical_boxes`) so với bảng tóm tắt trong `REQUIREMENTS.md` §8 — khi đổi schema hãy sync cả hai nơi.

---

## §6 Hệ thống màu chuẩn

Tham chiếu đầy đủ: **`docs/project/REQUIREMENTS.md` §5**.

Tóm tắt nhanh:

- **0–1 thùng** → Đỏ `#EF4444` (đã khớp UI sau KI-001)
- **≤ low_warning_boxes** → Vàng `#FACC15`
- **Hết hạn** → Đỏ `#EF4444`
- **≤ warning_days** (sắp hết hạn) → Vàng `#FACC15`
- **Bình thường** → Xanh `#22C55E`

**Logic ưu tiên:** Đỏ > Vàng > Xanh.

---

## §7 Coding conventions

- Comment code bằng **tiếng Việt**
- **Functional components** + hooks, không dùng class components
- Luôn dùng **`useThemeStore()`** để lấy colors — **không** hardcode màu (ngoại lệ đang tồn tại: tab bar trong `App.tsx` — xem **KI-003**)
- **Không** tự thêm npm package mới khi chưa được yêu cầu
- Khi bí hoặc thiếu thông tin → ghi vào **`docs/BLOCKERS.md`**, dừng lại hỏi người dùng

---

## §8 Quy tắc cập nhật tài liệu

Xem đầy đủ: **`docs/project/WORKFLOW.md`**.

Tóm tắt: sau mỗi thay đổi có ý nghĩa → cập nhật file tài liệu tương ứng theo vai trò DEV/TEST trong `WORKFLOW.md`.
