import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { getExpiryStatus, InventoryEntry, Product } from '../types'

type ExpiryCard = {
  productId: string
  productName: string
  totalBoxes: number
  isExpired: boolean
  isPriceReduced: boolean
}

type LowStockCard = {
  productId: string
  productName: string
  totalBoxes: number
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const {
    zones,
    products,
    inventoryEntries,
    fetchLocations,
    fetchProducts,
    fetchInventoryByZone,
    togglePriceReduced,
    toggleDiscontinued,
  } = useWarehouseStore()

  const [activeTab, setActiveTab] = useState<'expiry' | 'lowStock'>('expiry')

  useEffect(() => {
    fetchLocations()
    fetchProducts()
  }, [fetchLocations, fetchProducts])

  useEffect(() => {
    if (zones.length === 0) return
    void Promise.all(zones.map((zone) => fetchInventoryByZone(zone.id)))
  }, [zones, fetchInventoryByZone])

  const productIdToEntries = useMemo(() => {
    const map = new Map<string, InventoryEntry[]>()
    for (const entry of inventoryEntries) {
      const list = map.get(entry.product_id)
      if (list) list.push(entry)
      else map.set(entry.product_id, [entry])
    }
    return map
  }, [inventoryEntries])

  const expiryCards = useMemo(() => {
    const cards: ExpiryCard[] = []
    for (const [productId, entries] of productIdToEntries.entries()) {
      if (entries.length === 0) continue
      const product: Product | undefined = products.find((p) => p.id === productId) ?? entries[0]?.product
      if (!product || product.is_archived) continue

      let totalBoxes = 0
      let hasExpired = false
      let hasWarning = false
      for (const entry of entries) {
        totalBoxes += entry.quantity_boxes
        const status = getExpiryStatus(entry.expiry_date, product.warning_days ?? 30)
        if (status === 'expired') hasExpired = true
        if (status === 'warning') hasWarning = true
      }
      if (!hasExpired && !hasWarning) continue
      cards.push({
        productId,
        productName: product.name,
        totalBoxes,
        isExpired: hasExpired,
        isPriceReduced: product.is_price_reduced === true,
      })
    }
    return cards.sort((a, b) => {
      if (a.isExpired !== b.isExpired) return a.isExpired ? -1 : 1
      return a.productName.localeCompare(b.productName)
    })
  }, [productIdToEntries, products])

  const lowStockCards = useMemo(() => {
    const cards: LowStockCard[] = []
    for (const [productId, entries] of productIdToEntries.entries()) {
      if (entries.length === 0) continue
      const product: Product | undefined = products.find((p) => p.id === productId) ?? entries[0]?.product
      if (!product || product.is_archived || product.is_discontinued === true) continue

      const totalBoxes = entries.reduce((sum, e) => sum + e.quantity_boxes, 0)
      const lowWarning = product.low_warning_boxes ?? 3
      if (totalBoxes <= lowWarning || totalBoxes === 0) {
        cards.push({
          productId,
          productName: product.name,
          totalBoxes,
        })
      }
    }
    return cards.sort((a, b) => a.productName.localeCompare(b.productName))
  }, [productIdToEntries, products])

  const listEmpty = activeTab === 'expiry' ? expiryCards.length === 0 : lowStockCards.length === 0

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>🔔 Thông báo</Text>

      <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            {
              backgroundColor: activeTab === 'expiry' ? colors.accent : colors.bg,
              borderColor: activeTab === 'expiry' ? colors.accent : colors.border,
            },
          ]}
          onPress={() => setActiveTab('expiry')}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'expiry' ? colors.card : colors.sub }]}>
            Sắp hết hạn
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            {
              backgroundColor: activeTab === 'lowStock' ? colors.accent : colors.bg,
              borderColor: activeTab === 'lowStock' ? colors.accent : colors.border,
            },
          ]}
          onPress={() => setActiveTab('lowStock')}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'lowStock' ? colors.card : colors.sub }]}>
            Sắp hết hàng
          </Text>
        </TouchableOpacity>
      </View>

      {listEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.sub }}>
            {activeTab === 'expiry' ? 'Không có sản phẩm sắp hết hạn / hết hạn.' : 'Không có sản phẩm sắp hết hàng.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {activeTab === 'expiry'
            ? expiryCards.map((item) => {
                const bgColor = item.isExpired ? colors.badgeExpiredBg : colors.card
                const borderColor = item.isExpired ? colors.statusExpired : colors.border
                return (
                  <TouchableOpacity
                    key={item.productId}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (item.isExpired) {
                        navigation.navigate('ProductDetail', { productId: item.productId })
                      }
                    }}
                    style={[styles.item, { backgroundColor: bgColor, borderColor }]}
                  >
                    <View style={styles.headerRow}>
                      <View style={styles.leftWrap}>
                        <View style={[styles.titleDot, { backgroundColor: item.isExpired ? colors.statusExpired : colors.statusWarning }]} />
                        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                          {item.productName}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.line1, { color: colors.text }]}>Còn {item.totalBoxes} thùng</Text>
                    {item.isExpired ? (
                      <Text style={[styles.expiredLabel, { color: colors.statusExpired }]}>Hết hạn rồi</Text>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                        onPress={() => void togglePriceReduced(item.productId)}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.text }]}>
                          {item.isPriceReduced ? 'Đã giảm giá' : 'Chưa giảm giá'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                )
              })
            : lowStockCards.map((item) => (
                <View key={item.productId} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.headerRow}>
                    <View style={styles.leftWrap}>
                      <View style={[styles.titleDot, { backgroundColor: item.totalBoxes <= 0 ? colors.statusCritical : colors.statusWarning }]} />
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                        {item.productName}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.line1, { color: colors.text }]}>Còn {item.totalBoxes} thùng</Text>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.secondaryBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      onPress={() => {
                        console.log('[Notifications] add to purchase list placeholder', item.productId)
                      }}
                    >
                      <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Thêm vào danh sách nhập</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                      onPress={() => void toggleDiscontinued(item.productId)}
                    >
                      <Text style={[styles.primaryBtnText, { color: colors.card }]}>Không nhập nữa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabBtnText: { fontSize: 14, fontWeight: '700' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  leftWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  line1: { fontSize: 14, fontWeight: '600', marginTop: 10 },
  expiredLabel: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  titleDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8, alignSelf: 'flex-start', marginTop: 2 },
  name: { fontSize: 15, fontWeight: '700', flex: 1, minWidth: 0 },
  actionBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 12, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 12, fontWeight: '700' },
})
