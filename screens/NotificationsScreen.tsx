import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { CombinedStatus, getCombinedStatus, getCombinedStatusRank, getExpiryStatus, InventoryEntry, Product } from '../types'

const PILL_RED = '#EF4444'
const PILL_YELLOW = '#FACC15'

type PillLevel = 'red' | 'yellow'

type NotificationCardModel = {
  key: string
  productId: string
  productName: string
  isDeferred: boolean
  totalBoxes: number
  /** Tổng thùng thuộc lô có hạn hết hoặc sắp hết (đỏ/vàng theo `getExpiryStatus`). */
  boxesNearExpiry: number
  worstStatus: CombinedStatus
  worstRank: number
  stockPill?: { label: string; level: PillLevel }
  expiryPill?: { label: string; level: PillLevel }
}

type BuiltCard = NotificationCardModel & { hasCombinedIssue: boolean }

function lotHasCombinedIssue(status: CombinedStatus): boolean {
  return status !== 'ok'
}

function resolveProduct(productId: string, entries: InventoryEntry[], products: Product[]): Product | undefined {
  return products.find((p) => p.id === productId) ?? entries[0]?.product
}

function buildCardModel(productId: string, entries: InventoryEntry[], products: Product[]): BuiltCard {
  const product = resolveProduct(productId, entries, products)
  const productName = product?.name ?? 'Sản phẩm không xác định'
  const warningDays = product?.warning_days ?? 30
  const lowWarningBoxes = product?.low_warning_boxes ?? 3
  const isDeferred = product?.is_deferred === true

  let totalBoxes = 0
  let boxesNearExpiry = 0
  let hasCombinedIssue = false
  let worstStatus: CombinedStatus = 'ok'
  let worstRank = 99

  for (const entry of entries) {
    totalBoxes += entry.quantity_boxes
    const es = getExpiryStatus(entry.expiry_date, warningDays)
    if (es === 'expired' || es === 'warning') {
      boxesNearExpiry += entry.quantity_boxes
    }

    const status = getCombinedStatus(
      entry.quantity_boxes,
      entry.expiry_date,
      entry.product?.low_warning_boxes ?? lowWarningBoxes,
      1,
      entry.product?.warning_days ?? warningDays
    )
    const rank = getCombinedStatusRank(status)
    if (rank < worstRank) {
      worstRank = rank
      worstStatus = status
    }
    if (lotHasCombinedIssue(status)) {
      hasCombinedIssue = true
    }
  }

  let stockPill: NotificationCardModel['stockPill']
  const t = totalBoxes
  if (t <= 0) stockPill = { label: 'Hết hàng', level: 'red' }
  else if (t === 1) stockPill = { label: 'Còn rất ít', level: 'red' }
  else if (t <= lowWarningBoxes) stockPill = { label: 'Sắp hết hàng', level: 'yellow' }

  let hasExpiryRed = false
  let hasExpiryYellow = false
  for (const entry of entries) {
    const es = getExpiryStatus(entry.expiry_date, warningDays)
    if (es === 'expired') hasExpiryRed = true
    else if (es === 'warning') hasExpiryYellow = true
  }
  const expiryPill: NotificationCardModel['expiryPill'] = hasExpiryRed
    ? { label: 'Hết hạn', level: 'red' }
    : hasExpiryYellow
      ? { label: 'Sắp hết hạn', level: 'yellow' }
      : undefined

  const pillsShowStock = stockPill && (stockPill.level === 'red' || stockPill.level === 'yellow')
  const pillsShowExpiry = expiryPill && (expiryPill.level === 'red' || expiryPill.level === 'yellow')

  return {
    key: productId,
    productId,
    productName,
    isDeferred,
    totalBoxes,
    boxesNearExpiry,
    worstStatus,
    worstRank,
    stockPill: pillsShowStock ? stockPill : undefined,
    expiryPill: pillsShowExpiry ? expiryPill : undefined,
    hasCombinedIssue,
  }
}

