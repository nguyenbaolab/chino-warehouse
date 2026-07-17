export type Location = {
  id: string
  name: string
  description?: string
  created_at: string
  grid_rows: number
  grid_cols: number
}

export type ZoneCell = {
  row: number
  col: number
}

export type Zone = {
  id: string
  location_id: string
  name: string
  cells: ZoneCell[]
  has_tiers: boolean
  tier_count: number
  color: string
  notes?: string
  updated_at: string
}

/** F30 — phân loại cấp 1 (VD: Đồ khô). */
export type ProductCategoryL1 = {
  id: string
  name: string
  created_at: string
}

/** F30 — phân loại cấp 2 (VD: Mì), thuộc một cấp 1. */
export type ProductCategoryL2 = {
  id: string
  level1_id: string
  name: string
  created_at: string
}

export type Product = {
  id: string
  name: string
  image_url?: string
  notes?: string
  warning_days: number
  low_warning_boxes: number
  low_critical_boxes: number
  is_archived: boolean
  /** A5 — thời điểm cập nhật gần nhất của record products */
  updated_at?: string
  /** Tab Thông báo: đánh dấu Để sau (Supabase `products.is_deferred`). */
  is_deferred?: boolean
  /** Tab Sắp hết hàng: không nhập nữa. */
  is_discontinued?: boolean
  /** F28 — lý do không nhập nữa (tách khỏi notes). */
  discontinued_reason?: string
  created_at: string
  /** F30 — optional FK → product_categories_l1 */
  category_level1_id?: string | null
  /** F30 — optional FK → product_categories_l2 */
  category_level2_id?: string | null
}

export type OrderListStatus = 'draft' | 'confirmed' | 'placed'

export type OrderList = {
  id: string
  title: string
  status: OrderListStatus
  created_at: string
  updated_at: string
}

export type OrderItem = {
  id: string
  order_list_id: string
  product_id?: string | null
  product_name: string
  quantity_boxes: number
  notes?: string | null
  is_manual: boolean
  created_at: string
  updated_at: string
}

export type LocateIntent = {
  productName: string
  locationId: string
  zoneId: string
}

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'guest'

export type UserProfile = {
  id: string
  role: UserRole
  is_disabled: boolean
  last_login_at: string | null
  created_at: string
}

export type UserProfileWithEmail = UserProfile & {
  email: string
}

/** B1 — lịch sử mã vạch per sản phẩm (UNIQUE barcode toàn hệ thống). */
export interface ProductBarcode {
  id: string
  product_id: string
  barcode: string
  first_scanned_at: string
  last_scanned_at: string
}

export type InventoryEntry = {
  id: string
  product_id: string
  zone_id: string
  tier: number
  quantity_boxes: number
  barcode?: string
  /** Tab Sắp hết hạn: đã giảm giá cho lô này hay chưa. */
  is_price_reduced?: boolean
  expiry_date?: string
  notes?: string
  updated_at: string
  product?: Product
  zone?: Zone
}

/** F31 — ghi chú nội bộ theo sản phẩm */
export type InternalNote = {
  id: string
  product_id: string
  reason: string
  created_by: string | null
  created_at: string
  product?: Product
}

export type AuditLog = {
  id: string
  table_name: 'inventory_entries' | 'products' | 'product_barcodes' | 'user_profiles' | 'internal_notes'
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'CONFLICT'
  record_id: string | null
  location_id: string | null
  changed_by: string | null
  changed_by_name: string | null
  changed_at: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
}

export type ExpiryStatus = 'expired' | 'warning' | 'ok'
export type ExpiryColor = 'red' | 'yellow' | 'green'
export type CombinedStatus = 'expired' | 'critical' | 'warning' | 'ok'

function parseExpiryDate(expiry_date?: string): Date | null {
  if (!expiry_date) return null
  const parsed = new Date(`${expiry_date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function getExpiryColor(expiryDate?: string, warningDays = 30): ExpiryColor {
  const expiry = parseExpiryDate(expiryDate)
  if (!expiry) return 'green'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'red'
  if (diffDays <= Math.max(1, warningDays)) return 'yellow'
  return 'green'
}

export function getExpiryStatus(expiry_date?: string, warning_days = 30): ExpiryStatus {
  const color = getExpiryColor(expiry_date, warning_days)
  if (color === 'red') return 'expired'
  if (color === 'yellow') return 'warning'
  return 'ok'
}

export function getExpiryColorHex(expiryDate?: string, warningDays = 30): string {
  const color = getExpiryColor(expiryDate, warningDays)
  if (color === 'red') return '#EF4444'
  if (color === 'yellow') return '#FACC15'
  return '#22C55E'
}

export function getCombinedStatus(
  quantity_boxes: number,
  expiry_date?: string,
  low_warning_boxes = 3,
  low_critical_boxes = 1,
  warning_days = 30
): CombinedStatus {
  if (quantity_boxes <= 0) return 'expired'
  if (getExpiryStatus(expiry_date, warning_days) === 'expired') return 'expired'
  if (quantity_boxes <= Math.max(0, low_critical_boxes)) return 'critical'
  if (
    quantity_boxes <= Math.max(0, low_warning_boxes) ||
    getExpiryStatus(expiry_date, warning_days) === 'warning'
  ) {
    return 'warning'
  }
  return 'ok'
}

export function getCombinedStatusRank(status: CombinedStatus): number {
  if (status === 'expired') return 1
  if (status === 'critical') return 2
  if (status === 'warning') return 3
  return 4
}

export function formatExpiryDate(expiryDate?: string): string {
  const parsed = parseExpiryDate(expiryDate)
  if (!parsed) return 'Không hạn'
  const yyyy = parsed.getFullYear()
  const mm = String(parsed.getMonth() + 1).padStart(2, '0')
  const dd = String(parsed.getDate()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy}`
}

export const EXPIRY_COLORS: Record<CombinedStatus, string> = {
  expired: '#EF4444',
  critical: '#EF4444',
  warning: '#FACC15',
  ok: '#22C55E',
}

export const ZONE_COLORS = [
  '#22C55E', // Xanh lá
  '#3B82F6', // Xanh dương
  '#A855F7', // Tím
  '#EC4899', // Hồng
  '#F97316', // Cam
  '#EAB308', // Vàng
  '#06B6D4', // Xanh ngọc
  '#F43F5E', // Đỏ san hô
  '#A16207', // Nâu
  '#94A3B8', // Xám bạc
  '#65A30D', // Xanh rêu
  '#6366F1', // Indigo
]