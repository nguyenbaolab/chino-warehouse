# Hướng dẫn Build APK — Chino Warehouse

> Tài liệu này ghi lại toàn bộ quá trình setup môi trường và build APK cho app Chino Warehouse trên Windows, bao gồm tất cả vấn đề gặp phải và cách fix.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Lựa chọn phương pháp build](#2-lựa-chọn-phương-pháp-build)
3. [Phương pháp A — EAS Cloud (Online)](#3-phương-pháp-a--eas-cloud-online)
4. [Phương pháp B — EAS Local (WSL2)](#4-phương-pháp-b--eas-local-wsl2)
5. [Gửi APK cho điện thoại](#5-gửi-apk-cho-điện-thoại)
6. [Xóa cache — khi nào và cách làm](#6-xóa-cache--khi-nào-và-cách-làm)
7. [Vấn đề thường gặp và cách fix](#7-vấn-đề-thường-gặp-và-cách-fix)
8. [Quy trình build lần sau](#8-quy-trình-build-lần-sau)
9. [Câu hỏi thường gặp](#9-câu-hỏi-thường-gặp)
10. [Phụ lục](#10-phụ-lục)

---

## 1. Tổng quan

App Chino Warehouse dùng **Expo (React Native)** — để build ra file `.apk` cài trực tiếp lên điện thoại Android mà không cần Play Store, cần dùng **EAS Build**.

Có 2 cách build:
- **EAS Cloud**: build trên server Expo, không cần setup nhiều, dùng được ngay trên Windows
- **EAS Local**: build ngay trên máy qua WSL2, nhanh hơn từ lần 2 trở đi

---

## 2. Lựa chọn phương pháp build

| | EAS Cloud ☁️ | EAS Local 💻 (WSL2) |
|---|---|---|
| Thời gian mỗi lần | 10–30 phút | 3–7 phút (từ lần 2) |
| Setup ban đầu | ~5 phút | ~1–2 tiếng |
| Cần internet | Bắt buộc | Không (sau khi setup) |
| Chạy trên Windows | ✅ trực tiếp | ✅ qua WSL2 |
| Tốn tài nguyên máy | Không | CPU/RAM cao ~5 phút |
| Giới hạn build | 30 build/tháng (free) | Không giới hạn |
| **Khuyến nghị** | Build ít, tiện lợi | Build thường xuyên |

> 💡 **Gợi ý:** Nếu mới bắt đầu, dùng **EAS Cloud** trước cho nhanh. Sau khi quen rồi mới chuyển sang Local.

---

## 3. Phương pháp A — EAS Cloud (Online)

Cách đơn giản nhất — build chạy trên server của Expo, máy bạn chỉ cần chạy lệnh.

### 3.1 Yêu cầu

- Có tài khoản Expo (https://expo.dev)
- Đã cài Node.js trên Windows
- Có internet

### 3.2 Cài EAS CLI trên Windows (nếu chưa có)

```cmd
npm install -g eas-cli
```

### 3.3 Login

```cmd
eas login
```

### 3.4 Set biến môi trường trên EAS — chỉ làm 1 lần duy nhất

Đây là bước quan trọng — nếu bỏ qua, APK sẽ hiện màn "Chưa cấu hình kết nối" khi mở:

```cmd
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxx.supabase.co" --environment preview
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..." --environment preview
```

Lấy giá trị thật từ file `.env` trong thư mục project.

> ✅ Bước này chỉ cần làm **1 lần duy nhất**. Các lần build sau không cần làm lại vì EAS lưu trên server.

### 3.5 Build APK

```cmd
cd "E:\projects\chino-warehouse"
eas build --profile preview --platform android
```

Terminal sẽ hỏi một vài câu → Enter hết. Sau đó:
- Hiện link theo dõi: `https://expo.dev/accounts/.../builds/...`
- Chờ **10–30 phút**
- Vào link đó → bấm **Download** để tải file `.apk` về

### 3.6 Những lần build sau (EAS Cloud)

```cmd
cd "E:\projects\chino-warehouse"
eas build --profile preview --platform android
```

Chỉ cần 1 lệnh này — env vars đã lưu trên EAS, không cần set lại.

### 3.7 Ưu và nhược điểm EAS Cloud

**Ưu:**
- Không cần setup WSL2, Java, Android SDK
- Chạy được ngay trên Windows CMD
- Không tốn tài nguyên máy khi build

**Nhược:**
- Mỗi lần đều mất 10–30 phút (không có cache cục bộ)
- Cần internet suốt quá trình build
- Tài khoản free giới hạn **30 build/tháng**

---

## 4. Phương pháp B — EAS Local (WSL2)

Build chạy ngay trên máy bạn thông qua WSL2 (Linux trong Windows).

### 4.1 Setup môi trường Windows

#### Cài Java JDK 17

> **Lưu ý:** Nếu đã có Java 21, thử build luôn — Java 21 tương thích với Expo SDK 50+. Chỉ cài Java 17 nếu bị lỗi `Unsupported class file major version`.

1. Vào https://adoptium.net
2. Chọn **Temurin 17 (LTS)** → download file `.msi`
3. Cài bình thường, **tick "Set JAVA_HOME"** khi được hỏi
4. Kiểm tra:
```cmd
java -version
# Phải hiện: openjdk version "17.x.x"
```

#### Cài Android Studio

1. Vào https://developer.android.com/studio → download và cài
2. Mở Android Studio → **More Actions → SDK Manager**
3. Tab **SDK Platforms**: tick **Android 14 (API 34)** hoặc version đang có
4. Tab **SDK Tools**: tick **Android SDK Command-line Tools (latest)** → Apply

#### Set biến môi trường ANDROID_HOME

Mở **System Properties → Environment Variables → System variables → New**:
```
Variable name:  ANDROID_HOME
Variable value: C:\Users\ADMIN\AppData\Local\Android\Sdk
```

Thêm vào **PATH** (System variables → Path → Edit → New), thêm 2 dòng:
```
C:\Users\ADMIN\AppData\Local\Android\Sdk\platform-tools
C:\Users\ADMIN\AppData\Local\Android\Sdk\cmdline-tools\latest\bin
```

Kiểm tra (mở terminal **mới**):
```cmd
echo %ANDROID_HOME%
adb --version
```

---

### 4.2 Cài WSL2 + Ubuntu

#### Kiểm tra WSL2 đã có chưa

```cmd
wsl --version
```

Nếu hiện version → đã có, bỏ qua bước cài. Nếu chưa:

```powershell
# Chạy PowerShell với quyền Admin
wsl --install
# Restart máy sau khi xong
```

#### Cài Ubuntu

```powershell
wsl --install -d Ubuntu
```

Sau khi cài xong:
- Tạo username (❌ **không dùng `admin`** — tên này conflict với hệ thống)
- Nhập password (gõ không hiện ký tự là bình thường)

#### Tăng RAM cho WSL2 — bắt buộc để tránh OutOfMemoryError!

Tạo file `C:\Users\ADMIN\.wslconfig`:
- Mở **Notepad**
- Nhập nội dung bên dưới
- Lưu với tên `.wslconfig`, **Save as type = All Files**

> ⚠️ Nếu không chọn **All Files**, Windows tự thêm `.txt` thành `.wslconfig.txt` — sai định dạng, WSL sẽ không đọc!

```
[wsl2]
memory=16GB
processors=8
```

Restart WSL để áp dụng:
```cmd
wsl --shutdown
wsl -d Ubuntu
```

---

### 4.3 Cài công cụ trong Ubuntu

Mở Ubuntu: Start Menu → Ubuntu, hoặc gõ `wsl -d Ubuntu` trong CMD.

Dấu nhắc sẽ trông như: `nguyen_bao@DESKTOP-xxx:~$`

#### Cập nhật Ubuntu
```bash
sudo apt update && sudo apt upgrade -y
```

#### Cài Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Phải hiện v20.x.x
npm --version
```

#### Cài Java 17
```bash
sudo apt install -y openjdk-17-jdk
java -version  # Phải hiện openjdk version "17.x.x"
```

#### Cài Android SDK
```bash
sudo apt install -y wget unzip
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdtools.zip
mkdir -p ~/android/cmdline-tools
unzip cmdtools.zip -d ~/android/cmdline-tools
mv ~/android/cmdline-tools/cmdline-tools ~/android/cmdline-tools/latest
```

Set biến môi trường:
```bash
echo 'export ANDROID_HOME=$HOME/android' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.bashrc
source ~/.bashrc
```

Cài SDK components:
```bash
sdkmanager --install "platform-tools" "platforms;android-34" "build-tools;34.0.0"
# Gõ 'y' khi hỏi license (có thể hỏi vài lần)
```

#### Cài EAS CLI
```bash
sudo npm install -g eas-cli
eas --version
```

#### Cài Gradle config — fix OutOfMemoryError (bắt buộc!)

```bash
mkdir -p ~/.gradle
cat > ~/.gradle/gradle.properties << 'EOF'
org.gradle.jvmargs=-Xmx12g -XX:MaxMetaspaceSize=2g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError
org.gradle.daemon=false
android.enableLintDuringBuild=false
EOF
```

> ⚠️ File này phải nằm trong `~/.gradle/gradle.properties` (home của Ubuntu), **không phải** trong thư mục project. EAS local build copy project sang `/tmp/` nên file trong project không có tác dụng.
>
> ⚠️ Nếu xóa `~/.gradle` để fix lỗi, phải tạo lại file này trước khi build!

---

### 4.4 Build APK local

#### Login EAS — chỉ làm 1 lần
```bash
eas login
# Nhập email + password tài khoản Expo
```

#### Set env variables — bắt buộc mỗi lần build!

> ⚠️ EAS local build copy project sang `/tmp/` để build — **không tự đọc file `.env`**. Phải export thủ công trước mỗi lần build. Nếu quên, app sẽ crash khi mở hoặc hiện màn "Chưa cấu hình kết nối".

```bash
export EXPO_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

Lấy giá trị thật từ file `.env` trong thư mục project.

#### Chạy build
```bash
cd "/mnt/e/projects/chino-warehouse"
eas build --profile preview --platform android --local
```

Lần đầu mất **10–15 phút** (Gradle download dependencies).
Từ lần 2 trở đi mất **3–7 phút** (Gradle cache lại).

#### Lưu APK theo version

Sau khi build xong, terminal báo đường dẫn file `.apk`:

```bash
mkdir -p "/mnt/e/projects/chino-warehouse/apk"
cp /mnt/e/personal\ projects/chino-warehouse/build-*.apk \
   "/mnt/e/projects/chino-warehouse/apk/chino-warehouse-v1.0.apk"
```

---

## 5. Gửi APK cho điện thoại

### Cách đơn giản nhất — Zalo / Telegram / Google Drive

1. Mở File Explorer → vào `E:\projects\chino-warehouse\apk\`
2. Gửi file `.apk` qua Zalo / Telegram / Google Drive
3. Người nhận mở file trên điện thoại Android
4. Điện thoại hỏi **"Cho phép cài từ nguồn không rõ"** → bấm **Allow / Cho phép**
5. Cài xong mở app lên

### Cài qua USB — dùng adb

**Bật USB Debugging trên điện thoại:**
1. Vào **Cài đặt → Giới thiệu về điện thoại**
2. Bấm **Số phiên bản** 7 lần → hiện "Bạn là nhà phát triển"
3. Vào **Cài đặt → Tùy chọn nhà phát triển** → Bật **USB Debugging**
4. Cắm USB → điện thoại hỏi "Cho phép USB Debugging?" → bấm OK

**Kiểm tra điện thoại đã nhận:**
```cmd
adb devices
# Phải thấy serial number của điện thoại
```

**Cài APK:**
```cmd
adb install "E:\projects\chino-warehouse\apk\chino-warehouse-v1.0.apk"
```

---

## 6. Xóa cache — khi nào và cách làm

Cache Gradle giúp build nhanh hơn ở lần 2 trở đi, nhưng đôi khi bị lỗi hoặc corrupt và cần xóa. Đây là vấn đề gặp rất thường xuyên khi build local.

### 6.1 Khi nào cần xóa cache?

| Tình huống | Loại cache cần xóa |
|---|---|
| Lỗi `OutOfMemoryError: Metaspace` liên tục | `~/.gradle/caches` |
| Lỗi `Could not read workspace metadata` hoặc `metadata.bin` | `~/.gradle` toàn bộ |
| Lỗi `Timeout waiting to lock journal cache` | Chỉ lock file |
| Build thành công nhưng app bị lỗi lạ không rõ nguyên nhân | `~/.gradle/caches` |
| Sau khi nâng cấp Expo SDK hoặc thay đổi native dependencies lớn | `~/.gradle/caches` |
| Build bị interrupt giữa chừng (tắt máy, mất điện, Ctrl+C) | `~/.gradle/caches` |

### 6.2 Xóa cache nhẹ — chỉ xóa caches, giữ config

```bash
rm -rf ~/.gradle/caches
```

**Dùng khi:** Build lỗi liên tục, cache cũ bị corrupt một phần.  
**Hậu quả:** Lần build sau chậm hơn ~2–5 phút vì Gradle re-download. Không mất code.

### 6.3 Xóa cache toàn bộ — xóa cả config

```bash
rm -rf ~/.gradle
```

Sau đó **bắt buộc** phải tạo lại Gradle config:
```bash
mkdir -p ~/.gradle
cat > ~/.gradle/gradle.properties << 'EOF'
org.gradle.jvmargs=-Xmx12g -XX:MaxMetaspaceSize=2g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError
org.gradle.daemon=false
android.enableLintDuringBuild=false
EOF
```

**Dùng khi:** Cache bị corrupt nặng, lỗi `metadata.bin`, hoặc mọi cách khác đều không fix được.  
**Hậu quả:** Lần build sau chậm hơn ~5–10 phút. Không mất code.

### 6.4 Xóa chỉ lock file — khi bị treo

```bash
pkill -f gradle
rm -f ~/.gradle/caches/journal-1/journal-1.lock
```

**Dùng khi:** Lỗi `Timeout waiting to lock journal cache` — Gradle daemon cũ bị treo giữ lock file.

### 6.5 Lưu ý quan trọng

- ✅ **Xóa cache không mất code** — chỉ mất Gradle build cache trong `~/.gradle`
- ✅ **Xóa cache không ảnh hưởng project** — thư mục project `E:\projects\chino-warehouse` không bị đụng tới
- ⚠️ **Sau khi xóa `~/.gradle` toàn bộ**, bắt buộc phải tạo lại `~/.gradle/gradle.properties` — nếu không sẽ bị `OutOfMemoryError` lại ngay lần build kế tiếp
- ⚠️ **Không xóa cache thường xuyên** — chỉ xóa khi gặp lỗi cụ thể, vì xóa sẽ làm lần build sau chậm hơn

---

## 7. Vấn đề thường gặp và cách fix

### ❌ `Unsupported platform, macOS or Linux is required`
**Nguyên nhân:** Chạy `eas build --local` trực tiếp trên Windows CMD/PowerShell.  
**Fix:** Phải chạy trong Ubuntu (WSL2). Mở Ubuntu rồi chạy lại.

---

### ❌ `git init exited with non-zero code: 128`
**Nguyên nhân:** Project nằm trên OneDrive — WSL không có quyền `chmod` trên thư mục OneDrive.  
**Fix:** Chuyển project ra khỏi OneDrive:
1. OneDrive Settings → Sync and backup → Manage backup
2. Tắt Desktop backup → chọn **"Only on my PC"**
3. Chuyển project sang ổ khác (ví dụ `E:\projects\`)

---

### ❌ `OutOfMemoryError: Metaspace`
**Nguyên nhân:** WSL2 không đủ RAM/Metaspace cho Gradle build.  
**Fix theo thứ tự:**

**Bước 1 — Kiểm tra `.wslconfig`** (file `C:\Users\ADMIN\.wslconfig`):
```
[wsl2]
memory=16GB
processors=8
```
Restart WSL: `wsl --shutdown` → `wsl -d Ubuntu`

**Bước 2 — Kiểm tra Gradle config:**
```bash
cat ~/.gradle/gradle.properties
```
Phải có đầy đủ:
```
org.gradle.jvmargs=-Xmx12g -XX:MaxMetaspaceSize=2g -XX:+UseG1GC
org.gradle.daemon=false
android.enableLintDuringBuild=false
```
Nếu không có hoặc file không tồn tại → tạo lại (xem mục 4.3).

**Bước 3 — Xóa cache và build lại:**
```bash
rm -rf ~/.gradle/caches
export GRADLE_OPTS="-Xmx12g -XX:MaxMetaspaceSize=2g -XX:+UseG1GC"
eas build --profile preview --platform android --local
```

---

### ❌ `Timeout waiting to lock journal cache`
**Nguyên nhân:** Gradle daemon cũ bị treo, lock file chưa được giải phóng.  
**Fix:**
```bash
pkill -f gradle
rm -f ~/.gradle/caches/journal-1/journal-1.lock
```
Rồi build lại.

---

### ❌ `Could not read workspace metadata from .../metadata.bin`
**Nguyên nhân:** Gradle cache bị corrupt hoàn toàn.  
**Fix — xóa toàn bộ và tạo lại:**
```bash
rm -rf ~/.gradle
mkdir -p ~/.gradle
cat > ~/.gradle/gradle.properties << 'EOF'
org.gradle.jvmargs=-Xmx12g -XX:MaxMetaspaceSize=2g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError
org.gradle.daemon=false
android.enableLintDuringBuild=false
EOF
```
Rồi build lại.

---

### ❌ App crash khi mở — màn hình đen rồi thoát / "has stopped working"
**Nguyên nhân:** EAS local build không tự đọc file `.env` — `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_ANON_KEY` bị `undefined` → Supabase client crash ngay khi khởi động.  
**Fix:** Export env **trước** khi build:
```bash
export EXPO_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
eas build --profile preview --platform android --local
```

---

### ❌ App hiện "Chưa cấu hình kết nối" / "Thiếu EXPO_PUBLIC_SUPABASE_URL"
**Nguyên nhân (EAS Local):** Quên export env trước khi build — xem lỗi trên.  
**Nguyên nhân (EAS Cloud):** Chưa chạy `eas env:create` để set env trên server.  
**Fix EAS Cloud:**
```cmd
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxx.supabase.co" --environment preview
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..." --environment preview
```
Rồi build lại.

---

### ❌ `npm install -g eas-cli` lỗi EACCES permission denied
**Fix:**
```bash
sudo npm install -g eas-cli
```

---

### ❌ `Run this command inside a project directory`
**Nguyên nhân:** Chưa `cd` vào thư mục project.  
**Fix:**
```bash
cd "/mnt/e/projects/chino-warehouse"
```

---

### ❌ `wsl: Failed to start the systemd user session`
**Nguyên nhân:** Cảnh báo không ảnh hưởng đến build.  
**Fix:** Bỏ qua, tiếp tục bình thường.

---

### ❌ Username `admin` bị từ chối khi tạo Ubuntu user
**Nguyên nhân:** `admin` là tên group hệ thống trong Ubuntu.  
**Fix:** Dùng tên khác, ví dụ `nguyen_bao`, `chino`, `user1`.

---

### ❌ File `.wslconfig` bị thêm đuôi `.txt` thành `.wslconfig.txt`
**Nguyên nhân:** Notepad mặc định thêm `.txt` khi lưu.  
**Fix:** Khi lưu trong Notepad, chọn **Save as type = All Files**, đặt tên `.wslconfig`.

---

### ❌ Build lần sau chậm hơn bình thường sau khi xóa cache
**Nguyên nhân:** Cache bị xóa nên Gradle phải download lại dependencies.  
**Fix:** Bình thường — lần build kế tiếp sẽ nhanh lại. Không cần làm gì.

---

### ❌ `No environment variables found for the "preview" environment on EAS`
**Nguyên nhân:** EAS Cloud chưa được set env vars. Không ảnh hưởng đến EAS Local (đọc từ export).  
**Fix EAS Cloud:** Chạy `eas env:create` như Bước 3.4.  
**Fix EAS Local:** Bỏ qua thông báo này, đảm bảo đã export env trước khi build.

### ❌ `./build.sh chạy không có output gì, không báo lỗi`
**Nguyên nhân:** File build.sh được tạo/edit trên Windows có line endings CRLF — Linux không chạy được script này.  
**Fix:** 
```bash
sed -i 's/\r//' build.sh
./build.sh
```

---

## 8. Quy trình build lần sau

### EAS Cloud — đơn giản, chạy trên Windows

```cmd
cd "E:\projects\chino-warehouse"
eas build --profile preview --platform android
# Chờ 10-30 phút → vào link expo.dev → Download APK
```

### EAS Local — nhanh hơn, chạy trong Ubuntu

```bash
# 1. Mở Ubuntu
wsl -d Ubuntu

# 2. Vào thư mục project
cd "/mnt/e/projects/chino-warehouse"

# 3. Set env — bắt buộc mỗi lần, không tự nhớ
export EXPO_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# 4. Build
eas build --profile preview --platform android --local

# 5. Copy APK vào thư mục version
mkdir -p apk
cp build-*.apk "apk/chino-warehouse-v1.1.apk"
```

### Script tự động hóa (tùy chọn)

Tạo file `build.sh` trong thư mục project — chạy trong Ubuntu:

```bash
cat > "/mnt/e/projects/chino-warehouse/build.sh" << 'EOF'
#!/bin/bash
set -e

# Điền key thật vào đây
export EXPO_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

echo "Building..."
eas build --profile preview --platform android --local

mkdir -p apk
ORIGINAL=$(ls build-*.apk | head -1)
cp "$ORIGINAL" "apk/$ORIGINAL"
echo "Done: apk/$ORIGINAL"
EOF

chmod +x "/mnt/e/projects/chino-warehouse/build.sh"
```

Dùng:
```bash
cd "/mnt/e/projects/chino-warehouse"
sed -i 's/\r//' build.sh
./build.sh
```

---

## 9. Câu hỏi thường gặp

**Q: Mỗi lần build mất bao lâu?**  
A: EAS Cloud luôn 10–30 phút. EAS Local: lần đầu 10–15 phút, từ lần 2 trở đi 3–7 phút vì Gradle cache lại.

**Q: Có thể build local mà không cần login EAS không?**  
A: Không — EAS CLI cần login để đọc project ID và keystore. Nhưng bản thân quá trình compile vẫn chạy 100% trên máy bạn.

**Q: Có lộ Supabase key trong APK không?**  
A: `EXPO_PUBLIC_*` có thể extract từ APK nếu ai decompile. Nhưng RLS đã bật — người ngoài không thể đọc/ghi database dù có key. Supabase thiết kế `anon key` để dùng trong client app, an toàn kể cả lên Play Store.

**Q: Sau khi sửa code JS thôi có cần build lại APK không?**  
A: Nếu chỉ sửa JS/UI, dùng **EAS Update (OTA)** — push thẳng lên app đang cài trong vài giây, không cần build lại APK. Project đã cài `expo-updates` sẵn rồi.

**Q: Xóa cache có mất code không?**  
A: Không. Cache Gradle (`~/.gradle`) hoàn toàn tách biệt với code project. Xóa cache chỉ làm lần build sau chậm hơn một chút.

**Q: Tại sao phải xóa cache mỗi khi bị lỗi Gradle?**  
A: Khi build bị interrupt giữa chừng (tắt máy, out of memory, Ctrl+C), cache có thể bị corrupt — Gradle đọc file cache hỏng rồi báo lỗi lạ. Xóa để Gradle tạo lại từ đầu là cách fix nhanh nhất.

**Q: EAS Cloud có giới hạn số lần build không?**  
A: Tài khoản Expo free có **30 build/tháng**. Nếu build thường xuyên thì EAS Local tiết kiệm hơn.

**Q: Lần sau chuyển project sang máy khác thì sao?**  
A: Làm lại từ Bước 4.2 (cài WSL2 + Ubuntu) trên máy mới. Bước 4.1 (Android Studio + env vars) cũng cần làm lại.

---

## 10. Phụ lục

### Thông tin project

| Thông tin | Giá trị |
|-----------|---------|
| App ID | `com.nguyenbaolab.chinowarehouse` |
| EAS Profile | `preview` |
| Build type | `apk` |
| Expo SDK | 54.0.0 |
| React Native | 0.81.5 |
| Thư mục project (Windows) | `E:\projects\chino-warehouse` |
| Thư mục project (Ubuntu/WSL) | `/mnt/e/projects/chino-warehouse` |
| Thư mục APK output | `E:\projects\chino-warehouse\apk\` |

### Checklist trước khi build (EAS Local)

- [ ] Ubuntu đang chạy (`wsl -d Ubuntu`)
- [ ] Đang ở đúng thư mục project
- [ ] Đã export `EXPO_PUBLIC_SUPABASE_URL`
- [ ] Đã export `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `~/.gradle/gradle.properties` tồn tại và có đủ config
- [ ] Không có Gradle daemon cũ đang chạy (nếu build vừa bị lỗi)

### Lệnh debug nhanh

```bash
# Kiểm tra Gradle config còn không
cat ~/.gradle/gradle.properties

# Kill Gradle daemon cũ
pkill -f gradle

# Xóa cache nhẹ (giữ config)
rm -rf ~/.gradle/caches

# Xóa cache toàn bộ (phải tạo lại gradle.properties sau!)
rm -rf ~/.gradle

# Xem APK đã build
ls -lh "/mnt/e/projects/chino-warehouse"/build-*.apk 2>/dev/null

# Cài APK qua USB
adb install "E:\projects\chino-warehouse\apk\chino-warehouse-v1.0.apk"
```

---

*Tài liệu cập nhật: tháng 5/2026*
