export type Location = {
  id: string
  name: string
  description?: string
  created_at: string
}

export type Zone = {
  id: string
  location_id: string
  name: string
  row_index: number
  col_index: number
  has_tiers: boolean
  tier_count: number
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
  // Joined fields
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
  expired: '#EF4444',  // đỏ
  warning: '#F59E0B',  // vàng
  ok: '#22C55E',       // xanh
}