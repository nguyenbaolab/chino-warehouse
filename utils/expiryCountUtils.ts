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

/** Một dòng lô/SP hết hạn cho UI ExpiryAlert */
export type ExpiringEntryItem = {
  entryId: string
  productId: string
  productName: string
  productImageUrl: string | null
  zoneName: string
  locationName: string
  locationType: 'warehouse' | 'market'
  tier: number
  quantityBoxes: number
  expiryDate: string
  daysUntilExpiry: number
}

function daysBetweenLocal(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number)
  const [ty, tm, td] = toIso.split('-').map(Number)
  const from = new Date(fy, fm - 1, fd)
  const to = new Date(ty, tm - 1, td)
  from.setHours(0, 0, 0, 0)
  to.setHours(0, 0, 0, 0)
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function collectEntriesInRange(
  inventoryEntries: InventoryEntry[],
  products: Product[],
  zoneToLoc: Map<string, Location>,
  zonesById: Map<string, Zone>,
  fromIso: string,
  toIso: string,
  todayIso: string,
  excludeEntryIds?: Set<string>,
): ExpiringEntryItem[] {
  const productById = new Map(products.map((p) => [p.id, p]))
  const items: ExpiringEntryItem[] = []

  for (const entry of inventoryEntries) {
    if (!entry.expiry_date) continue
    if (entry.expiry_date < fromIso || entry.expiry_date > toIso) continue
    if (excludeEntryIds?.has(entry.id)) continue

    const product =
      productById.get(entry.product_id) ??
      (entry.product as Product | undefined)
    if (!product || product.is_archived) continue
    if (product.ignore_expiry_warning) continue

    const loc = zoneToLoc.get(entry.zone_id)
    if (!loc) continue
    if (loc.type !== 'warehouse' && loc.type !== 'market') continue

    const zone = zonesById.get(entry.zone_id)
    items.push({
      entryId: entry.id,
      productId: entry.product_id,
      productName: product.name,
      productImageUrl: product.image_url ?? null,
      zoneName: zone?.name ?? '—',
      locationName: loc.name,
      locationType: loc.type,
      tier: entry.tier,
      quantityBoxes: entry.quantity_boxes,
      expiryDate: entry.expiry_date,
      daysUntilExpiry: daysBetweenLocal(todayIso, entry.expiry_date),
    })
  }

  return items
}

function sortExactDayItems(items: ExpiringEntryItem[]): ExpiringEntryItem[] {
  return [...items].sort((a, b) => {
    if (a.locationType !== b.locationType) {
      return a.locationType === 'warehouse' ? -1 : 1
    }
    return a.productName.localeCompare(b.productName, 'vi')
  })
}

function sortRangeItems(items: ExpiringEntryItem[]): ExpiringEntryItem[] {
  return [...items].sort((a, b) => {
    if (a.expiryDate !== b.expiryDate) {
      return a.expiryDate.localeCompare(b.expiryDate)
    }
    return a.productName.localeCompare(b.productName, 'vi')
  })
}

/** Danh sách lô/SP hết hạn đúng một ngày (today + daysFromToday). */
export function getExpiringEntriesExactDay(
  inventoryEntries: InventoryEntry[],
  products: Product[],
  allLocations: Location[],
  zones: Zone[],
  daysFromToday: number,
): ExpiringEntryItem[] {
  const today = localMidnightToday()
  const todayIso = toLocalISODate(today)
  const targetIso = toLocalISODate(addDays(today, daysFromToday))
  const zoneToLoc = buildZoneToLoc(allLocations, zones)
  const zonesById = new Map(zones.map((z) => [z.id, z]))
  const items = collectEntriesInRange(
    inventoryEntries,
    products,
    zoneToLoc,
    zonesById,
    targetIso,
    targetIso,
    todayIso,
  )
  return sortExactDayItems(items)
}

/**
 * Danh sách trong cửa sổ range (7 = tuần, 30 = tháng).
 * `excludeEntryIds` — loại entries đã hiện ở section trước (tránh trùng).
 */
export function getExpiringEntriesRange(
  inventoryEntries: InventoryEntry[],
  products: Product[],
  allLocations: Location[],
  zones: Zone[],
  windowDays: number,
  excludeEntryIds?: Set<string>,
): ExpiringEntryItem[] {
  const today = localMidnightToday()
  const todayIso = toLocalISODate(today)
  const zoneToLoc = buildZoneToLoc(allLocations, zones)
  const zonesById = new Map(zones.map((z) => [z.id, z]))

  let fromIso: string
  let toIso: string
  if (windowDays === 30) {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    fromIso = toLocalISODate(first)
    toIso = toLocalISODate(last)
  } else {
    fromIso = todayIso
    toIso = toLocalISODate(addDays(today, windowDays))
  }

  const items = collectEntriesInRange(
    inventoryEntries,
    products,
    zoneToLoc,
    zonesById,
    fromIso,
    toIso,
    todayIso,
    excludeEntryIds,
  )
  return sortRangeItems(items)
}

/** Đếm warehouse/market từ danh sách UI (sau loại trừ trùng). */
export function countFromExpiringItems(items: ExpiringEntryItem[]): ExpiryModeCounts {
  let warehouse = 0
  const marketIds = new Set<string>()
  for (const item of items) {
    if (item.locationType === 'warehouse') warehouse++
    else marketIds.add(item.productId)
  }
  return { warehouse, market: marketIds.size }
}
