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

function buildZoneToLoc(
  allLocations: Location[],
  zones: Zone[],
): Map<string, Location> {
  const locById = new Map(allLocations.map((l) => [l.id, l]))
  const zoneToLoc = new Map<string, Location>()
  for (const z of zones) {
    const loc = locById.get(z.location_id)
    if (loc) zoneToLoc.set(z.id, loc)
  }
  return zoneToLoc
}

function countInDateRange(
  inventoryEntries: InventoryEntry[],
  products: Product[],
  zoneToLoc: Map<string, Location>,
  fromIso: string,
  toIso: string,
): ExpiryModeCounts {
  const productById = new Map(products.map((p) => [p.id, p]))
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

/**
 * Đếm lô/SP hết hạn đúng một ngày: today + daysFromToday (local).
 * 0 = hôm nay, 1 = ngày mai, …
 */
export function countExpiringEntriesExactDay(
  inventoryEntries: InventoryEntry[],
  products: Product[],
  allLocations: Location[],
  zones: Zone[],
  daysFromToday: number,
): ExpiryModeCounts {
  const today = localMidnightToday()
  const targetIso = toLocalISODate(addDays(today, daysFromToday))
  const zoneToLoc = buildZoneToLoc(allLocations, zones)
  return countInDateRange(inventoryEntries, products, zoneToLoc, targetIso, targetIso)
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
  const today = localMidnightToday()
  const todayIso = toLocalISODate(today)
  const zoneToLoc = buildZoneToLoc(allLocations, zones)

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

  return countInDateRange(inventoryEntries, products, zoneToLoc, fromIso, toIso)
}

export type DailyExpiryCounts = {
  day0: ExpiryModeCounts
  day1: ExpiryModeCounts
  day2: ExpiryModeCounts
  day3: ExpiryModeCounts
}

export type ScheduleExpiryCounts = {
  daily: DailyExpiryCounts
  weekly: ExpiryModeCounts
  monthly: ExpiryModeCounts
}

/** 4 mốc exact-day + tuần (7) + tháng (30) cho schedule + ExpiryAlert */
export function buildScheduleExpiryCounts(
  inventoryEntries: InventoryEntry[],
  products: Product[],
  allLocations: Location[],
  zones: Zone[],
): ScheduleExpiryCounts {
  return {
    daily: {
      day0: countExpiringEntriesExactDay(inventoryEntries, products, allLocations, zones, 0),
      day1: countExpiringEntriesExactDay(inventoryEntries, products, allLocations, zones, 1),
      day2: countExpiringEntriesExactDay(inventoryEntries, products, allLocations, zones, 2),
      day3: countExpiringEntriesExactDay(inventoryEntries, products, allLocations, zones, 3),
    },
    weekly: countExpiringEntries(inventoryEntries, products, allLocations, zones, 7),
    monthly: countExpiringEntries(inventoryEntries, products, allLocations, zones, 30),
  }
}

/** Format "X lô (kho) · Y SP (siêu thị)" — bỏ phần 0; null nếu cả hai = 0 */
export function formatWhMarketLabel(warehouse: number, market: number): string | null {
  const parts: string[] = []
  if (warehouse > 0) parts.push(`${warehouse} lô (kho)`)
  if (market > 0) parts.push(`${market} SP (siêu thị)`)
  return parts.length > 0 ? parts.join(' · ') : null
}
