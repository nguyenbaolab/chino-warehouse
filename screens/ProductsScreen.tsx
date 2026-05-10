import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { CombinedStatus, formatExpiryDate, getCombinedStatus, getCombinedStatusRank } from '../types'
import { supabase } from '../lib/supabase'

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
  const [showArchived, setShowArchived] = useState(false)

  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editBarcode, setEditBarcode] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editWarningDays, setEditWarningDays] = useState('30')
  const [isEditingArchived, setIsEditingArchived] = useState(false)

  useEffect(() => {
    fetchLocations()
    if (showArchived) {
      // Bật toggle thì lấy cả sản phẩm đã ẩn
      supabase
        .from('products')
        .select('*')
        .order('name')
        .then(({ data }) => {
          if (data) useWarehouseStore.setState({ products: data })
        })
    } else {
      fetchProducts()
    }
  }, [fetchLocations, fetchProducts, showArchived])

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

  function openEditProduct(productId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    setEditingProductId(productId)
    setEditName(product.name)
    setEditBarcode(product.barcode ?? '')
    setEditNotes(product.notes ?? '')
    setEditWarningDays(String(product.warning_days ?? 30))
    setIsEditingArchived(product.is_archived)
    setEditModalVisible(true)
  }

  async function handleSaveProduct() {
    if (!editingProductId) return
    if (!editName.trim()) {
      Alert.alert('Thiếu thông tin', 'Tên sản phẩm không được để trống.')
      return
    }
    const warningDays = Number(editWarningDays)
    if (!Number.isFinite(warningDays) || warningDays <= 0) {
      Alert.alert('Ngưỡng cảnh báo không hợp lệ', 'Ngưỡng cảnh báo (ngày) phải lớn hơn 0.')
      return
    }

    const payload = {
      name: editName.trim(),
      barcode: editBarcode.trim() || null,
      notes: editNotes.trim() || null,
      warning_days: Math.floor(warningDays),
    }
    const { data: updated } = await supabase
      .from('products')
      .update(payload)
      .eq('id', editingProductId)
      .select('*')
      .single()

    if (updated) {
      useWarehouseStore.setState((s) => ({
        products: s.products.map((p) => (p.id === updated.id ? updated : p)),
      }))
    }
    setEditModalVisible(false)
  }

  async function handleArchiveToggle() {
    if (!editingProductId) return
    const nextArchived = !isEditingArchived
    const actionLabel = nextArchived ? 'Ẩn sản phẩm' : 'Khôi phục sản phẩm'

    Alert.alert(actionLabel, `Bạn có chắc muốn ${nextArchived ? 'ẩn' : 'khôi phục'} sản phẩm này?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          const { data: updated } = await supabase
            .from('products')
            .update({ is_archived: nextArchived })
            .eq('id', editingProductId)
            .select('*')
            .single()

          if (updated) {
            useWarehouseStore.setState((s) => {
              if (!showArchived && nextArchived) {
                return { products: s.products.filter((p) => p.id !== updated.id) }
              }
              return { products: s.products.map((p) => (p.id === updated.id ? updated : p)) }
            })
          }
          setEditModalVisible(false)
        },
      },
    ])
  }

  const selectedZoneSet = useMemo(() => new Set(selectedZoneIds), [selectedZoneIds])

  const totalBoxesByProduct = useMemo(() => {
    const map = new Map<string, number>()
    const hasZoneFilter = selectedZoneIds.length > 0
    for (const entry of inventoryEntries) {
      if (hasZoneFilter && !selectedZoneSet.has(entry.zone_id)) continue
      const id = entry.product_id
      map.set(id, (map.get(id) ?? 0) + entry.quantity_boxes)
    }
    return map
  }, [inventoryEntries, selectedZoneIds, selectedZoneSet])

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
      const aTime = a.expiry_date ? new Date(`${a.expiry_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
      const bTime = b.expiry_date ? new Date(`${b.expiry_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
      return aTime - bTime
    })
  }

  function getWorstStatusForProduct(productId: string): CombinedStatus {
    const hasZoneFilter = selectedZoneIds.length > 0
    const entries = inventoryEntries.filter((entry) => (
      entry.product_id === productId &&
      (!hasZoneFilter || selectedZoneSet.has(entry.zone_id))
    ))
    if (entries.length === 0) return 'ok'

    let worstStatus: CombinedStatus = 'ok'
    let worstRank = 99
    for (const entry of entries) {
      const status = getCombinedStatus(
        entry.quantity_boxes,
        entry.expiry_date,
        entry.product?.low_warning_boxes ?? 3,
        entry.product?.low_critical_boxes ?? 1,
        entry.product?.warning_days ?? 30
      )
      const rank = getCombinedStatusRank(status)
      if (rank < worstRank) {
        worstRank = rank
        worstStatus = status
      }
    }
    return worstStatus
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>📦 Sản phẩm</Text>
      <TouchableOpacity
        style={[styles.archivedToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setShowArchived((v) => !v)}
      >
        <Text style={{ color: colors.sub }}>
          {showArchived ? '✅ Đang hiện sản phẩm đã ẩn' : '⬜ Hiện sản phẩm đã ẩn'}
        </Text>
      </TouchableOpacity>

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm sản phẩm theo tên..."
            placeholderTextColor={colors.sub}
          />
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('BarcodeScanner')}
          >
            <Text style={styles.scanBtnText}>📷</Text>
          </TouchableOpacity>
        </View>
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
            const worstStatus = getWorstStatusForProduct(product.id)
            const productDotColor = worstStatus === 'expired'
              ? colors.statusExpired
              : worstStatus === 'critical'
                ? colors.statusCritical
                : worstStatus === 'warning'
                  ? colors.statusWarning
                  : colors.statusOk
            return (
              <TouchableOpacity
                key={product.id}
                style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleRow}>
                    <View style={[styles.titleDot, { backgroundColor: productDotColor }]} />
                    <Text
                      style={[
                        styles.itemName,
                        { color: colors.text, opacity: product.is_archived ? 0.55 : 1 },
                      ]}
                      numberOfLines={1}
                    >
                      {product.name}
                    </Text>
                  </View>
                  <Text style={[styles.totalBoxesLabel, { color: colors.sub }]}>
                    Tổng {totalBoxesByProduct.get(product.id) ?? 0} thùng
                  </Text>
                  <TouchableOpacity
                    style={[styles.editBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                    onPress={() => openEditProduct(product.id)}
                  >
                    <Text style={{ fontSize: 12 }}>✏️</Text>
                  </TouchableOpacity>
                </View>
                {product.is_archived && (
                  <Text style={[styles.archivedTag, { color: colors.sub }]}>Đã ẩn</Text>
                )}
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
                      const lotStatus = getCombinedStatus(
                        lot.quantity_boxes,
                        lot.expiry_date,
                        product.low_warning_boxes ?? 3,
                        product.low_critical_boxes ?? 1,
                        product.warning_days ?? 30
                      )
                      const dotColor = lotStatus === 'expired'
                        ? colors.statusExpired
                        : lotStatus === 'critical'
                          ? colors.statusCritical
                          : lotStatus === 'warning'
                            ? colors.statusWarning
                            : colors.statusOk
                      return (
                        <View key={`${product.id}-${lot.expiry_date ?? 'none'}-${index}`} style={styles.lotRow}>
                          <View style={[styles.lotDot, { backgroundColor: dotColor }]} />
                          <Text style={[styles.lotText, { color: colors.sub }]}>
                            Hạn: {formatExpiryDate(lot.expiry_date)} · {lot.quantity_boxes} thùng
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

      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Sửa sản phẩm</Text>

                <Text style={[styles.modalLabel, { color: colors.sub }]}>Tên sản phẩm *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Tên sản phẩm"
                  placeholderTextColor={colors.sub}
                />

                <Text style={[styles.modalLabel, { color: colors.sub }]}>Barcode</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={editBarcode}
                  onChangeText={setEditBarcode}
                  placeholder="Optional"
                  placeholderTextColor={colors.sub}
                />

                <Text style={[styles.modalLabel, { color: colors.sub }]}>Ghi chú</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Optional"
                  placeholderTextColor={colors.sub}
                />

                <Text style={[styles.modalLabel, { color: colors.sub }]}>Ngưỡng cảnh báo (ngày)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={editWarningDays}
                  onChangeText={setEditWarningDays}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={colors.sub}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: colors.bg }]}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={{ color: colors.sub }}>Huỷ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                    onPress={handleSaveProduct}
                  >
                    <Text style={{ color: colors.card, fontWeight: '700' }}>Lưu</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.archiveBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                  onPress={handleArchiveToggle}
                >
                  <Text style={{ color: isEditingArchived ? colors.accent : '#ef4444', fontWeight: '700' }}>
                    {isEditingArchived ? 'Khôi phục' : 'Ẩn sản phẩm'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  archivedToggle: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
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
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 4, minWidth: 0 },
  totalBoxesLabel: { fontSize: 12, fontWeight: '600', flexShrink: 0, maxWidth: '28%' },
  itemName: { fontSize: 15, fontWeight: '700' },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  archivedTag: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  itemSub: { fontSize: 12, marginTop: 3 },
  noLotText: { fontSize: 12, marginTop: 8 },
  lotGroupWrap: { marginTop: 8, gap: 4 },
  lotRow: { flexDirection: 'row', alignItems: 'center' },
  lotText: { fontSize: 12, marginLeft: 6 },
  titleDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8, alignSelf: 'center' },
  lotDot: { width: 8, height: 8, borderRadius: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBox: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  modalLabel: { fontSize: 12, marginBottom: 4 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 10,
  },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  archiveBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
})