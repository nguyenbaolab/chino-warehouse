import type { InventoryEntry, Location, Product, Zone } from '../types'

export type ExpiryModeCounts = {
  /** Số lô (warehouse) */
  warehouse: number
  /** Số SP unique (market) */
  market: number
}

/** YYYY-MM-DD theo local timezone (Finland) — không dùng toISOString UTC */
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localMidnightToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Đếm lô/SP hết hạn trong cửa sổ ngày.
 * - windowDays = 0: đúng hôm nay
 * - windowDays = 3 | 7: từ hôm nay → hôm nay + N ngày
 * - windowDays = 30: từ đầu tháng → cuối tháng hiện tại
 * Warehouse = số lô; Market = số SP (unique product_id).
 */
export function countExpiringEntries(
  inventoryEntries: InventoryEntry[],
  products: Product[],
  allLocations: Location[],
  zones: Zone[],
  windowDays: number,
): ExpiryModeCounts {
  const locById = new Map(allLocations.map((l) => [l.id, l]))
  const zoneToLoc = new Map<string, Location>()
  for (const z of zones) {
    const loc = locById.get(z.location_id)
    if (loc) zoneToLoc.set(z.id, loc)
  }

  const productById = new Map(products.map((p) => [p.id, p]))

  const today = localMidnightToday()
  const todayIso = toLocalISODate(today)

  let fromIso: string
  let toIso: string

  if (windowDays === 0) {
    fromIso = todayIso
    toIso = todayIso
  } else if (windowDays === 30) {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    fromIso = toLocalISODate(first)
    toIso = toLocalISODate(last)
  } else {
    fromIso = todayIso
    toIso = toLocalISODate(addDays(today, windowDays))
  }

  let warehouse = 0
  const marketProductIds = new Set<string>()

  for (const entry of inventoryEntries) {
    if (!entry.expiry_date) continue
    if (entry.expiry_date < fromIso || entry.expiry_date > toIso) continue

    const product =
      productById.get(entry.product_id) ??
      (entry.product as Product | undefined)
    if (!product || product.is_archived) continue
    if (product.ignore_expiry_warning) continue

    const loc = zoneToLoc.get(entry.zone_id)
    if (!loc) continue

    if (loc.type === 'warehouse') {
      warehouse++
    } else if (loc.type === 'market') {
      marketProductIds.add(entry.product_id)
    }
  }

  return { warehouse, market: marketProductIds.size }
}

export type ExpiryCounts = {
  todayExpiredWarehouse: number
  todayExpiredMarket: number
  threeDayExpiredWarehouse: number
  threeDayExpiredMarket: number
  weekExpiredWarehouse: number
  weekExpiredMarket: number
  monthExpiredWarehouse: number
  monthExpiredMarket: number
}

/** Tính đủ 4 cửa sổ dùng cho schedule notification */
export function buildExpiryCounts(
  inventoryEntries: InventoryEntry[],
  products: Product[],
  allLocations: Location[],
  zones: Zone[],
): ExpiryCounts {
  const today = countExpiringEntries(inventoryEntries, products, allLocations, zones, 0)
  const three = countExpiringEntries(inventoryEntries, products, allLocations, zones, 3)
  const week = countExpiringEntries(inventoryEntries, products, allLocations, zones, 7)
  const month = countExpiringEntries(inventoryEntries, products, allLocations, zones, 30)
  return {
    todayExpiredWarehouse: today.warehouse,
    todayExpiredMarket: today.market,
    threeDayExpiredWarehouse: three.warehouse,
    threeDayExpiredMarket: three.market,
    weekExpiredWarehouse: week.warehouse,
    weekExpiredMarket: week.market,
    monthExpiredWarehouse: month.warehouse,
    monthExpiredMarket: month.market,
  }
}
