import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  TextInput, SafeAreaView, ActivityIndicator, Modal, Alert, Platform
} from 'react-native'
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { Zone, ZoneCell, InventoryEntry, formatExpiryDate, getCombinedStatus, getCombinedStatusRank, ZONE_COLORS } from '../types'
import ZoneDetailSheet from '../components/ZoneDetailSheet'

const CELL_SIZE = 56
const DEFAULT_GRID = 6

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

export default function MapScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const isFocused = useIsFocused()
  const {
    locations, selectedLocationId, zones, products, inventoryEntries, isLoading,
    fetchLocations, fetchProducts, fetchInventoryByZone, setSelectedLocation, addZone, updateZone, deleteZone, searchProducts
  } = useWarehouseStore()
  const { colors, loadTheme } = useThemeStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<InventoryEntry[]>([])
  const [highlightedZones, setHighlightedZones] = useState<Map<string, string>>(new Map())
  const [isSearchPanelExpanded, setIsSearchPanelExpanded] = useState(false)
  const searchRequestRef = useRef(0)

  const [mode, setMode] = useState<'normal' | 'selecting'>('normal')
  const [selectedCells, setSelectedCells] = useState<ZoneCell[]>([])
  const [editingZone, setEditingZone] = useState<Zone | null>(null)

  const [nameModal, setNameModal] = useState(false)
  const [actionModal, setActionModal] = useState(false)
  const [zoneDetailVisible, setZoneDetailVisible] = useState(false)
  const [tappedZone, setTappedZone] = useState<Zone | null>(null)
  const [locationSheetOpen, setLocationSheetOpen] = useState(false)
  const [zoneName, setZoneName] = useState('')
  const [tierCount, setTierCount] = useState('1')
  const [selectedColor, setSelectedColor] = useState(ZONE_COLORS[0])
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
    console.log('[MapScreen][locate] focus params:', {
      scannedProductName,
      locateScannedAt,
    })
    if (scannedBarcode && scannedInventoryEntryId) {
      const matchedEntry = inventoryEntries.find((e) => e.id === scannedInventoryEntryId)
      if (matchedEntry) {
        const product = matchedEntry.product ?? products.find((p) => p.id === matchedEntry.product_id)
        const status = getCombinedStatus(
          matchedEntry.quantity_boxes,
          matchedEntry.expiry_date,
          product?.low_warning_boxes ?? 3,
          product?.low_critical_boxes ?? 1,
          product?.warning_days ?? 30
        )
        const color = status === 'expired'
          ? colors.statusExpired
          : status === 'critical'
            ? colors.statusCritical
            : status === 'warning'
              ? colors.statusWarning
              : colors.statusOk
        setSearchQuery(scannedBarcode)
        setSearchResults([matchedEntry])
        setIsSearchPanelExpanded(false)
        setHighlightedZones(new Map([[matchedEntry.zone_id, color]]))
      }
      navigation.setParams({
        scannedBarcode: undefined,
        scannedInventoryEntryId: undefined,
        scannedZoneLotBarcode: undefined,
        scannedZoneLotId: undefined,
        scannedZoneLotBarcodeAt: undefined,
        scannedProductName: undefined,
        locateScannedAt: undefined,
      })
      return
    }

    if (scannedProductName) {
      console.log('[MapScreen][locate] triggering search for:', scannedProductName)
      setSearchQuery(scannedProductName)
      handleSearch(scannedProductName)
      navigation.setParams({
        scannedProductName: undefined,
        scannedZoneLotBarcode: undefined,
        scannedZoneLotId: undefined,
        scannedZoneLotBarcodeAt: undefined,
        locateScannedAt: undefined,
      })
      return
    }
  }, [isFocused, scannedProductName, scannedBarcode, scannedInventoryEntryId, locateScannedAt, inventoryEntries, products, colors.statusCritical, colors.statusExpired, colors.statusOk, colors.statusWarning])

  useEffect(() => {
    if (!selectedLocationId || zones.length === 0) return
    // Đồng bộ lot hiện tại của các zone để auto hiển thị chấm đỏ/vàng
    Promise.all(zones.map((zone) => fetchInventoryByZone(zone.id)))
  }, [selectedLocationId, zones, fetchInventoryByZone])

  async function handleSearch(text: string) {
    const requestId = ++searchRequestRef.current
    setSearchQuery(text)
    if (text.trim().length < 2) {
      setSearchResults([])
      setHighlightedZones(new Map())
      setIsSearchPanelExpanded(false)
      return
    }
    const results = await searchProducts(text)
    if (requestId !== searchRequestRef.current) return
    setSearchResults(results)
    setIsSearchPanelExpanded(false)
    const map = new Map<string, string>()
    for (const r of results) {
      const product = r.product ?? products.find((p) => p.id === r.product_id)
      const status = getCombinedStatus(
        r.quantity_boxes,
        r.expiry_date,
        product?.low_warning_boxes ?? 3,
        product?.low_critical_boxes ?? 1,
        product?.warning_days ?? 30
      )
      const color = status === 'expired'
        ? colors.statusExpired
        : status === 'critical'
          ? colors.statusCritical
          : status === 'warning'
            ? colors.statusWarning
            : colors.statusOk
      if (r.zone_id) map.set(r.zone_id, color)
    }
    setHighlightedZones(map)
  }

  function clearSearch() {
    searchRequestRef.current += 1
    setSearchQuery('')
    setSearchResults([])
    setHighlightedZones(new Map())
    setIsSearchPanelExpanded(false)
  }

  const collapsedSearchSummaries = useMemo(() => {
    const map = new Map<string, { productName: string; totalBoxes: number; zoneIds: Set<string> }>()
    for (const entry of searchResults) {
      const productId = entry.product_id
      const current = map.get(productId)
      if (current) {
        current.totalBoxes += entry.quantity_boxes
        current.zoneIds.add(entry.zone_id)
      } else {
        map.set(productId, {
          productName: entry.product?.name ?? 'Sản phẩm không xác định',
          totalBoxes: entry.quantity_boxes,
          zoneIds: new Set([entry.zone_id]),
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName))
  }, [searchResults])

  function startAddZone() {
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

  function confirmSelection() {
    if (selectedCells.length === 0) {
      Alert.alert('Chưa chọn ô', 'Hãy chọn ít nhất 1 ô trên lưới.')
      return
    }
    setZoneName(editingZone?.name ?? '')
    setTierCount(String(editingZone?.tier_count ?? 1))
    setSelectedColor(editingZone?.color ?? ZONE_COLORS[0])
    setNameModal(true)
  }

  async function saveZone() {
    if (!zoneName.trim()) {
      Alert.alert('Lỗi', 'Tên zone không được để trống')
      return
    }
    if (!selectedLocationId) return
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
  }

  function handleZoneTap(zone: Zone) {
    if (mode === 'selecting') return
    setTappedZone(zone)
    setActionModal(true)
  }

  function startEditZone() {
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
    if (!tappedZone) return
    setActionModal(false)
    Alert.alert('Xóa zone', `Xóa zone "${tappedZone.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
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
        const dotColor = worstStatus === 'expired'
          ? colors.statusExpired
          : worstStatus === 'critical'
            ? colors.statusCritical
            : colors.statusWarning
        map.set(zone.id, dotColor)
      }
    }

    return map
  }, [zones, inventoryEntries, products, colors.statusCritical, colors.statusExpired, colors.statusWarning])

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

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🏪 Chino's Warehouse</Text>
        {mode === 'normal' ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.layoutBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                !selectedLocationId ? { opacity: 0.35 } : null,
              ]}
              onPress={() => {
                if (!selectedLocationId) return
                navigation.navigate('ZoneLayoutEditor', { locationId: selectedLocationId })
              }}
              disabled={!selectedLocationId}
            >
              <Text style={[styles.layoutBtnIcon, { color: colors.text }]}>▦</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={startAddZone}>
              <Text style={styles.addBtnText}>+ Zone</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.card }]} onPress={cancelSelect}>
            <Text style={[styles.cancelBtnText, { color: colors.text }]}>Hủy</Text>
          </TouchableOpacity>
        )}
      </View>

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
            <TouchableOpacity
              style={[styles.locationSheetAddBtn, { backgroundColor: colors.accent }]}
              onPress={openAddWarehouseFromMap}
            >
              <Text style={[styles.locationSheetAddBtnText, { color: colors.card }]}>Thêm kho mới</Text>
            </TouchableOpacity>
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
            <Text style={[styles.resultsTitle, { color: colors.sub }]}>Kết quả ({searchResults.length})</Text>
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
            searchResults.slice(0, 5).map(r => (
              <View key={r.id} style={styles.resultItem}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: (() => {
                        const status = getCombinedStatus(
                          r.quantity_boxes,
                          r.expiry_date,
                          r.product?.low_warning_boxes ?? 3,
                          r.product?.low_critical_boxes ?? 1,
                          r.product?.warning_days ?? 30
                        )
                        if (status === 'expired') return colors.statusExpired
                        if (status === 'critical') return colors.statusCritical
                        if (status === 'warning') return colors.statusWarning
                        return colors.statusOk
                      })(),
                    },
                  ]}
                />
                <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={1}>
                  {r.product?.name} — {r.zone?.name} T{r.tier} — {r.quantity_boxes} thùng · {formatResultExpiry(r.expiry_date)}{r.barcode ? ` · BC: ${r.barcode}` : ''}
                </Text>
              </View>
            ))
          ) : (
            collapsedSearchSummaries.map((summary, idx) => (
              <Text key={`${summary.productName}-${idx}`} style={[styles.resultText, styles.collapsedSummaryText, { color: colors.text }]} numberOfLines={1}>
                {summary.productName} — {summary.totalBoxes} thùng — {summary.zoneIds.size} zone
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
      {mode === 'selecting' && (
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
        <View style={styles.modalOverlay}>
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
            />

            <Text style={[styles.label, { color: colors.sub }]}>Số tầng kệ</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={tierCount}
              onChangeText={setTierCount}
              keyboardType="numeric"
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
              <TouchableOpacity
                onPress={saveZone}
                style={[styles.modalSaveBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
            <TouchableOpacity style={[styles.actionBtn, { borderBottomColor: colors.border }]} onPress={startEditZone}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>✏️ Sửa zone</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { borderBottomWidth: 0 }]} onPress={handleDeleteZone}>
              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>🗑️ Xóa zone</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ZoneDetailSheet
        visible={zoneDetailVisible}
        zone={tappedZone}
        onClose={() => setZoneDetailVisible(false)}
        navigation={navigation}
        scannedLotBarcode={scannedZoneLotBarcode}
        scannedLotId={scannedZoneLotId}
        scannedLotBarcodeAt={scannedZoneLotBarcodeAt}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSpacer: { height: Platform.OS === 'android' ? 16 : 0 },
  bottomSpacer: { height: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 17, fontWeight: 'bold' },
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
  resultsTitle: { fontSize: 12, marginBottom: 6 },
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
  resultItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  resultText: { fontSize: 13, marginLeft: 8, flex: 1 },
  collapsedSummaryText: { marginLeft: 0, marginBottom: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
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