# Phase 3 — Tổng kết

**Trạng thái:** In progress | Tháng 5/2026

---

## 1. Tổng quan Phase 3

### Mục tiêu

Ổn định app multi-user, cải thiện UX vận hành hàng ngày, hoàn thiện đặt hàng/PDF (F27), lý do discontinued (F28), ảnh sản phẩm (F08), Dashboard tổng quan (F23), và RBAC đầy đủ (F24). Sửa bugs tồn đọng (A1–A5), bổ sung Realtime bản đồ zone (C1), và hai hạng mục security High (SEC-05/06).

### Kết quả

— *Cập nhật khi hoàn thành Phase 3.*

---

## 2. Tính năng đã hoàn thành

| Mã | Tóm tắt |
|----|---------|
| *(Điền dần khi hoàn thành từng task)* | |

---

## 3. Tính năng chưa hoàn thành → Phase 4

| Hạng mục | Ghi chú |
|----------|---------|
| **F19** | **Dropped** — không implement (không phù hợp nghiệp vụ) |
| **F21** | Offline mode |
| **F25** | Báo cáo / Xuất dữ liệu |
| **F26** | Kiểm kho |
| **SEC-10** | Backup script `service_role` (KI-021) |
| **SEC-12** | `console.log` guard (KI-023) |
| **SEC-13** | Dependency audit (KI-024) |
| **SEC-14** | `.env.*` gitignore (KI-025) |
| **KI-039** | `useFocusEffect` fetch thừa |
| **KI-040** | `ProductsScreen` `fetchProducts` không limit |

---

## 4. Quyết định thiết kế quan trọng (Phase 3)

Tóm tắt — chi tiết trong **[`docs/DECISIONS.md`](../../DECISIONS.md)**:

- **F19 Dropped:** Không implement chuyển hàng giữa khu vực — xóa lô ở kho là đủ nghiệp vụ.
- **Conflict detection:** Optimistic locking với `updated_at`; Alert khi có người sửa trước (Ghi đè / Xem lại).
- **RBAC 5 role:** `super_admin` / `admin` / `staff` / `guest` / `disabled`; bảng `user_profiles`; guard client + RLS.
- **Global warning toggles:** 2 toggle Settings (hết hạn / hết hàng), AsyncStorage, tắt màu/badge nhưng vẫn hiện SP.
- **Format hạn:** Text input DD/MM/YYYY; MM/YYYY → tự điền ngày 1.

---

## 5. Security Phase 3

| SEC | Mô tả | KI | Trạng thái |
|-----|-------|----|-----------|
| SEC-05 | Input validation `maxLength` | KI-017 | In progress |
| SEC-06 | Generic error messages | KI-018 | In progress |
| SEC-09 | RBAC đầy đủ (F24) | KI-020 | In progress |
| SEC-10 | Backup script `service_role` | KI-021 | Deferred → Phase 4 |
| SEC-12 | `console.log` guard | KI-023 | Deferred → Phase 4 |
| SEC-13 | Dependency audit | KI-024 | Deferred → Phase 4 |
| SEC-14 | `.env.*` gitignore | KI-025 | Deferred → Phase 4 |

---

## 6. Known issues còn open

| KI | Mô tả | Mức độ | Trạng thái |
|----|-------|--------|-----------|
| KI-017 | SEC-05: Input validation thiếu | High | Open |
| KI-018 | SEC-06: Error message lộ schema | High | Open |
| KI-044 | Format hạn DD/MM/YYYY | Medium | Open — A1 |
| KI-045 | ProductsScreen barcode/search | High | Open — A2 |
| KI-046 | Zone overlap race | High | Open — A3 |
| KI-047 | Map search barcode text | Medium | Open — A4 |
| KI-048 | Conflict detection | Medium | Open — A5 |

*Điền dần khi resolve từng KI.*

---

## 7. Số liệu Phase 3

— *Cập nhật khi hoàn thành* (migrations mới, screens mới, số KI resolved, test cases Pass).

---

## 8. Chuyển sang Phase 4

- **F21** — Offline mode (Zustand persist + sync queue).
- **F25** — Báo cáo / xuất dữ liệu tồn kho.
- **F26** — Kiểm kho (đối chiếu thực tế theo zone/tầng).
- **SEC-10/12/13/14** — Backup script, console guard, npm audit, gitignore.
- **KI-039, KI-040** — Performance fetch / pagination server-side.

Kế hoạch chi tiết: tạo **`docs/phases/phase-4/PLAN_4.md`** khi bắt đầu Phase 4.
