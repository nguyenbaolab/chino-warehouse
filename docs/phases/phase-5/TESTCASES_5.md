# Phase 5 — Test Cases

---

## F34 — Picking list

### TC-F34-01: Tạo picking list mới
- **Bước:** Tab Lấy hàng → nút + → nhập tên → Tạo
- **Kết quả mong đợi:** List mới hiện trong danh sách, status draft

### TC-F34-02: Thêm lô vào picking list
- **Bước:** Mở picking list draft → tìm SP → chọn lô → nhập qty → Thêm
- **Kết quả mong đợi:** Lô hiện trong list với qty đúng

### TC-F34-03: Bắt đầu lấy hàng (draft → in_progress)
- **Bước:** Picking list draft có ít nhất 1 item → bấm Bắt đầu
- **Kết quả mong đợi:** Status → in_progress; có thể tick is_picked

### TC-F34-04: Tick is_picked từng lô
- **Bước:** Picking list in_progress → tick checkbox lô
- **Kết quả mong đợi:** Lô được đánh dấu; giữ nguyên sau khi quay lại

### TC-F34-05: Revert in_progress → draft
- **Bước:** Picking list in_progress → bấm «Quay lại chỉnh sửa»
- **Kết quả mong đợi:** Status → draft; is_picked giữ nguyên; có thể thêm/xóa lô

### TC-F34-06: Hoàn thành picking — trừ tồn
- **Bước:** Picking list in_progress, tick các lô cần lấy → Hoàn thành
- **Kết quả mong đợi:** Chỉ trừ tồn items is_picked; status → completed;
  qty trên ProductDetail giảm đúng số

### TC-F34-07: Partial fail giữ in_progress
- **Bước:** Simulate 1 item fail khi confirm (vd. qty DB đã đổi)
- **Kết quả mong đợi:** Status giữ in_progress; item fail không trừ tồn

### TC-F34-08: Xóa picking list
- **Bước:** Picking list draft → Xóa → confirm
- **Kết quả mong đợi:** List + items xóa khỏi DB; không còn trong danh sách

---

## F35 — Push notification

### TC-F35-01: Permission request sau login
- **Bước:** Login lần đầu (chưa grant permission)
- **Kết quả mong đợi:** App hỏi permission notification; denied = im lặng

### TC-F35-02: Schedule notification
- **Bước:** Settings → Thông báo hết hạn → bật + đặt giờ
- **Kết quả mong đợi:** Notification schedule đúng giờ (daily/weekly/monthly)

### TC-F35-03: Nội dung notification — 4 mốc exact-day
- **Bước:** Có lô hết hạn hôm nay / 1 / 2 / 3 ngày tới → chờ notification
- **Kết quả mong đợi:** Body hiện đúng số lô theo từng mốc; bỏ mốc count=0

### TC-F35-04: Opt-out notification
- **Bước:** Settings → Thông báo hết hạn → tắt toggle
- **Kết quả mong đợi:** Cancel tất cả scheduled notifications

### TC-F35-05: ExpiryAlertScreen — 6 section
- **Bước:** Settings → Thông báo hết hạn → xem danh sách
- **Kết quả mong đợi:** 6 section collapsible (hôm nay/1/2/3 ngày/tuần/tháng);
  entries không trùng giữa sections

### TC-F35-06: Tap entry → ProductDetail
- **Bước:** ExpiryAlertScreen → tap card lô
- **Kết quả mong đợi:** Navigate ProductDetail đúng SP

---

## Hàng đặc biệt (is_special) — KI-069

### TC-KI069-01: Toggle is_special trên ZoneDetailSheet
- **Bước:** Map mode Market → mở zone → inline edit lô → bật Switch «Hàng đặc biệt» → Lưu
- **Kết quả mong đợi:** is_special = true trong DB; ⭐ hiện trước tên SP trong nhóm

### TC-KI069-02: Switch không hiện ở warehouse
- **Bước:** Map mode Kho → mở zone → inline edit lô
- **Kết quả mong đợi:** Không có Switch «Hàng đặc biệt»

### TC-KI069-03: Toggle is_special trên ProductDetailScreen
- **Bước:** Mở SP có lô market → inline edit lô → bật Switch → Lưu
- **Kết quả mong đợi:** Badge ⭐ hiện trên card lô; is_special = true DB

### TC-KI069-04: StockCheckScreen hiện lô đã đánh dấu
- **Bước:** Đánh dấu is_special cho lô market → Settings → Kiểm hàng
- **Kết quả mong đợi:** Lô xuất hiện trong danh sách Kiểm hàng

---

## Realtime silent refresh — KI-063

### TC-KI063-01: Realtime không gây spinner Map
- **Bước:** User B thay đổi inventory → User A đang xem MapScreen
- **Kết quả mong đợi:** Map tự refresh không hiện spinner / không unmount grid

### TC-KI063-02: Realtime không reset form đang nhập
- **Bước:** User B thay đổi → User A đang nhập inline edit ZoneDetailSheet
- **Kết quả mong đợi:** Form giữ nguyên, không bị clear

---

## Fix crash presence — KI-070

### TC-KI070-01: Re-login sau 20 phút không crash
- **Bước:** Login → để app idle 20 phút → session hết → login lại
- **Kết quả mong đợi:** App không crash; presence channel hoạt động bình thường

### TC-KI070-02: Re-login nhiều lần liên tiếp
- **Bước:** Login → logout thủ công → login lại (lặp 3 lần)
- **Kết quả mong đợi:** Không crash lần nào; online users hiện đúng

---

## ProductsScreen

### TC-PROD-01: Catalog Mode Tất cả hiện đủ SP
- **Bước:** Mode Tất cả, không filter → xem tổng số SP
- **Kết quả mong đợi:** Tối đa 1000 SP (không còn giới hạn 200)

### TC-PROD-02: Tap card → ProductDetail
- **Bước:** Tap vào card SP bất kỳ
- **Kết quả mong đợi:** Navigate ProductDetail đúng SP

### TC-PROD-03: Tap-to-zoom ảnh
- **Bước:** Tap ảnh SP trên bất kỳ màn nào có ảnh
- **Kết quả mong đợi:** ImageViewerModal mở, pinch/double-tap zoom