function toPublicCard(c: BuiltCard): NotificationCardModel {
  const { hasCombinedIssue: _, ...rest } = c
  return rest
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
    toggleDeferred,
  } = useWarehouseStore()

  const [activeTab, setActiveTab] = useState<'issues' | 'deferred'>('issues')

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

  const allCardsWithMeta = useMemo(() => {
    const out: BuiltCard[] = []
    for (const productId of productIdToEntries.keys()) {
      const entries = productIdToEntries.get(productId) ?? []
      out.push(buildCardModel(productId, entries, products))
    }
    return out
  }, [productIdToEntries, products])

  const issuesItems = useMemo(() => {
    return allCardsWithMeta
      .filter((c) => !c.isDeferred && c.hasCombinedIssue)
      .map(toPublicCard)
      .sort((a, b) => a.worstRank - b.worstRank)
  }, [allCardsWithMeta])

  const deferredItems = useMemo(() => {
    const list: NotificationCardModel[] = []
    for (const p of products) {
      if (p.is_deferred !== true) continue
      const entries = productIdToEntries.get(p.id) ?? []
      list.push(toPublicCard(buildCardModel(p.id, entries, products)))
    }
    return list.sort((a, b) => a.productName.localeCompare(b.productName))
  }, [products, productIdToEntries])

  const listEmpty =
    activeTab === 'issues' ? issuesItems.length === 0 : deferredItems.length === 0

  function renderPill(
    pill: { label: string; level: PillLevel },
    key: string
  ) {
    const isRed = pill.level === 'red'
    return (
      <View
        key={key}
        style={[
          styles.pill,
          {
            backgroundColor: isRed ? colors.badgeExpiredBg : colors.badgeWarningBg,
            borderColor: isRed ? PILL_RED : PILL_YELLOW,
          },
        ]}
      >
        <Text style={[styles.pillText, { color: isRed ? PILL_RED : PILL_YELLOW }]} numberOfLines={1}>
          {pill.label}
        </Text>
      </View>
    )
  }

  function renderCard(item: NotificationCardModel, mode: 'issues' | 'deferred') {
    const dotColor =
      item.worstStatus === 'expired'
        ? colors.statusExpired
        : item.worstStatus === 'critical'
          ? colors.statusCritical
          : item.worstStatus === 'warning'
            ? colors.statusWarning
            : colors.statusOk

    return (
      <View
        key={item.key}
        style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
        >
          <View style={styles.headerRow}>
            <View style={styles.leftWrap}>
              <View style={[styles.titleDot, { backgroundColor: dotColor }]} />
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {item.productName}
              </Text>
            </View>
          </View>
          <Text style={[styles.line1, { color: colors.text }]}>
            Còn {item.totalBoxes} thùng
          </Text>
          <Text style={[styles.line2, { color: colors.sub }]}>
            Số thùng sắp hết hạn: {item.boxesNearExpiry} thùng
          </Text>
          {(item.stockPill || item.expiryPill) && (
            <View style={styles.pillsRow}>
              {item.stockPill ? renderPill(item.stockPill, 'stock') : null}
              {item.expiryPill ? renderPill(item.expiryPill, 'exp') : null}
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.deferBtn,
            {
              backgroundColor: mode === 'issues' ? colors.bg : colors.accent,
              borderColor: colors.border,
            },
          ]}
          onPress={() => void toggleDeferred(item.productId)}
        >
          <Text
            style={[
              styles.deferBtnText,
              { color: mode === 'issues' ? colors.text : colors.card },
            ]}
          >
            {mode === 'issues' ? 'Để sau' : 'Có vấn đề'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  const displayList = activeTab === 'issues' ? issuesItems : deferredItems

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>🔔 Thông báo</Text>

      <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            {
              backgroundColor: activeTab === 'issues' ? colors.accent : colors.bg,
              borderColor: activeTab === 'issues' ? colors.accent : colors.border,
            },
          ]}
          onPress={() => setActiveTab('issues')}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'issues' ? colors.card : colors.sub }]}>
            Có vấn đề
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            {
              backgroundColor: activeTab === 'deferred' ? colors.accent : colors.bg,
              borderColor: activeTab === 'deferred' ? colors.accent : colors.border,
            },
          ]}
          onPress={() => setActiveTab('deferred')}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'deferred' ? colors.card : colors.sub }]}>
            Để sau
          </Text>
        </TouchableOpacity>
      </View>

      {listEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.sub }}>
            {activeTab === 'issues' ? 'Không có sản phẩm cần xử lý.' : 'Chưa có sản phẩm Để sau.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {displayList.map((item) => renderCard(item, activeTab))}
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
  line2: { fontSize: 13, marginTop: 4 },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  titleDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8, alignSelf: 'flex-start', marginTop: 2 },
  name: { fontSize: 15, fontWeight: '700', flex: 1, minWidth: 0 },
  deferBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  deferBtnText: { fontSize: 14, fontWeight: '700' },
})
