import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import FilterModal, { formatFilterSummary, type FilterMode } from '../components/FilterModal'
import ImageViewerModal from '../components/ImageViewerModal'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { supabase } from '../lib/supabase'
import type { InventoryEntry, Location, Product, Zone } from '../types'

const NUM_COLUMNS = 3
const FOCUS_FETCH_TTL_MS = 30_000

type DiscountCardItem = {
  entry: InventoryEntry
  product: Product
}

export default function DiscountScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const {
    inventoryEntries,
    products,
    fetchProducts,
    fetchAllInventoryEntries,
    fetchInventoryByZone,
  } = useWarehouseStore()

  const [loading, setLoading] = useState(true)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [filterLocationId, setFilterLocationId] = useState<string | null>(null)
  const [filterZoneId, setFilterZoneId] = useState<string | null>(null)
  const [filterLocations, setFilterLocations] = useState<Location[]>([])
  const [zonesForFilterLoc, setZonesForFilterLoc] = useState<Zone[]>([])
  const [modeZoneIds, setModeZoneIds] = useState<Set<string> | null>(null)
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)

  const lastFetchRef = useRef(0)
  const filterModeMountedRef = useRef(false)

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      if (now - lastFetchRef.current < FOCUS_FETCH_TTL_MS) return
      lastFetchRef.current = now

      let cancelled = false
      void (async () => {
        setLoading(true)
        await fetchProducts()
        await fetchAllInventoryEntries()
        if (!cancelled) setLoading(false)
      })()

      return () => {
        cancelled = true
      }
    }, [fetchAllInventoryEntries, fetchProducts]),
  )

  useEffect(() => {
    let cancelled = false
    async function loadFilterLocations() {
      let query = supabase.from('locations').select('*').order('name')
      if (filterMode !== 'all') query = query.eq('type', filterMode)
      const { data } = await query
      if (!cancelled) setFilterLocations((data as Location[]) ?? [])
    }
    void loadFilterLocations()
    return () => {
      cancelled = true
    }
  }, [filterMode])

  useEffect(() => {
    if (!filterModeMountedRef.current) {
      filterModeMountedRef.current = true
      return
    }
    setFilterLocationId(null)
    setFilterZoneId(null)
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
    return () => {
      cancelled = true
    }
  }, [filterMode, filterLocations, filterLocationId])

  useEffect(() => {
    if (filterLocationId) return
    void fetchAllInventoryEntries()
  }, [filterLocationId, fetchAllInventoryEntries])

  useEffect(() => {
    if (!filterLocationId) {
      setZonesForFilterLoc([])
      return
    }
    let cancelled = false
    void supabase
      .from('zones')
      .select('*')
      .eq('location_id', filterLocationId)
      .order('name')
      .then(({ data }) => {
        if (!cancelled) setZonesForFilterLoc((data as Zone[]) ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [filterLocationId])

  useEffect(() => {
    if (!filterLocationId || zonesForFilterLoc.length === 0) return
    void Promise.all(zonesForFilterLoc.map((z) => fetchInventoryByZone(z.id)))
  }, [filterLocationId, zonesForFilterLoc, fetchInventoryByZone])

  const locationZoneSet = useMemo(() => {
    if (!filterLocationId) return null
    return new Set(zonesForFilterLoc.map((z) => z.id))
  }, [filterLocationId, zonesForFilterLoc])

  const filterSummary = formatFilterSummary({
    mode: filterMode,
    locationId: filterLocationId,
    zoneId: filterZoneId,
    locations: filterLocations,
    zones: zonesForFilterLoc,
  })

  const hasActiveFilter = filterMode !== 'all' || filterLocationId !== null || filterZoneId !== null

  const scopedEntries = useMemo(() => {
    if (filterZoneId) {
      return inventoryEntries.filter((e) => e.zone_id === filterZoneId)
    }
    if (locationZoneSet) {
      return inventoryEntries.filter((e) => locationZoneSet.has(e.zone_id))
    }
    if (modeZoneIds) {
      return inventoryEntries.filter((e) => modeZoneIds.has(e.zone_id))
    }
    return inventoryEntries
  }, [inventoryEntries, locationZoneSet, filterZoneId, modeZoneIds])

  const discountedItems = useMemo(() => {
    const items: DiscountCardItem[] = []
    for (const entry of scopedEntries) {
      if (entry.is_price_reduced !== true) continue
      const product =
        products.find((p) => p.id === entry.product_id) ?? entry.product ?? null
      if (!product || product.is_archived) continue
      items.push({ entry, product })
    }
    return items.sort((a, b) => a.product.name.localeCompare(b.product.name))
  }, [scopedEntries, products])

  const renderCard = useCallback(
    ({ item }: { item: DiscountCardItem }) => {
      const { entry, product } = item
      const discountPercent =
        entry.discount_percent == null ? null : Number(entry.discount_percent)
      const discountLabel =
        discountPercent != null && Number.isFinite(discountPercent) && discountPercent > 0
          ? `Giảm ${discountPercent}%`
          : 'Đã giảm giá'

      return (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
        >
          {product.image_url ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setZoomImageUrl(product.image_url ?? null)}
            >
              <Image
                source={{ uri: product.image_url }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.cardImage,
                styles.cardImagePlaceholder,
                { backgroundColor: colors.border },
              ]}
            >
              <Text style={{ fontSize: 24 }}>📷</Text>
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
              {product.name}
            </Text>
            <View style={[styles.discountBadge, { backgroundColor: '#F97316' + '26' }]}>
              <Text style={styles.discountBadgeText}>{discountLabel}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )
    },
    [colors, navigation],
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.card }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.sub }}>← Đóng</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          🏷️ Hàng giảm giá
        </Text>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.card }]}
          onPress={() => setFilterModalOpen(true)}
        >
          <Text style={{ fontSize: 16 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {hasActiveFilter ? (
        <View style={[styles.filterBar, { backgroundColor: colors.card }]}>
          <Text style={[styles.filterLabel, { color: colors.sub }]} numberOfLines={1}>
            Đang lọc: {filterSummary}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setFilterMode('all')
              setFilterLocationId(null)
              setFilterZoneId(null)
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 13 }}>Xoá bộ lọc</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : discountedItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.sub }]}>Không có hàng giảm giá nào.</Text>
        </View>
      ) : (
        <FlatList
          data={discountedItems}
          renderItem={renderCard}
          keyExtractor={(item) => item.entry.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      )}

      <FilterModal
        visible={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        selectedMode={filterMode}
        onChangeMode={setFilterMode}
        locations={filterLocations}
        selectedLocationId={filterLocationId}
        onChangeLocation={(id) => {
          setFilterLocationId(id)
          setFilterZoneId(null)
        }}
        zones={zonesForFilterLoc}
        selectedZoneId={filterZoneId}
        onChangeZone={setFilterZoneId}
        onReset={() => {
          setFilterMode('all')
          setFilterLocationId(null)
          setFilterZoneId(null)
        }}
      />

      <ImageViewerModal uri={zoomImageUrl} onClose={() => setZoomImageUrl(null)} />
    </SafeAreaView>
  )
}

const CARD_MARGIN = 6
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterLabel: { fontSize: 13, flex: 1 },
  grid: { padding: CARD_MARGIN },
  row: { gap: CARD_MARGIN },
  card: {
    flex: 1,
    margin: CARD_MARGIN,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', aspectRatio: 1 },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { padding: 6, gap: 4 },
  cardName: { fontSize: 12, fontWeight: '600' },
  discountBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  discountBadgeText: { fontSize: 11, fontWeight: '700', color: '#F97316' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15 },
})
