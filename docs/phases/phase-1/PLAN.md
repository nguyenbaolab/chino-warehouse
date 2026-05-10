# Phase 1 — MVP Plan

## Mục tiêu

App dùng được ngay trong kho: tìm hàng, quét mã, cập nhật tồn kho.

## Scope

F01–F17 (theo `docs/project/REQUIREMENTS.md`)

## Trạng thái hiện tại

- **Done:** F01, F02, F03, F04, F05, F06, F07, F09, F10, F11, F12, F13, F14, F16, F17*
- **Partial:** F15 (thiếu barcode field ở AddInventory)
- **Cần verify:** F17 Realtime (xem KI-002 trong `docs/KNOWN_ISSUES.md`)

## Phase 1+ (sau MVP)

F18: Tab Thông báo đầy đủ (cảnh báo tồn + hạn)

## TODO còn lại (theo thứ tự ưu tiên)

1. Fix KI-001: critical màu đỏ (0–1 thùng)
2. Bỏ UI `low_critical_boxes`, hardcode = 1
3. Fix `NotificationsScreen`: format card đúng §7.6
4. Thêm toggle lọc "có vấn đề" ở `ProductsScreen`
5. Thêm tổng thùng ở `ProductsScreen`
6. Bottom tab bar cho màn hình stack
7. Barcode field ở `AddInventoryScreen`
8. Verify F17 Realtime
9. Fix KI-003: tab bar theo themeStore
10. Fix KI-004: đổi kho xóa search
