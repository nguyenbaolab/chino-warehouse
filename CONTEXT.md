# Chino's Warehouse - Context

## Muc tieu
Ung dung noi bo giup nhan vien tim nhanh san pham trong kho theo ten/zone/tang, theo doi han su dung va muc ton theo thung, dong bo realtime tren nhieu thiet bi.

## Cap nhat moi nhat (05/2026)
- Them 2 field tren `products`:
  - `low_warning_boxes` (default 3)
  - `low_critical_boxes` (default 1)
- Them ham `getCombinedStatus()` trong `types/index.ts` de xep rank mau theo ca han su dung + so thung:
  - Do: het hang hoac het han
  - Cam: con rat it
  - Vang: sap het hang hoac sap het han
  - Xanh: binh thuong
- Da cap nhat logic cham mau tai:
  - `MapScreen`
  - `ProductsScreen`
  - `ProductDetailScreen`
  - `ZoneDetailSheet`
  - `NotificationsScreen`
- `ProductDetailScreen` da co them UI luu 2 nguong canh bao thung moi.
- F18 (canh bao sap het hang) duoc nang cap theo nguong rieng tung san pham, khong hardcode.

## Trang thai tinh nang
### Da hoan thanh
- F02, F03, F04, F05, F06, F07, F09
- F11, F12, F13, F14, F15, F16, F17
- F18 (hoan thien theo nguong per-product + badge thong bao)

### Chua hoan thanh
- F01: location selector dang chip list, chua phai searchable dropdown day du
- F10: scanner UI flow chua xong
- F08, F19, F20, F21, F22, F23, F24, F25

## Business rules bat buoc
- Don vi ton kho la thung nguyen.
- Thung dang dung do van tinh la 1.
- Chi cap nhat ton khi bo thung di hoan toan.
- Khong xoa zone neu van con lot co `quantity_boxes > 0`.
- Mot san pham co the nam o nhieu zone/tang cung luc.

## File can uu tien doc
- `types/index.ts`
- `stores/warehouseStore.ts`
- `stores/themeStore.ts`
- `screens/MapScreen.tsx`
- `screens/ProductsScreen.tsx`
- `screens/ProductDetailScreen.tsx`
- `screens/NotificationsScreen.tsx`
- `components/ZoneDetailSheet.tsx`

## Tai lieu chi tiet
- Xem `docs/CONTEXT.md`
- Xem `docs/FEATURES.md`
- Xem `docs/README.md`
- Xem `docs/USER_GUIDE.md`