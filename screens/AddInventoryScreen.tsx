import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { navigateToTabMainFromNestedStack } from '../lib/tabNavigation'
import { normalizeText } from '../utils/textUtils'

type AddInventoryRouteParams = {
  zoneId?: string
  tierId?: number
  zoneName?: string
  zoneColor?: string
  tier?: number
  productId?: string
  scannedBarcode?: string
  barcodeScannedAt?: number
  /** Tab gốc để nút Hủy về `…Main` (từ scanner / luồng có truyền). */
  returnTab?: string
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
    scannedBarcode,
    barcodeScannedAt,
    returnTab,
  } = (route.params as AddInventoryRouteParams) || {}
  const { colors } = useThemeStore()
  const {
    products,
    zones,
    fetchProducts,
    fetchLocations,
    fetchCategories,
    productCategoriesL1,
    productCategoriesL2,
    addProduct,
    addInventoryEntry,
    updateInventoryEntry,
  } = useWarehouseStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [lotBarcode, setLotBarcode] = useState('')
  const [quantityBoxes, setQuantityBoxes] = useState('1')
  const [expiryDisplay, setExpiryDisplay] = useState('')
  const [batchNote, setBatchNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [showCreateProduct, setShowCreateProduct] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductNote, setNewProductNote] = useState('')
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(initialZoneId ?? null)
  const [selectedTier, setSelectedTier] = useState<number | null>(initialTierId ?? tier ?? null)
  const [showZoneOptions, setShowZoneOptions] = useState(false)
  const [showTierOptions, setShowTierOptions] = useState(false)

  const [newCategoryL1Id, setNewCategoryL1Id] = useState<string | null>(null)
  const [newCategoryL2Id, setNewCategoryL2Id] = useState<string | null>(null)
  const [showNewCatL1, setShowNewCatL1] = useState(false)
  const [showNewCatL2, setShowNewCatL2] = useState(false)

  const scrollRef = useRef<ScrollView>(null)

  function openCreateProductForm() {
    setNewProductName(searchQuery.trim())
    setNewCategoryL1Id(null)
    setNewCategoryL2Id(null)
    setShowNewCatL1(false)
    setShowNewCatL2(false)
    setShowCreateProduct(true)
  }

  function closeCreateProductForm() {
    setShowCreateProduct(false)
    setNewProductName('')
    setNewProductNote('')
    setNewCategoryL1Id(null)
    setNewCategoryL2Id(null)
    setShowNewCatL1(false)
    setShowNewCatL2(false)
  }

  useEffect(() => {
    if (useWarehouseStore.getState().productCategoriesL1.length === 0) {
      void fetchCategories()
    }
  }, [fetchCategories])

  useEffect(() => {
    fetchLocations()
    // Không gọi fetchProducts() mỗi lần mount: request async có thể hoàn thành
    // SAU addProduct và ghi đè store → mất SP mới trên tab Sản phẩm (KI-005).
    // Chỉ fetch khi store chưa có danh sách (edge: vào thẳng màn này).
    if (useWarehouseStore.getState().products.length === 0) {
      void fetchProducts()
    }
  }, [fetchLocations, fetchProducts])

  const filteredProducts = useMemo(() => {
    const query = normalizeText(searchQuery.trim())
    if (!query) return products
    return products.filter((p) => normalizeText(p.name).includes(query))
  }, [products, searchQuery])
  const isSearching = searchQuery.trim().length > 0

  const newCategoryL2Options = useMemo(() => {
    if (!newCategoryL1Id) return []
    return productCategoriesL2.filter((c) => c.level1_id === newCategoryL1Id)
  }, [newCategoryL1Id, productCategoriesL2])

  const selectedCategoryReadonly = useMemo(() => {
    if (!selectedProduct || showCreateProduct) return null
    const pFull = products.find((p) => p.id === selectedProduct.id) ?? selectedProduct
    const l1id = pFull.category_level1_id ?? null
    const l2id = pFull.category_level2_id ?? null
    if (!l1id && !l2id) return 'Chưa phân loại'
    const l1n = l1id ? productCategoriesL1.find((c) => c.id === l1id)?.name : null
    const l2n = l2id ? productCategoriesL2.find((c) => c.id === l2id)?.name : null
    const left = l1n ?? '—'
    const right = l2id ? (l2n ?? '—') : '—'
    return `${left} · ${right}`
  }, [selectedProduct, showCreateProduct, products, productCategoriesL1, productCategoriesL2])

  useEffect(() => {
    if (!productId || selectedProduct) return
    const pref = products.find((p) => p.id === productId)
    if (pref) setSelectedProduct(pref)
  }, [productId, products, selectedProduct])

  useEffect(() => {
    if (!scannedBarcode) return
    setLotBarcode(scannedBarcode.trim())
    navigation.setParams({ scannedBarcode: undefined, barcodeScannedAt: undefined })
  }, [scannedBarcode, barcodeScannedAt, navigation])

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
      notes: newProductNote.trim() || undefined,
      warning_days: 30,
      is_archived: false,
      category_level1_id: newCategoryL1Id ?? null,
      category_level2_id: newCategoryL1Id ? (newCategoryL2Id ?? null) : null,
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
    setNewProductNote('')
    setNewCategoryL1Id(null)
    setNewCategoryL2Id(null)
    setShowNewCatL1(false)
    setShowNewCatL2(false)
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
    if (!Number.isFinite(quantity) || quantity < 0 || quantity !== Math.floor(quantity)) {
      Alert.alert('Số thùng không hợp lệ', 'Số thùng phải là số nguyên lớn hơn hoặc bằng 0.')
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
    duplicateQuery = lotBarcode.trim()
      ? duplicateQuery.eq('barcode', lotBarcode.trim())
      : duplicateQuery.is('barcode', null)

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
      barcode: lotBarcode.trim() || undefined,
      expiry_date: expiryDateIso ?? undefined,
      notes: batchNote.trim() || undefined,
    })
    setIsSaving(false)
    navigation.goBack()
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={[styles.topColorBar, { backgroundColor: selectedZone?.color || zoneColor || colors.accent }]} />

      {/* Header có nút hủy quay lại màn trước */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Thêm hàng</Text>
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: colors.card }]}
          onPress={() => {
            if (returnTab) {
              navigateToTabMainFromNestedStack(navigation, returnTab)
            } else {
              navigation.goBack()
            }
          }}
        >
          <Text style={[styles.cancelBtnText, { color: colors.sub }]}>Hủy</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
            </View>
            <TouchableOpacity
              style={[styles.clearSelectedBtn, { backgroundColor: colors.bg }]}
              onPress={() => {
                setSelectedProduct(null)
                setSearchQuery('')
                setLotBarcode('')
                setNewCategoryL1Id(null)
                setNewCategoryL2Id(null)
                setShowNewCatL1(false)
                setShowNewCatL2(false)
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
                  setLotBarcode('')
                }}
              >
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                  {product.name}
                </Text>
              </TouchableOpacity>
            ))}
            {filteredProducts.length === 0 && (
              <View style={styles.emptyProductWrap}>
                <Text style={[styles.emptyProductText, { color: colors.sub }]}>Không tìm thấy sản phẩm phù hợp.</Text>
                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    if (showCreateProduct) {
                      setShowCreateProduct(false)
                    } else {
                      openCreateProductForm()
                    }
                  }}
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

        {selectedProduct && !showCreateProduct && selectedCategoryReadonly && (
          <View style={[styles.readonlyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.sub, marginBottom: 4 }]}>Phân loại</Text>
            <Text style={[styles.readonlyText, { color: colors.text }]}>{selectedCategoryReadonly}</Text>
          </View>
        )}

        {selectedProduct && (
          <>
            <Text style={[styles.label, { color: colors.sub }]}>Barcode lô hàng</Text>
            <View style={styles.barcodeRow}>
              <TextInput
                style={[
                  styles.barcodeInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={lotBarcode}
                onChangeText={setLotBarcode}
                placeholder="Chưa có mã vạch"
                placeholderTextColor={colors.sub}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.barcodeScanBtn, { backgroundColor: colors.accent }]}
                onPress={() =>
                  navigation.navigate('BarcodeScanner', {
                    mode: 'search',
                    onScanFillBarcode: (barcode: string) => {
                      setLotBarcode(barcode.trim())
                    },
                  })
                }
              >
                <Text style={[styles.barcodeScanBtnText, { color: colors.card }]}>📷</Text>
              </TouchableOpacity>
            </View>
          </>
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

            <Text style={[styles.label, { color: colors.sub }]}>Nhóm (Cấp 1)</Text>
            <Pressable
              style={[styles.selectBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => {
                setShowNewCatL1((v) => !v)
                setShowNewCatL2(false)
              }}
            >
              <Text style={{ color: newCategoryL1Id ? colors.text : colors.sub }}>
                {!newCategoryL1Id
                  ? 'Không phân loại'
                  : productCategoriesL1.find((c) => c.id === newCategoryL1Id)?.name ?? 'Không phân loại'}
              </Text>
            </Pressable>
            {showNewCatL1 && (
              <View style={[styles.optionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.optionRow, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setNewCategoryL1Id(null)
                    setNewCategoryL2Id(null)
                    setShowNewCatL1(false)
                  }}
                >
                  <Text style={{ color: colors.text }}>Không phân loại</Text>
                </TouchableOpacity>
                {productCategoriesL1.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setNewCategoryL1Id(cat.id)
                      setNewCategoryL2Id(null)
                      setShowNewCatL1(false)
                    }}
                  >
                    <Text style={{ color: colors.text }}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!!newCategoryL1Id && (
              <>
                <Text style={[styles.label, { color: colors.sub }]}>Loại (Cấp 2)</Text>
                <Pressable
                  style={[styles.selectBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                  onPress={() => {
                    setShowNewCatL2((v) => !v)
                    setShowNewCatL1(false)
                  }}
                >
                  <Text style={{ color: newCategoryL2Id ? colors.text : colors.sub }}>
                    {!newCategoryL2Id
                      ? 'Không phân loại'
                      : productCategoriesL2.find((c) => c.id === newCategoryL2Id)?.name ?? 'Không phân loại'}
                  </Text>
                </Pressable>
                {showNewCatL2 && (
                  <View style={[styles.optionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.optionRow, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setNewCategoryL2Id(null)
                        setShowNewCatL2(false)
                      }}
                    >
                      <Text style={{ color: colors.text }}>Không phân loại</Text>
                    </TouchableOpacity>
                    {newCategoryL2Options.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.optionRow, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setNewCategoryL2Id(cat.id)
                          setShowNewCatL2(false)
                        }}
                      >
                        <Text style={{ color: colors.text }}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            <Text style={[styles.label, { color: colors.sub }]}>Ghi chú sản phẩm</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={newProductNote}
              onChangeText={setNewProductNote}
              placeholder="Optional"
              placeholderTextColor={colors.sub}
            />

            <View style={styles.createFormActions}>
              <TouchableOpacity
                style={[styles.cancelCreateBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                onPress={closeCreateProductForm}
                disabled={isCreatingProduct}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitCreateBtn, { backgroundColor: colors.accent, flex: 1 }]}
                onPress={handleCreateProduct}
                disabled={isCreatingProduct}
              >
                <Text style={[styles.submitCreateText, { color: colors.card }]}>
                  {isCreatingProduct ? 'Đang tạo...' : 'Tạo và chọn sản phẩm'}
                </Text>
              </TouchableOpacity>
            </View>
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
          onFocus={() => {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
          }}
        />
      </ScrollView>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.accent }]}
        onPress={handleSaveInventory}
        disabled={isSaving}
      >
        <Text style={[styles.saveBtnText, { color: colors.card }]}>{isSaving ? 'Đang lưu...' : 'Lưu'}</Text>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
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
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  barcodeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  barcodeScanBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeScanBtnText: {
    fontSize: 18,
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
  createFormActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cancelCreateBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
