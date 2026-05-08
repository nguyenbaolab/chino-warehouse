import { useEffect, useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { formatExpiryDate, getExpiryColor, getExpiryColorHex } from '../types'

type NotificationItem = {
  key: string
  severity: 1 | 2 | 3
  icon: string
  iconColor: string
  productId: string
  productName: string
  zoneName: string
  tier: number
  quantityBoxes: number
  expiryDate?: string
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
      const warningDays = entries[0]?.product?.warning_days ?? 30
      let worstEntry = entries[0]
      let worstRank = 3 // red=1 yellow=2 green=3
      let hasLowStock = false

      for (const entry of entries) {
        if (entry.quantity_boxes <= 1) hasLowStock = true
        const color = getExpiryColor(entry.expiry_date, warningDays)
        const rank = color === 'red' ? 1 : color === 'yellow' ? 2 : 3
        if (rank < worstRank) {
          worstRank = rank
          worstEntry = entry
        }
      }

      // Chỉ hiện nếu có expiry đỏ/vàng hoặc có lot sắp hết hàng
      if (worstRank === 3 && !hasLowStock) continue

      let severity: 1 | 2 | 3 = 2
      let icon = '🟡'
      let iconColor = '#F59E0B'
      if (worstRank === 1) {
        severity = 1
        icon = '🔴'
        iconColor = '#EF4444'
      } else if (worstRank === 2) {
        severity = 2
        icon = '🟡'
        iconColor = '#F59E0B'
      } else {
        // Hạn xa nhưng sắp hết hàng
        severity = 3
        icon = '🟠'
        iconColor = '#F97316'
      }

      items.push({
        key: `${productId}-${worstEntry.id}`,
        severity,
        icon,
        iconColor,
        productId,
        productName,
        zoneName: worstEntry.zone?.name ?? 'Zone?',
        tier: worstEntry.tier,
        quantityBoxes: worstEntry.quantity_boxes,
        expiryDate: worstEntry.expiry_date,
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
              <View style={styles.row}>
                <Text style={[styles.icon, { color: item.iconColor }]}>{item.icon}</Text>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.productName}</Text>
              </View>
              <Text style={[styles.sub, { color: colors.sub }]}>
                {item.zoneName} · Tầng {item.tier} · {item.quantityBoxes} thùng
              </Text>
              <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: item.severity === 3 ? '#F97316' : getExpiryColorHex(item.expiryDate, 30) }]} />
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
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 6 },
  name: { fontSize: 14, fontWeight: '700', flex: 1 },
  sub: { fontSize: 12, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
})
