import { useEffect, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { EXPIRY_COLORS, getExpiryStatus } from '../types'

export default function ProductsScreen() {
  const navigation = useNavigation<any>()
  const {
    products,
    zones,
    inventoryEntries,
    fetchProducts,
    fetchLocations,
    fetchInventoryByZone,
  } = useWarehouseStore()
  const { colors } = useThemeStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([])

  useEffect(() => {
    fetchLocations()
    fetchProducts()
  }, [fetchLocations, fetchProducts])

  useEffect(() => {
    if (zones.length === 0) return
    // Đồng bộ inventory entries từ tất cả zone vào store để lọc local
    Promise.all(zones.map((zone) => fetchInventoryByZone(zone.id)))
  }, [zones, fetchInventoryByZone])

  function toggleZone(zoneId: string) {
    setSelectedZoneIds((prev) => (
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    ))
  }

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const hasZoneFilter = selectedZoneIds.length > 0
    const selectedSet = new Set(selectedZoneIds)

    return products.filter((product) => {
      const matchSearch = normalizedQuery.length === 0 || product.name.toLowerCase().includes(normalizedQuery)
      if (!matchSearch) return false
      if (!hasZoneFilter) return true

      // Khi có filter zone: chỉ giữ sản phẩm có ít nhất 1 lot nằm trong zone đã chọn
      return inventoryEntries.some((entry) => (
        entry.product_id === product.id && selectedSet.has(entry.zone_id)
      ))
    })
  }, [products, searchQuery, selectedZoneIds, inventoryEntries])

  const selectedZoneSet = useMemo(() => new Set(selectedZoneIds), [selectedZoneIds])

  function getGroupedLotsByExpiry(productId: string) {
    const hasZoneFilter = selectedZoneIds.length > 0
    const relevantEntries = inventoryEntries.filter((entry) => (
      entry.product_id === productId &&
      (!hasZoneFilter || selectedZoneSet.has(entry.zone_id))
    ))

    const map = new Map<string, { expiry_date?: string; quantity_boxes: number }>()
    for (const entry of relevantEntries) {
      const key = entry.expiry_date ?? '__NO_EXPIRY__'
      const current = map.get(key)
      if (current) {
        current.quantity_boxes += entry.quantity_boxes
      } else {
        map.set(key, { expiry_date: entry.expiry_date, quantity_boxes: entry.quantity_boxes })
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aTime = a.expiry_date ? new Date(a.expiry_date).getTime() : Number.POSITIVE_INFINITY
      const bTime = b.expiry_date ? new Date(b.expiry_date).getTime() : Number.POSITIVE_INFINITY
      return aTime - bTime
    })
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>📦 Sản phẩm</Text>

      <View style={styles.searchWrap}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Tìm sản phẩm theo tên..."
          placeholderTextColor={colors.sub}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.zoneFilterRow}
        style={styles.zoneFilterScroll}
      >
        {zones.map((zone) => {
          const isSelected = selectedZoneIds.includes(zone.id)
          return (
            <TouchableOpacity
              key={zone.id}
              style={[
                styles.zoneChip,
                {
                  backgroundColor: isSelected ? colors.accent : colors.card,
                  borderColor: isSelected ? colors.accent : colors.border,
                },
              ]}
              onPress={() => toggleZone(zone.id)}
            >
              <Text style={{ color: isSelected ? colors.card : colors.sub, fontSize: 12 }}>
                {zone.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {filteredProducts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.sub }}>
            {products.length === 0 ? 'Chưa có sản phẩm.' : 'Không có sản phẩm phù hợp.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filteredProducts.map((product) => {
            const groupedLots = getGroupedLotsByExpiry(product.id)
            return (
              <TouchableOpacity
                key={product.id}
                style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              >
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                  {product.name}
                </Text>
                {!!product.barcode && (
                  <Text style={[styles.itemSub, { color: colors.sub }]} numberOfLines={1}>
                    Barcode: {product.barcode}
                  </Text>
                )}

                {groupedLots.length === 0 ? (
                  <Text style={[styles.noLotText, { color: colors.sub }]}>Chưa có lô hàng</Text>
                ) : (
                  <View style={styles.lotGroupWrap}>
                    {groupedLots.map((lot, index) => {
                      const dotColor = EXPIRY_COLORS[getExpiryStatus(lot.expiry_date)]
                      return (
                        <View key={`${product.id}-${lot.expiry_date ?? 'none'}-${index}`} style={styles.lotRow}>
                          <View style={[styles.expiryDot, { backgroundColor: dotColor }]} />
                          <Text style={[styles.lotText, { color: colors.sub }]}>
                            Hạn: {lot.expiry_date ?? 'Không hạn'} · {lot.quantity_boxes} thùng
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  zoneFilterScroll: { maxHeight: 44, marginBottom: 8 },
  zoneFilterRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  zoneChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  itemName: { fontSize: 15, fontWeight: '700' },
  itemSub: { fontSize: 12, marginTop: 3 },
  noLotText: { fontSize: 12, marginTop: 8 },
  lotGroupWrap: { marginTop: 8, gap: 4 },
  lotRow: { flexDirection: 'row', alignItems: 'center' },
  lotText: { fontSize: 12, marginLeft: 6 },
  expiryDot: { width: 8, height: 8, borderRadius: 4 },
})