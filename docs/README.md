# Chino's Warehouse - Developer README

## Gioi thieu
Day la ung dung React Native (Expo) cho Chino's Boba Tea & Asian Market, dung de quan ly ton kho noi bo theo zone/tang, theo doi han su dung va canh bao ton kho theo nguong tung san pham.

## Trang thai hien tai (tom tat)
- Core inventory flow da hoat dong (map, products, product detail, add/edit/delete/move lot).
- He thong canh bao F18 da done voi 2 nguong per-product:
  - `low_warning_boxes` (default 3)
  - `low_critical_boxes` (default 1)
- Dot status dang dung logic `getCombinedStatus()` (do/cam/vang/xanh).
- Barcode scanner UI flow (F10) chua hoan thien.

## Tech stack
- React Native + Expo
- TypeScript
- Zustand
- Supabase (PostgreSQL + Realtime)

## Yeu cau moi truong
- Node.js 18+ (khuyen nghi LTS)
- npm 9+
- Expo CLI (`npx expo ...` la du)
- Expo Go tren iOS/Android hoac emulator

## Cai dat
1. Clone repository
2. Cai dependencies:
   - `npm install`
3. Tao file env theo huong dan ben duoi

## Cau hinh Supabase
App can cac bien moi truong sau:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Co the dat trong `.env` (neu project da cau hinh doc env) hoac trong app config tuy setup hien tai.

## Chay app
- `npx expo start`

Sau do quet QR bang Expo Go hoac chay emulator.

## Migration database moi nhat
Run SQL migration:
- `supabase/migrations/20260509_add_product_low_stock_thresholds.sql`

Migration nay them 2 field vao `products`:
- `low_warning_boxes`
- `low_critical_boxes`

## Cau truc thu muc chinh
- `screens/` - man hinh app
- `components/` - UI components dung chung
- `stores/` - Zustand stores
- `types/` - model + helper functions
- `lib/` - supabase client
- `docs/` - tai lieu du an
- `supabase/migrations/` - script migration SQL

## Docs lien quan
- `docs/CONTEXT.md`
- `docs/FEATURES.md`
- `docs/USER_GUIDE.md`
- `CONTEXT.md`
