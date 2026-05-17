import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { CombinedStatus, formatExpiryDate, getCombinedStatus, getCombinedStatusRank, Product, Zone } from '../types'
import { supabase } from '../lib/supabase'
import { normalizeText } from '../utils/textUtils'

const PAGE_SIZE = 10

export default function ProductsScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const {
    products,
    locations,
    inventoryEntries,
    productCategoriesL1,
    productCategoriesL2,
    fetchProducts,
    fetchLocations,
    fetchInventoryByZone,
    fetchAllInventoryEntries,
    fetchCategories,
  } = useWarehouseStore()
  const { colors } = useThemeStore()
  const [searchQuery, setSearchQuery] = useState('')
  /** null = Tất cả zone (chỉ khi đã chọn kho cụ thể) */
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [showArchived, setShowArchived] = useState(false)

  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editWarningDays, setEditWarningDays] = useState('30')
  const [isEditingArchived, setIsEditingArchived] = useState(false)
  const [scannedLotId, setScannedLotId] = useState<string | null>(null)

  const [filterLocationId, setFilterLocationId] = useState<string | null>(null)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [zonePickerOpen, setZonePickerOpen] = useState(false)
  const [zonesForFilterLoc, setZonesForFilterLoc] = useState<Zone[]>([])

  useEffect(() => {
    if (useWarehouseStore.getState().productCategoriesL1.length === 0) {
      void fetchCategories()
    }
  }, [fetchCategories])

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
    setSelectedZoneId(null)
  }, [filterLocationId])

  useEffect(() => {
    setCurrentPage(0)
  }, [searchQuery, filterLocationId, selectedZoneId])

  useEffect(() => {
    const scannedInventoryEntryId: string | undefined = route.params?.scannedInventoryEntryId
    if (!scannedInventoryEntryId) return
    const lot = inventoryEntries.find((entry) => entry.id === scannedInventoryEntryId)
    if (lot) {
      setScannedLotId(lot.id)
      setSelectedZoneId(lot.zone_id)
      setSearchQuery(lot.product?.name ?? '')
    }
    navigation.setParams({
      scannedInventoryEntryId: undefined,
      scannedBarcode: undefined,
      scannedAt: undefined,
    })
  }, [route.params?.scannedInventoryEntryId, route.params?.scannedBarcode, route.params?.scannedAt, inventoryEntries, navigation])

  function clearSearch() {
    setSearchQuery('')
    setScannedLotId(null)
  }

  function openEditProduct(productId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    setEditingProductId(productId)
    setEditName(product.name)
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

  const locationZoneSet = useMemo(() => {
    if (!filterLocationId) return null
    return new Set(zonesForFilterLoc.map((z) => z.id))
  }, [filterLocationId, zonesForFilterLoc])

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name)),
    [locations]
  )

  const totalBoxesByProduct = useMemo(() => {
    const map = new Map<string, number>()
    const hasZoneFilter = selectedZoneId != null
    for (const entry of inventoryEntries) {
      if (locationZoneSet && !locationZoneSet.has(entry.zone_id)) continue
      if (hasZoneFilter && entry.zone_id !== selectedZoneId) continue
      const id = entry.product_id
      map.set(id, (map.get(id) ?? 0) + entry.quantity_boxes)
    }
    return map
  }, [inventoryEntries, selectedZoneId, locationZoneSet])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery.trim())
    const hasZoneFilter = selectedZoneId != null

    return products.filter((product) => {
      const matchSearch = normalizedQuery.length === 0 || normalizeText(product.name).includes(normalizedQuery)
      if (!matchSearch) return false
      if (locationZoneSet) {
        const inLoc = inventoryEntries.some(
          (entry) => entry.product_id === product.id && locationZoneSet.has(entry.zone_id)
        )
        if (!inLoc) return false
      }
      if (!hasZoneFilter) return true

      return inventoryEntries.some((entry) => (
        entry.product_id === product.id &&
        entry.zone_id === selectedZoneId &&
        (!locationZoneSet || locationZoneSet.has(entry.zone_id))
      ))
    })
  }, [products, searchQuery, selectedZoneId, inventoryEntries, locationZoneSet])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const pagedProducts = useMemo(
    () => filteredProducts.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filteredProducts, currentPage],
  )
  const canGoPrev = currentPage > 0
  const canGoNext = currentPage < totalPages - 1

  function renderProductItem({ item: product }: { item: Product }) {
    const groupedLots = getGroupedLotsByExpiry(product.id)
    const worstStatus = getWorstStatusForProduct(product.id)
    const categoryLine = getProductCategoryLine(product)
    const productDotColor = worstStatus === 'expired'
      ? colors.statusExpired
      : worstStatus === 'critical'
        ? colors.statusCritical
        : worstStatus === 'warning'
          ? colors.statusWarning
          : colors.statusOk
    return (
      <TouchableOpacity
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
        {categoryLine ? (
          <Text style={[styles.itemCategoryLine, { color: colors.sub }]} numberOfLines={2}>
            {categoryLine}
          </Text>
        ) : null}
        {product.is_archived && (
          <Text style={[styles.archivedTag, { color: colors.sub }]}>Đã ẩn</Text>
        )}
        {scannedLotId && inventoryEntries.some((entry) => entry.id === scannedLotId && entry.product_id === product.id) && (
          <Text style={[styles.itemSub, { color: colors.accent }]} numberOfLines={1}>
            Kết quả quét barcode theo lô
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
                    Hạn: {formatExpiryDate(lot.expiry_date)} · {lot.quantity_boxes} thùng · {lot.barcode?.trim() || '—'}
                  </Text>
                </View>
              )
            })}
          </View>
        )}
      </TouchableOpacity>
    )
  }

  function getGroupedLotsByExpiry(productId: string) {
    const hasZoneFilter = selectedZoneId != null
    const relevantEntries = inventoryEntries.filter((entry) => (
      entry.product_id === productId &&
      (!locationZoneSet || locationZoneSet.has(entry.zone_id)) &&
      (!hasZoneFilter || entry.zone_id === selectedZoneId)
    ))

    return [...relevantEntries].sort((a, b) => {
      const aTime = a.expiry_date ? new Date(`${a.expiry_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
      const bTime = b.expiry_date ? new Date(`${b.expiry_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
      return aTime - bTime
    })
  }

  function getWorstStatusForProduct(productId: string): CombinedStatus {
    const hasZoneFilter = selectedZoneId != null
    const entries = inventoryEntries.filter((entry) => (
      entry.product_id === productId &&
      (!locationZoneSet || locationZoneSet.has(entry.zone_id)) &&
      (!hasZoneFilter || entry.zone_id === selectedZoneId)
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

  function getProductCategoryLine(product: Product): string | null {
    const l1name = product.category_level1_id
      ? productCategoriesL1.find((c) => c.id === product.category_level1_id)?.name
      : undefined
    const l2name = product.category_level2_id
      ? productCategoriesL2.find((c) => c.id === product.category_level2_id)?.name
      : undefined
    if (l1name && l2name) return `${l1name} · ${l2name}`
    if (l1name) return l1name
    return null
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

      <TouchableOpacity
        style={[styles.locationFilterRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setLocationPickerOpen(true)}
        activeOpacity={0.75}
      >
        <Text style={[styles.locationFilterLabel, { color: colors.sub }]}>Kho</Text>
        <Text style={[styles.locationFilterValue, { color: colors.text }]} numberOfLines={1}>
          {filterLocationId
            ? locations.find((l) => l.id === filterLocationId)?.name ?? '…'
            : 'Tất cả kho'}
        </Text>
        <Text style={[styles.locationFilterChevron, { color: colors.sub }]}>▾</Text>
      </TouchableOpacity>

      {filterLocationId ? (
        <TouchableOpacity
          style={[styles.locationFilterRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setZonePickerOpen(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.locationFilterLabel, { color: colors.sub }]}>Zone</Text>
          <Text style={[styles.locationFilterValue, { color: colors.text }]} numberOfLines={1}>
            {selectedZoneId
              ? zonesForFilterLoc.find((z) => z.id === selectedZoneId)?.name ?? '…'
              : 'Tất cả zone'}
          </Text>
          <Text style={[styles.locationFilterChevron, { color: colors.sub }]}>▾</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.locationFilterRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.locationFilterLabel, { color: colors.sub }]}>Zone</Text>
          <Text style={[styles.locationFilterValue, { color: colors.statusWarning }]} numberOfLines={1}>
            Vui lòng chọn kho trước
          </Text>
        </View>
      )}

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm sản phẩm theo tên..."
              placeholderTextColor={colors.sub}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity style={styles.searchClearInsideBtn} onPress={clearSearch}>
                <Text style={{ color: colors.text }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('BarcodeScanner', { mode: 'search', returnTab: 'Products' })}
          >
            <Text style={styles.scanBtnText}>📷</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredProducts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.sub }}>
            {products.length === 0 ? 'Chưa có sản phẩm.' : 'Không có sản phẩm phù hợp.'}
          </Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          <FlatList
            data={pagedProducts}
            keyExtractor={(item) => item.id}
            renderItem={renderProductItem}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          />
          {filteredProducts.length > PAGE_SIZE && (
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

      <Modal visible={locationPickerOpen} transparent animationType="fade" onRequestClose={() => setLocationPickerOpen(false)}>
        <Pressable style={styles.locationModalOverlay} onPress={() => setLocationPickerOpen(false)}>
          <Pressable style={[styles.locationModalBox, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.locationModalTitle, { color: colors.text }]}>Chọn kho</Text>
            <ScrollView style={styles.locationModalList} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={[
                  styles.locationOption,
                  { borderColor: colors.border, backgroundColor: filterLocationId ? colors.bg : colors.accent + '22' },
                ]}
                onPress={() => {
                  setFilterLocationId(null)
                  setLocationPickerOpen(false)
                }}
              >
                <Text style={[styles.locationOptionText, { color: colors.text, fontWeight: filterLocationId ? '500' : '700' }]}>
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
                      styles.locationOption,
                      { borderColor: colors.border, backgroundColor: sel ? colors.accent + '22' : colors.bg },
                    ]}
                    onPress={() => {
                      setFilterLocationId(loc.id)
                      setLocationPickerOpen(false)
                    }}
                  >
                    <Text style={[styles.locationOptionText, { color: colors.text, fontWeight: sel ? '700' : '500' }]} numberOfLines={2}>
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
        <Pressable style={styles.locationModalOverlay} onPress={() => setZonePickerOpen(false)}>
          <Pressable style={[styles.locationModalBox, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.locationModalTitle, { color: colors.text }]}>Chọn zone</Text>
            <ScrollView style={styles.locationModalList} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={[
                  styles.locationOption,
                  { borderColor: colors.border, backgroundColor: selectedZoneId ? colors.bg : colors.accent + '22' },
                ]}
                onPress={() => {
                  setSelectedZoneId(null)
                  setZonePickerOpen(false)
                }}
              >
                <Text style={[styles.locationOptionText, { color: colors.text, fontWeight: selectedZoneId ? '500' : '700' }]}>
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
                      styles.locationOption,
                      { borderColor: colors.border, backgroundColor: sel ? colors.accent + '22' : colors.bg },
                    ]}
                    onPress={() => {
                      setSelectedZoneId(zone.id)
                      setZonePickerOpen(false)
                    }}
                  >
                    <Text style={[styles.locationOptionText, { color: colors.text, fontWeight: sel ? '700' : '500' }]} numberOfLines={2}>
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

      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
          <KeyboardAvoidingView
            style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
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
          </KeyboardAvoidingView>
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
  locationFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  locationFilterLabel: { fontSize: 12, width: 36 },
  locationFilterValue: { flex: 1, fontSize: 14, fontWeight: '600' },
  locationFilterChevron: { fontSize: 12 },
  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  locationModalBox: {
    borderRadius: 14,
    padding: 16,
    maxHeight: '70%',
  },
  locationModalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  locationModalList: { maxHeight: 360 },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  locationOptionText: { flex: 1, marginRight: 8, fontSize: 14 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
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
  itemCategoryLine: { fontSize: 12, marginTop: 6, paddingHorizontal: 0 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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