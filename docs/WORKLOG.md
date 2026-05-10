# WORKLOG

Nhật ký thay đổi có ý nghĩa (DEV ghi sau mỗi task theo `docs/project/WORKFLOW.md`).

---

## Tháng 5/2026 — Hệ thống tài liệu & màu sắc

### Màu sắc (TODO #1 — Done)

- **Task:** Đơn giản hóa hệ thống màu status
- **Files thay đổi:** `types/index.ts`, `stores/themeStore.ts`
- **Kết quả:** Gộp critical + warning = vàng (`#FACC15` dark / `#EAB308` light). Bỏ màu cam khỏi status system.
- **Docs đã cập nhật:** `CONTEXT.md`, `FEATURES.md`, `USER_GUIDE.md`, `README.md`, `.cursorrules` (trước khi tái cấu trúc docs)

### Tái cấu trúc tài liệu

- **Task:** Xây dựng hệ thống docs chuyên nghiệp
- **Kết quả:** Tạo cấu trúc `docs/` với `project/REQUIREMENTS.md`, `project/CONTEXT.md`, `project/WORKFLOW.md`, `project/USER_GUIDE.md`, `DECISIONS.md`, `KNOWN_ISSUES.md`, `WORKLOG.md`, `BLOCKERS.md`, `phases/phase-1/`; cập nhật `.cursorrules`; xóa `FEATURES.md`, `CONTEXT.md` root; di chuyển requirements & user guide vào `docs/project/`.
