import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { Product } from '../types'
import { supabase } from '../lib/supabase'

type AddInventoryRouteParams = {
  zoneId?: string
  tierId?: number
  zoneName?: string
  zoneColor?: string
  tier?: number
  productId?: string
}

// Parse DD/MM/YYYY -> YYYY-MM-DD để lưu xuống Supabase
function parseDisplayDateToIso(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export default function AddInventoryScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const {
    zoneId: initialZoneId,
    tierId: initialTierId,
    zoneName,
    zoneColor,
    tier,
    productId,
  } = (route.params as AddInventoryRouteParams) || {}
  const { colors } = useThemeStore()
  const {
    products,
    zones,
    fetchProducts,
    fetchLocations,
    addProduct,
    addInventoryEntry,
    updateInventoryEntry,
  } = useWarehouseStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantityBoxes, setQuantityBoxes] = useState('1')
  const [expiryDisplay, setExpiryDisplay] = useState('')
  const [batchNote, setBatchNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [showCreateProduct, setShowCreateProduct] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductBarcode, setNewProductBarcode] = useState('')
  const [newProductNote, setNewProductNote] = useState('')
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(initialZoneId ?? null)
  const [selectedTier, setSelectedTier] = useState<number | null>(initialTierId ?? tier ?? null)
  const [showZoneOptions, setShowZoneOptions] = useState(false)
  const [showTierOptions, setShowTierOptions] = useState(false)

  useEffect(() => {
    fetchLocations()
    fetchProducts()
  }, [fetchLocations, fetchProducts])

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return products
    return products.filter((p) => p.name.toLowerCase().includes(query))
  }, [products, searchQuery])
  const isSearching = searchQuery.trim().length > 0

  useEffect(() => {
    if (!productId || selectedProduct) return
    const pref = products.find((p) => p.id === productId)
    if (pref) setSelectedProduct(pref)
  }, [productId, products, selectedProduct])

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  )

  const availableTiers = useMemo(() => {
    if (!selectedZone) return []
    return Array.from({ length: Math.max(selectedZone.tier_count || 1, 1) }, (_, idx) => idx + 1)
  }, [selectedZone])

  useEffect(() => {
    if (!selectedZone) {
      setSelectedTier(null)
      return
    }
    // Zone 1 tầng thì tự động chọn tầng 1
    if (availableTiers.length === 1) {
      setSelectedTier(1)
      return
    }
    // Nếu tier cũ không còn hợp lệ theo zone mới thì reset
    if (selectedTier && !availableTiers.includes(selectedTier)) {
      setSelectedTier(null)
    }
  }, [selectedZone, availableTiers, selectedTier])

  async function handleCreateProduct() {
    if (!newProductName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên sản phẩm mới.')
      return
    }

    setIsCreatingProduct(true)
    const created = await addProduct({
      name: newProductName.trim(),
      barcode: newProductBarcode.trim() || undefined,
      notes: newProductNote.trim() || undefined,
      warning_days: 30,
      is_archived: false,
    })
    setIsCreatingProduct(false)

    if (!created) {
      Alert.alert('Lỗi', 'Không thể tạo sản phẩm mới.')
      return
    }

    // Store đã được update trực tiếp trong addProduct
    setSelectedProduct(created)
    setSearchQuery('')
    setShowCreateProduct(false)
    setNewProductName('')
    setNewProductBarcode('')
    setNewProductNote('')
  }

  async function handleSaveInventory() {
    if (!selectedProduct) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn sản phẩm.')
      return
    }

    if (!selectedZoneId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn zone.')
      return
    }
    if (!selectedTier) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn tầng.')
      return
    }

    const quantity = Number(quantityBoxes)
    if (!Number.isFinite(quantity) || quantity < 1) {
      Alert.alert('Số thùng không hợp lệ', 'Số thùng phải lớn hơn hoặc bằng 1.')
      return
    }

    const expiryDateIso = parseDisplayDateToIso(expiryDisplay)
    if (expiryDisplay.trim() && !expiryDateIso) {
      Alert.alert('Ngày không hợp lệ', 'Hạn sử dụng cần đúng định dạng DD/MM/YYYY.')
      return
    }

    setIsSaving(true)

    // Kiểm tra trùng lot theo product + zone + tier + expiry trước khi insert
    let duplicateQuery = supabase
      .from('inventory_entries')
      .select('id, quantity_boxes')
      .eq('product_id', selectedProduct.id)
      .eq('zone_id', selectedZoneId)
      .eq('tier', selectedTier)
      .limit(1)

    duplicateQuery = expiryDateIso
      ? duplicateQuery.eq('expiry_date', expiryDateIso)
      : duplicateQuery.is('expiry_date', null)

    const { data: duplicatedLots } = await duplicateQuery
    const duplicatedLot = duplicatedLots?.[0]

    if (duplicatedLot) {
      Alert.alert(
        'Đã có lô này',
        `Đã có lô này, bạn muốn cộng thêm ${quantity} thùng?`,
        [
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => {
              setIsSaving(false)
            },
          },
          {
            text: 'Cộng thêm',
            onPress: async () => {
              const newQuantity = duplicatedLot.quantity_boxes + quantity
              // Đi qua store để state local cập nhật ngay
              await updateInventoryEntry(duplicatedLot.id, {
                quantity_boxes: newQuantity,
                notes: batchNote.trim() || undefined,
              })
              setIsSaving(false)
              navigation.goBack()
            },
          },
        ]
      )
      return
    }

    await addInventoryEntry({
      product_id: selectedProduct.id,
      zone_id: selectedZoneId,
      tier: selectedTier,
      quantity_boxes: quantity,
      expiry_date: expiryDateIso ?? undefined,
      notes: batchNote.trim() || undefined,
    })
    setIsSaving(false)
    navigation.goBack()
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topColorBar, { backgroundColor: selectedZone?.color || zoneColor || colors.accent }]} />

      {/* Header có nút hủy quay lại màn trước */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Thêm hàng</Text>
        <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelBtnText, { color: colors.sub }]}>Hủy</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Dropdown zone + tầng */}
        <View style={styles.zoneTierRow}>
          <View style={styles.zoneTierCol}>
            <Text style={[styles.label, { color: colors.sub }]}>Chọn zone *</Text>
            <Pressable
              style={[styles.selectBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setShowZoneOptions((v) => !v)
                setShowTierOptions(false)
              }}
            >
              <Text style={{ color: selectedZone ? colors.text : colors.sub }}>
                {selectedZone?.name ?? zoneName ?? 'Chọn zone'}
              </Text>
            </Pressable>
            {showZoneOptions && (
              <View style={[styles.optionsWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {zones.map((zone) => (
                  <TouchableOpacity
                    key={zone.id}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedZoneId(zone.id)
                      setShowZoneOptions(false)
                    }}
                  >
                    <Text style={{ color: colors.text }}>{zone.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.zoneTierCol}>
            <Text style={[styles.label, { color: colors.sub }]}>Chọn tầng *</Text>
            <Pressable
              style={[
                styles.selectBtn,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: selectedZone ? 1 : 0.5 },
              ]}
              onPress={() => {
                if (!selectedZone || availableTiers.length <= 1) return
                setShowTierOptions((v) => !v)
                setShowZoneOptions(false)
              }}
            >
              <Text style={{ color: selectedTier ? colors.text : colors.sub }}>
                {selectedTier ? `Tầng ${selectedTier}` : 'Chọn tầng'}
              </Text>
            </Pressable>
            {showTierOptions && selectedZone && availableTiers.length > 1 && (
              <View style={[styles.optionsWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {availableTiers.map((tierNum) => (
                  <TouchableOpacity
                    key={tierNum}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedTier(tierNum)
                      setShowTierOptions(false)
                    }}
                  >
                    <Text style={{ color: colors.text }}>Tầng {tierNum}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.label, { color: colors.sub }]}>Tìm/chọn sản phẩm *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Gõ tên sản phẩm..."
          placeholderTextColor={colors.sub}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {selectedProduct ? (
          <View style={[styles.selectedProductBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.selectedProductMain}>
              <Text style={[styles.selectedProductName, { color: colors.text }]} numberOfLines={1}>
                {selectedProduct.name}
              </Text>
              {!!selectedProduct.barcode && (
                <Text style={[styles.selectedProductBarcode, { color: colors.sub }]} numberOfLines={1}>
                  {selectedProduct.barcode}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.clearSelectedBtn, { backgroundColor: colors.bg }]}
              onPress={() => {
                setSelectedProduct(null)
                setSearchQuery('')
              }}
            >
              <Text style={[styles.clearSelectedText, { color: colors.sub }]}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : isSearching ? (
          <View style={[styles.productList, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {filteredProducts.slice(0, 8).map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[styles.productRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSelectedProduct(product)
                  setSearchQuery('')
                }}
              >
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                  {product.name}
                </Text>
                {!!product.barcode && (
                  <Text style={[styles.productBarcode, { color: colors.sub }]} numberOfLines={1}>
                    {product.barcode}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            {filteredProducts.length === 0 && (
              <View style={styles.emptyProductWrap}>
                <Text style={[styles.emptyProductText, { color: colors.sub }]}>Không tìm thấy sản phẩm phù hợp.</Text>
                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setShowCreateProduct((v) => !v)}
                >
                  <Text style={[styles.createBtnText, { color: colors.card }]}>Tạo sản phẩm mới</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.searchHintBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.searchHintText, { color: colors.sub }]}>
              Nhập tên sản phẩm để hiện danh sách gợi ý.
            </Text>
          </View>
        )}

        {showCreateProduct && (
          <View style={[styles.createWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.sub }]}>Tên sản phẩm mới *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={newProductName}
              onChangeText={setNewProductName}
              placeholder="VD: Chino Milk Tea"
              placeholderTextColor={colors.sub}
            />

            <Text style={[styles.label, { color: colors.sub }]}>Mã vạch</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={newProductBarcode}
              onChangeText={setNewProductBarcode}
              placeholder="Optional"
              placeholderTextColor={colors.sub}
            />

            <Text style={[styles.label, { color: colors.sub }]}>Ghi chú sản phẩm</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={newProductNote}
              onChangeText={setNewProductNote}
              placeholder="Optional"
              placeholderTextColor={colors.sub}
            />

            <TouchableOpacity
              style={[styles.submitCreateBtn, { backgroundColor: colors.accent }]}
              onPress={handleCreateProduct}
              disabled={isCreatingProduct}
            >
              <Text style={[styles.submitCreateText, { color: colors.card }]}>
                {isCreatingProduct ? 'Đang tạo...' : 'Tạo và chọn sản phẩm'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.label, { color: colors.sub }]}>Số thùng *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          keyboardType="numeric"
          placeholderTextColor={colors.sub}
          value={quantityBoxes}
          onChangeText={setQuantityBoxes}
        />

        <Text style={[styles.label, { color: colors.sub }]}>Hạn sử dụng (DD/MM/YYYY)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="VD: 30/12/2026"
          placeholderTextColor={colors.sub}
          value={expiryDisplay}
          onChangeText={setExpiryDisplay}
        />

        <Text style={[styles.label, { color: colors.sub }]}>Ghi chú lô hàng</Text>
        <TextInput
          style={[
            styles.input,
            styles.noteInput,
            { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
          ]}
          multiline
          value={batchNote}
          onChangeText={setBatchNote}
          placeholder="Optional"
          placeholderTextColor={colors.sub}
        />
      </ScrollView>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.accent }]}
        onPress={handleSaveInventory}
        disabled={isSaving}
      >
        <Text style={[styles.saveBtnText, { color: colors.card }]}>{isSaving ? 'Đang lưu...' : 'Lưu'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topColorBar: {
    height: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  readonlyBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  readonlyText: {
    fontSize: 13,
    marginBottom: 2,
  },
  readonlyValue: {
    fontWeight: '700',
  },
  zoneTierRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  zoneTierCol: {
    flex: 1,
  },
  selectBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionsWrap: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
  },
  optionRow: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  productList: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  searchHintBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchHintText: {
    fontSize: 13,
  },
  selectedProductBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectedProductMain: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedProductBarcode: {
    marginTop: 2,
    fontSize: 12,
  },
  clearSelectedBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSelectedText: {
    fontSize: 14,
    fontWeight: '700',
  },
  productRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
  },
  productBarcode: {
    marginTop: 2,
    fontSize: 12,
  },
  emptyProductWrap: {
    padding: 12,
    alignItems: 'flex-start',
  },
  emptyProductText: {
    fontSize: 13,
    marginBottom: 8,
  },
  createBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  createBtnText: {
    fontWeight: '700',
  },
  createWrap: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  submitCreateBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitCreateText: {
    fontWeight: '700',
  },
  saveBtn: {
    margin: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
