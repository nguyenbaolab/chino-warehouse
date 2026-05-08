export type Location = {
  id: string
  name: string
  description?: string
  created_at: string
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

export type Product = {
  id: string
  name: string
  barcode?: string
  image_url?: string
  notes?: string
  is_archived: boolean
  created_at: string
}

export type InventoryEntry = {
  id: string
  product_id: string
  zone_id: string
  tier: number
  quantity_boxes: number
  expiry_date?: string
  notes?: string
  updated_at: string
  product?: Product
  zone?: Zone
}

export type ExpiryStatus = 'expired' | 'warning' | 'ok'

export function getExpiryStatus(expiry_date?: string): ExpiryStatus {
  if (!expiry_date) return 'ok'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiry_date)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'expired'
  if (diffDays <= 30) return 'warning'
  return 'ok'
}

export const EXPIRY_COLORS: Record<ExpiryStatus, string> = {
  expired: '#EF4444',
  warning: '#F59E0B',
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