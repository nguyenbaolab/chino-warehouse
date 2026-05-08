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
    setSearchQuery(created.name)
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

        <View style={[styles.productList, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {filteredProducts.slice(0, 8).map((product) => {
            const active = selectedProduct?.id === product.id
            return (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productRow,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: active ? colors.bg : 'transparent',
                  },
                ]}
                onPress={() => setSelectedProduct(product)}
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
            )
          })}
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
