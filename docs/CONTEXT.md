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
- **Cham mau UI** da doi tu huong cu (`getExpiryStatus`) sang `getCombinedStatus()` cho cac man hinh co dot status.

## Cac man hinh da duoc cap nhat cham mau theo logic moi
- `ProductDetailScreen`: cham mau tung lot theo `getCombinedStatus()`; them UI cap nhat nguong thung.
- `ZoneDetailSheet`: cham mau tung lot va nhom san pham theo worst case.
- `ProductsScreen`: cham mau tong san pham theo worst case cua tat ca lot.
- `MapScreen`: cham mau zone khi search theo combined status.
- `NotificationsScreen`: thong bao + badge han/thung theo nguong per-product.

## UI fixes gan day
- `NotificationsScreen`:
  - Fix layout badge de khong overflow khoi card
  - Badge can phai, ten san pham co lai khong gian
  - Giu 1 cham mau lon ben trai ten san pham
  - Bo cham mau nho o dong `Han: ...`
- `ProductsScreen`:
  - Dot tieu de san pham to, de doc
  - Dot o dong lot (`Han: ... · X thung`) giu size nho 8px

## Trang thai F18
- **F18 da hoan thien**: canh bao sap het hang khong con hardcode `<= 1`.
- Hien tai canh bao dua tren nguong rieng tung san pham:
  - `low_warning_boxes`
  - `low_critical_boxes`

## Da hoan thanh
- F02, F03, F04, F05, F06, F07, F09, F10
- F11, F12, F13, F14, F15, F16, F17
- F18 (hoan thien theo nguong per-product + badge thong bao + UI da polish)

## Con thieu
- F01 searchable dropdown chon kho
- F08 anh san pham
- F19-F25 (theo roadmap PRD, chua implement)

## Next tasks de bat dau ngay
1. F01 location selector searchable dropdown dung PRD
2. Dong bo UX ket qua search/scan giua map va product detail
3. Chuan hoa test cases cho status do/cam/vang/xanh theo quantity + expiry
4. F19 canh bao han <14 ngay theo rule rieng

## F10 BarcodeScanner flow
- Mo scanner tu `MapScreen` hoac `ProductsScreen` qua nut scan ben canh o tim kiem.
- Co the mo scanner tu `ProductDetailScreen` o che do gan barcode cho san pham hien tai.
- Quet thanh cong:
  - Tim theo `barcode` (exact match) qua `searchByBarcode()`.
  - Neu tim thay -> mo `ProductDetail`.
  - Neu khong tim thay -> Alert:
    - `Them thu cong` -> mo `AddInventory`
    - `Quet lai` -> tiep tuc scanner.
- Neu tu choi quyen camera -> hien huong dan + nut `Mo cai dat`.
- Scanner co 3 mode:
  - `search`: quet de tim san pham
  - `assign`: quet de tra barcode ve `ProductDetailScreen` (nguoi dung bam `Luu` de luu DB)
  - `locate`: quet de tra `scannedProduct` ve `MapScreen` va trigger search/highlight zone
- `searchByBarcode()` hien tai la ham sync, filter local store (`products`) thay vi goi Supabase.

## Ghi chu data model lien quan barcode
- Field `products.barcode` da co san trong DB (text, optional) va dang duoc dung cho F10.
- Barcode co the nhap tay hoac quet truc tiep trong `ProductDetailScreen`.
- Tren `MapScreen`, scan barcode khong navigate vao chi tiet ma se tim va dinh vi zone nhu search bang ten.
- Sau khi store da load `products`, scan tren `MapScreen` co 0 network call cho buoc tra barcode.
