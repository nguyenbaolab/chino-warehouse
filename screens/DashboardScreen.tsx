import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import SimplePieChart, { PieSlice } from '../components/SimplePieChart'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { Zone } from '../types'
import { computeDashboardStats } from '../utils/dashboardStats'
import { supabase } from '../lib/supabase'

const COLOR_OK = '#22C55E'
const COLOR_WARN = '#FACC15'
const COLOR_DANGER = '#EF4444'
const COLOR_NEUTRAL = '#9CA3AF'
const FOCUS_FETCH_TTL_MS = 30_000
const REALTIME_DEBOUNCE_MS = 2_000

type PieMode = 'stock' | 'expiry'

type StatCard = {
  key: string
  label: string
  value: number
  color: string
  onPress?: () => void
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const {
    locations,
    products,
    inventoryEntries,
    fetchLocations,
    fetchProducts,
    fetchAllInventoryEntries,
    fetchInventoryByZone,
  } = useWarehouseStore()

  const [filterLocationId, setFilterLocationId] = useState<string | null>(null)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [zonePickerOpen, setZonePickerOpen] = useState(false)
  const [zonesForFilterLoc, setZonesForFilterLoc] = useState<Zone[]>([])
  const [pieMode, setPieMode] = useState<PieMode>('stock')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const lastFetchedAt = useRef(0)
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name)),
    [locations],
  )

  const locationZoneSet = useMemo(() => {
    if (!filterLocationId) return null
    return new Set(zonesForFilterLoc.map((z) => z.id))
  }, [filterLocationId, zonesForFilterLoc])

  const stats = useMemo(
    () =>
      computeDashboardStats(
        products,
        inventoryEntries,
        locations.length,
        locationZoneSet,
        selectedZoneId,
      ),
    [products, inventoryEntries, locations.length, locationZoneSet, selectedZoneId],
  )

  const navigateToNotifications = useCallback(
    (params: {
      initialTab: 'expiry' | 'lowStock'
      showExpiredFilter?: boolean
      showWarningFilter?: boolean
      showOutOfStockFilter?: boolean
      showLowStockFilter?: boolean
    }) => {
      navigation.push('NotificationsFromDashboard', {
        ...params,
        filterLocationId,
        filterZoneId: selectedZoneId,
      })
    },
    [navigation, filterLocationId, selectedZoneId],
  )

  const statCards: StatCard[] = useMemo(
    () => [
      { key: 'totalProducts', label: 'Tổng sản phẩm', value: stats.totalProducts, color: colors.text },
      { key: 'activeSku', label: 'SKU có lô', value: stats.activeSkuCount, color: COLOR_OK },
      {
        key: 'outOfStock',
        label: 'SP hết hàng',
        value: stats.outOfStockProducts,
        color: COLOR_DANGER,
        onPress: () =>
          navigateToNotifications({ initialTab: 'lowStock', showOutOfStockFilter: true }),
      },
      {
        key: 'lowStock',
        label: 'SP sắp hết',
        value: stats.lowStockProducts,
        color: COLOR_WARN,
        onPress: () =>
          navigateToNotifications({ initialTab: 'lowStock', showLowStockFilter: true }),
      },
      {
        key: 'expiredLots',
        label: 'Lô hết hạn',
        value: stats.expiredLots,
        color: COLOR_DANGER,
        onPress: () =>
          navigateToNotifications({ initialTab: 'expiry', showExpiredFilter: true }),
      },
      {
        key: 'warningLots',
        label: 'Lô sắp hết hạn',
        value: stats.warningLots,
        color: COLOR_WARN,
        onPress: () =>
          navigateToNotifications({ initialTab: 'expiry', showWarningFilter: true }),
      },
      {
        key: 'discontinued',
        label: 'Không nhập nữa',
        value: stats.discontinuedProducts,
        color: colors.text,
        onPress: () => navigation.push('DiscontinuedProducts'),
      },
      { key: 'locations', label: 'Tổng số kho', value: stats.locationCount, color: COLOR_OK },
    ],
    [stats, colors.text, navigateToNotifications, navigation],
  )

  const stockPieSlices: PieSlice[] = useMemo(
    () => [
      { label: '🟢 Còn hàng bình thường', value: stats.stockPie.normal, color: COLOR_OK },
      { label: '🟡 Sắp hết', value: stats.stockPie.low, color: COLOR_WARN },
      { label: '🔴 Hết hàng', value: stats.stockPie.out, color: COLOR_DANGER },
    ],
    [stats.stockPie],
  )

  const expiryPieSlices: PieSlice[] = useMemo(
    () => [
      { label: '🟢 Còn hạn', value: stats.expiryPie.ok, color: COLOR_OK },
      { label: '🟡 Sắp hết hạn', value: stats.expiryPie.warning, color: COLOR_WARN },
      { label: '🔴 Hết hạn', value: stats.expiryPie.expired, color: COLOR_DANGER },
      { label: '⚪ Không có hạn', value: stats.expiryPie.noExpiry, color: COLOR_NEUTRAL },
    ],
    [stats.expiryPie],
  )

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await fetchLocations()
      await fetchProducts()
      if (!filterLocationId) {
        await fetchAllInventoryEntries()
      } else if (zonesForFilterLoc.length > 0) {
        await Promise.all(zonesForFilterLoc.map((z) => fetchInventoryByZone(z.id)))
      }
      lastFetchedAt.current = Date.now()
    } finally {
      setIsRefreshing(false)
    }
  }, [
    fetchLocations,
    fetchProducts,
    fetchAllInventoryEntries,
    fetchInventoryByZone,
    filterLocationId,
    zonesForFilterLoc,
  ])

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastFetchedAt.current <= FOCUS_FETCH_TTL_MS) return
      void refreshData()
    }, [refreshData]),
  )

  useEffect(() => {
    if (!filterLocationId) {
      setZonesForFilterLoc([])
      setSelectedZoneId(null)
      return
    }
    let cancelled = false
    void supabase
      .from('zones')
      .select('*')
      .eq('location_id', filterLocationId)
      .order('name')
      .then(({ data }) => {
        if (!cancelled) {
          setZonesForFilterLoc((data as Zone[]) ?? [])
          setSelectedZoneId(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [filterLocationId])

  useEffect(() => {
    if (!filterLocationId) {
      void fetchAllInventoryEntries()
      return
    }
    if (zonesForFilterLoc.length === 0) return
    void Promise.all(zonesForFilterLoc.map((z) => fetchInventoryByZone(z.id)))
  }, [filterLocationId, zonesForFilterLoc, fetchAllInventoryEntries, fetchInventoryByZone])

  useEffect(() => {
    const scheduleRefresh = () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
      realtimeDebounceRef.current = setTimeout(() => {
        realtimeDebounceRef.current = null
        void refreshData()
      }, REALTIME_DEBOUNCE_MS)
    }

    const channel = supabase
      .channel(`dashboard-realtime-${Date.now()}`, {
        config: { private: true },
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_entries' }, scheduleRefresh)
      .subscribe()

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
      realtimeDebounceRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [refreshData])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Tổng quan kho</Text>
        {isRefreshing ? <ActivityIndicator size="small" color={colors.accent} /> : <View style={styles.backBtn} />}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setLocationPickerOpen(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.filterLabel, { color: colors.sub }]}>Kho</Text>
          <Text style={[styles.filterValue, { color: colors.text }]} numberOfLines={1}>
            {filterLocationId
              ? locations.find((l) => l.id === filterLocationId)?.name ?? '…'
              : 'Tất cả kho'}
          </Text>
          <Text style={[styles.filterChevron, { color: colors.sub }]}>▾</Text>
        </TouchableOpacity>

        {filterLocationId ? (
          <TouchableOpacity
            style={[styles.filterRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setZonePickerOpen(true)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterLabel, { color: colors.sub }]}>Zone</Text>
            <Text style={[styles.filterValue, { color: colors.text }]} numberOfLines={1}>
              {selectedZoneId
                ? zonesForFilterLoc.find((z) => z.id === selectedZoneId)?.name ?? '…'
                : 'Tất cả zone'}
            </Text>
            <Text style={[styles.filterChevron, { color: colors.sub }]}>▾</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.filterRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.filterLabel, { color: colors.sub }]}>Zone</Text>
            <Text style={[styles.filterValue, { color: colors.statusWarning }]} numberOfLines={1}>
              Vui lòng chọn kho trước
            </Text>
          </View>
        )}

        <View style={styles.grid}>
          {statCards.map((card) => {
            const cardStyle = [styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]
            const cardContent = (
              <>
                <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
                <Text style={[styles.statLabel, { color: colors.sub }]}>{card.label}</Text>
              </>
            )
            if (card.onPress) {
              return (
                <TouchableOpacity
                  key={card.key}
                  style={cardStyle}
                  activeOpacity={0.75}
                  onPress={card.onPress}
                >
                  {cardContent}
                </TouchableOpacity>
              )
            }
            return (
              <View key={card.key} style={cardStyle}>
                {cardContent}
              </View>
            )
          })}
        </View>

        <View style={[styles.chartSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartModeRow}>
            <TouchableOpacity
              style={[
                styles.chartModeBtn,
                {
                  backgroundColor: pieMode === 'stock' ? colors.accent + '22' : colors.bg,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setPieMode('stock')}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: pieMode === 'stock' ? '700' : '500' }}>
                Theo số lượng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chartModeBtn,
                {
                  backgroundColor: pieMode === 'expiry' ? colors.accent + '22' : colors.bg,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setPieMode('expiry')}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: pieMode === 'expiry' ? '700' : '500' }}>
                Theo hạn sử dụng
              </Text>
            </TouchableOpacity>
          </View>

          <SimplePieChart
            slices={pieMode === 'stock' ? stockPieSlices : expiryPieSlices}
            textColor={colors.text}
            subColor={colors.sub}
          />
        </View>
      </ScrollView>

      <Modal visible={locationPickerOpen} transparent animationType="fade" onRequestClose={() => setLocationPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLocationPickerOpen(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn kho</Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  { borderColor: colors.border, backgroundColor: filterLocationId ? colors.bg : colors.accent + '22' },
                ]}
                onPress={() => {
                  setFilterLocationId(null)
                  setLocationPickerOpen(false)
                }}
              >
                <Text style={[styles.modalOptionText, { color: colors.text, fontWeight: filterLocationId ? '500' : '700' }]}>
                  Tất cả kho
                </Text>
                {!filterLocationId && <Text style={{ color: colors.accent }}>✓</Text>}
              </TouchableOpacity>
              {sortedLocations.map((loc) => {
                const sel = filterLocationId === loc.id
                return (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.modalOption,
                      { borderColor: colors.border, backgroundColor: sel ? colors.accent + '22' : colors.bg },
                    ]}
                    onPress={() => {
                      setFilterLocationId(loc.id)
                      setLocationPickerOpen(false)
                    }}
                  >
                    <Text
                      style={[styles.modalOptionText, { color: colors.text, fontWeight: sel ? '700' : '500' }]}
                      numberOfLines={2}
                    >
                      {loc.name}
                    </Text>
                    {sel && <Text style={{ color: colors.accent }}>✓</Text>}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={zonePickerOpen} transparent animationType="fade" onRequestClose={() => setZonePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setZonePickerOpen(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Chọn zone</Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  { borderColor: colors.border, backgroundColor: selectedZoneId ? colors.bg : colors.accent + '22' },
                ]}
                onPress={() => {
                  setSelectedZoneId(null)
                  setZonePickerOpen(false)
                }}
              >
                <Text style={[styles.modalOptionText, { color: colors.text, fontWeight: selectedZoneId ? '500' : '700' }]}>
                  Tất cả zone
                </Text>
                {!selectedZoneId && <Text style={{ color: colors.accent }}>✓</Text>}
              </TouchableOpacity>
              {zonesForFilterLoc.map((zone) => {
                const sel = selectedZoneId === zone.id
                return (
                  <TouchableOpacity
                    key={zone.id}
                    style={[
                      styles.modalOption,
                      { borderColor: colors.border, backgroundColor: sel ? colors.accent + '22' : colors.bg },
                    ]}
                    onPress={() => {
                      setSelectedZoneId(zone.id)
                      setZonePickerOpen(false)
                    }}
                  >
                    <Text
                      style={[styles.modalOptionText, { color: colors.text, fontWeight: sel ? '700' : '500' }]}
                      numberOfLines={2}
                    >
                      {zone.name}
                    </Text>
                    {sel && <Text style={{ color: colors.accent }}>✓</Text>}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 16 : 12,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  backText: { fontSize: 24, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  filterLabel: { fontSize: 13, width: 48 },
  filterValue: { flex: 1, fontSize: 14, fontWeight: '600' },
  filterChevron: { fontSize: 14, marginLeft: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 88,
    justifyContent: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  chartSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  chartModeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chartModeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: { borderRadius: 14, padding: 16, maxHeight: '70%' },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  modalList: { maxHeight: 360 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  modalOptionText: { flex: 1, fontSize: 14, marginRight: 8 },
})
