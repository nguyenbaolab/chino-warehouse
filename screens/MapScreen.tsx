import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  TextInput, ActivityIndicator, Modal, Alert, Platform, KeyboardAvoidingView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useIsFocused, useNavigation, useRoute } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore, type ThemeColors } from '../stores/themeStore'
import { Zone, ZoneCell, InventoryEntry, Product, formatExpiryDate, getCombinedStatus, getCombinedStatusRank, ZONE_COLORS } from '../types'
import { useWarningStore } from '../stores/warningStore'
import { useCanWrite, useIsReadOnly } from '../stores/authStore'
import { getDisplayColorForEntry } from '../utils/statusUtils'
import ZoneDetailSheet from '../components/ZoneDetailSheet'

const CELL_SIZE = 56
const DEFAULT_GRID = 6
const REALTIME_DEBOUNCE_MS = 2000

// Tìm ô trung tâm của zone để hiện tên
function getCenterCell(cells: ZoneCell[]): ZoneCell {
  if (cells.length === 0) return { row: 1, col: 1 }
  const avgRow = cells.reduce((s, c) => s + c.row, 0) / cells.length
  const avgCol = cells.reduce((s, c) => s + c.col, 0) / cells.length
  return cells.reduce((best, c) => {
    const dBest = Math.abs(best.row - avgRow) + Math.abs(best.col - avgCol)
    const dCurr = Math.abs(c.row - avgRow) + Math.abs(c.col - avgCol)
    return dCurr < dBest ? c : best
  }, cells[0])
}

// Tính border radius để các ô liền nhau trông liền mạch
function getCellRadius(cells: ZoneCell[], row: number, col: number) {
  const has = (r: number, c: number) => cells.some(cell => cell.row === r && cell.col === c)
  const top = has(row - 1, col)
  const bottom = has(row + 1, col)
  const left = has(row, col - 1)
  const right = has(row, col + 1)
  return {
    borderTopLeftRadius: top || left ? 2 : 10,
    borderTopRightRadius: top || right ? 2 : 10,
    borderBottomLeftRadius: bottom || left ? 2 : 10,
    borderBottomRightRadius: bottom || right ? 2 : 10,
  }
}

function formatResultExpiry(expiryDate?: string): string {
  return `Hạn: ${formatExpiryDate(expiryDate)}`
}

type SearchLocationGroup = {
  locationId: string
  locationName: string
  entries: InventoryEntry[]
}

function buildHighlightMapFromEntries(
  entries: InventoryEntry[],
  colors: ThemeColors,
  expiryWarningEnabled: boolean,
  lowStockWarningEnabled: boolean,
): Map<string, string> {
  const map = new Map<string, string>()
  const worstRankByZone = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.zone_id) continue
    const rank = getEntryStatusRank(entry)
    const prevWorst = worstRankByZone.get(entry.zone_id) ?? Infinity
    if (rank < prevWorst) {
      worstRankByZone.set(entry.zone_id, rank)
      const product = entry.product
      map.set(
        entry.zone_id,
        getDisplayColorForEntry(entry, product, colors, expiryWarningEnabled, lowStockWarningEnabled),
      )
    }
  }
  return map
}

/** Rank thấp = tệ hơn (1 expired … 4 ok) — dùng ascending để đỏ → vàng → xanh. */
function getEntryStatusRank(entry: InventoryEntry): number {
  return getCombinedStatusRank(
    getCombinedStatus(
      entry.quantity_boxes,
      entry.expiry_date,
      entry.product?.low_warning_boxes ?? 3,
      entry.product?.low_critical_boxes ?? 1,
      entry.product?.warning_days ?? 30,
    ),
  )
}

function compareEntriesByStatusThenName(a: InventoryEntry, b: InventoryEntry): number {
  const rankDiff = getEntryStatusRank(a) - getEntryStatusRank(b)
  if (rankDiff !== 0) return rankDiff
  const nameA = a.product?.name ?? ''
  const nameB = b.product?.name ?? ''
  if (nameA !== nameB) return nameA.localeCompare(nameB)
  const zoneA = a.zone?.name ?? ''
  const zoneB = b.zone?.name ?? ''
  return zoneA.localeCompare(zoneB)
}

function sortSearchResultsByStatusRank(entries: InventoryEntry[]): InventoryEntry[] {
  return [...entries].sort(compareEntriesByStatusThenName)
}

