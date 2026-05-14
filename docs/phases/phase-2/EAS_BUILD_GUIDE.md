# Hướng dẫn Build & Phân phối APK — Chino's Warehouse

**Phiên bản:** 1.0 | Tháng 5/2026  
**Áp dụng cho:** Android (iOS yêu cầu Apple Developer account riêng — xem §6)

---

## §1 Tổng quan kiến trúc

```
Developer (Expo Go / máy tính)
        ↓ code + eas build
EAS Server (Expo cloud) → compile → APK file (lưu 30 ngày)
        ↓ link tải APK
Nhân viên (Android)
        ↓ cài APK
App → kết nối Supabase cloud (luôn online, không cần máy dev)
```

**Điểm quan trọng:**
- Supabase là cloud — data luôn online, máy tính dev tắt đi app vẫn chạy bình thường.
- APK cài trên máy nhân viên kết nối thẳng Supabase, không qua máy dev.
- Mọi thiết bị (APK + Expo Go) dùng chung database → đồng bộ realtime.

---

## §2 Điều kiện cần trước khi build

| Thứ | Trạng thái |
|-----|-----------|
| Tài khoản Expo (expo.dev) | ✓ Đã có |
| EAS CLI | Cài theo §3 |
| `expo-updates` trong package.json | Cài theo §3 |
| Supabase URL + Anon Key | Set trên EAS theo §3 |

---

## §3 Setup lần đầu (làm 1 lần duy nhất)

### Bước 1 — Cài dependencies

```bash
# Thêm expo-updates (cần cho OTA update sau này)
npx expo install expo-updates

# Cài EAS CLI global
npm install -g eas-cli
```

### Bước 2 — Đăng nhập và khởi tạo

```bash
# Đăng nhập tài khoản Expo
eas login

# Khởi tạo EAS project (bấm Y khi hỏi tạo project)
eas build:configure

# Cấu hình OTA update
eas update:configure
```

### Bước 3 — Thêm profile preview vào eas.json

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Bước 4 — Set biến môi trường trên EAS

```bash
# Supabase URL
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxx.supabase.co" --environment production

# Supabase Anon Key
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJxxx..." --environment production
```

**Lưu ý khi chọn visibility:**
- Chọn **Sensitive** (không phải Secret) cho cả 2 biến
- EAS không cho dùng Secret với prefix `EXPO_PUBLIC_` vì các biến này được bundle vào APK — đây là kiến trúc bình thường của Supabase client-direct (xem SEC-03 trong KNOWN_ISSUES.md)

### Bước 5 — Build APK lần đầu

```bash
eas build --profile preview --platform android
```

- EAS build trên cloud server của Expo (~10–30 phút, free tier có thể queue lâu)
- Theo dõi tiến trình tại: **expo.dev → project → Builds**
- Xong → trạng thái "Finished" → có link tải APK
- Gửi link cho nhân viên → tải về → bật "Cài từ nguồn không rõ" trên Android → cài

---

## §4 Quy trình update sau này

### Update code JS thông thường (95% trường hợp)

```bash
eas update --branch preview --message "mô tả thay đổi"
```

→ Nhân viên **không cần làm gì** — app tự nhận update khi mở lại.

### Khi nào cần build APK mới

| Tình huống | Ví dụ |
|-----------|-------|
| Thêm native module mới | F08 hình ảnh sản phẩm (expo-image-picker) |
| Đổi permission | Thêm quyền truy cập thư viện ảnh |
| Đổi icon / splash screen | Thiết kế lại branding |

```bash
# Build APK mới → gửi link cho nhân viên cài đè lên bản cũ
eas build --profile preview --platform android
```

**Dự kiến với app này:** cần build lại nhiều nhất **2–3 lần** trong Phase 2 (chủ yếu khi làm F08).

---

## §5 Thông tin về storage và quota

### Quota EAS Free tier

| Hạng mục | Giới hạn |
|---------|---------|
| Builds/tháng | 30 lượt |
| Lưu trữ APK | 30 ngày/build |

Với app nội bộ như Chino's Warehouse, 30 lượt/tháng là quá dư — thực tế cả tháng chỉ build 1–2 lần.

### APK lưu ở đâu

- Trên server của Expo (AWS cloud) — không trên máy dev
- Xem lại tại: **expo.dev → project → Builds**
- Sau 30 ngày: Expo tự xóa APK khỏi server, link hỏng
- APK đã cài trên máy nhân viên **không bị ảnh hưởng** — vẫn chạy bình thường

### Quota hoạt động thế nào

- Quota 30 lượt/tháng tính theo số lần **chạy build**, không phải số bản đang lưu
- Xóa build cũ đi **không** được hoàn quota
- Xóa build chỉ để thu hồi link tải (nhân viên không tải thêm được bản đó)

### Bảo mật link APK

- Link là URL ngẫu nhiên dài — không đoán được, không bị index công khai
- Chỉ ai có link mới tải được
- Muốn thu hồi: vào expo.dev xóa build → link hỏng ngay
- Sau khi nhân viên cài xong, có thể xóa build cho chắc

---

## §6 iOS — Tình trạng hiện tại

iOS **chưa hỗ trợ** vì bắt buộc cần **Apple Developer account ($99/năm)**.

Khi có account, có 2 cách distribute:

| Cách | Mô tả |
|------|-------|
| TestFlight | App tự update, dễ dùng, cần app review cho external tester |
| Ad-hoc | Đăng ký UDID từng iPhone, không cần review |

**Khuyến nghị:** thử thực tế với Android trước, ổn thì mới đầu tư $99 cho iOS.

---

## §7 Expo Go vs APK — Dùng song song được không

**Hoàn toàn được.** Cả 2 đều kết nối cùng Supabase database → data đồng bộ realtime.

| | Expo Go | APK |
|---|---------|-----|
| Dùng cho | Developer (bạn) | Nhân viên |
| Cần máy dev chạy | Có (`npx expo start`) | Không |
| Cài như app thường | Không | Có |
| Nhận OTA update | Không (dùng code trực tiếp) | Có |

**Lưu ý:** Khi đang dev trên Expo Go, tránh xóa/sửa data thật vì nhân viên đang dùng cùng database.

---

## §8 Checklist go-live (nhóm D + E từ GOLIVE_CHECKLIST.md)

### Nhóm D — Build & cài máy

- [ ] D1: Cài EAS CLI (`npm install -g eas-cli`)
- [ ] D2: `eas login`
- [ ] D3: `eas build:configure` + thêm profile preview vào eas.json
- [ ] D4: Set EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY trên EAS (Sensitive)
- [ ] D5: `npx expo install expo-updates` + `eas update:configure`
- [ ] D6: `eas build --profile preview --platform android`
- [ ] D7: Gửi link APK → nhân viên tải về cài

### Nhóm E — Kiểm tra trước khi dùng thực tế

- [ ] E1: Test RLS — GET không có auth header → phải trả 401
- [ ] E2: Test login sai password → app chặn đúng, không vào được
- [ ] E3: Test session — kill app → mở lại → phải login lại
- [ ] E4: Test auto-logout — để app 20 phút không chạm → phải hiện thông báo hết phiên
- [ ] E5: Test 2 máy realtime — sửa data trên máy A → máy B cập nhật trong vài giây
- [ ] E6: Test đăng xuất — bấm đăng xuất → về LoginScreen, không vào lại được

---

## §9 Lệnh thường dùng

```bash
# Build APK mới
eas build --profile preview --platform android

# Push OTA update (không cần build lại)
eas update --branch preview --message "fix: mô tả"

# Xem danh sách builds
eas build:list

# Xem biến môi trường đã set
eas env:list
```
