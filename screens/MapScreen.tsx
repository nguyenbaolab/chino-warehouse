import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, SafeAreaView, ActivityIndicator
} from 'react-native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { Zone, InventoryEntry, getExpiryStatus, EXPIRY_COLORS } from '../types'

const GRID_COLS = 6

export default function MapScreen() {
  const {
    locations, selectedLocationId, zones, isLoading,
    fetchLocations, setSelectedLocation
  } = useWarehouseStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<InventoryEntry[]>([])
  const [highlightedZones, setHighlightedZones] = useState<Map<string, string>>(new Map())
  const { searchProducts } = useWarehouseStore()

  useEffect(() => {
    fetchLocations()
  }, [])

  // Tính màu chấm cho zone dựa trên lô hàng xấu nhất
  function getZoneDotColor(entries: InventoryEntry[]): string {
    if (entries.length === 0) return 'transparent'
    let worst: 'expired' | 'warning' | 'ok' = 'ok'
    for (const e of entries) {
      const s = getExpiryStatus(e.expiry_date)
      if (s === 'expired') return EXPIRY_COLORS.expired
      if (s === 'warning') worst = 'warning'
    }
    return EXPIRY_COLORS[worst]
  }

  async function handleSearch(text: string) {
    setSearchQuery(text)
    if (text.trim().length < 2) {
      setSearchResults([])
      setHighlightedZones(new Map())
      return
    }
    const results = await searchProducts(text)
    setSearchResults(results)
    // Build zone highlight map
    const map = new Map<string, string>()
    for (const r of results) {
      if (r.zone_id) {
        const color = getExpiryStatus(r.expiry_date)
        map.set(r.zone_id, EXPIRY_COLORS[color])
      }
    }
    setHighlightedZones(map)
  }

  function clearSearch() {
    setSearchQuery('')
    setSearchResults([])
    setHighlightedZones(new Map())
  }

  // Tạo lưới zone
  function renderGrid() {
    const maxRow = Math.max(...zones.map(z => z.row_index), 5)
    const maxCol = Math.max(...zones.map(z => z.col_index), GRID_COLS - 1)
    const rows = []
    for (let r = 0; r <= maxRow; r++) {
      const cols = []
      for (let c = 0; c <= maxCol; c++) {
        const zone = zones.find(z => z.row_index === r && z.col_index === c)
        const dotColor = highlightedZones.get(zone?.id || '')
        cols.push(
          <TouchableOpacity
            key={`${r}-${c}`}
            style={[styles.cell, zone ? styles.cellFilled : styles.cellEmpty]}
            disabled={!zone}
          >
            {zone && (
              <>
                <Text style={styles.zoneName}>{zone.name}</Text>
                {dotColor && (
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                )}
              </>
            )}
          </TouchableOpacity>
        )
      }
      rows.push(
        <View key={r} style={styles.row}>{cols}</View>
      )
    }
    return rows
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header + Location Dropdown */}
      <View style={styles.header}>
        <Text style={styles.title}>🏪 Chino's Warehouse</Text>
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
      </View>

      {/* Search bar */}
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

      {/* Search results */}
      {searchResults.length > 0 && (
        <View style={styles.resultsBox}>
          <Text style={styles.resultsTitle}>Kết quả ({searchResults.length})</Text>
          {searchResults.map(r => (
            <View key={r.id} style={styles.resultItem}>
              <View style={[styles.dot, { backgroundColor: EXPIRY_COLORS[getExpiryStatus(r.expiry_date)] }]} />
              <Text style={styles.resultText}>
                {r.product?.name} — {r.zone?.name} T{r.tier} — {r.quantity_boxes} thùng
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Map grid */}
      {isLoading ? (
        <ActivityIndicator color="#22C55E" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView>
          <ScrollView horizontal>
            <View style={styles.grid}>{renderGrid()}</View>
          </ScrollView>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { padding: 16, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  locationRow: { flexDirection: 'row' },
  locBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#222', marginRight: 8
  },
  locBtnActive: { backgroundColor: '#22C55E' },
  locText: { color: '#888', fontSize: 13 },
  locTextActive: { color: '#fff', fontWeight: 'bold' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8
  },
  searchInput: {
    flex: 1, backgroundColor: '#222', color: '#fff',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14
  },
  clearBtn: {
    marginLeft: 8, backgroundColor: '#333',
    padding: 10, borderRadius: 10
  },
  resultsBox: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12 },
  resultsTitle: { color: '#888', fontSize: 12, marginBottom: 8 },
  resultItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  resultText: { color: '#fff', fontSize: 13, marginLeft: 8 },
  grid: { padding: 16 },
  row: { flexDirection: 'row' },
  cell: {
    width: 64, height: 64, margin: 3,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center'
  },
  cellFilled: { backgroundColor: '#1e3a2f', borderWidth: 1, borderColor: '#2d5a3d' },
  cellEmpty: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#222' },
  zoneName: { color: '#22C55E', fontSize: 11, fontWeight: 'bold' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
})