export default function MapScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const isFocused = useIsFocused()
  const {
    locations, selectedLocationId, zones, products, inventoryEntries, isLoading,
    appMode,
    fetchLocations,
    fetchProducts,
    fetchInventoryByLocation,
    fetchZonesSilent,
    fetchInventoryByLocationSilent,
    setSelectedLocation,
    setAppMode,
    getQtyUnit,
    clearLocateIntent,
    addZone,
    updateZone,
    deleteZone,
    searchProducts,
    searchInventoryByBarcode,
  } = useWarehouseStore()
  const qtyUnit = getQtyUnit()

  // Realtime dùng silent (không isLoading) — giữ fetchZones/fetchInventoryByLocation cho load chủ động
  const fetchZonesSilentRef = useRef(fetchZonesSilent)
  const fetchInventoryByLocationSilentRef = useRef(fetchInventoryByLocationSilent)
  useEffect(() => {
    fetchZonesSilentRef.current = fetchZonesSilent
    fetchInventoryByLocationSilentRef.current = fetchInventoryByLocationSilent
  })

  const { colors, loadTheme } = useThemeStore()
  const { expiryWarningEnabled, lowStockWarningEnabled } = useWarningStore()
  const canWrite = useCanWrite()
  const isReadOnly = useIsReadOnly()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<InventoryEntry[]>([])
  const [highlightedZones, setHighlightedZones] = useState<Map<string, string>>(new Map())
  const [isSearchPanelExpanded, setIsSearchPanelExpanded] = useState(false)
  const searchRequestRef = useRef(0)
  const lastLocateAtRef = useRef<number | undefined>(undefined)
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ownMutationRef = useRef(false)
  const ownMutationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markOwnMutation = useCallback(() => {
    ownMutationRef.current = true
    if (ownMutationTimerRef.current) clearTimeout(ownMutationTimerRef.current)
    ownMutationTimerRef.current = setTimeout(() => {
      ownMutationRef.current = false
      ownMutationTimerRef.current = null
    }, 3000)
  }, [])

  const [mode, setMode] = useState<'normal' | 'selecting'>('normal')
  const [selectedCells, setSelectedCells] = useState<ZoneCell[]>([])
  const [editingZone, setEditingZone] = useState<Zone | null>(null)

  const [nameModal, setNameModal] = useState(false)
  const [actionModal, setActionModal] = useState(false)
  const [zoneDetailVisible, setZoneDetailVisible] = useState(false)
  const [tappedZone, setTappedZone] = useState<Zone | null>(null)
  const [autoScrollProductId, setAutoScrollProductId] = useState<string | null>(null)
  const [locationSheetOpen, setLocationSheetOpen] = useState(false)
  const [modeSheetOpen, setModeSheetOpen] = useState(false)
  const [zoneName, setZoneName] = useState('')
  const [tierCount, setTierCount] = useState('1')
  const [selectedColor, setSelectedColor] = useState(ZONE_COLORS[0])
  const [isSavingZone, setIsSavingZone] = useState(false)
  const scannedProductName: string | undefined = route.params?.scannedProductName
  const scannedBarcode: string | undefined = route.params?.scannedBarcode
  const scannedInventoryEntryId: string | undefined = route.params?.scannedInventoryEntryId
  const scannedZoneLotBarcode: string | undefined = route.params?.scannedZoneLotBarcode
  const scannedZoneLotId: string | undefined = route.params?.scannedZoneLotId
  const scannedZoneLotBarcodeAt: number | undefined = route.params?.scannedZoneLotBarcodeAt
  const locateScannedAt: number | undefined = route.params?.locateScannedAt

  const activeLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId),
    [locations, selectedLocationId]
  )
  const gridRows = activeLocation?.grid_rows ?? DEFAULT_GRID
  const gridCols = activeLocation?.grid_cols ?? DEFAULT_GRID

  function pickLocation(id: string) {
    clearSearch()
    setSelectedLocation(id)
    setLocationSheetOpen(false)
  }

  function openAddWarehouseFromMap() {
    setLocationSheetOpen(false)
    navigation.navigate('Settings', {
      screen: 'LocationManagement',
      params: { openCreateModal: true },
    })
  }

  useEffect(() => {
    loadTheme()
    fetchLocations()
    fetchProducts()
  }, [])

  useEffect(() => {
    if (!isFocused) return
    if (!scannedBarcode && !scannedProductName) return
    if (locateScannedAt != null && lastLocateAtRef.current === locateScannedAt) return

    let cancelled = false

    void (async () => {
      if (locateScannedAt != null) lastLocateAtRef.current = locateScannedAt

      if (scannedBarcode) {
        const results = sortSearchResultsByStatusRank(await searchInventoryByBarcode(scannedBarcode))
        if (!cancelled) {
          setSearchQuery(scannedBarcode)
          setSearchResults(results)
          setIsSearchPanelExpanded(false)
          setHighlightedZones(
            buildHighlightMapFromEntries(results, colors, expiryWarningEnabled, lowStockWarningEnabled),
          )
        }
      } else if (scannedProductName) {
        if (!cancelled) {
          setSearchQuery(scannedProductName)
          await handleSearch(scannedProductName)
        }
      }

      if (!cancelled) {
        navigation.setParams({
          scannedBarcode: undefined,
          scannedInventoryEntryId: undefined,
          scannedZoneLotBarcode: undefined,
          scannedZoneLotId: undefined,
          scannedZoneLotBarcodeAt: undefined,
          scannedProductName: undefined,
          locateScannedAt: undefined,
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isFocused, scannedProductName, scannedBarcode, scannedInventoryEntryId, locateScannedAt])

  useEffect(() => {
    if (!isFocused || !selectedLocationId || zones.length === 0) return
    // Đồng bộ lot hiện tại của các zone để auto hiển thị chấm đỏ/vàng (1 query / kho)
    void fetchInventoryByLocation(selectedLocationId)
  }, [isFocused, selectedLocationId, zones, fetchInventoryByLocation])

  useEffect(() => {
    if (!selectedLocationId) return

    const scheduleRefresh = () => {
      if (ownMutationRef.current) return
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
      realtimeDebounceRef.current = setTimeout(() => {
        realtimeDebounceRef.current = null
        void fetchZonesSilentRef.current(selectedLocationId)
        void fetchInventoryByLocationSilentRef.current(selectedLocationId)
      }, REALTIME_DEBOUNCE_MS)
    }

    const channel = supabase
      .channel(`map-realtime-${selectedLocationId}-${Date.now()}`, {
        config: { private: true }, // SEC-08
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'zones' },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_entries' },
        scheduleRefresh,
      )
      .subscribe()

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
      realtimeDebounceRef.current = null
      if (ownMutationTimerRef.current) clearTimeout(ownMutationTimerRef.current)
      ownMutationTimerRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [selectedLocationId])

  async function handleSearch(text: string) {
    const requestId = ++searchRequestRef.current
    setSearchQuery(text)
    const trimmed = text.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setHighlightedZones(new Map())
      return
    }

    const [nameResults, barcodeResults] = await Promise.all([
      searchProducts(trimmed),
      searchInventoryByBarcode(trimmed),
    ])
    if (requestId !== searchRequestRef.current) return

    const seen = new Set<string>()
    const merged = [...(nameResults ?? []), ...(barcodeResults ?? [])].filter((e) => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })
    const results = sortSearchResultsByStatusRank(merged)
    setSearchResults(results)
    setIsSearchPanelExpanded(false)
    setHighlightedZones(
      buildHighlightMapFromEntries(results, colors, expiryWarningEnabled, lowStockWarningEnabled),
    )
  }

  useFocusEffect(
    useCallback(() => {
      const intent = useWarehouseStore.getState().locateIntent
      if (!intent) return

      const { productName, locationId } = intent
      setSelectedLocation(locationId)
      void (async () => {
        await handleSearch(productName)
        setIsSearchPanelExpanded(true)
      })()
      clearLocateIntent()
    }, [setSelectedLocation, clearLocateIntent, colors])
  )

  function clearSearch() {
    searchRequestRef.current += 1
    setSearchQuery('')
    setSearchResults([])
    setHighlightedZones(new Map())
    setIsSearchPanelExpanded(false)
  }

  const searchResultsByLocation = useMemo((): SearchLocationGroup[] => {
    const groupMap = new Map<string, SearchLocationGroup>()
    for (const entry of searchResults) {
      const locationId = entry.zone?.location_id
      if (!locationId) continue
      const locationName =
        locations.find((l) => l.id === locationId)?.name ?? 'Kho không xác định'
      const existing = groupMap.get(locationId)
      if (existing) {
        existing.entries.push(entry)
      } else {
        groupMap.set(locationId, { locationId, locationName, entries: [entry] })
      }
    }
    return Array.from(groupMap.values())
      .map((g) => ({
        ...g,
        entries: [...g.entries].sort(compareEntriesByStatusThenName),
      }))
      .sort((a, b) => {
        const worstA = Math.min(...a.entries.map(getEntryStatusRank))
        const worstB = Math.min(...b.entries.map(getEntryStatusRank))
        if (worstA !== worstB) return worstA - worstB
        return a.locationName.localeCompare(b.locationName)
      })
  }, [searchResults, locations])

  const collapsedSearchSummaries = useMemo(() => {
    const map = new Map<
      string,
      { productName: string; totalBoxes: number; zoneIds: Set<string>; worstRank: number }
    >()
    for (const entry of searchResults) {
      const productId = entry.product_id
      const rank = getEntryStatusRank(entry)
      const current = map.get(productId)
      if (current) {
        current.totalBoxes += entry.quantity_boxes
        current.zoneIds.add(entry.zone_id)
        current.worstRank = Math.min(current.worstRank, rank)
      } else {
        map.set(productId, {
          productName: entry.product?.name ?? 'Sản phẩm không xác định',
          totalBoxes: entry.quantity_boxes,
          zoneIds: new Set([entry.zone_id]),
          worstRank: rank,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.worstRank !== b.worstRank) return a.worstRank - b.worstRank
      return a.productName.localeCompare(b.productName)
    })
  }, [searchResults])

  function focusSearchResultLot(entry: InventoryEntry) {
    const locationId = entry.zone?.location_id
    if (!locationId || !entry.zone_id) {
      Alert.alert('Thiếu thông tin', 'Không xác định được kho hoặc zone của lô này.')
      return
    }
    searchRequestRef.current += 1
    setSelectedLocation(locationId)
    setHighlightedZones(
      buildHighlightMapFromEntries([entry], colors, expiryWarningEnabled, lowStockWarningEnabled),
    )
    setSearchResults([])
    setSearchQuery('')

    const targetZone = entry.zone ?? zones.find((z) => z.id === entry.zone_id) ?? null
    if (targetZone) {
      setTappedZone(targetZone)
      setAutoScrollProductId(entry.product_id ?? null)
      setZoneDetailVisible(true)
    }
  }

  function closeZoneDetail() {
    const wasSearchFlow = autoScrollProductId !== null
    setZoneDetailVisible(false)
    if (wasSearchFlow) {
      setHighlightedZones(new Map())
      setSearchResults([])
      setSearchQuery('')
    }
    setAutoScrollProductId(null)
  }

  function startAddZone() {
    if (isReadOnly) return
    setEditingZone(null)
    setSelectedCells([])
    setSelectedColor(ZONE_COLORS[0])
    setMode('selecting')
  }

  function cancelSelect() {
    setMode('normal')
    setSelectedCells([])
    setEditingZone(null)
  }

  function isCellSelected(r: number, c: number) {
    return selectedCells.some(cell => cell.row === r && cell.col === c)
  }

  function getCellZone(r: number, c: number): Zone | null {
    return zones.find(z => z.cells?.some(cell => cell.row === r && cell.col === c)) ?? null
  }

  function toggleCell(r: number, c: number) {
    const occupiedZone = getCellZone(r, c)
    if (occupiedZone && editingZone?.id !== occupiedZone.id) return
    if (isCellSelected(r, c)) {
      setSelectedCells(prev => prev.filter(cell => !(cell.row === r && cell.col === c)))
    } else {
      setSelectedCells(prev => [...prev, { row: r, col: c }])
    }
  }

  function hasSelectedCellsOverlap(): boolean {
    const occupiedCells = new Set<string>()
    for (const zone of zones) {
      if (editingZone && zone.id === editingZone.id) continue
      for (const cell of zone.cells ?? []) {
        occupiedCells.add(`${cell.row},${cell.col}`)
      }
    }
    return selectedCells.some((c) => occupiedCells.has(`${c.row},${c.col}`))
  }

  function confirmSelection() {
    if (isReadOnly) return
    if (selectedCells.length === 0) {
      Alert.alert('Chưa chọn ô', 'Hãy chọn ít nhất 1 ô trên lưới.')
      return
    }
    if (hasSelectedCellsOverlap()) {
      Alert.alert('Không thể tạo zone', 'Một hoặc nhiều ô đã được zone khác sử dụng.')
      return
    }
    setZoneName(editingZone?.name ?? '')
    setTierCount(String(editingZone?.tier_count ?? 1))
    setSelectedColor(editingZone?.color ?? ZONE_COLORS[0])
    setNameModal(true)
  }

  async function saveZone() {
    if (isReadOnly) return
    if (isSavingZone) return
    if (!zoneName.trim()) {
      Alert.alert('Lỗi', 'Tên zone không được để trống')
      return
    }
    if (!selectedLocationId) return
    if (hasSelectedCellsOverlap()) {
      Alert.alert('Không thể tạo zone', 'Một hoặc nhiều ô đã được zone khác sử dụng.')
      return
    }

    setIsSavingZone(true)
    try {
      markOwnMutation()
      if (editingZone) {
        await updateZone(editingZone.id, {
          name: zoneName.trim(),
          cells: selectedCells,
          tier_count: parseInt(tierCount) || 1,
          has_tiers: parseInt(tierCount) > 1,
          color: selectedColor,
        })
      } else {
        await addZone({
          name: zoneName.trim(),
          cells: selectedCells,
          tier_count: parseInt(tierCount) || 1,
          color: selectedColor,
          location_id: selectedLocationId,
        })
      }
      setNameModal(false)
      setMode('normal')
      setSelectedCells([])
      setEditingZone(null)
    } catch {
      Alert.alert('Lỗi', 'Không thể tạo zone, vui lòng thử lại.')
    } finally {
      setIsSavingZone(false)
    }
  }

  function handleZoneTap(zone: Zone) {
    if (mode === 'selecting') return
    setTappedZone(zone)
    setActionModal(true)
  }

  function startEditZone() {
    if (isReadOnly) return
    if (!tappedZone) return
    setEditingZone(tappedZone)
    setSelectedCells(tappedZone.cells ?? [])
    setMode('selecting')
    setActionModal(false)
  }

  function openZoneDetail() {
    if (!tappedZone) return
    setActionModal(false)
    setZoneDetailVisible(true)
  }

  async function handleDeleteZone() {
    if (isReadOnly) return
    if (!tappedZone) return
    setActionModal(false)
    Alert.alert('Xóa zone', `Xóa zone "${tappedZone.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          markOwnMutation()
          const ok = await deleteZone(tappedZone.id)
          if (!ok) Alert.alert('Không thể xóa', 'Zone này vẫn còn hàng.')
        }
      }
    ])
  }

  // Hex màu zone → màu nền nhạt hơn (thêm opacity)
  function zoneBgColor(hex: string, opacity = 0.25): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${opacity})`
  }

  const autoZoneDots = useMemo(() => {
    const selectedZoneSet = new Set(zones.map((z) => z.id))
    const map = new Map<string, string>()

    for (const zone of zones) {
      const zoneEntries = inventoryEntries.filter((entry) => (
        selectedZoneSet.has(entry.zone_id) && entry.zone_id === zone.id && entry.quantity_boxes > 0
      ))
      if (zoneEntries.length === 0) continue

      let worstRank = 99
      let worstStatus: 'expired' | 'critical' | 'warning' | 'ok' = 'ok'
      for (const entry of zoneEntries) {
        const product = entry.product ?? products.find((p) => p.id === entry.product_id)
        const status = getCombinedStatus(
          entry.quantity_boxes,
          entry.expiry_date,
          product?.low_warning_boxes ?? 3,
          product?.low_critical_boxes ?? 1,
          product?.warning_days ?? 30
        )
        const rank = getCombinedStatusRank(status)
        if (rank < worstRank) {
          worstRank = rank
          worstStatus = status
        }
      }
      if (worstStatus !== 'ok') {
        let worstEntry: InventoryEntry | undefined
        for (const entry of zoneEntries) {
          const product = entry.product ?? products.find((p) => p.id === entry.product_id)
          const status = getCombinedStatus(
            entry.quantity_boxes,
            entry.expiry_date,
            product?.low_warning_boxes ?? 3,
            product?.low_critical_boxes ?? 1,
            product?.warning_days ?? 30,
          )
          if (status === worstStatus) {
            worstEntry = entry
            break
          }
        }
        if (worstEntry) {
          const product = worstEntry.product ?? products.find((p) => p.id === worstEntry!.product_id)
          map.set(
            zone.id,
            getDisplayColorForEntry(
              worstEntry,
              product,
              colors,
              expiryWarningEnabled,
              lowStockWarningEnabled,
            ),
          )
        }
      }
    }

    return map
  }, [zones, inventoryEntries, products, colors, expiryWarningEnabled, lowStockWarningEnabled])

  function renderGrid() {
    const rows = []
    for (let r = 1; r <= gridRows; r++) {
      const cols = []
      for (let c = 1; c <= gridCols; c++) {
        const zone = getCellZone(r, c)
        const isSelected = isCellSelected(r, c)
        const isOtherZone = zone && editingZone && zone.id !== editingZone.id
        const isSearchActive = highlightedZones.size > 0
        const isHighlighted = zone ? highlightedZones.has(zone.id) : false
        const expiryDotColor = zone
          ? (isSearchActive ? highlightedZones.get(zone.id) : autoZoneDots.get(zone.id))
          : undefined
        const zoneColor = zone?.color ?? ZONE_COLORS[0]
        const centerCell = zone ? getCenterCell(zone.cells) : null
        const isCenter = centerCell?.row === r && centerCell?.col === c
        const radius = zone ? getCellRadius(zone.cells, r, c) : {
          borderTopLeftRadius: 10, borderTopRightRadius: 10,
          borderBottomLeftRadius: 10, borderBottomRightRadius: 10
        }

        let bgColor = colors.cellEmpty
        let borderColor = colors.cellBorder
        let opacity = 1

        if (mode === 'selecting') {
          if (isSelected) {
            bgColor = selectedColor
            borderColor = selectedColor
          } else if (isOtherZone || (zone && !editingZone)) {
            opacity = 0.3
          }
        } else {
          if (zone) {
            bgColor = zoneBgColor(zoneColor)
            borderColor = zoneColor
            if (isSearchActive && !isHighlighted) opacity = 0.25
          }
        }

        cols.push(
          <TouchableOpacity
            key={`${r}-${c}`}
            style={[
              styles.cell,
              { backgroundColor: bgColor, borderColor, opacity },
              radius,
            ]}
            onPress={() => mode === 'selecting'
              ? toggleCell(r, c)
              : (zone ? handleZoneTap(zone) : null)
            }
            activeOpacity={0.7}
          >
            {/* Tên zone ở ô trung tâm */}
            {mode !== 'selecting' && isCenter && zone && (
              <Text style={[styles.zoneLabel, { color: zoneColor }]} numberOfLines={2}>
                {zone.name}
              </Text>
            )}

            {/* Checkmark khi đang select */}
            {mode === 'selecting' && isSelected && (
              <Text style={styles.checkmark}>✓</Text>
            )}

            {/* Chấm hạn sử dụng khi search */}
            {mode === 'normal' && expiryDotColor && (
              <View style={[styles.expiryDot, { backgroundColor: expiryDotColor }]} />
            )}
          </TouchableOpacity>
        )
      }
      rows.push(
        <View key={r} style={styles.gridRow}>
          <Text style={[styles.axisLabel, { color: colors.sub }]}>{r}</Text>
          {cols}
        </View>
      )
    }
    return rows
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.topSpacer} />

      {/* Header — mode switcher Warehouse ↔ Market */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.modeTitleBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => setModeSheetOpen(true)}
        >
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {appMode === 'warehouse' ? "🏪 Chino's Warehouse" : "🏪 Chino's Market"}
          </Text>
          <Text style={[styles.modeTitleChevron, { color: colors.sub }]}>▾</Text>
        </Pressable>
        {mode === 'normal' ? (
          canWrite ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[
                  styles.layoutBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  !selectedLocationId ? { opacity: 0.35 } : null,
                ]}
                onPress={() => {
                  if (!selectedLocationId) return
                  navigation.navigate('ZoneLayoutEditor', {
                    locationId: selectedLocationId,
                    markOwnMutation,
                  })
                }}
                disabled={!selectedLocationId}
              >
                <Text style={[styles.layoutBtnIcon, { color: colors.text }]}>▦</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={startAddZone}>
                <Text style={styles.addBtnText}>+ Zone</Text>
              </TouchableOpacity>
            </View>
          ) : null
        ) : canWrite ? (
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.card }]} onPress={cancelSelect}>
            <Text style={[styles.cancelBtnText, { color: colors.text }]}>Hủy</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={modeSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModeSheetOpen(false)}
      >
        <Pressable style={styles.locationSheetBackdrop} onPress={() => setModeSheetOpen(false)}>
          <Pressable style={[styles.locationSheetPanel, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.locationSheetTitle, { color: colors.text }]}>Chọn chế độ</Text>
            {(
              [
                { mode: 'warehouse' as const, label: "Chino's Warehouse" },
                { mode: 'market' as const, label: "Chino's Market" },
              ] as const
            ).map((opt) => {
              const selected = appMode === opt.mode
              return (
                <TouchableOpacity
                  key={opt.mode}
                  style={[styles.locationSheetRow, { borderColor: colors.border, backgroundColor: selected ? colors.bg : 'transparent' }]}
                  onPress={() => {
                    if (opt.mode !== appMode) {
                      clearSearch()
                      setAppMode(opt.mode)
                    }
                    setModeSheetOpen(false)
                  }}
                >
                  <Text style={[styles.locationSheetName, { color: colors.text }]}>{opt.label}</Text>
                  {selected ? <Text style={{ color: colors.accent, fontSize: 18, fontWeight: '700' }}>✓</Text> : null}
                </TouchableOpacity>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Location selector — dropdown sheet (KI-004: clear search khi đổi kho) */}
      <View style={styles.locationSelectorWrap}>
        <Pressable
          style={({ pressed }) => [
            styles.locationSelectorBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => setLocationSheetOpen(true)}
        >
          <Text style={[styles.locationSelectorTitle, { color: colors.text }]} numberOfLines={1}>
            {activeLocation?.name ?? 'Chọn kho'}
          </Text>
          <Text style={[styles.locationSelectorChevron, { color: colors.sub }]}>▾</Text>
        </Pressable>
      </View>

      <Modal
        visible={locationSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationSheetOpen(false)}
      >
        <Pressable style={styles.locationSheetBackdrop} onPress={() => setLocationSheetOpen(false)}>
          <Pressable style={[styles.locationSheetPanel, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.locationSheetTitle, { color: colors.text }]}>Chọn kho</Text>
            <ScrollView style={styles.locationSheetList} keyboardShouldPersistTaps="handled">
              {locations.map((loc) => {
                const selected = loc.id === selectedLocationId
                const gr = loc.grid_rows ?? DEFAULT_GRID
                const gc = loc.grid_cols ?? DEFAULT_GRID
                return (
                  <TouchableOpacity
                    key={loc.id}
                    style={[styles.locationSheetRow, { borderColor: colors.border, backgroundColor: selected ? colors.bg : 'transparent' }]}
                    onPress={() => pickLocation(loc.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.locationSheetName, { color: colors.text }]}>{loc.name}</Text>
                      <Text style={[styles.locationSheetGrid, { color: colors.sub }]}>{gr} × {gc}</Text>
                    </View>
                    {selected ? <Text style={{ color: colors.accent, fontSize: 18, fontWeight: '700' }}>✓</Text> : null}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
            {canWrite ? (
              <TouchableOpacity
                style={[styles.locationSheetAddBtn, { backgroundColor: colors.accent }]}
                onPress={openAddWarehouseFromMap}
              >
                <Text style={[styles.locationSheetAddBtnText, { color: colors.card }]}>Thêm kho mới</Text>
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Search */}
      {mode === 'normal' && (
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Tìm sản phẩm..."
              placeholderTextColor={colors.sub}
              value={searchQuery}
              onChangeText={handleSearch}
              maxLength={100}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.searchClearInsideBtn}>
                <Text style={{ color: colors.text }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('BarcodeScanner', { mode: 'locate', returnTab: 'Map' })}
            style={[styles.scanBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.scanBtnText}>📷</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Instruction khi selecting */}
      {mode === 'selecting' && (
        <View style={[styles.instructionBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.instructionText, { color: colors.accent }]}>
            {editingZone ? `Đang sửa "${editingZone.name}"` : 'Chọn các ô để tạo zone mới'}
          </Text>
          <Text style={[styles.instructionSub, { color: colors.sub }]}>
            Đã chọn {selectedCells.length} ô
          </Text>
        </View>
      )}

      {/* Search results */}
      {searchResults.length > 0 && mode === 'normal' && (
        <View style={[styles.resultsBox, { backgroundColor: colors.card }]}>
          <View style={styles.resultsHeaderRow}>
            <Text style={[styles.resultsTitle, { color: colors.sub }]}>
              Kết quả ({searchResults.length} lô · {searchResultsByLocation.length} kho)
            </Text>
            <TouchableOpacity
              style={[styles.resultsToggleBtn, { backgroundColor: colors.bg }]}
              onPress={() => setIsSearchPanelExpanded((prev) => !prev)}
            >
              <Text style={[styles.resultsToggleLabel, { color: colors.text }]}>
                {isSearchPanelExpanded ? 'Thu gọn' : 'Chi tiết'}
              </Text>
              <Text style={[styles.resultsToggleText, { color: colors.sub }]}>
                {isSearchPanelExpanded ? '▴' : '▾'}
              </Text>
            </TouchableOpacity>
          </View>

          {isSearchPanelExpanded ? (
          <ScrollView style={styles.resultsScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {searchResultsByLocation.map((group) => (
              <View key={group.locationId} style={styles.resultLocationGroup}>
                <Text style={[styles.resultLocationHeader, { color: colors.text }]}>
                  {group.locationName}
                </Text>
                {group.entries.map((entry) => {
                  const product = entry.product
                  const dotColor = getDisplayColorForEntry(
                    entry,
                    product,
                    colors,
                    expiryWarningEnabled,
                    lowStockWarningEnabled,
                  )
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={[styles.resultLotRow, { borderColor: colors.border }]}
                      onPress={() => focusSearchResultLot(entry)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.dot, { backgroundColor: dotColor }]} />
                      <View style={styles.resultLotTextWrap}>
                        <Text style={[styles.resultProductName, { color: colors.text }]} numberOfLines={1}>
                          {product?.name ?? 'Sản phẩm không xác định'}
                        </Text>
                        <Text style={[styles.resultLotMeta, { color: colors.sub }]} numberOfLines={2}>
                          {entry.zone?.name ?? '—'} · Tầng {entry.tier} · {entry.quantity_boxes} {qtyUnit}
                          {entry.expiry_date ? ` · ${formatResultExpiry(entry.expiry_date)}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
          </ScrollView>
          ) : (
            collapsedSearchSummaries.map((summary, idx) => (
              <Text
                key={`${summary.productName}-${idx}`}
                style={[styles.resultText, styles.collapsedSummaryText, { color: colors.text }]}
                numberOfLines={1}
              >
                {summary.productName} — {summary.totalBoxes} {qtyUnit} — {summary.zoneIds.size} zone
              </Text>
            ))
          )}
        </View>
      )}

      {/* Grid */}
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.grid}>
              <View style={styles.gridRow}>
                <View style={styles.axisCorner} />
                {Array.from({ length: gridCols }, (_, i) => (
                  <Text key={i} style={[styles.axisLabel, styles.colLabel, { color: colors.sub }]}>{i + 1}</Text>
                ))}
              </View>
              {renderGrid()}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* Confirm bar */}
      {mode === 'selecting' && canWrite && (
        <View style={[styles.confirmBar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.accent }]} onPress={confirmSelection}>
            <Text style={styles.confirmBtnText}>
              {editingZone ? 'Xác nhận chỉnh sửa' : 'Tạo zone'} ({selectedCells.length} ô)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomSpacer} />

      {/* Modal đặt tên + chọn màu */}
      <Modal visible={nameModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingZone ? 'Sửa zone' : 'Đặt tên zone'}
            </Text>

            <Text style={[styles.label, { color: colors.sub }]}>Tên zone *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={zoneName}
              onChangeText={setZoneName}
              placeholder="VD: A1, Khu lạnh..."
              placeholderTextColor={colors.sub}
              autoFocus
              maxLength={100}
            />

            <Text style={[styles.label, { color: colors.sub }]}>Số tầng kệ</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={tierCount}
              onChangeText={setTierCount}
              keyboardType="numeric"
              maxLength={2}
            />

            <Text style={[styles.label, { color: colors.sub }]}>Màu zone</Text>
            <View style={styles.colorRow}>
              {ZONE_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorDotSelected
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setNameModal(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.bg }]}
              >
                <Text style={{ color: colors.sub }}>Hủy</Text>
              </TouchableOpacity>
              {canWrite ? (
                <TouchableOpacity
                  onPress={saveZone}
                  disabled={isSavingZone}
                  style={[
                    styles.modalSaveBtn,
                    { backgroundColor: colors.accent, opacity: isSavingZone ? 0.5 : 1 },
                  ]}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lưu</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Action modal */}
      <Modal visible={actionModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionModal(false)}>
          <View style={[styles.actionBox, { backgroundColor: colors.card }]}>
            <View style={[styles.actionColorBar, { backgroundColor: tappedZone?.color ?? colors.accent }]} />
            <Text style={[styles.actionTitle, { color: colors.text }]}>{tappedZone?.name}</Text>
            <Text style={[styles.actionSub, { color: colors.sub }]}>
              {tappedZone?.cells?.length} ô · {tappedZone?.tier_count} tầng
            </Text>
            <TouchableOpacity style={[styles.actionBtn, { borderBottomColor: colors.border }]} onPress={openZoneDetail}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>📦 Xem hàng trong zone</Text>
            </TouchableOpacity>
            {canWrite ? (
              <TouchableOpacity style={[styles.actionBtn, { borderBottomColor: colors.border }]} onPress={startEditZone}>
                <Text style={[styles.actionBtnText, { color: colors.text }]}>✏️ Sửa zone</Text>
              </TouchableOpacity>
            ) : null}
            {canWrite ? (
              <TouchableOpacity style={[styles.actionBtn, { borderBottomWidth: 0 }]} onPress={handleDeleteZone}>
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>🗑️ Xóa zone</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ height: 8 }} />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <ZoneDetailSheet
        visible={zoneDetailVisible}
        zone={tappedZone}
        onClose={closeZoneDetail}
        onBeforeMutation={markOwnMutation}
        navigation={navigation}
        scannedLotBarcode={scannedZoneLotBarcode}
        scannedLotId={scannedZoneLotId}
        scannedLotBarcodeAt={scannedZoneLotBarcodeAt}
        scrollToProductId={autoScrollProductId}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSpacer: { height: Platform.OS === 'android' ? 16 : 0 },
  bottomSpacer: { height: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  modeTitleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8, minWidth: 0 },
  modeTitleChevron: { fontSize: 14, fontWeight: '700', marginLeft: 4 },
  title: { fontSize: 17, fontWeight: 'bold', flexShrink: 1 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  layoutBtn: {
    width: 40,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutBtnIcon: { fontSize: 18, fontWeight: '700' },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  cancelBtnText: { fontWeight: 'bold' },
  locationSelectorWrap: { paddingHorizontal: 16, marginBottom: 8 },
  locationSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationSelectorTitle: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  locationSelectorChevron: { fontSize: 14, fontWeight: '700' },
  locationSheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  locationSheetPanel: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    maxHeight: '72%',
  },
  locationSheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  locationSheetList: { maxHeight: 360 },
  locationSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  locationSheetName: { fontSize: 15, fontWeight: '600' },
  locationSheetGrid: { fontSize: 13, marginTop: 4 },
  locationSheetAddBtn: { marginTop: 6, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  locationSheetAddBtnText: { fontSize: 15, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10 },
  searchInputWrap: { flex: 1, position: 'relative' },
  searchInput: { flex: 1, borderRadius: 10, borderWidth: 1, paddingLeft: 14, paddingRight: 40, paddingVertical: 10, fontSize: 14 },
  searchClearInsideBtn: {
    position: 'absolute',
    right: 10,
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
  instructionBox: { marginHorizontal: 16, marginBottom: 10, borderRadius: 10, padding: 12 },
  instructionText: { fontWeight: 'bold', fontSize: 14 },
  instructionSub: { fontSize: 12, marginTop: 2 },
  resultsBox: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 12 },
  resultsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  resultsTitle: { fontSize: 12, flex: 1 },
  resultsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultsToggleLabel: { fontSize: 13, fontWeight: '600' },
  resultsToggleText: { fontSize: 12, fontWeight: '700' },
  resultsScroll: { maxHeight: 220 },
  resultText: { fontSize: 13, flex: 1 },
  collapsedSummaryText: { marginBottom: 5 },
  resultLocationGroup: { marginBottom: 10 },
  resultLocationHeader: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  resultLotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  resultLotTextWrap: { flex: 1, marginLeft: 8 },
  resultProductName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  resultLotMeta: { fontSize: 12, lineHeight: 17 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  grid: { padding: 16 },
  gridRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  axisCorner: { width: 20, height: CELL_SIZE },
  axisLabel: { width: 20, fontSize: 10, textAlign: 'center' },
  colLabel: { width: CELL_SIZE, marginHorizontal: 2, marginBottom: 4 },
  cell: {
    width: CELL_SIZE, height: CELL_SIZE,
    marginHorizontal: 2, marginVertical: 2,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  zoneLabel: { fontSize: 10, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 2 },
  checkmark: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  expiryDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },
  confirmBar: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  confirmBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 14 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  actionBox: { marginHorizontal: 32, borderRadius: 16, overflow: 'hidden', marginBottom: 180 },
  actionColorBar: { height: 4 },
  actionTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 16 },
  actionSub: { fontSize: 12, textAlign: 'center', marginBottom: 16 },
  actionBtn: { paddingVertical: 14, borderBottomWidth: 1, alignItems: 'center' },
  actionBtnText: { fontSize: 15 },
})