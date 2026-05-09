# Chino's Warehouse - Project Context

## Muc tieu app
Chino's Warehouse la app noi bo cho chu cua hang va nhan vien de tra cuu ton kho nhanh tren mobile, khong can xuong kho kiem tra thu cong.

## Cap nhat quan trong vua hoan tat
- **Database products** da them:
  - `low_warning_boxes` integer not null default 3
  - `low_critical_boxes` integer not null default 1
- **Type `Product`** da bo sung 2 field tuong ung trong `types/index.ts`.
- **Ham moi `getCombinedStatus()`** da them vao `types/index.ts` voi thu tu uu tien:
  1. Do: `quantity_boxes = 0`
  2. Do: het han
  3. Cam: `quantity_boxes <= low_critical_boxes`
  4. Vang: `quantity_boxes <= low_warning_boxes` hoac sap het han
  5. Xanh: con lai
- **Mau cam** da them vao bo mau status va da duoc dung qua `useThemeStore()` (khong hardcode cho luong moi).

## Cac man hinh da duoc cap nhat cham mau theo logic moi
- `ProductDetailScreen`: cham mau tung lot theo `getCombinedStatus()`; them UI cap nhat nguong thung.
- `ZoneDetailSheet`: cham mau tung lot va nhom san pham theo worst case.
- `ProductsScreen`: cham mau tong san pham theo worst case cua tat ca lot.
- `MapScreen`: cham mau zone khi search theo combined status.
- `NotificationsScreen`: thong bao + badge han/thung theo nguong per-product.

## Trang thai F18
- **F18 da hoan thien**: canh bao sap het hang khong con hardcode `<= 1`.
- Hien tai canh bao dua tren nguong rieng tung san pham:
  - `low_warning_boxes`
  - `low_critical_boxes`

## Da hoan thanh
- F02, F03, F04, F05, F06, F07, F09
- F11, F12, F13, F14, F15, F16, F17
- F18 (hoan thien theo nguong per-product + badge thong bao)

## Con thieu
- F01 searchable dropdown chon kho
- F10 scanner UI flow
- F08 anh san pham
- F19-F25 (theo roadmap PRD)

## Next tasks de bat dau ngay
1. F10 BarcodeScanner end-to-end (camera, ket qua, fallback them thu cong)
2. F01 location selector searchable dropdown dung PRD
3. Dong bo UX ket qua search/scan giua map va product detail
4. Chuan hoa test cases cho status do/cam/vang/xanh theo quantity + expiry
