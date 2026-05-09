# Features Matrix (F01-F25)

## Trang thai tinh nang

- F01 - Dropdown chon kho (searchable): 🚧 WIP
- F02 - Ban do 2D kho hang: ✅ Done
- F03 - Cham mau tren zone khi search/scan: ✅ Done
- F04 - Quan ly zone linh hoat: ✅ Done
- F05 - Zone nhieu tang ke: ✅ Done
- F06 - Danh sach san pham trong zone: ✅ Done
- F07 - Man hinh chi tiet san pham: ✅ Done
- F08 - Hinh anh san pham: 📋 Backlog
- F09 - Tim kiem san pham theo ten: ✅ Done
- F10 - Quet ma vach: 🚧 WIP
- F11 - Quan ly ton kho theo thung: ✅ Done
- F12 - Theo doi han su dung bang mau: ✅ Done
- F13 - Ghi chu san pham va lo hang: ✅ Done
- F14 - Them san pham moi: ✅ Done
- F15 - Them lo hang vao kho: ✅ Done
- F16 - Sua / Xoa lo hang: ✅ Done
- F17 - Dong bo thoi gian thuc: ✅ Done
- F18 - Canh bao sap het hang: ✅ Done
- F19 - Canh bao han <14 ngay: 📋 Backlog
- F20 - Chuyen hang giua khu vuc/kho: 📋 Backlog
- F21 - Ban do nhieu khu vuc: 📋 Backlog
- F22 - Offline mode: 📋 Backlog
- F23 - Lich su cap nhat: 📋 Backlog
- F24 - Trang tong quan: 📋 Backlog
- F25 - Tai khoan & phan quyen: 📋 Backlog

## Mo ta ngan theo nhom
- **Map + Zone**: F02-F06 da hoan thien cho luong core trong kho.
- **Product + Inventory**: F07, F09, F11-F16 da hoan thien.
- **Alerting**: F18 da nang cap theo nguong thung per-product (`low_warning_boxes`, `low_critical_boxes`).
- **Scanner + Multi-location UX**: F01, F10 con dang WIP.
- **Phase 2/3**: F08, F19-F25 de backlog.

## Business rules bat buoc
- So luong tinh theo thung nguyen.
- Chi cap nhat ton khi bo thung di hoan toan.
- Khong duoc xoa zone neu con inventory co `quantity_boxes > 0`.
- Mau han:
  - `expired`: het han/han hom nay
  - `warning`: con 1-30 ngay
  - `ok`: tren 30 ngay
- Mau tong hop (`getCombinedStatus`):
  - `expired`: het hang hoac het han
  - `critical`: con rat it
  - `warning`: sap het hang hoac sap het han
  - `ok`: binh thuong
- Mot san pham co the o nhieu zone/tang cung luc.

## Data model tom tat
- **locations**
  - `id`, `name`, `description`, `created_at`
- **zones**
  - `id`, `location_id`, `name`, `cells`, `tier_count`, `color`, `has_tiers`, `updated_at`
- **products**
  - `id`, `name`, `barcode`, `warning_days`
  - `low_warning_boxes` (moi, default 3)
  - `low_critical_boxes` (moi, default 1)
  - `notes`, `is_archived`, `created_at`
- **inventory_entries**
  - `id`, `product_id`, `zone_id`, `tier`
  - `quantity_boxes`, `expiry_date`, `notes`, `updated_at`

## Quy uoc ky thuat va UI
- Khong dung external UI library.
- Dung `StyleSheet` thuan.
- Luon lay mau tu `useThemeStore()`, khong hardcode cho luong moi.
- Grid map: `CELL_SIZE = 56`, map `6x6`, 1-indexed.
- Modal:
  - Form: `animationType="slide"`
  - Action sheet: `animationType="fade"`
- Status mau trong theme:
  - `statusExpired` (do)
  - `statusCritical` (cam, critical)
  - `statusWarning` (vang)
  - `statusOk` (xanh)
- Mau tong hop khi render dot:
  - Do = het hang/het han
  - Cam = con rat it (critical)
  - Vang = sap het hang/sap het han
  - Xanh = binh thuong
