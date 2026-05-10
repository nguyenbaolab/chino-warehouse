# WORKFLOW — Quy trình làm việc (Chino's Warehouse)

File này mô tả cách Cursor (và team) đọc/ghi tài liệu kèm code. **Đọc file này trước** khi bắt đầu task kỹ thuật hoặc test.

---

## §1 Xác định role

- Task liên quan **viết / sửa code** → Role: **DEV**
- Task liên quan **kiểm tra / verify** → Role: **TEST**

---

## §2 Role DEV — Đọc trước khi làm

1. `docs/project/REQUIREMENTS.md` — business rules, scope
2. `docs/project/CONTEXT.md` — technical context, conventions
3. `docs/BLOCKERS.md` — tránh lặp lỗi / chờ quyết định
4. `docs/phases/phase-1/PLAN.md` — scope phase hiện tại

---

## §3 Role DEV — Cập nhật sau khi làm xong

**Tự động cập nhật** (không cần hỏi):

- `docs/project/CONTEXT.md` — nếu thêm/xóa file, đổi store, đổi convention
- `docs/WORKLOG.md` — ghi log task vừa hoàn thành
- `docs/KNOWN_ISSUES.md` — nếu phát hiện bug mới
- `docs/phases/phase-1/HANDOFF.md` — nếu task sẵn sàng để test

**Đề xuất, chờ người dùng confirm:**

- `docs/project/REQUIREMENTS.md` — nếu business rule thay đổi
- `docs/DECISIONS.md` — nếu có quyết định thiết kế mới
- `docs/phases/phase-1/PLAN.md` — nếu scope thay đổi

**Không bao giờ tự update:**

- `docs/project/USER_GUIDE.md`
- `README.md`
- `.cursorrules`

---

## §4 Role TEST — Đọc trước khi test

1. `docs/phases/phase-1/TESTCASES.md`
2. `docs/phases/phase-1/HANDOFF.md`

---

## §5 Role TEST — Cập nhật sau khi test

**Tự động:**

- `docs/phases/phase-1/SUMMARY.md` — kết quả test
- `docs/KNOWN_ISSUES.md` — bug phát hiện khi test
- `docs/phases/phase-1/HANDOFF.md` — feedback lại cho DEV nếu fail

---

## §6 Nguyên tắc chia phase

- Hoàn thành và test xong phase hiện tại trước khi sang phase mới
- Mỗi phase có `PLAN`, `TESTCASES`, `HANDOFF`, `SUMMARY` riêng
- Không trộn lẫn test cases giữa các phase

---

## §7 Khi bí hoặc thiếu thông tin

1. **Dừng lại** — không tự đoán
2. Ghi rõ vào `docs/BLOCKERS.md`: vấn đề là gì, cần thông tin gì
3. Hỏi người dùng
4. Chờ xác nhận trước khi tiếp tục
