import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useShallow } from 'zustand/react/shallow'
import SimplePieChart, { PieSlice } from '../components/SimplePieChart'
import FilterModal, { formatFilterSummary, type FilterMode } from '../components/FilterModal'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { Location, Zone } from '../types'
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
  } = useWarehouseStore(
    useShallow((s) => ({
      locations: s.locations,
      products: s.products,
      inventoryEntries: s.inventoryEntries,
      fetchLocations: s.fetchLocations,
      fetchProducts: s.fetchProducts,
      fetchAllInventoryEntries: s.fetchAllInventoryEntries,
      fetchInventoryByZone: s.fetchInventoryByZone,
    })),
  )

  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [filterLocationId, setFilterLocationId] = useState<string | null>(null)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filterLocations, setFilterLocations] = useState<Location[]>([])
  const [zonesForFilterLoc, setZonesForFilterLoc] = useState<Zone[]>([])
  const [modeZoneIds, setModeZoneIds] = useState<Set<string> | null>(null)
  const [pieMode, setPieMode] = useState<PieMode>('stock')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const lastFetchedAt = useRef(0)
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** KI-092 — đếm refreshData chồng nhau; chỉ tắt spinner khi về 0 */
  const inFlightRefreshCountRef = useRef(0)
  const refreshDataRef = useRef<
    ((source?: 'realtime' | 'manual') => Promise<void>) | null
  >(null)
  /** Skip fetch inventory theo filter ở lần mount đầu (focus lo) */
  const filterInventoryFetchMountedRef = useRef(false)
  const prevFilterLocationIdForFetchRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadFilterLocations() {
      let query = supabase.from('locations').select('*').order('name')
      if (filterMode !== 'all') query = query.eq('type', filterMode)
      const { data } = await query
      if (!cancelled) setFilterLocations((data as Location[]) ?? [])
    }
    void loadFilterLocations()
    return () => { cancelled = true }
  }, [filterMode])

  const filterModeMountedRef = useRef(false)
  useEffect(() => {
    if (!filterModeMountedRef.current) {
      filterModeMountedRef.current = true
      return
    }
    setFilterLocationId(null)
    setSelectedZoneId(null)
  }, [filterMode])

  useEffect(() => {
    if (filterMode === 'all' || filterLocationId) {
      setModeZoneIds(null)
      return
    }
    const locIds = filterLocations.map((l) => l.id)
    if (locIds.length === 0) {
      setModeZoneIds(new Set())
      return
    }
    let cancelled = false
    void supabase
      .from('zones')
      .select('id')
      .in('location_id', locIds)
      .then(({ data }) => {
        if (!cancelled) setModeZoneIds(new Set(((data as { id: string }[]) ?? []).map((z) => z.id)))
      })
    return () => { cancelled = true }
  }, [filterMode, filterLocations, filterLocationId])

  const locationZoneSet = useMemo(() => {
    if (!filterLocationId) return null
    return new Set(zonesForFilterLoc.map((z) => z.id))
  }, [filterLocationId, zonesForFilterLoc])

  const filterSummary = formatFilterSummary({
    mode: filterMode,
    locationId: filterLocationId,
    zoneId: selectedZoneId,
    locations: filterLocations,
    zones: zonesForFilterLoc,
  })

  const effectiveZoneSet = locationZoneSet ?? modeZoneIds

  const stats = useMemo(
    () =>
      computeDashboardStats(
        products,
        inventoryEntries,
        filterMode === 'all' ? locations.length : filterLocations.length,
        effectiveZoneSet,
        selectedZoneId,
      ),
    [products, inventoryEntries, locations.length, filterLocations.length, filterMode, effectiveZoneSet, selectedZoneId],
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

  const refreshData = useCallback(async (source: 'realtime' | 'manual' = 'manual') => {
    inFlightRefreshCountRef.current += 1
    if (inFlightRefreshCountRef.current === 1) setIsRefreshing(true)
    try {
      // Realtime: chỉ inventory — tránh refetch locations/products làm re-render rộng
      if (source === 'manual') {
        await fetchLocations()
        await fetchProducts()
      }
      if (!filterLocationId) {
        await fetchAllInventoryEntries()
      } else if (zonesForFilterLoc.length > 0) {
        await Promise.all(zonesForFilterLoc.map((z) => fetchInventoryByZone(z.id)))
      }
      lastFetchedAt.current = Date.now()
    } finally {
      inFlightRefreshCountRef.current -= 1
      if (inFlightRefreshCountRef.current === 0) setIsRefreshing(false)
    }
  }, [
    fetchLocations,
    fetchProducts,
    fetchAllInventoryEntries,
    fetchInventoryByZone,
    filterLocationId,
    zonesForFilterLoc,
  ])

  // Giữ callback mới nhất — Realtime không phụ thuộc refreshData (tránh resubscribe khi đổi filter)
  useEffect(() => {
    refreshDataRef.current = refreshData
  }, [refreshData])

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastFetchedAt.current <= FOCUS_FETCH_TTL_MS) return
      void refreshData('manual')
    }, [refreshData]),
  )

  useEffect(() => {
    if (!filterLocationId) {
      // Tránh set [] mới mỗi lần → không kích effect inventory thừa lúc mount
      setZonesForFilterLoc((prev) => (prev.length === 0 ? prev : []))
      setSelectedZoneId((prev) => (prev === null ? prev : null))
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

  // Bypass TTL khi user ĐỔI filter — skip lần mount đầu (focus đã fetch; tránh double fetchAll)
  useEffect(() => {
    if (!filterInventoryFetchMountedRef.current) {
      filterInventoryFetchMountedRef.current = true
      prevFilterLocationIdForFetchRef.current = filterLocationId
      return
    }

    const locationChanged = prevFilterLocationIdForFetchRef.current !== filterLocationId
    if (locationChanged) {
      prevFilterLocationIdForFetchRef.current = filterLocationId
    }

    if (!filterLocationId) {
      // Clear kho → fetch all chỉ khi location vừa đổi (không khi zones reset)
      if (locationChanged) void fetchAllInventoryEntries()
      return
    }

    // Chọn kho: chờ zones load rồi fetch (có thể locationChanged=false ở lần zones cập nhật)
    if (zonesForFilterLoc.length === 0) return
    void Promise.all(zonesForFilterLoc.map((z) => fetchInventoryByZone(z.id)))
  }, [filterLocationId, zonesForFilterLoc, fetchAllInventoryEntries, fetchInventoryByZone])

  useEffect(() => {
    const scheduleRefresh = () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
      realtimeDebounceRef.current = setTimeout(() => {
        realtimeDebounceRef.current = null
        void refreshDataRef.current?.('realtime')
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
  }, [])

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
          style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setFilterModalOpen(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.filterBtnText, { color: colors.text }]} numberOfLines={1}>
            {filterSummary}
          </Text>
          <Text style={{ color: colors.sub }}>▾</Text>
        </TouchableOpacity>

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

      <FilterModal
        visible={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        selectedMode={filterMode}
        onChangeMode={setFilterMode}
        locations={filterLocations}
        selectedLocationId={filterLocationId}
        onChangeLocation={setFilterLocationId}
        zones={zonesForFilterLoc}
        selectedZoneId={selectedZoneId}
        onChangeZone={setSelectedZoneId}
        onReset={() => {
          setFilterMode('all')
          setFilterLocationId(null)
          setSelectedZoneId(null)
        }}
      />
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
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterBtnText: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
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
})
