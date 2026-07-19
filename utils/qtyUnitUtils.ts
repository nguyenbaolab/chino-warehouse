import type { Location } from '../types'

/** Đơn vị số lượng theo loại location (không theo appMode global). */
export function qtyUnitForLocationType(type: 'warehouse' | 'market'): string {
  return type === 'warehouse' ? 'thùng' : 'sản phẩm'
}

/**
 * Cách A — tách đơn vị kho / siêu thị.
 * VD: `5 thùng · 3 sản phẩm` | `5 thùng` | `3 sản phẩm` | `0`
 */
export function formatSplitQtyLabel(warehouseQty: number, marketQty: number): string {
  const parts: string[] = []
  if (warehouseQty > 0) parts.push(`${warehouseQty} thùng`)
  if (marketQty > 0) parts.push(`${marketQty} sản phẩm`)
  if (parts.length === 0) return '0'
  return parts.join(' · ')
}

/** Resolve loại location từ zone.location_id + map locations (fallback warehouse). */
export function locationTypeOfEntry(
  entry: { zone?: { location_id?: string } | null },
  locationById: Map<string, Location>,
): 'warehouse' | 'market' {
  const locId = entry.zone?.location_id
  if (locId) {
    const t = locationById.get(locId)?.type
    if (t === 'warehouse' || t === 'market') return t
  }
  return 'warehouse'
}

/** Tên kho từ map all-locations (không phụ thuộc store.locations theo appMode). */
export function locationNameOfEntry(
  entry: { zone?: { location_id?: string } | null },
  locationById: Map<string, Location>,
  fallback = '—',
): string {
  const locId = entry.zone?.location_id
  if (!locId) return fallback
  return locationById.get(locId)?.name ?? fallback
}
