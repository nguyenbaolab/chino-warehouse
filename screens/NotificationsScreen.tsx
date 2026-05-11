import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { formatExpiryDate, getExpiryStatus, InventoryEntry, Product } from '../types'

type ExpiryLotRow = {
  entryId: string
  quantityBoxes: number
  expiryDate?: string
  isPriceReduced: boolean
  status: 'expired' | 'warning'
}

type ExpiryCard = {
  productId: string
  productName: string
  totalBoxes: number
  lots: ExpiryLotRow[]
  hasExpiredLot: boolean
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
  const [showExpiredFilter, setShowExpiredFilter] = useState(false)
  const [showWarningFilter, setShowWarningFilter] = useState(false)
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({})

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
      const lots: ExpiryLotRow[] = []
      for (const entry of entries) {
        totalBoxes += entry.quantity_boxes
        const status = getExpiryStatus(entry.expiry_date, product.warning_days ?? 30)
        if (status === 'expired') {
          hasExpired = true
          lots.push({
            entryId: entry.id,
            quantityBoxes: entry.quantity_boxes,
            expiryDate: entry.expiry_date,
            isPriceReduced: entry.is_price_reduced === true,
            status: 'expired',
          })
        }
        if (status === 'warning') {
          hasWarning = true
          lots.push({
            entryId: entry.id,
            quantityBoxes: entry.quantity_boxes,
            expiryDate: entry.expiry_date,
            isPriceReduced: entry.is_price_reduced === true,
            status: 'warning',
          })
        }
      }
      if (!hasExpired && !hasWarning) continue
      cards.push({
        productId,
        productName: product.name,
        totalBoxes,
        lots,
        hasExpiredLot: hasExpired,
      })
    }
    return cards.sort((a, b) => {
      if (a.hasExpiredLot !== b.hasExpiredLot) return a.hasExpiredLot ? -1 : 1
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

  const expiryCardsFiltered = useMemo(() => {
    return expiryCards
      .map((card) => {
        const filteredLots = card.lots.filter((lot) => {
          if (!showExpiredFilter && !showWarningFilter) return true
          if (showExpiredFilter && showWarningFilter) return true
          if (showExpiredFilter) return lot.status === 'expired'
          if (showWarningFilter) return lot.status === 'warning'
          return true
        })
        return {
          ...card,
          lots: filteredLots,
          hasExpiredLot: filteredLots.some((lot) => lot.status === 'expired'),
        }
      })
      .filter((card) => card.lots.length > 0)
  }, [expiryCards, showExpiredFilter, showWarningFilter])

  const listEmpty = activeTab === 'expiry' ? expiryCardsFiltered.length === 0 : lowStockCards.length === 0

  function toggleExpanded(productId: string) {
    setExpandedProducts((prev) => ({ ...prev, [productId]: !prev[productId] }))
  }

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

      {activeTab === 'expiry' && (
        <View style={[styles.filterBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.filterItem}
            onPress={() => setShowExpiredFilter((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={[styles.tickBox, { borderColor: colors.border, backgroundColor: showExpiredFilter ? colors.accent : colors.bg }]}>
              {showExpiredFilter && <Text style={[styles.tickText, { color: colors.card }]}>✓</Text>}
            </View>
            <Text style={[styles.filterText, { color: colors.text }]}>Hết hạn</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterItem}
            onPress={() => setShowWarningFilter((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={[styles.tickBox, { borderColor: colors.border, backgroundColor: showWarningFilter ? colors.accent : colors.bg }]}>
              {showWarningFilter && <Text style={[styles.tickText, { color: colors.card }]}>✓</Text>}
            </View>
            <Text style={[styles.filterText, { color: colors.text }]}>Sắp hết hạn</Text>
          </TouchableOpacity>
        </View>
      )}

      {listEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.sub }}>
            {activeTab === 'expiry' ? 'Không có sản phẩm sắp hết hạn / hết hạn.' : 'Không có sản phẩm sắp hết hàng.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {activeTab === 'expiry'
            ? expiryCardsFiltered.map((item) => {
                const isExpanded = expandedProducts[item.productId] === true
                const bgColor = item.hasExpiredLot ? colors.badgeExpiredBg : colors.card
                const borderColor = item.hasExpiredLot ? colors.statusExpired : colors.border
                return (
                  <View
                    key={item.productId}
                    style={[styles.item, { backgroundColor: bgColor, borderColor }]}
                  >
                    <TouchableOpacity activeOpacity={0.8} onPress={() => toggleExpanded(item.productId)}>
                      <View style={styles.headerRow}>
                        <View style={styles.leftWrap}>
                          <View style={[styles.titleDot, { backgroundColor: item.hasExpiredLot ? colors.statusExpired : colors.statusWarning }]} />
                          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                            {item.productName}
                          </Text>
                        </View>
                        <Text style={[styles.expandHint, { color: colors.sub }]}>{isExpanded ? 'Thu gọn ▴' : 'Chi tiết ▾'}</Text>
                      </View>
                      <Text style={[styles.line1, { color: colors.text }]}>Còn {item.totalBoxes} thùng</Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.lotList}>
                        {item.lots.map((lot) => {
                          const lotBg = lot.status === 'expired' ? colors.badgeExpiredBg : colors.badgeWarningBg
                          const lotBorder = lot.status === 'expired' ? colors.statusExpired : colors.statusWarning
                          return (
                            <View key={lot.entryId} style={[styles.lotRow, { backgroundColor: lotBg, borderColor: lotBorder }]}>
                              <View style={styles.lotInfo}>
                                <Text style={[styles.lotText, { color: colors.text }]}>
                                  {lot.quantityBoxes} thùng · Hạn: {formatExpiryDate(lot.expiryDate)}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.lotToggleBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                                onPress={() => void togglePriceReduced(lot.entryId)}
                              >
                                <Text style={[styles.lotToggleText, { color: colors.text }]}>
                                  {lot.isPriceReduced ? 'Đã giảm giá' : 'Chưa giảm giá'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )
                        })}
                        {item.lots.some((lot) => lot.status === 'expired') && (
                          <TouchableOpacity
                            style={[styles.expiredNavigateBtn, { borderColor: colors.statusExpired, backgroundColor: colors.bg }]}
                            onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
                          >
                            <Text style={[styles.expiredNavigateText, { color: colors.statusExpired }]}>Hết hạn rồi — mở chi tiết sản phẩm</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
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
  filterBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 16,
  },
  filterItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tickBox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: { fontSize: 12, fontWeight: '800' },
  filterText: { fontSize: 13, fontWeight: '600' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  leftWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  line1: { fontSize: 14, fontWeight: '600', marginTop: 10 },
  expandHint: { fontSize: 12, fontWeight: '600' },
  titleDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8, alignSelf: 'flex-start', marginTop: 2 },
  name: { fontSize: 15, fontWeight: '700', flex: 1, minWidth: 0 },
  lotList: { marginTop: 10, gap: 8 },
  lotRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lotInfo: { flex: 1 },
  lotText: { fontSize: 13, fontWeight: '600' },
  lotToggleBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  lotToggleText: { fontSize: 12, fontWeight: '700' },
  expiredNavigateBtn: {
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  expiredNavigateText: { fontSize: 12, fontWeight: '700' },
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
