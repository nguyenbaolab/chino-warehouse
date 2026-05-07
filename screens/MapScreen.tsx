import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, ActivityIndicator, Modal, Alert, Platform
} from 'react-native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { Zone, ZoneCell, InventoryEntry, getExpiryStatus, EXPIRY_COLORS } from '../types'

const GRID_ROWS = 6
const GRID_COLS = 6
const CELL_SIZE = 56

export default function MapScreen() {
  const {
    locations, selectedLocationId, zones, isLoading,
    fetchLocations, setSelectedLocation, addZone, updateZone, deleteZone, searchProducts
  } = useWarehouseStore()

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<InventoryEntry[]>([])
  const [highlightedZones, setHighlightedZones] = useState<Map<string, string>>(new Map())

  // Zone creation/edit mode
  const [mode, setMode] = useState<'normal' | 'selecting'>('normal')
  const [selectedCells, setSelectedCells] = useState<ZoneCell[]>([])
  const [editingZone, setEditingZone] = useState<Zone | null>(null)

  // Modals
  const [nameModal, setNameModal] = useState(false)
  const [actionModal, setActionModal] = useState(false)
  const [tappedZone, setTappedZone] = useState<Zone | null>(null)
  const [zoneName, setZoneName] = useState('')
  const [tierCount, setTierCount] = useState('1')

  useEffect(() => { fetchLocations() }, [])

  // --- Search ---
  async function handleSearch(text: string) {
    setSearchQuery(text)
    if (text.trim().length < 2) {
      setSearchResults([])
      setHighlightedZones(new Map())
      return
    }
    const results = await searchProducts(text)
    setSearchResults(results)
    const map = new Map<string, string>()
    for (const r of results) {
      if (r.zone_id) {
        map.set(r.zone_id, EXPIRY_COLORS[getExpiryStatus(r.expiry_date)])
      }
    }
    setHighlightedZones(map)
  }

  function clearSearch() {
    setSearchQuery('')
    setSearchResults([])
    setHighlightedZones(new Map())
  }

  // --- Zone creation ---
  function startAddZone() {
    setEditingZone(null)
    setSelectedCells([])
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
    // Nếu ô đang thuộc zone khác (không phải zone đang edit) thì không cho chọn
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
      })
    } else {
      await addZone({
        name: zoneName.trim(),
        cells: selectedCells,
        tier_count: parseInt(tierCount) || 1,
        location_id: selectedLocationId,
      })
    }
    setNameModal(false)
    setMode('normal')
    setSelectedCells([])
    setEditingZone(null)
  }

  // --- Zone actions (tap in normal mode) ---
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

  // --- Render grid ---
  function renderGrid() {
    const rows = []
    for (let r = 1; r <= GRID_ROWS; r++) {
      const cols = []
      for (let c = 1; c <= GRID_COLS; c++) {
        const zone = getCellZone(r, c)
        const isSelected = isCellSelected(r, c)
        const isOtherZone = zone && editingZone && zone.id !== editingZone.id
        const dotColor = zone ? highlightedZones.get(zone.id) : undefined

        let cellStyle: any[] = [styles.cell]
        let labelColor = '#22C55E'

        if (mode === 'selecting') {
          if (isSelected) {
            cellStyle.push(styles.cellSelected)
            labelColor = '#fff'
          } else if (isOtherZone) {
            cellStyle.push(styles.cellBlocked)
            labelColor = '#444'
          } else if (zone && !editingZone) {
            cellStyle.push(styles.cellBlocked)
            labelColor = '#444'
          } else {
            cellStyle.push(styles.cellEmpty)
          }
        } else {
          if (zone) {
            cellStyle.push(styles.cellFilled)
          } else {
            cellStyle.push(styles.cellEmpty)
          }
        }

        // Chỉ hiện label ở ô đầu tiên của zone (cells[0])
        const isFirstCell = zone?.cells?.[0]?.row === r && zone?.cells?.[0]?.col === c

        cols.push(
          <TouchableOpacity
            key={`${r}-${c}`}
            style={cellStyle}
            onPress={() => mode === 'selecting' ? toggleCell(r, c) : (zone ? handleZoneTap(zone) : null)}
            activeOpacity={0.7}
          >
            {isFirstCell && zone && (
              <Text style={[styles.zoneLabel, { color: labelColor }]} numberOfLines={1}>
                {zone.name}
              </Text>
            )}
            {mode === 'normal' && dotColor && (
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
            )}
            {mode === 'selecting' && isSelected && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        )
      }
      rows.push(
        <View key={r} style={styles.gridRow}>
          {/* Row label */}
          <Text style={styles.axisLabel}>{r}</Text>
          {cols}
        </View>
      )
    }
    return rows
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top padding for notch */}
      <View style={styles.topSpacer} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🏪 Chino's Warehouse</Text>
        {mode === 'normal' ? (
          <TouchableOpacity style={styles.addBtn} onPress={startAddZone}>
            <Text style={styles.addBtnText}>+ Zone</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelSelect}>
            <Text style={styles.cancelBtnText}>Hủy</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Location selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationRow}>
        {locations.map(loc => (
          <TouchableOpacity
            key={loc.id}
            style={[styles.locBtn, selectedLocationId === loc.id && styles.locBtnActive]}
            onPress={() => setSelectedLocation(loc.id)}
          >
            <Text style={[styles.locText, selectedLocationId === loc.id && styles.locTextActive]}>
              {loc.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search bar (chỉ hiện khi normal mode) */}
      {mode === 'normal' && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm sản phẩm..."
            placeholderTextColor="#555"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
              <Text style={{ color: '#fff' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Hướng dẫn khi đang chọn ô */}
      {mode === 'selecting' && (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            {editingZone ? `Đang sửa zone "${editingZone.name}"` : 'Chọn các ô để tạo zone mới'}
          </Text>
          <Text style={styles.instructionSub}>
            Đã chọn {selectedCells.length} ô
          </Text>
        </View>
      )}

      {/* Search results */}
      {searchResults.length > 0 && mode === 'normal' && (
        <View style={styles.resultsBox}>
          <Text style={styles.resultsTitle}>Kết quả ({searchResults.length})</Text>
          {searchResults.slice(0, 5).map(r => (
            <View key={r.id} style={styles.resultItem}>
              <View style={[styles.dot, { backgroundColor: EXPIRY_COLORS[getExpiryStatus(r.expiry_date)] }]} />
              <Text style={styles.resultText} numberOfLines={1}>
                {r.product?.name} — {r.zone?.name} T{r.tier} — {r.quantity_boxes} thùng
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Grid */}
      {isLoading ? (
        <ActivityIndicator color="#22C55E" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.grid}>
              {/* Column labels */}
              <View style={styles.gridRow}>
                <View style={styles.axisCorner} />
                {Array.from({ length: GRID_COLS }, (_, i) => (
                  <Text key={i} style={[styles.axisLabel, styles.colLabel]}>{i + 1}</Text>
                ))}
              </View>
              {renderGrid()}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* Confirm button khi đang select */}
      {mode === 'selecting' && (
        <View style={styles.confirmBar}>
          <TouchableOpacity style={styles.confirmBtn} onPress={confirmSelection}>
            <Text style={styles.confirmBtnText}>
              {editingZone ? 'Xác nhận chỉnh sửa' : 'Tạo zone'} ({selectedCells.length} ô)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom spacer */}
      <View style={styles.bottomSpacer} />

      {/* Modal đặt tên zone */}
      <Modal visible={nameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingZone ? 'Sửa zone' : 'Đặt tên zone'}
            </Text>
            <Text style={styles.label}>Tên zone *</Text>
            <TextInput
              style={styles.input}
              value={zoneName}
              onChangeText={setZoneName}
              placeholder="VD: A1, Khu lạnh..."
              placeholderTextColor="#555"
              autoFocus
            />
            <Text style={styles.label}>Số tầng kệ</Text>
            <TextInput
              style={styles.input}
              value={tierCount}
              onChangeText={setTierCount}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setNameModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={{ color: '#888' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveZone} style={styles.modalSaveBtn}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action modal khi tap zone */}
      <Modal visible={actionModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionModal(false)}
        >
          <View style={styles.actionBox}>
            <Text style={styles.actionTitle}>{tappedZone?.name}</Text>
            <Text style={styles.actionSub}>
              {tappedZone?.cells?.length} ô · {tappedZone?.tier_count} tầng
            </Text>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setActionModal(false)}>
              <Text style={styles.actionBtnText}>📦 Xem hàng trong zone</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={startEditZone}>
              <Text style={styles.actionBtnText}>✏️ Sửa zone</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleDeleteZone}>
              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>🗑️ Xóa zone</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  topSpacer: { height: Platform.OS === 'android' ? 16 : 0 },
  bottomSpacer: { height: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12
  },
  title: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#22C55E', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#333', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  cancelBtnText: { color: '#fff' },
  locationRow: { paddingHorizontal: 16, marginBottom: 8, flexGrow: 0 },
  locBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#222', marginRight: 8
  },
  locBtnActive: { backgroundColor: '#22C55E' },
  locText: { color: '#888', fontSize: 13 },
  locTextActive: { color: '#fff', fontWeight: 'bold' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10
  },
  searchInput: {
    flex: 1, backgroundColor: '#222', color: '#fff',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14
  },
  clearBtn: { marginLeft: 8, backgroundColor: '#333', padding: 10, borderRadius: 10 },
  instructionBox: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#1e3a2f', borderRadius: 10, padding: 12
  },
  instructionText: { color: '#22C55E', fontWeight: 'bold', fontSize: 14 },
  instructionSub: { color: '#888', fontSize: 12, marginTop: 2 },
  resultsBox: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12
  },
  resultsTitle: { color: '#888', fontSize: 12, marginBottom: 6 },
  resultItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  resultText: { color: '#fff', fontSize: 13, marginLeft: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  grid: { padding: 16 },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  axisCorner: { width: 20, height: CELL_SIZE + 4 },
  axisLabel: { width: 20, color: '#555', fontSize: 11, textAlign: 'center' },
  colLabel: { width: CELL_SIZE + 4, marginHorizontal: 2 },
  cell: {
    width: CELL_SIZE, height: CELL_SIZE,
    margin: 2, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center'
  },
  cellEmpty: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' },
  cellFilled: { backgroundColor: '#1e3a2f', borderWidth: 1, borderColor: '#2d5a3d' },
  cellSelected: { backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#16a34a' },
  cellBlocked: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#1a1a1a', opacity: 0.4 },
  zoneLabel: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  checkmark: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  confirmBar: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#222'
  },
  confirmBtn: {
    backgroundColor: '#22C55E', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center'
  },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end'
  },
  modalBox: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24
  },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 16 },
  label: { color: '#888', fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#222', color: '#fff', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 14
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, backgroundColor: '#222', padding: 14,
    borderRadius: 10, alignItems: 'center'
  },
  modalSaveBtn: {
    flex: 1, backgroundColor: '#22C55E', padding: 14,
    borderRadius: 10, alignItems: 'center'
  },
  actionBox: {
    backgroundColor: '#1a1a1a', marginHorizontal: 40,
    borderRadius: 16, padding: 20, marginBottom: 200
  },
  actionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  actionSub: { color: '#666', fontSize: 12, textAlign: 'center', marginBottom: 16 },
  actionBtn: {
    paddingVertical: 14, borderBottomWidth: 1,
    borderBottomColor: '#222', alignItems: 'center'
  },
  actionBtnDanger: { borderBottomWidth: 0 },
  actionBtnText: { color: '#fff', fontSize: 15 },
})