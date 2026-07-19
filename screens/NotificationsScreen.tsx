import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarningStore } from '../stores/warningStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useCanWrite } from '../stores/authStore'
import FilterModal, { countActiveFilters, type FilterMode } from '../components/FilterModal'
import { formatExpiryDate, getExpiryStatus, InventoryEntry, Location, Product, Zone } from '../types'
import { supabase } from '../lib/supabase'
import { normalizeText } from '../utils/textUtils'
import { isoExpiryToDisplay, parseDisplayDateToIso } from '../utils/dateUtils'
import {
  getDisplayColor,
  getDisplayColorContextFromEntry,
  getExpiryCardHeaderColors,
  getExpiryLotSurfaceColors,
} from '../utils/statusUtils'

const PAGE_SIZE = 10

function todayISO(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function plus30ISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

type ExpiryLotRow = {
  entryId: string
  quantityBoxes: number
  expiryDate?: string
  isPriceReduced: boolean
  status: 'expired' | 'warning' | 'ok'
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
  lowWarningBoxes: number
}

type NotificationsRouteParams = {
  initialTab?: 'expiry' | 'lowStock'
  showExpiredFilter?: boolean
  showWarningFilter?: boolean
  showOutOfStockFilter?: boolean
  showLowStockFilter?: boolean
  filterLocationId?: string | null
  filterZoneId?: string | null
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const routeParams = (route.params as NotificationsRouteParams | undefined) ?? {}
  const { colors } = useThemeStore()
  const canWrite = useCanWrite()
  const {
    expiryWarningEnabled,
    lowStockWarningEnabled,
  } = useWarningStore()
  const {
    products,
    inventoryEntries,
    fetchProducts,
    fetchAllInventoryEntries,
    fetchInventoryByZone,
    togglePriceReduced,
    toggleDiscontinued,
    getQtyUnit,
  } = useWarehouseStore()
  const qtyUnit = getQtyUnit()

  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [filterLocationId, setFilterLocationId] = useState<string | null>(null)
  const [filterZoneId, setFilterZoneId] = useState<string | null>(null)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filterLocations, setFilterLocations] = useState<Location[]>([])
  const [zonesForFilterLoc, setZonesForFilterLoc] = useState<Zone[]>([])
  const [modeZoneIds, setModeZoneIds] = useState<Set<string> | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'expiry' | 'lowStock'>('expiry')
  const [showExpiredFilter, setShowExpiredFilter] = useState(false)
  const [showWarningFilter, setShowWarningFilter] = useState(false)
  const [showOutOfStockFilter, setShowOutOfStockFilter] = useState(false)
  const [showLowStockFilter, setShowLowStockFilter] = useState(false)
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({})
  const [currentPageExpiry, setCurrentPageExpiry] = useState(0)
  const [currentPageLowStock, setCurrentPageLowStock] = useState(0)
  /** C3: date range tab Sắp hết hạn — ISO YYYY-MM-DD */
  const [dateFrom, setDateFrom] = useState<string>(() => todayISO())
  const [dateTo, setDateTo] = useState<string>(() => plus30ISO())
  const [dateFromDraft, setDateFromDraft] = useState(() => isoExpiryToDisplay(todayISO()) || '')
  const [dateToDraft, setDateToDraft] = useState(() => isoExpiryToDisplay(plus30ISO()) || '')
  /** C3 fix: true = hiện mọi lô trong [from,to]; false = chỉ expired/warning + checkbox */
  const [dateRangeActive, setDateRangeActive] = useState(false)

  useEffect(() => {
    if (routeParams.initialTab) setActiveTab(routeParams.initialTab)
    if (routeParams.showExpiredFilter === true) setShowExpiredFilter(true)
    if (routeParams.showWarningFilter === true) setShowWarningFilter(true)
    if (routeParams.showOutOfStockFilter === true) setShowOutOfStockFilter(true)
    if (routeParams.showLowStockFilter === true) setShowLowStockFilter(true)
    if (routeParams.filterLocationId !== undefined) setFilterLocationId(routeParams.filterLocationId)
    if (routeParams.filterZoneId !== undefined) setFilterZoneId(routeParams.filterZoneId)
  }, [
    routeParams.initialTab,
    routeParams.showExpiredFilter,
    routeParams.showWarningFilter,
    routeParams.showOutOfStockFilter,
    routeParams.showLowStockFilter,
    routeParams.filterLocationId,
    routeParams.filterZoneId,
  ])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

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
    return () => { cancelled = true }
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

  useEffect(() => {
    setCurrentPageExpiry(0)
    setCurrentPageLowStock(0)
  }, [
    searchQuery,
    filterMode,
    filterLocationId,
    filterZoneId,
    showExpiredFilter,
    showWarningFilter,
    showOutOfStockFilter,
    showLowStockFilter,
    activeTab,
    dateFrom,
    dateTo,
    dateRangeActive,
  ])

  const locationZoneSet = useMemo(() => {
    if (!filterLocationId) return null
    return new Set(zonesForFilterLoc.map((z) => z.id))
  }, [filterLocationId, zonesForFilterLoc])

  const activeFilterCount = countActiveFilters(filterMode, filterLocationId, filterZoneId)

  const inventoryEntriesForNotify = useMemo(() => {
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

  const productIdToEntries = useMemo(() => {
    const map = new Map<string, InventoryEntry[]>()
    for (const entry of inventoryEntriesForNotify) {
      const list = map.get(entry.product_id)
      if (list) list.push(entry)
      else map.set(entry.product_id, [entry])
    }
    return map
  }, [inventoryEntriesForNotify])

  const expiryCards = useMemo(() => {
    if (!expiryWarningEnabled) return []
    const cards: ExpiryCard[] = []
    for (const [productId, entries] of productIdToEntries.entries()) {
      if (entries.length === 0) continue
      const product: Product | undefined = products.find((p) => p.id === productId) ?? entries[0]?.product
      if (!product || product.is_archived) continue
      if (product.ignore_expiry_warning) continue

      let totalBoxes = 0
      let hasExpired = false
      const lots: ExpiryLotRow[] = []

      if (dateRangeActive) {
        // Mọi lô có expiry_date ∈ [from, to] (kể cả ok)
        for (const entry of entries) {
          if (!entry.expiry_date) continue
          if (entry.expiry_date < dateFrom || entry.expiry_date > dateTo) continue
          const status = getExpiryStatus(entry.expiry_date, product.warning_days ?? 30)
          totalBoxes += entry.quantity_boxes
          if (status === 'expired') hasExpired = true
          lots.push({
            entryId: entry.id,
            quantityBoxes: entry.quantity_boxes,
            expiryDate: entry.expiry_date,
            isPriceReduced: entry.is_price_reduced === true,
            status,
          })
        }
        if (lots.length === 0) continue
      } else {
        // Mặc định: chỉ expired + warning
        let hasWarning = false
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
      }

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
  }, [productIdToEntries, products, dateRangeActive, dateFrom, dateTo, expiryWarningEnabled])

  const lowStockCards = useMemo(() => {
    if (!lowStockWarningEnabled) return []
    const cards: LowStockCard[] = []
    for (const [productId, entries] of productIdToEntries.entries()) {
      if (entries.length === 0) continue
      const product: Product | undefined = products.find((p) => p.id === productId) ?? entries[0]?.product
      if (!product || product.is_archived || product.is_discontinued === true) continue
      if (product.ignore_stock_warning) continue

      const totalBoxes = entries.reduce((sum, e) => sum + e.quantity_boxes, 0)
      const lowWarning = product.low_warning_boxes ?? 3
      if (totalBoxes <= lowWarning || totalBoxes === 0) {
        cards.push({
          productId,
          productName: product.name,
          totalBoxes,
          lowWarningBoxes: lowWarning,
        })
      }
    }
    return cards.sort((a, b) => a.productName.localeCompare(b.productName))
  }, [productIdToEntries, products, lowStockWarningEnabled])

  const normalizedSearch = normalizeText(searchQuery.trim())

  const expiryCardsSearched = useMemo(() => {
    if (!normalizedSearch) return expiryCards
    return expiryCards.filter((card) =>
      normalizeText(card.productName).includes(normalizedSearch)
    )
  }, [expiryCards, normalizedSearch])

  const countExpired = useMemo(
    () => expiryCardsSearched.filter((card) => card.lots.some((lot) => lot.status === 'expired')).length,
    [expiryCardsSearched]
  )

  const countWarning = useMemo(
    () => expiryCardsSearched.filter((card) => card.lots.some((lot) => lot.status === 'warning')).length,
    [expiryCardsSearched]
  )

  const expiryCardsFiltered = useMemo(() => {
    // Date range active: đã lọc trong expiryCards — bỏ qua checkbox
    if (dateRangeActive) {
      return expiryCardsSearched
    }
    return expiryCardsSearched
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
  }, [expiryCardsSearched, showExpiredFilter, showWarningFilter, dateRangeActive])

  const lowStockCardsSearched = useMemo(() => {
    if (!normalizedSearch) return lowStockCards
    return lowStockCards.filter((card) =>
      normalizeText(card.productName).includes(normalizedSearch)
    )
  }, [lowStockCards, normalizedSearch])

  const countOutOfStock = useMemo(
    () => lowStockCardsSearched.filter((card) => card.totalBoxes === 0).length,
    [lowStockCardsSearched]
  )

  const countLowStock = useMemo(
    () =>
      lowStockCardsSearched.filter(
        (card) => card.totalBoxes > 0 && card.totalBoxes <= card.lowWarningBoxes
      ).length,
    [lowStockCardsSearched]
  )

  const lowStockCardsFiltered = useMemo(() => {
    return lowStockCardsSearched.filter((card) => {
      if (!showOutOfStockFilter && !showLowStockFilter) return true
      if (showOutOfStockFilter && showLowStockFilter) return true
      if (showOutOfStockFilter) return card.totalBoxes === 0
      if (showLowStockFilter) return card.totalBoxes > 0
      return true
    })
  }, [lowStockCardsSearched, showOutOfStockFilter, showLowStockFilter])

  const activeSearchedList = activeTab === 'expiry' ? expiryCardsFiltered : lowStockCardsFiltered
  const currentPage = activeTab === 'expiry' ? currentPageExpiry : currentPageLowStock
  const setCurrentPage = activeTab === 'expiry' ? setCurrentPageExpiry : setCurrentPageLowStock

  const totalPages = Math.max(1, Math.ceil(activeSearchedList.length / PAGE_SIZE))
  const pagedList = useMemo(
    () => activeSearchedList.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [activeSearchedList, currentPage]
  )

  const canGoPrev = currentPage > 0
  const canGoNext = currentPage < totalPages - 1
  const listEmpty = activeSearchedList.length === 0
  const hasSearch = searchQuery.trim().length > 0

  function toggleExpanded(productId: string) {
    setExpandedProducts((prev) => ({ ...prev, [productId]: !prev[productId] }))
  }

  function clearSearch() {
    setSearchQuery('')
  }

  function commitDateFrom() {
    const iso = parseDisplayDateToIso(dateFromDraft)
    if (iso) {
      setDateFrom(iso)
      setDateFromDraft(isoExpiryToDisplay(iso) || '')
    } else {
      setDateFromDraft(isoExpiryToDisplay(dateFrom) || '')
    }
  }

  function commitDateTo() {
    const iso = parseDisplayDateToIso(dateToDraft)
    if (iso) {
      setDateTo(iso)
      setDateToDraft(isoExpiryToDisplay(iso) || '')
    } else {
      setDateToDraft(isoExpiryToDisplay(dateTo) || '')
    }
  }

  function activateDateRange() {
    const fromIso = parseDisplayDateToIso(dateFromDraft)
    const toIso = parseDisplayDateToIso(dateToDraft)
    if (!fromIso || !toIso) {
      Alert.alert('Ngày không hợp lệ', 'Vui lòng nhập Từ và Đến theo định dạng DD/MM/YYYY.')
      return
    }
    setDateFrom(fromIso)
    setDateTo(toIso)
    setDateFromDraft(isoExpiryToDisplay(fromIso) || '')
    setDateToDraft(isoExpiryToDisplay(toIso) || '')
    setDateRangeActive(true)
  }

  function handleBarcodeScan(barcode: string) {
    const normalized = barcode.trim().toLowerCase()
    if (!normalized) return
    const entry = inventoryEntriesForNotify.find(
      (e) => e.barcode?.trim().toLowerCase() === normalized
    )
    if (!entry) {
      Alert.alert('Không tìm thấy', 'Không có lô nào với mã vạch này trong phạm vi kho đang lọc.')
      return
    }
    const productName =
      entry.product?.name ?? products.find((p) => p.id === entry.product_id)?.name ?? ''
    if (productName) setSearchQuery(productName)
    else Alert.alert('Không tìm thấy', 'Không xác định được tên sản phẩm cho mã vạch này.')
  }

  function openBarcodeScanner() {
    navigation.navigate('BarcodeScanner', {
      mode: 'search',
      onScanFillBarcode: handleBarcodeScan,
    })
  }

  const renderExpiryItem = useCallback(
    ({ item }: { item: ExpiryCard }) => {
      const isExpanded = expandedProducts[item.productId] === true
      const hasAnyPriceReduced = item.lots.some((lot) => lot.isPriceReduced)
      const headerColors = getExpiryCardHeaderColors(item.hasExpiredLot, colors, expiryWarningEnabled)
      const bgColor = headerColors.backgroundColor
      const borderColor = headerColors.borderColor
      const titleDotColor = headerColors.dotColor
      return (
        <View style={[styles.item, { backgroundColor: bgColor, borderColor }]}>
          <View style={styles.headerRow}>
            <View style={[styles.leftWrap, { flex: 1 }]}>
              <View
                style={[
                  styles.titleDot,
                  { backgroundColor: titleDotColor },
                ]}
              />
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
                  style={{ flex: 1 }}
                >
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                    {item.productName}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleExpanded(item.productId)}>
                  <Text style={[styles.line1, { color: colors.text }]}>Còn {item.totalBoxes} {qtyUnit}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {hasAnyPriceReduced && (
              <View style={styles.priceReducedBadge}>
                <Text style={styles.priceReducedBadgeText}>Đã giảm giá</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => toggleExpanded(item.productId)}>
              <Text style={[styles.expandHint, { color: colors.sub }]}>
                {isExpanded ? 'Thu gọn ▴' : 'Chi tiết ▾'}
              </Text>
            </TouchableOpacity>
          </View>

          {isExpanded && (
            <View style={styles.lotList}>
              {item.lots.map((lot) => {
                const lotSurface = getExpiryLotSurfaceColors(lot.status, colors, expiryWarningEnabled)
                return (
                  <TouchableOpacity
                    key={lot.entryId}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
                    style={[
                      styles.lotRow,
                      { backgroundColor: lotSurface.backgroundColor, borderColor: lotSurface.borderColor },
                    ]}
                  >
                    <View style={styles.lotInfo}>
                      <Text style={[styles.lotText, { color: colors.text }]}>
                        {lot.quantityBoxes} {qtyUnit} · Hạn: {formatExpiryDate(lot.expiryDate)}
                      </Text>
                    </View>
                    {canWrite ? (
                      <TouchableOpacity
                        style={[
                          styles.lotToggleBtn,
                          {
                            backgroundColor: lot.isPriceReduced ? '#22C55E' : colors.bg,
                            borderColor: lot.isPriceReduced ? '#22C55E' : colors.border,
                          },
                        ]}
                        onPress={() => void togglePriceReduced(lot.entryId)}
                      >
                        <Text style={[styles.lotToggleText, { color: lot.isPriceReduced ? '#FFFFFF' : colors.text }]}>
                          {lot.isPriceReduced ? 'Đã giảm giá' : 'Chưa giảm giá'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>
      )
    },
    [canWrite, colors, expandedProducts, expiryWarningEnabled, navigation, togglePriceReduced]
  )

  const renderLowStockItem = useCallback(
    ({ item }: { item: LowStockCard }) => {
      const lowStockStatus = item.totalBoxes <= 0 ? 'critical' : 'warning'
      const titleDotColor = getDisplayColor(
        lowStockStatus,
        colors,
        expiryWarningEnabled,
        lowStockWarningEnabled,
        {
          quantity_boxes: item.totalBoxes,
          low_warning_boxes: item.lowWarningBoxes,
          low_critical_boxes: 1,
        },
      )
      return (
      <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.leftWrap}>
            <View
              style={[
                styles.titleDot,
                { backgroundColor: titleDotColor },
              ]}
            />
            <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {item.productName}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.line1, { color: colors.text }]}>Còn {item.totalBoxes} {qtyUnit}</Text>
        {canWrite ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => {
                if (__DEV__) console.log('[Notifications] add to purchase list placeholder', item.productId)
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
        ) : null}
      </View>
      )
    },
    [canWrite, colors, expiryWarningEnabled, lowStockWarningEnabled, navigation, toggleDiscontinued]
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>🔔 Thông báo</Text>

      <TouchableOpacity
        style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setFilterModalOpen(true)}
        activeOpacity={0.75}
      >
        <Text style={[styles.filterBtnText, { color: colors.text }]}>
          {activeFilterCount > 0 ? `Lọc (${activeFilterCount})` : 'Lọc'}
        </Text>
        <Text style={{ color: colors.sub }}>▾</Text>
      </TouchableOpacity>

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm sản phẩm theo tên..."
              placeholderTextColor={colors.sub}
              maxLength={100}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity style={styles.searchClearInsideBtn} onPress={clearSearch}>
                <Text style={{ color: colors.text }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: colors.accent }]}
            onPress={openBarcodeScanner}
          >
            <Text style={styles.scanBtnText}>📷</Text>
          </TouchableOpacity>
        </View>
      </View>

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
        <View
          style={[
            styles.filterBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: dateRangeActive ? 0.4 : 1,
            },
          ]}
          pointerEvents={dateRangeActive ? 'none' : 'auto'}
        >
          <TouchableOpacity
            style={styles.filterItem}
            onPress={() => setShowExpiredFilter((v) => !v)}
            activeOpacity={0.8}
            disabled={dateRangeActive}
          >
            <View style={[styles.tickBox, { borderColor: colors.border, backgroundColor: showExpiredFilter ? colors.accent : colors.bg }]}>
              {showExpiredFilter && <Text style={[styles.tickText, { color: colors.card }]}>✓</Text>}
            </View>
            <Text style={[styles.filterText, { color: colors.text }]}>
              Hết hạn{expiryWarningEnabled ? ` (${countExpired})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterItem}
            onPress={() => setShowWarningFilter((v) => !v)}
            activeOpacity={0.8}
            disabled={dateRangeActive}
          >
            <View style={[styles.tickBox, { borderColor: colors.border, backgroundColor: showWarningFilter ? colors.accent : colors.bg }]}>
              {showWarningFilter && <Text style={[styles.tickText, { color: colors.card }]}>✓</Text>}
            </View>
            <Text style={[styles.filterText, { color: colors.text }]}>
              Sắp hết hạn{expiryWarningEnabled ? ` (${countWarning})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'expiry' && (
        <View
          style={[
            styles.dateRangeRow,
            {
              backgroundColor: dateRangeActive ? colors.accent + '18' : colors.card,
              borderColor: dateRangeActive ? colors.accent : colors.border,
            },
          ]}
        >
          <Text style={[styles.dateRangeLabel, { color: colors.sub }]}>Từ</Text>
          <TextInput
            style={[styles.dateRangeInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
            value={dateFromDraft}
            onChangeText={setDateFromDraft}
            onBlur={commitDateFrom}
            onSubmitEditing={commitDateFrom}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={colors.sub}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            returnKeyType="done"
          />
          <Text style={[styles.dateRangeLabel, { color: colors.sub }]}>Đến</Text>
          <TextInput
            style={[styles.dateRangeInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
            value={dateToDraft}
            onChangeText={setDateToDraft}
            onBlur={commitDateTo}
            onSubmitEditing={commitDateTo}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={colors.sub}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.dateRangeActionBtn, { backgroundColor: colors.accent }]}
            onPress={activateDateRange}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={[styles.dateRangeActionText, { color: colors.card }]}>➜</Text>
          </TouchableOpacity>
          {dateRangeActive ? (
            <TouchableOpacity
              style={[styles.dateRangeActionBtn, { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => setDateRangeActive(false)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={[styles.dateRangeActionText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {activeTab === 'lowStock' && (
        <View style={[styles.filterBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.filterItem}
            onPress={() => setShowOutOfStockFilter((v) => !v)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.tickBox,
                { borderColor: colors.border, backgroundColor: showOutOfStockFilter ? colors.accent : colors.bg },
              ]}
            >
              {showOutOfStockFilter && <Text style={[styles.tickText, { color: colors.card }]}>✓</Text>}
            </View>
            <Text style={[styles.filterText, { color: colors.text }]}>
              Hết hàng{lowStockWarningEnabled ? ` (${countOutOfStock})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterItem}
            onPress={() => setShowLowStockFilter((v) => !v)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.tickBox,
                { borderColor: colors.border, backgroundColor: showLowStockFilter ? colors.accent : colors.bg },
              ]}
            >
              {showLowStockFilter && <Text style={[styles.tickText, { color: colors.card }]}>✓</Text>}
            </View>
            <Text style={[styles.filterText, { color: colors.text }]}>
              Sắp hết hàng{lowStockWarningEnabled ? ` (${countLowStock})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {listEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.sub, textAlign: 'center', paddingHorizontal: 24 }}>
            {hasSearch
              ? 'Không có sản phẩm phù hợp.'
              : activeTab === 'expiry' && !expiryWarningEnabled
                ? 'Cảnh báo hết hạn đã tắt. Bật lại trong Cài đặt.'
                : activeTab === 'lowStock' && !lowStockWarningEnabled
                  ? 'Cảnh báo hết hàng đã tắt. Bật lại trong Cài đặt.'
                  : activeTab === 'expiry'
                    ? 'Không có sản phẩm sắp hết hạn / hết hạn.'
                    : 'Không có sản phẩm sắp hết hàng.'}
          </Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {activeTab === 'expiry' ? (
            <FlatList
              data={pagedList as ExpiryCard[]}
              keyExtractor={(item) => item.productId}
              renderItem={renderExpiryItem}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <FlatList
              data={pagedList as LowStockCard[]}
              keyExtractor={(item) => item.productId}
              renderItem={renderLowStockItem}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
            />
          )}
          {activeSearchedList.length > PAGE_SIZE && (
            <View style={[styles.footer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.pageBtn, { opacity: canGoPrev ? 1 : 0.3 }]}
                disabled={!canGoPrev}
                onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
              >
                <Text style={[styles.pageBtnText, { color: colors.text }]}>←</Text>
              </TouchableOpacity>
              <Text style={[styles.pageLabel, { color: colors.sub }]}>
                Trang {currentPage + 1} / {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageBtn, { opacity: canGoNext ? 1 : 0.3 }]}
                disabled={!canGoNext}
                onPress={() => setCurrentPage((p) => p + 1)}
              >
                <Text style={[styles.pageBtnText, { color: colors.text }]}>→</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  filterBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterBtnText: { fontSize: 14, fontWeight: '600' },
  searchWrap: { paddingHorizontal: 16, marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInputWrap: { flex: 1, position: 'relative' },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 38,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchClearInsideBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtn: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnText: { fontSize: 16 },
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
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  dateRangeLabel: { fontSize: 12, fontWeight: '600' },
  dateRangeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    minWidth: 72,
  },
  dateRangeActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRangeActionText: { fontSize: 15, fontWeight: '700' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  listWrap: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pageBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pageBtnText: { fontSize: 20, fontWeight: '700' },
  pageLabel: { fontSize: 13 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  leftWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  line1: { fontSize: 14, fontWeight: '600', marginTop: 10 },
  expandHint: { fontSize: 12, fontWeight: '600' },
  titleDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8, alignSelf: 'flex-start', marginTop: 2 },
  name: { fontSize: 15, fontWeight: '700', flex: 1, minWidth: 0 },
  priceReducedBadge: {
    backgroundColor: '#22C55E',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priceReducedBadgeText: { color: 'white', fontSize: 11, fontWeight: '600' },
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
