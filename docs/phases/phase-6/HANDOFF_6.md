# Phase 6 — Handoff

**Ngày:** Tháng 7/2026  
**Phase tiếp theo:** Phase 7

---

## 1. Bạn là ai / ngữ cảnh agent

Bạn là AI coding assistant làm việc trên repo **Chino's Store** (internal warehouse + market app, Joensuu). Luôn đọc theo thứ tự trước khi code:

1. `docs/project/WORKFLOW.md`
2. `docs/project/REQUIREMENTS.md`
3. `docs/project/CONTEXT.md`
4. `docs/BLOCKERS.md`

Phase hiện tại sau handoff: **Phase 7** — ưu tiên **A1 F27 mở rộng**. Xem `docs/phases/phase-7/PLAN_7.md`.

---

## 2. Project overview (ngắn)

- React Native (Expo) + TypeScript + Supabase + Zustand
- Bottom tabs: Map (Kho/Siêu thị) · Products · Orders (**Lấy hàng**) · Notifications · Settings
- Auth: email/password, `persistSession: false`, biometric F37, RBAC `user_profiles`
- Market mode F36: `locations.type`, `is_special` / `is_checked`, Discount + StockCheck

---

## 3. Trạng thái hiện tại

| | |
|--|--|
| Phase 6 | **Closed** |
| Schema | **v5.5** |
| REQUIREMENTS | **v1.3.46** |
| Bug High open | Không |

---

## 4. Đã hoàn thành Phase 6 (tóm tắt)

| Group | Nội dung |
|-------|----------|
| **B** | Picking UX B1–B5 (+ completed_at, edit qty) |
| **C** | Products 🛒 + C2 qty=0 picking guard |
| **D** | discount_percent → DiscountScreen + PDF + Notifications % |
| **E** | Search Kho/Zone / notes / AddInventory (không component riêng) |
| **F** | Settings 4 sections |
| **G** | Perf P1–P4, S1–S2, lazy tabs |
| **Extra** | Notes folders + ảnh; market giảm giá toggle/%; Login icon |

Chi tiết: `SUMMARY_6.md`, `TESTCASES_6.md`, `PLAN_6.md`.

---

## 5. Còn lại → Phase 7

### A1 — F27 mở rộng (**bắt buộc**)
- Spec: `REQUIREMENTS.md` §6 F27 + `DECISIONS.md` (List đặt hàng 2 tab / số thùng trống / PDF gộp)
- Files dự kiến: `OrderListScreen`, `OrderDetailScreen`, `warehouseStore`, có thể migration `order_items`
- **Bước đầu:** recon `OrderDetailScreen` + `OrderListScreen` trước khi schema/UI

### Optional
- Optimization: server-side filter inventory, expo-image, Zustand selectors, FlatList `getItemLayout`
- Polish / bugs từ test Phase 6
- Deferred lâu: F21 Offline, F25 Báo cáo, F26 Kiểm kho, Expo major, KI-026, KI-065

---

## 6. Stack & key files (cập nhật Phase 6)

**Screens mới / trọng tâm:**  
`DiscountScreen.tsx`, `PickingDetailScreen.tsx`, `InternalNotesScreen.tsx` (folders), `SettingsScreen.tsx`, `LotPickerModal` usage từ Products/Picking

**Components mới:**  
`components/LotPickerModal.tsx`

**Store:**  
`stores/warehouseStore.ts` — picking, notes folders, projections, `completePicking` parallel, discount fields

**Schema / migrations Phase 6:**  
`discount_percent`, `completed_at`, `internal_notes.image_url`, `internal_note_folders` + `folder_id`, perf indexes — xem `schema.sql` v5.5

**Utils:**  
`utils/dashboardStats.ts`, `utils/textUtils.ts` (`normalizeText`), `utils/dateUtils.ts` (`isoExpiryToDisplay`)

---

## 7. Workflow rules (kế thừa)

- Comment tiếng Việt; functional components; `useThemeStore` cho màu
- Không tự thêm npm package nếu chưa được yêu cầu
- Search/filter text: luôn `normalizeText()` hai vế
- Schema đổi → migration mới + cập nhật `schema.sql` (Phase = major version)
- WORKLOG: entry mới ở **đầu** file
- Ảnh SP: tap-to-zoom `ImageViewerModal`; card SP → `ProductDetail` (trừ suggestion form)
- Khi bí → `docs/BLOCKERS.md` + hỏi user
- Confirm trước khi sửa `REQUIREMENTS.md` / `DECISIONS.md` nếu thay đổi business rule lớn

---

## 8. Môi trường

- Expo SDK 54; EAS slug **`chino-warehouse`** (không đổi)
- Package: `com.nguyenbaolab.chinosstore`
- Apply migrations tới `20260723*` trước khi test discount/folders/indexes

---

## 9. Bước tiếp theo (Phase 7)

1. Đọc `docs/phases/phase-7/PLAN_7.md` + F27 trong REQUIREMENTS/DECISIONS  
2. **Recon** `OrderDetailScreen` + `OrderListScreen` + store order actions  
3. Implement **A1** (schema nếu cần → store → UI 2 tab → PDF gộp)  
4. Xen kẽ Group B/C optional khi A1 ổn định  

---

## 10. Tài liệu tham chiếu

- `SUMMARY_6.md`, `TESTCASES_6.md`, `PLAN_6.md` (closed scope)
- `docs/phases/phase-7/PLAN_7.md` — scope Phase 7
- `KNOWN_ISSUES.md` — KI-062, KI-065, KI-071–074 Resolved
- `CONTEXT.md`, `WORKFLOW.md`
