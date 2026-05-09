import { useEffect, useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { formatExpiryDate, getCombinedStatus, getCombinedStatusRank, getExpiryStatus } from '../types'

type NotificationItem = {
  key: string
  severity: 1 | 2 | 3 | 4
  icon: string
  productId: string
  productName: string
  zoneName: string
  tier: number
  quantityBoxes: number
  expiryDate?: string
  combinedStatus: 'expired' | 'critical' | 'warning' | 'ok'
  expiryBadge?: { label: string; tone: 'expired' | 'warning' }
  stockBadge?: { label: string; tone: 'expired' | 'warning' }
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
      let worstEntry = entries[0]
      let worstRank = 99
      let worstStatus: 'expired' | 'critical' | 'warning' | 'ok' = 'ok'

      for (const entry of entries) {
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
          worstEntry = entry
          worstStatus = status
        }
      }

      const expiryStatus = getExpiryStatus(worstEntry.expiry_date, warningDays)
      const expiryBadge = expiryStatus === 'expired'
        ? { label: 'Đã hết hạn', tone: 'expired' as const }
        : expiryStatus === 'warning'
          ? { label: 'Sắp hết hạn', tone: 'warning' as const }
          : undefined

      const stockBadge = worstEntry.quantity_boxes <= 0
        ? { label: 'Đã hết hàng', tone: 'expired' as const }
        : worstEntry.quantity_boxes <= lowCriticalBoxes
          ? { label: 'Còn rất ít', tone: 'expired' as const }
          : worstEntry.quantity_boxes <= lowWarningBoxes
            ? { label: 'Sắp hết hàng', tone: 'warning' as const }
            : undefined

      if (!expiryBadge && !stockBadge) continue

      items.push({
        key: `${productId}-${worstEntry.id}`,
        severity: worstRank as 1 | 2 | 3 | 4,
        icon: worstStatus === 'expired' ? '🔴' : worstStatus === 'critical' ? '🟠' : worstStatus === 'warning' ? '🟡' : '🟢',
        productId,
        productName,
        zoneName: worstEntry.zone?.name ?? 'Zone?',
        tier: worstEntry.tier,
        quantityBoxes: worstEntry.quantity_boxes,
        expiryDate: worstEntry.expiry_date,
        combinedStatus: worstStatus,
        expiryBadge,
        stockBadge,
      })
    }

    return items.sort((a, b) => a.severity - b.severity)
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
                <View style={styles.row}>
                  <Text style={[styles.icon, { color: colors.text }]}>{item.icon}</Text>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.productName}</Text>
                </View>
                <View style={styles.badgesRow}>
                  {item.expiryBadge && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: item.expiryBadge.tone === 'expired'
                            ? colors.badgeExpiredBg
                            : colors.badgeWarningBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: item.expiryBadge.tone === 'expired' ? colors.statusExpired : colors.statusWarning },
                        ]}
                      >
                        {item.expiryBadge.label}
                      </Text>
                    </View>
                  )}
                  {item.stockBadge && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: item.stockBadge.tone === 'expired'
                            ? colors.badgeExpiredBg
                            : colors.badgeWarningBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: item.stockBadge.tone === 'expired' ? colors.statusExpired : colors.statusWarning },
                        ]}
                      >
                        {item.stockBadge.label}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.sub, { color: colors.sub }]}>
                {item.zoneName} · Tầng {item.tier} · {item.quantityBoxes} thùng
              </Text>
              <View style={styles.row}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: item.combinedStatus === 'expired'
                        ? colors.statusExpired
                        : item.combinedStatus === 'critical'
                          ? colors.statusCritical
                          : item.combinedStatus === 'warning'
                            ? colors.statusWarning
                            : colors.statusOk,
                    },
                  ]}
                />
                <Text style={[styles.sub, { color: colors.sub }]}>Hạn: {formatExpiryDate(item.expiryDate)}</Text>
              </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 6 },
  name: { fontSize: 14, fontWeight: '700', flex: 1 },
  badgesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '58%' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
})
