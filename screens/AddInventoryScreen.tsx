import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
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
  zoneId: string
  zoneName: string
  zoneColor: string
  tier: number
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
  const { zoneId, zoneName, zoneColor, tier } = route.params as AddInventoryRouteParams
  const { colors } = useThemeStore()
  const { products, fetchProducts, addProduct, addInventoryEntry } = useWarehouseStore()

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

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return products
    return products.filter((p) => p.name.toLowerCase().includes(query))
  }, [products, searchQuery])
  const isSearching = searchQuery.trim().length > 0

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
      is_archived: false,
    })
    setIsCreatingProduct(false)

    if (!created) {
      Alert.alert('Lỗi', 'Không thể tạo sản phẩm mới.')
      return
    }

    // Đồng bộ lại danh sách và tự chọn sản phẩm vừa tạo
    await fetchProducts()
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
      .eq('zone_id', zoneId)
      .eq('tier', tier)
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
              await supabase
                .from('inventory_entries')
                .update({ quantity_boxes: newQuantity, notes: batchNote.trim() || undefined })
                .eq('id', duplicatedLot.id)
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
      zone_id: zoneId,
      tier,
      quantity_boxes: quantity,
      expiry_date: expiryDateIso ?? undefined,
      notes: batchNote.trim() || undefined,
    })
    setIsSaving(false)
    navigation.goBack()
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topColorBar, { backgroundColor: zoneColor || colors.accent }]} />

      {/* Header có nút hủy quay lại màn trước */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Thêm hàng</Text>
        <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelBtnText, { color: colors.sub }]}>Hủy</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Zone/tầng chỉ hiển thị thông tin, không cho sửa */}
        <View style={[styles.readonlyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.readonlyText, { color: colors.sub }]}>
            Zone: <Text style={[styles.readonlyValue, { color: colors.text }]}>{zoneName}</Text>
          </Text>
          <Text style={[styles.readonlyText, { color: colors.sub }]}>
            Tầng: <Text style={[styles.readonlyValue, { color: colors.text }]}>Tầng {tier}</Text>
          </Text>
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
