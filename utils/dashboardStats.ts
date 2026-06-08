import { getExpiryStatus, InventoryEntry, Product } from '../types'

export type StockPieSlice = {
  normal: number
  low: number
  out: number
}

export type ExpiryPieSlice = {
  ok: number
  warning: number
  expired: number
  noExpiry: number
}

export type DashboardStats = {
  totalProducts: number
  activeSkuCount: number
  outOfStockProducts: number
  lowStockProducts: number
  expiredLots: number
  warningLots: number
  discontinuedProducts: number
  locationCount: number
  stockPie: StockPieSlice
  expiryPie: ExpiryPieSlice
}

export function filterInventoryEntries(
  inventoryEntries: InventoryEntry[],
  zoneIdsInLocation: Set<string> | null,
  selectedZoneId: string | null,
): InventoryEntry[] {
  if (selectedZoneId) {
    return inventoryEntries.filter((e) => e.zone_id === selectedZoneId)
  }
  if (zoneIdsInLocation) {
    return inventoryEntries.filter((e) => zoneIdsInLocation.has(e.zone_id))
  }
  return inventoryEntries
}

/** Client-side dashboard metrics — mirrors NotificationsScreen stock/expiry rules. */
export function computeDashboardStats(
  products: Product[],
  inventoryEntries: InventoryEntry[],
  locationCount: number,
  zoneIdsInLocation: Set<string> | null,
  selectedZoneId: string | null,
): DashboardStats {
  const filteredEntries = filterInventoryEntries(inventoryEntries, zoneIdsInLocation, selectedZoneId)

  let totalProducts: number
  if (zoneIdsInLocation === null) {
    totalProducts = products.filter((p) => !p.is_archived).length
  } else {
    const entriesInLocation = filterInventoryEntries(inventoryEntries, zoneIdsInLocation, null)
    const productIdsInLocation = new Set(entriesInLocation.map((e) => e.product_id))
    totalProducts = products.filter((p) => !p.is_archived && productIdsInLocation.has(p.id)).length
  }

  const discontinuedProducts = products.filter((p) => !p.is_archived && p.is_discontinued === true).length

  const productIdToEntries = new Map<string, InventoryEntry[]>()
  for (const entry of filteredEntries) {
    const list = productIdToEntries.get(entry.product_id)
    if (list) list.push(entry)
    else productIdToEntries.set(entry.product_id, [entry])
  }

  const activeSkuCount = productIdToEntries.size

  let outOfStockProducts = 0
  let lowStockProducts = 0
  const stockPie: StockPieSlice = { normal: 0, low: 0, out: 0 }

  for (const [productId, entries] of productIdToEntries.entries()) {
    if (entries.length === 0) continue
    const product: Product | undefined = products.find((p) => p.id === productId) ?? entries[0]?.product
    if (!product || product.is_archived) continue

    const totalBoxes = entries.reduce((sum, e) => sum + e.quantity_boxes, 0)
    const lowWarning = product.low_warning_boxes ?? 3

    if (totalBoxes === 0) {
      outOfStockProducts += 1
      stockPie.out += 1
    } else if (totalBoxes <= lowWarning) {
      if (!product.is_discontinued) lowStockProducts += 1
      stockPie.low += 1
    } else {
      stockPie.normal += 1
    }
  }

  let expiredLots = 0
  let warningLots = 0
  const expiryPie: ExpiryPieSlice = { ok: 0, warning: 0, expired: 0, noExpiry: 0 }

  for (const entry of filteredEntries) {
    const product: Product | undefined =
      products.find((p) => p.id === entry.product_id) ?? entry.product
    if (!product || product.is_archived) continue

    const warningDays = product.warning_days ?? 30
    if (!entry.expiry_date) {
      expiryPie.noExpiry += 1
      continue
    }

    const status = getExpiryStatus(entry.expiry_date, warningDays)
    if (status === 'expired') {
      expiredLots += 1
      expiryPie.expired += 1
    } else if (status === 'warning') {
      warningLots += 1
      expiryPie.warning += 1
    } else {
      expiryPie.ok += 1
    }
  }

  return {
    totalProducts,
    activeSkuCount,
    outOfStockProducts,
    lowStockProducts,
    expiredLots,
    warningLots,
    discontinuedProducts,
    locationCount,
    stockPie,
    expiryPie,
  }
}
