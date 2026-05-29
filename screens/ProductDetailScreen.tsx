import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarningStore } from '../stores/warningStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { getDisplayColor, getDisplayColorContextFromEntry } from '../utils/statusUtils'
import { supabase } from '../lib/supabase'
import { formatExpiryDate, getCombinedStatus, InventoryEntry, Product, Zone, AuditLog } from '../types'
import { checkConflict } from '../utils/conflictUtils'
import { isoExpiryToDisplay, isValidDisplayDate, parseDisplayDateToIso } from '../utils/dateUtils'

type ProductDetailRouteParams = {
  productId: string
  scannedLotBarcode?: string
  scannedLotId?: string
  scannedLotBarcodeAt?: number
}

function isExpiredBeforeToday(expiryDate?: string): boolean {
  if (!expiryDate) return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiryDate.trim())
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const expiry = new Date(year, month - 1, day)
  if (Number.isNaN(expiry.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  return expiry.getTime() < today.getTime()
}

export default function ProductDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const { productId, scannedLotBarcode, scannedLotId, scannedLotBarcodeAt } = route.params as ProductDetailRouteParams
  const { colors } = useThemeStore()
  const { expiryWarningEnabled, lowStockWarningEnabled } = useWarningStore()
  const {
    zones,
    locations,
    fetchLocations,
    updateInventoryEntry,
    deleteInventoryEntry,
    updateProductStockThresholds,
    productCategoriesL1,
    productCategoriesL2,
    fetchCategories,
    updateProductCategory,
    fetchAuditLogsForProduct,
    deleteProduct,
    setLocateIntent,
  } = useWarehouseStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [lots, setLots] = useState<InventoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // A5: snapshot used for optimistic locking (conflict detection)
  const [lotSnapshots, setLotSnapshots] = useState<Record<string, string>>({})
  const [productSnapshot, setProductSnapshot] = useState<string>('')

  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editExpiryDate, setEditExpiryDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLotBarcode, setEditLotBarcode] = useState('')
  const [editWarningDays, setEditWarningDays] = useState('30')
  const [editLowWarningBoxes, setEditLowWarningBoxes] = useState('3')
  const [isEditingThresholds, setIsEditingThresholds] = useState(false)
  const [originalWarningDays, setOriginalWarningDays] = useState('')
  const [originalLowWarningBoxes, setOriginalLowWarningBoxes] = useState('')
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  const [showIssuesOnly, setShowIssuesOnly] = useState(false)
  const [showCategoryL1Picker, setShowCategoryL1Picker] = useState(false)
  const [showCategoryL2Picker, setShowCategoryL2Picker] = useState(false)
  const [categorySaving, setCategorySaving] = useState(false)
  const [auditEntries, setAuditEntries] = useState<AuditLog[]>([])

  const totalLotBoxes = useMemo(
    () => lots.reduce((sum, lot) => sum + lot.quantity_boxes, 0),
    [lots]
  )

  const hasThresholdChanged =
    editWarningDays !== originalWarningDays ||
    editLowWarningBoxes !== originalLowWarningBoxes

  useEffect(() => {
    if (useWarehouseStore.getState().productCategoriesL1.length === 0) {
      void fetchCategories()
    }
  }, [fetchCategories])

  useEffect(() => {
    if (useWarehouseStore.getState().locations.length === 0) {
      void fetchLocations()
    }
  }, [fetchLocations])

  const categoryL2Options = useMemo(() => {
    const l1 = product?.category_level1_id
    if (!l1) return []
    return productCategoriesL2.filter((c) => c.level1_id === l1)
  }, [product?.category_level1_id, productCategoriesL2])

  const displayedLots = useMemo(() => {
    if (!showIssuesOnly) return lots
    return lots.filter((lot) => {
      const st = getCombinedStatus(
        lot.quantity_boxes,
        lot.expiry_date,
        product?.low_warning_boxes ?? 3,
        1,
        product?.warning_days ?? 30
      )
      return st !== 'ok'
    })
  }, [lots, showIssuesOnly, product])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const [{ data: productData }, { data: lotData }] = await Promise.all([
      supabase.from('products').select('*').eq('id', productId).single(),
      supabase
        .from('inventory_entries')
        .select('*, zone:zones(*)')
        .eq('product_id', productId),
    ])
    const nextProduct = productData ?? null
    const nextLots = (lotData as InventoryEntry[]) ?? []

    setProduct(nextProduct)
    setLots(nextLots)
    setProductSnapshot(nextProduct?.updated_at ?? '')
    setLotSnapshots(Object.fromEntries(nextLots.map((l) => [l.id, l.updated_at ?? ''])))

    setEditWarningDays(String(nextProduct?.warning_days ?? 30))
    setEditLowWarningBoxes(String(nextProduct?.low_warning_boxes ?? 3))
    setIsLoading(false)
  }, [productId])

  // Refetch khi màn có focus (ví dụ quay lại từ AddInventory) — state `lots` là local, không đọc từ store
  useFocusEffect(
    useCallback(() => {
      void loadData()
      void fetchAuditLogsForProduct(productId, 10).then(setAuditEntries)
    }, [loadData, fetchAuditLogsForProduct, productId])
  )

  useEffect(() => {
    if (!scannedLotBarcode || !scannedLotId) return
    const lot = lots.find((item) => item.id === scannedLotId)
    if (!lot) return
    setEditingLotId(lot.id)
    setEditQuantity(String(lot.quantity_boxes))
    setEditExpiryDate(isoExpiryToDisplay(lot.expiry_date))
    setEditNotes(lot.notes ?? '')
    setEditLotBarcode(scannedLotBarcode.trim())
    navigation.setParams({
      scannedLotBarcode: undefined,
      scannedLotId: undefined,
      scannedLotBarcodeAt: undefined,
    })
  }, [scannedLotBarcode, scannedLotId, scannedLotBarcodeAt, lots, navigation])

  function handleConflictReview() {
    setEditingLotId(null)
    setIsEditingThresholds(false)
    setShowCategoryL1Picker(false)
    setShowCategoryL2Picker(false)
    void loadData()
  }

  async function handleThresholdEditButtonPress() {
    if (!isEditingThresholds) {
      setOriginalWarningDays(editWarningDays)
      setOriginalLowWarningBoxes(editLowWarningBoxes)
      setIsEditingThresholds(true)
      return
    }
    if (!hasThresholdChanged) {
      setEditWarningDays(originalWarningDays)
      setEditLowWarningBoxes(originalLowWarningBoxes)
      setIsEditingThresholds(false)
      return
    }
    const okWarning = await handleSaveWarningDays()
    const okLow = await handleSaveLowWarningBoxes()
    if (okWarning && okLow) {
      setOriginalWarningDays(editWarningDays)
      setOriginalLowWarningBoxes(editLowWarningBoxes)
      setIsEditingThresholds(false)
    }
  }

  function openInlineEdit(lot: InventoryEntry) {
    if (editingLotId === lot.id) {
      setEditingLotId(null)
      return
    }
    setEditingLotId(lot.id)
    setEditQuantity(String(lot.quantity_boxes))
    setEditExpiryDate(isoExpiryToDisplay(lot.expiry_date))
    setEditNotes(lot.notes ?? '')
    setEditLotBarcode(lot.barcode ?? '')
  }

  async function handleSaveLot(lot: InventoryEntry) {
    const quantity = Number(editQuantity)
    if (!Number.isFinite(quantity) || quantity < 0 || quantity !== Math.floor(quantity)) {
      Alert.alert('Số thùng không hợp lệ', 'Số thùng phải là số nguyên lớn hơn hoặc bằng 0.')
      return
    }
    if (!isValidDisplayDate(editExpiryDate)) {
      Alert.alert('Hạn không hợp lệ', 'Hạn sử dụng phải theo định dạng DD/MM/YYYY hoặc MM/YYYY.')
      return
    }

    const payload = {
      quantity_boxes: quantity,
      expiry_date: parseDisplayDateToIso(editExpiryDate),
      notes: editNotes.trim() || undefined,
      barcode: editLotBarcode.trim() || undefined,
    }

    async function doSaveLot(lotId: string, payloadToSend: Partial<InventoryEntry>) {
      await updateInventoryEntry(lotId, payloadToSend)

      // Lấy updated_at mới để update snapshot, tránh prompt conflict lặp khi user bấm edit lại
      let nextUpdatedAt = new Date().toISOString()
      try {
        const { data: row } = await supabase
          .from('inventory_entries')
          .select('updated_at')
          .eq('id', lotId)
          .maybeSingle()
        if (row?.updated_at) nextUpdatedAt = row.updated_at
      } catch {
        // keep fallback
      }

      setLotSnapshots((prev) => ({ ...prev, [lotId]: nextUpdatedAt }))
      setLots((prev) =>
        prev.map((item) =>
          item.id === lotId
            ? {
                ...item,
                quantity_boxes: quantity,
                expiry_date: payload.expiry_date,
                notes: payload.notes,
                barcode: payload.barcode,
                updated_at: nextUpdatedAt,
              }
            : item,
        ),
      )
      setEditingLotId(null)
    }

    const { hasConflict, changedByName } = await checkConflict(
      'inventory_entries',
      lot.id,
      lotSnapshots[lot.id],
    )

    if (hasConflict) {
      Alert.alert(
        'Có xung đột',
        `Lô này vừa được ${changedByName ?? 'người khác'} cập nhật.\nBạn có muốn ghi đè không?`,
        [
          { text: 'Xem lại', style: 'cancel', onPress: handleConflictReview },
          { text: 'Ghi đè', style: 'destructive', onPress: () => void doSaveLot(lot.id, payload) },
        ],
      )
      return
    }

    await doSaveLot(lot.id, payload)
  }

  function handleDeleteLot(lot: InventoryEntry) {
    Alert.alert('Xóa lô hàng', 'Xóa lô hàng này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteInventoryEntry(lot.id)
          if (editingLotId === lot.id) setEditingLotId(null)
          setLots((prev) => prev.filter((item) => item.id !== lot.id))
        },
      },
    ])
  }

  async function handleSaveWarningDays(): Promise<boolean> {
    if (!product) return false
    const productId = product.id
    const warningDays = Number(editWarningDays)
    if (!Number.isFinite(warningDays) || warningDays <= 0) {
      Alert.alert('Ngưỡng cảnh báo không hợp lệ', 'Ngưỡng cảnh báo (ngày) phải lớn hơn 0.')
      return false
    }
    const nextWarningDays = Math.floor(warningDays)

    async function doSaveWarningDays() {
      const { data: updated } = await supabase
        .from('products')
        .update({ warning_days: nextWarningDays })
        .eq('id', productId)
        .select('*')
        .single()
      if (updated) {
        setProduct(updated)
        setProductSnapshot(updated.updated_at ?? productSnapshot)
        useWarehouseStore.setState((s) => ({
          products: s.products.map((p) => (p.id === updated.id ? updated : p)),
        }))
      }
    }

    const { hasConflict, changedByName } = await checkConflict(
      'products',
      productId,
      productSnapshot,
    )

    if (hasConflict) {
      Alert.alert(
        'Có xung đột',
        `Sản phẩm này vừa được ${changedByName ?? 'người khác'} cập nhật.\nBạn có muốn ghi đè không?`,
        [
          { text: 'Xem lại', style: 'cancel', onPress: handleConflictReview },
          { text: 'Ghi đè', style: 'destructive', onPress: () => void doSaveWarningDays() },
        ],
      )
      return false
    }

    await doSaveWarningDays()
    return true
  }

  async function handleSaveLowWarningBoxes(): Promise<boolean> {
    if (!product) return false
    const productId = product.id
    const lowWarningBoxes = Number(editLowWarningBoxes)
    if (!Number.isFinite(lowWarningBoxes) || lowWarningBoxes < 1) {
      Alert.alert('Ngưỡng không hợp lệ', 'Ngưỡng cảnh báo sắp hết (thùng) phải lớn hơn hoặc bằng 1.')
      return false
    }
    const nextLowWarningBoxes = Math.floor(lowWarningBoxes)

    async function doSaveLowWarningBoxes() {
      const updated = await updateProductStockThresholds(productId, {
        low_warning_boxes: nextLowWarningBoxes,
      })
      if (updated) {
        setProduct(updated)
        setProductSnapshot(updated.updated_at ?? productSnapshot)
      }
    }

    const { hasConflict, changedByName } = await checkConflict(
      'products',
      productId,
      productSnapshot,
    )

    if (hasConflict) {
      Alert.alert(
        'Có xung đột',
        `Sản phẩm này vừa được ${changedByName ?? 'người khác'} cập nhật.\nBạn có muốn ghi đè không?`,
        [
          { text: 'Xem lại', style: 'cancel', onPress: handleConflictReview },
          { text: 'Ghi đè', style: 'destructive', onPress: () => void doSaveLowWarningBoxes() },
        ],
      )
      return false
    }

    await doSaveLowWarningBoxes()
    return true
  }

  async function applyCategoryL1(level1Id: string | null) {
    if (!product) return
    const productId = product.id
    setShowCategoryL1Picker(false)
    const prevL1 = product.category_level1_id ?? null
    const nextL1 = level1Id
    const nextL2 = nextL1 === prevL1 ? (product.category_level2_id ?? null) : null
    if (nextL1 === prevL1 && (product.category_level2_id ?? null) === (nextL2 ?? null)) {
      return
    }
    async function doApplyCategoryL1() {
      setCategorySaving(true)
      const res = await updateProductCategory(productId, {
        category_level1_id: nextL1,
        category_level2_id: nextL2,
      })
      setCategorySaving(false)
      if (res.error) {
        Alert.alert('Lỗi', res.error)
        return
      }
      if (res.product) {
        setProduct(res.product)
        setProductSnapshot(res.product.updated_at ?? productSnapshot)
      }
    }

    const { hasConflict, changedByName } = await checkConflict(
      'products',
      productId,
      productSnapshot,
    )

    if (hasConflict) {
      Alert.alert(
        'Có xung đột',
        `Sản phẩm này vừa được ${changedByName ?? 'người khác'} cập nhật.\nBạn có muốn ghi đè không?`,
        [
          { text: 'Xem lại', style: 'cancel', onPress: handleConflictReview },
          { text: 'Ghi đè', style: 'destructive', onPress: () => void doApplyCategoryL1() },
        ],
      )
      return
    }

    await doApplyCategoryL1()
  }

  async function applyCategoryL2(level2Id: string | null) {
    if (!product) return
    if (!product.category_level1_id) return
    const productId = product.id
    const categoryLevel1Id = product.category_level1_id
    setShowCategoryL2Picker(false)
    const prevL2 = product.category_level2_id ?? null
    if ((level2Id ?? null) === (prevL2 ?? null)) return

    async function doApplyCategoryL2() {
      setCategorySaving(true)
      const res = await updateProductCategory(productId, {
        category_level1_id: categoryLevel1Id,
        category_level2_id: level2Id,
      })
      setCategorySaving(false)
      if (res.error) {
        Alert.alert('Lỗi', res.error)
        return
      }
      if (res.product) {
        setProduct(res.product)
        setProductSnapshot(res.product.updated_at ?? productSnapshot)
      }
    }

    const { hasConflict, changedByName } = await checkConflict(
      'products',
      productId,
      productSnapshot,
    )

    if (hasConflict) {
      Alert.alert(
        'Có xung đột',
        `Sản phẩm này vừa được ${changedByName ?? 'người khác'} cập nhật.\nBạn có muốn ghi đè không?`,
        [
          { text: 'Xem lại', style: 'cancel', onPress: handleConflictReview },
          { text: 'Ghi đè', style: 'destructive', onPress: () => void doApplyCategoryL2() },
        ],
      )
      return
    }

    await doApplyCategoryL2()
  }

  function handleLocateLot(lot: InventoryEntry) {
    if (!product?.name) return
    const locationId = lot.zone?.location_id ?? zones.find((z) => z.id === lot.zone_id)?.location_id
    if (!locationId || !lot.zone_id) {
      Alert.alert('Thiếu thông tin', 'Không xác định được kho của lô này.')
      return
    }
    setLocateIntent({
      productName: product.name,
      locationId,
      zoneId: lot.zone_id,
    })
    navigation.getParent()?.navigate('Map' as never)
  }

  function handleAddNewLot() {
    // Prefill productId để AddInventoryScreen tự chọn sẵn sản phẩm
    const fallbackLot = lots[0]
    if (!fallbackLot?.zone_id || !fallbackLot?.zone?.name) {
      Alert.alert('Thiếu thông tin zone', 'Sản phẩm này chưa có lô để prefill zone/tầng.')
      return
    }

    navigation.navigate('AddInventory', {
      productId,
      zoneId: fallbackLot.zone_id,
      zoneName: fallbackLot.zone.name,
      zoneColor: fallbackLot.zone.color ?? colors.accent,
      tier: fallbackLot.tier,
    })
  }

  function getHostTabName(): string {
    const tabNav = navigation.getParent()?.getParent()
    const st = tabNav?.getState()
    if (!st?.routes || st.index === undefined) return 'Products'
    return String(st.routes[st.index]?.name ?? 'Products')
  }

  function handleDeleteProduct() {
    if (!product) return
    Alert.alert(
      'Xóa sản phẩm',
      `Bạn có chắc muốn xóa sản phẩm ${product.name}? Hành động này không thể hoàn tác.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteProduct(product.id)
                navigation.goBack()
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : 'Không thể xóa sản phẩm.'
                Alert.alert('Không thể xóa', message)
              }
            })()
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Chi tiết sản phẩm</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.sub }}>Đóng</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.productName, { color: colors.text }]}>{product?.name ?? 'Không xác định'}</Text>
          {!!product?.notes && <Text style={[styles.infoText, { color: colors.sub }]}>Ghi chú: {product.notes}</Text>}
          <TouchableOpacity
            style={[styles.detailsToggleRow, { borderColor: colors.border, backgroundColor: colors.bg }]}
            onPress={() => setDetailsExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.detailsToggleLabel, { color: colors.text }]}>
              {detailsExpanded ? 'Thu gọn' : 'Chi tiết'}
            </Text>
            <Text style={[styles.detailsToggleArrow, { color: colors.sub }]}>{detailsExpanded ? '▴' : '▾'}</Text>
          </TouchableOpacity>
          {detailsExpanded && (
            <>
              <View style={styles.thresholdsHeaderRow}>
                <Text style={[styles.infoText, { color: colors.sub, marginTop: 0, flex: 1 }]}>
                  Ngưỡng cảnh báo · sắp hết
                </Text>
                <TouchableOpacity
                  style={[styles.thresholdEditBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => void handleThresholdEditButtonPress()}
                >
                  <Text
                    style={[
                      styles.thresholdEditBtnText,
                      isEditingThresholds && hasThresholdChanged ? { color: '#22C55E' } : null,
                    ]}
                  >
                    {!isEditingThresholds ? '✏️' : hasThresholdChanged ? '✓' : '✕'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.infoText, { color: colors.sub }]}>
                Ngưỡng cảnh báo: {product?.warning_days ?? 30} ngày
              </Text>
              <TextInput
                style={[
                  styles.warningInput,
                  {
                    backgroundColor: colors.bg,
                    color: colors.text,
                    borderColor: colors.border,
                    opacity: isEditingThresholds ? 1 : 0.65,
                  },
                ]}
                value={editWarningDays}
                onChangeText={setEditWarningDays}
                editable={isEditingThresholds}
                keyboardType="numeric"
                placeholder="30"
                placeholderTextColor={colors.sub}
              />
              <Text style={[styles.infoText, { color: colors.sub, marginTop: 10 }]}>
                Ngưỡng cảnh báo sắp hết (thùng): {product?.low_warning_boxes ?? 3}
              </Text>
              <TextInput
                style={[
                  styles.warningInput,
                  {
                    backgroundColor: colors.bg,
                    color: colors.text,
                    borderColor: colors.border,
                    opacity: isEditingThresholds ? 1 : 0.65,
                  },
                ]}
                value={editLowWarningBoxes}
                onChangeText={setEditLowWarningBoxes}
                editable={isEditingThresholds}
                keyboardType="numeric"
                placeholder="3"
                placeholderTextColor={colors.sub}
              />

              <Text style={[styles.infoText, { color: colors.sub, marginTop: 12 }]}>Nhóm (Cấp 1)</Text>
              <Pressable
                style={[styles.selectBtn, { backgroundColor: colors.bg, borderColor: colors.border, marginTop: 6 }]}
                onPress={() => {
                  setShowCategoryL1Picker((v) => !v)
                  setShowCategoryL2Picker(false)
                }}
              >
                <Text style={{ color: colors.text }}>
                  {categorySaving
                    ? '...'
                    : !product?.category_level1_id
                      ? 'Không phân loại'
                      : productCategoriesL1.find((c) => c.id === product.category_level1_id)?.name ?? 'Không phân loại'}
                </Text>
              </Pressable>
              {showCategoryL1Picker && (
                <View style={[styles.optionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => void applyCategoryL1(null)}
                  >
                    <Text style={{ color: colors.text }}>Không phân loại</Text>
                  </TouchableOpacity>
                  {productCategoriesL1.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.optionRow, { borderBottomColor: colors.border }]}
                      onPress={() => void applyCategoryL1(cat.id)}
                    >
                      <Text style={{ color: colors.text }}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {!!product?.category_level1_id && (
                <>
                  <Text style={[styles.infoText, { color: colors.sub, marginTop: 10 }]}>Loại (Cấp 2)</Text>
                  <Pressable
                    style={[styles.selectBtn, { backgroundColor: colors.bg, borderColor: colors.border, marginTop: 6 }]}
                    onPress={() => {
                      setShowCategoryL2Picker((v) => !v)
                      setShowCategoryL1Picker(false)
                    }}
                  >
                    <Text style={{ color: colors.text }}>
                      {categorySaving
                        ? '...'
                        : !product?.category_level2_id
                          ? 'Không phân loại'
                          : productCategoriesL2.find((c) => c.id === product.category_level2_id)?.name ?? 'Không phân loại'}
                    </Text>
                  </Pressable>
                  {showCategoryL2Picker && (
                    <View style={[styles.optionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <TouchableOpacity
                        style={[styles.optionRow, { borderBottomColor: colors.border }]}
                        onPress={() => void applyCategoryL2(null)}
                      >
                        <Text style={{ color: colors.text }}>Không phân loại</Text>
                      </TouchableOpacity>
                      {categoryL2Options.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.optionRow, { borderBottomColor: colors.border }]}
                          onPress={() => void applyCategoryL2(cat.id)}
                        >
                          <Text style={{ color: colors.text }}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>

        <View style={[styles.lotsToolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.totalBoxesToolbar, { color: colors.text }]}>Tổng {totalLotBoxes} thùng</Text>
          <View style={styles.issuesToggleInner}>
            <Text style={{ color: colors.sub, fontSize: 13 }}>Có vấn đề</Text>
            <Switch
              value={showIssuesOnly}
              onValueChange={setShowIssuesOnly}
              trackColor={{ false: '#ccc', true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.addLotBtn, { backgroundColor: colors.accent }]} onPress={handleAddNewLot}>
          <Text style={[styles.addLotBtnText, { color: colors.card }]}>Thêm lô hàng mới</Text>
        </TouchableOpacity>

        {isLoading ? (
          <Text style={{ color: colors.sub }}>Đang tải...</Text>
        ) : lots.length === 0 ? (
          <Text style={{ color: colors.sub }}>Chưa có lô hàng cho sản phẩm này.</Text>
        ) : displayedLots.length === 0 ? (
          <Text style={{ color: colors.sub }}>Không có lô đỏ/vàng (đang bật lọc Có vấn đề).</Text>
        ) : (
          displayedLots.map((lot) => {
            const isExpiredLot = isExpiredBeforeToday(lot.expiry_date)
            const status = getCombinedStatus(
              lot.quantity_boxes,
              lot.expiry_date,
              product?.low_warning_boxes ?? 3,
              1,
              product?.warning_days ?? 30
            )
            const dotColor = getDisplayColor(
              status,
              colors,
              expiryWarningEnabled,
              lowStockWarningEnabled,
              getDisplayColorContextFromEntry(lot, product ?? lot.product),
            )
            const zoneResolved = (lot.zone as Zone | undefined) ?? zones.find((z) => z.id === lot.zone_id)
            const locationName = zoneResolved?.location_id
              ? locations.find((l) => l.id === zoneResolved.location_id)?.name
              : undefined
            const lotPlaceTitle = `${locationName ?? '—'} · ${zoneResolved?.name ?? '—'} · Tầng ${lot.tier}`
            return (
              <View key={lot.id} style={[styles.lotWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {lot.quantity_boxes === 0 && (
                  <View style={[styles.depletedRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.depletedLabel, { color: colors.sub }]}>Lô này đã hết hàng</Text>
                    <TouchableOpacity onPress={() => handleDeleteLot(lot)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={[styles.deleteLotLink, { color: colors.statusCritical }]}>Xóa lô</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {isExpiredLot && (
                  <View style={[styles.depletedRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.depletedLabel, { color: colors.sub }]}>Lô này đã hết hạn</Text>
                    <TouchableOpacity onPress={() => handleDeleteLot(lot)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={[styles.deleteLotLink, { color: colors.statusCritical }]}>Xóa lô</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.lotRow}>
                  <TouchableOpacity style={styles.lotMain} activeOpacity={0.75} onPress={() => openInlineEdit(lot)}>
                    <Text style={[styles.lotTitle, { color: colors.text }]}>{lotPlaceTitle}</Text>
                    <Text style={[styles.lotSub, { color: colors.sub }]}>
                      {lot.quantity_boxes} thùng · Hạn: {formatExpiryDate(lot.expiry_date)}
                    </Text>
                    {!!lot.barcode && <Text style={[styles.lotSub, { color: colors.sub }]}>Barcode: {lot.barcode}</Text>}
                    {!!lot.notes && <Text style={[styles.lotSub, { color: colors.sub }]}>{lot.notes}</Text>}
                  </TouchableOpacity>
                  <View style={styles.lotActions}>
                    <View style={[styles.expiryDot, { backgroundColor: dotColor }]} />
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      onPress={() => openInlineEdit(lot)}
                    >
                      <Text style={styles.deleteBtnText}>✏️</Text>
                    </TouchableOpacity>
                    {lot.quantity_boxes > 0 && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                        onPress={() => handleLocateLot(lot)}
                      >
                        <Text style={styles.deleteBtnText}>📍</Text>
                      </TouchableOpacity>
                    )}
                    {lot.quantity_boxes > 0 && (
                      <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                        onPress={() => handleDeleteLot(lot)}
                      >
                        <Text style={styles.deleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {editingLotId === lot.id && (
                  <View style={[styles.editBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                    <Text style={[styles.editLabel, { color: colors.sub }]}>Số thùng</Text>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      keyboardType="numeric"
                      value={editQuantity}
                      onChangeText={setEditQuantity}
                      placeholder="1"
                      placeholderTextColor={colors.sub}
                    />

                    <Text style={[styles.editLabel, { color: colors.sub }]}>Hạn sử dụng (DD/MM/YYYY)</Text>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      value={editExpiryDate}
                      onChangeText={setEditExpiryDate}
                      placeholder="30/12/2026"
                      placeholderTextColor={colors.sub}
                      keyboardType="default"
                    />

                    <Text style={[styles.editLabel, { color: colors.sub }]}>Ghi chú</Text>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      value={editNotes}
                      onChangeText={setEditNotes}
                      placeholder="Optional"
                      placeholderTextColor={colors.sub}
                    />

                    <Text style={[styles.editLabel, { color: colors.sub }]}>Barcode lô</Text>
                    <View style={styles.lotBarcodeRow}>
                      <TextInput
                        style={[styles.lotBarcodeInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                        value={editLotBarcode}
                        onChangeText={setEditLotBarcode}
                        placeholder="Optional"
                        placeholderTextColor={colors.sub}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={[styles.scanBarcodeBtn, { backgroundColor: colors.accent }]}
                        onPress={() => navigation.navigate('BarcodeScanner', {
                          mode: 'search',
                          onScanFillBarcode: (barcode: string) => {
                            setEditingLotId(lot.id)
                            setEditLotBarcode(barcode.trim())
                          },
                        })}
                      >
                        <Text style={[styles.scanBarcodeText, { color: colors.card }]}>📷</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={[styles.cancelBtn, { backgroundColor: colors.card }]}
                        onPress={() => setEditingLotId(null)}
                      >
                        <Text style={{ color: colors.sub }}>Huỷ</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={() => handleSaveLot(lot)}>
                        <Text style={{ color: colors.card, fontWeight: '700' }}>Lưu</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )
          })
        )}

        {/* SEC-11: Section Lịch sử thay đổi */}
        {auditEntries.length > 0 && (
          <View style={[styles.auditSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.auditHeader}>
              <Text style={[styles.auditTitle, { color: colors.text }]}>Lịch sử thay đổi</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AuditLog', { filterProductId: productId })}>
                <Text style={[styles.auditViewAll, { color: colors.accent }]}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>
            {auditEntries.map((entry) => {
              const ignored = new Set(['updated_at', 'created_at'])
              const fields = entry.old_data && entry.new_data
                ? Object.keys(entry.new_data).filter((k) => !ignored.has(k) && JSON.stringify(entry.old_data![k]) !== JSON.stringify(entry.new_data![k]))
                : []
              const icon = entry.action === 'INSERT' ? '➕' : entry.action === 'UPDATE' ? '✏️' : '🗑️'
              const tableLabel = entry.table_name === 'inventory_entries' ? 'Lô hàng' : 'Sản phẩm'
              const time = new Date(entry.changed_at)
              const pad = (n: number) => String(n).padStart(2, '0')
              const timeStr = `${pad(time.getDate())}/${pad(time.getMonth() + 1)} ${pad(time.getHours())}:${pad(time.getMinutes())}`
              return (
                <View key={entry.id} style={[styles.auditEntry, { borderColor: colors.border }]}>
                  <Text style={styles.auditIcon}>{icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.auditEntryText, { color: colors.text }]}>
                      {entry.changed_by_name ?? 'Không rõ'} · {tableLabel} · {timeStr}
                    </Text>
                    {fields.length > 0 && (
                      <Text style={[styles.auditFieldsText, { color: colors.sub }]}>{fields.join(', ')}</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        <TouchableOpacity
          style={[styles.deleteProductBtn, { borderColor: colors.statusExpired, backgroundColor: colors.card }]}
          onPress={handleDeleteProduct}
        >
          <Text style={[styles.deleteProductBtnText, { color: colors.statusExpired }]}>Xóa sản phẩm</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '700' },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  content: { padding: 16, paddingBottom: 20 },
  deleteProductBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteProductBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  detailsToggleRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailsToggleLabel: { fontSize: 14, fontWeight: '600' },
  detailsToggleArrow: { fontSize: 14, fontWeight: '700' },
  lotsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  totalBoxesToolbar: { fontSize: 15, fontWeight: '700' },
  issuesToggleInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productName: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  infoText: { fontSize: 13, marginTop: 2 },
  thresholdsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  thresholdEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thresholdEditBtnText: { fontSize: 11 },
  warningInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 8 },
  scanBarcodeBtn: {
    width: 40,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBarcodeText: { fontSize: 16 },
  lotBarcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  lotBarcodeInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  addLotBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 14 },
  addLotBtnText: { fontWeight: '700' },
  lotWrap: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  depletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  depletedLabel: { flex: 1, fontSize: 13, marginRight: 8 },
  deleteLotLink: { fontSize: 13, fontWeight: '700' },
  lotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lotMain: { flex: 1, marginRight: 8 },
  lotTitle: { fontSize: 14, fontWeight: '700' },
  lotSub: { fontSize: 12, marginTop: 2 },
  lotActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expiryDot: { width: 10, height: 10, borderRadius: 5 },
  actionBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 11 },
  editBox: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 10 },
  editLabel: { fontSize: 12, marginBottom: 4 },
  editInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  selectBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  optionsWrap: { borderWidth: 1, borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  optionRow: { borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  auditSection: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 },
  auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  auditTitle: { fontSize: 15, fontWeight: '700' },
  auditViewAll: { fontSize: 13, fontWeight: '600' },
  auditEntry: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth },
  auditIcon: { fontSize: 14, marginRight: 8, marginTop: 1 },
  auditEntryText: { fontSize: 13 },
  auditFieldsText: { fontSize: 12, marginTop: 1, fontStyle: 'italic' },
})
