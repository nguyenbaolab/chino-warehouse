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
