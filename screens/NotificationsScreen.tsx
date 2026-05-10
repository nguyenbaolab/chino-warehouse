import { useEffect, useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { CombinedStatus, getCombinedStatus, getCombinedStatusRank, getExpiryStatus } from '../types'

/** Màu pill theo mức combined (đỏ = hết/critical tồn hoặc hết hạn; vàng = sắp hết / warning). */
const PILL_RED = '#EF4444'
const PILL_YELLOW = '#FACC15'

function lotHasIssueStatus(status: CombinedStatus): boolean {
  return status !== 'ok'
}

type PillLevel = 'red' | 'yellow'

type NotificationItem = {
  key: string
  productId: string
  productName: string
  totalBoxes: number
  issueBoxes: number
  worstStatus: CombinedStatus
  worstRank: number
  /** Tồn kho: Hết hàng (đỏ) / Sắp hết hàng (vàng) — theo ngưỡng thùng, không trộn hạn */
  stockPill?: { label: string; level: PillLevel }
  /** Hạn: Hết hạn (đỏ) / Sắp hết hạn (vàng) — getExpiryStatus */
  expiryPill?: { label: string; level: PillLevel }
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const { zones, inventoryEntries, fetchLocations, fetchInventoryByZone } = useWarehouseStore()

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  useEffect(() => {
    if (zones.length === 0) return
    Promise.all(zones.map((zone) => fetchInventoryByZone(zone.id)))
  }, [zones, fetchInventoryByZone])

  const notifications = useMemo<NotificationItem[]>(() => {
    const productMap = new Map<string, typeof inventoryEntries>()
    for (const entry of inventoryEntries) {
      const current = productMap.get(entry.product_id)
      if (current) current.push(entry)
      else productMap.set(entry.product_id, [entry])
    }

    const items: NotificationItem[] = []
    for (const [productId, entries] of productMap.entries()) {
      const productName = entries[0]?.product?.name ?? 'Sản phẩm không xác định'
      const product = entries[0]?.product
      const warningDays = product?.warning_days ?? 30
      const lowWarningBoxes = product?.low_warning_boxes ?? 3
      const lowCriticalBoxes = product?.low_critical_boxes ?? 1

      let totalBoxes = 0
      let issueBoxes = 0
      let worstStatus: CombinedStatus = 'ok'
      let worstRank = 99

      for (const entry of entries) {
        totalBoxes += entry.quantity_boxes
        const status = getCombinedStatus(
          entry.quantity_boxes,
          entry.expiry_date,
          entry.product?.low_warning_boxes ?? lowWarningBoxes,
          entry.product?.low_critical_boxes ?? lowCriticalBoxes,
          entry.product?.warning_days ?? warningDays
        )
        const rank = getCombinedStatusRank(status)
        if (rank < worstRank) {
          worstRank = rank
          worstStatus = status
        }
        if (lotHasIssueStatus(status)) {
          issueBoxes += entry.quantity_boxes
        }
      }

      if (issueBoxes === 0) continue

      let hasStockRed = false
      let hasStockYellow = false
      let hasExpiryRed = false
      let hasExpiryYellow = false
      for (const entry of entries) {
        const q = entry.quantity_boxes
        if (q <= 0) hasStockRed = true
        else if (q <= lowCriticalBoxes) hasStockRed = true
        else if (q <= lowWarningBoxes) hasStockYellow = true

        const es = getExpiryStatus(entry.expiry_date, warningDays)
        if (es === 'expired') hasExpiryRed = true
        else if (es === 'warning') hasExpiryYellow = true
      }

      const stockPill = hasStockRed
        ? { label: 'Hết hàng', level: 'red' as const }
        : hasStockYellow
          ? { label: 'Sắp hết hàng', level: 'yellow' as const }
          : undefined

      const expiryPill = hasExpiryRed
        ? { label: 'Hết hạn', level: 'red' as const }
        : hasExpiryYellow
          ? { label: 'Sắp hết hạn', level: 'yellow' as const }
          : undefined

      items.push({
        key: productId,
        productId,
        productName,
        totalBoxes,
        issueBoxes,
        worstStatus,
        worstRank,
        stockPill,
        expiryPill,
      })
    }

    return items.sort((a, b) => a.worstRank - b.worstRank)
  }, [inventoryEntries])

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>🔔 Thông báo</Text>

      {notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.sub }}>Không có cảnh báo nào</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notifications.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
            >
              <View style={styles.headerRow}>
                <View style={styles.leftWrap}>
                  <View
                    style={[
                      styles.titleDot,
                      {
                        backgroundColor: item.worstStatus === 'expired'
                          ? colors.statusExpired
                          : item.worstStatus === 'critical'
                            ? colors.statusCritical
                            : item.worstStatus === 'warning'
                              ? colors.statusWarning
                              : colors.statusOk,
                      },
                    ]}
                  />
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{item.productName}</Text>
                </View>
              </View>
              <Text style={[styles.summary, { color: colors.sub }]}>
                Tổng {item.totalBoxes} thùng | {item.issueBoxes} thùng có vấn đề
              </Text>
              {(item.stockPill || item.expiryPill) && (
                <View style={styles.pillsRow}>
                  {item.stockPill && (
                    <View
                      style={[
                        styles.pill,
                        {
                          backgroundColor: item.stockPill.level === 'red' ? colors.badgeExpiredBg : colors.badgeWarningBg,
                          borderColor: item.stockPill.level === 'red' ? PILL_RED : PILL_YELLOW,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: item.stockPill.level === 'red' ? PILL_RED : PILL_YELLOW },
                        ]}
                        numberOfLines={1}
                      >
                        {item.stockPill.label}
                      </Text>
                    </View>
                  )}
                  {item.expiryPill && (
                    <View
                      style={[
                        styles.pill,
                        {
                          backgroundColor: item.expiryPill.level === 'red' ? colors.badgeExpiredBg : colors.badgeWarningBg,
                          borderColor: item.expiryPill.level === 'red' ? PILL_RED : PILL_YELLOW,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: item.expiryPill.level === 'red' ? PILL_RED : PILL_YELLOW },
                        ]}
                        numberOfLines={1}
                      >
                        {item.expiryPill.label}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  leftWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  titleDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8, alignSelf: 'flex-start', marginTop: 2 },
  name: { fontSize: 15, fontWeight: '700', flex: 1, minWidth: 0 },
  summary: { fontSize: 13, marginTop: 8, fontWeight: '600' },
})
