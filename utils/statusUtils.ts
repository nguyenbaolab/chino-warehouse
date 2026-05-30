import type { ThemeColors } from '../stores/themeStore'
import {
  CombinedStatus,
  getCombinedStatus,
  getCombinedStatusRank,
  getExpiryStatus,
  InventoryEntry,
  Product,
} from '../types'

export type DisplayColorContext = {
  quantity_boxes: number
  expiry_date?: string
  low_warning_boxes?: number
  low_critical_boxes?: number
  warning_days?: number
}

function getRawCombinedColor(status: CombinedStatus, colors: ThemeColors): string {
  if (status === 'expired') return colors.statusExpired
  if (status === 'critical') return colors.statusCritical
  if (status === 'warning') return colors.statusWarning
  return colors.statusOk
}

/** Màu hiển thị theo toggle cảnh báo — không đổi logic `getCombinedStatus`. */
export function getDisplayColor(
  status: CombinedStatus,
  colors: ThemeColors,
  expiryWarningEnabled: boolean,
  lowStockWarningEnabled: boolean,
  context?: DisplayColorContext,
): string {
  if (!expiryWarningEnabled && !lowStockWarningEnabled) {
    return colors.sub
  }

  if (!context) {
    if (status === 'ok') return colors.statusOk
    if (status === 'expired') {
      return expiryWarningEnabled ? colors.statusExpired : colors.sub
    }
    if (status === 'critical' || status === 'warning') {
      return lowStockWarningEnabled ? getRawCombinedColor(status, colors) : colors.sub
    }
    return colors.sub
  }

  const warningDays = context.warning_days ?? 30
  const lowWarn = context.low_warning_boxes ?? 3
  const lowCrit = context.low_critical_boxes ?? 1
  const qty = context.quantity_boxes
  const expirySt = getExpiryStatus(context.expiry_date, warningDays)

  type Issue = { rank: number; color: string; kind: 'expiry' | 'stock' }
  const issues: Issue[] = []

  if (expirySt === 'expired') {
    issues.push({ rank: 1, color: colors.statusExpired, kind: 'expiry' })
  }
  if (expirySt === 'warning') {
    issues.push({ rank: 3, color: colors.statusWarning, kind: 'expiry' })
  }
  if (qty <= 0) {
    issues.push({ rank: 1, color: colors.statusExpired, kind: 'stock' })
  } else if (qty <= lowCrit) {
    issues.push({ rank: 2, color: colors.statusCritical, kind: 'stock' })
  } else if (qty <= lowWarn) {
    issues.push({ rank: 3, color: colors.statusWarning, kind: 'stock' })
  }

  const visible = issues.filter((issue) =>
    issue.kind === 'expiry' ? expiryWarningEnabled : lowStockWarningEnabled,
  )
  if (visible.length === 0) return colors.statusOk
  visible.sort((a, b) => a.rank - b.rank)
  return visible[0].color
}

export function getDisplayColorContextFromEntry(
  entry: InventoryEntry,
  product?: Product,
): DisplayColorContext {
  return {
    quantity_boxes: entry.quantity_boxes,
    expiry_date: entry.expiry_date,
    low_warning_boxes: product?.low_warning_boxes ?? entry.product?.low_warning_boxes ?? 3,
    low_critical_boxes: product?.low_critical_boxes ?? entry.product?.low_critical_boxes ?? 1,
    warning_days: product?.warning_days ?? entry.product?.warning_days ?? 30,
  }
}

export function getDisplayColorForEntry(
  entry: InventoryEntry,
  product: Product | undefined,
  colors: ThemeColors,
  expiryWarningEnabled: boolean,
  lowStockWarningEnabled: boolean,
): string {
  const ctx = getDisplayColorContextFromEntry(entry, product)
  const status = getCombinedStatus(
    ctx.quantity_boxes,
    ctx.expiry_date,
    ctx.low_warning_boxes,
    ctx.low_critical_boxes,
    ctx.warning_days,
  )
  return getDisplayColor(status, colors, expiryWarningEnabled, lowStockWarningEnabled, ctx)
}

/** Nền/viền lô theo hạn (tab Thông báo — Sắp hết hạn). */
export function getExpiryLotSurfaceColors(
  expiryLotStatus: 'expired' | 'warning',
  colors: ThemeColors,
  expiryWarningEnabled: boolean,
): { backgroundColor: string; borderColor: string; dotColor: string } {
  if (!expiryWarningEnabled) {
    return {
      backgroundColor: colors.bg,
      borderColor: colors.border,
      dotColor: colors.sub,
    }
  }
  if (expiryLotStatus === 'expired') {
    return {
      backgroundColor: colors.badgeExpiredBg,
      borderColor: colors.statusExpired,
      dotColor: colors.statusExpired,
    }
  }
  return {
    backgroundColor: colors.badgeWarningBg,
    borderColor: colors.statusWarning,
    dotColor: colors.statusWarning,
  }
}

export function getExpiryCardHeaderColors(
  hasExpiredLot: boolean,
  colors: ThemeColors,
  expiryWarningEnabled: boolean,
): { backgroundColor: string; borderColor: string; dotColor: string } {
  if (!expiryWarningEnabled) {
    return {
      backgroundColor: colors.card,
      borderColor: colors.border,
      dotColor: colors.sub,
    }
  }
  if (hasExpiredLot) {
    return {
      backgroundColor: colors.badgeExpiredBg,
      borderColor: colors.statusExpired,
      dotColor: colors.statusExpired,
    }
  }
  return {
    backgroundColor: colors.card,
    borderColor: colors.border,
    dotColor: colors.statusWarning,
  }
}

export function getWorstDisplayColorForEntries(
  entries: InventoryEntry[],
  product: Product | undefined,
  colors: ThemeColors,
  expiryWarningEnabled: boolean,
  lowStockWarningEnabled: boolean,
): string {
  if (entries.length === 0) return colors.sub

  let worstRank = 99
  let worstColor = colors.statusOk
  for (const entry of entries) {
    const ctx = getDisplayColorContextFromEntry(entry, product)
    const status = getCombinedStatus(
      ctx.quantity_boxes,
      ctx.expiry_date,
      ctx.low_warning_boxes,
      ctx.low_critical_boxes,
      ctx.warning_days,
    )
    const rank = getCombinedStatusRank(status)
    if (rank < worstRank) {
      worstRank = rank
      worstColor = getDisplayColor(
        status,
        colors,
        expiryWarningEnabled,
        lowStockWarningEnabled,
        ctx,
      )
    }
  }
  return worstColor
}
