import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { supabase } from '../lib/supabase'
import { formatExpiryDate, getCombinedStatus, InventoryEntry, Product, Zone, AuditLog } from '../types'

type ProductDetailRouteParams = {
  productId: string
  scannedLotBarcode?: string
  scannedLotId?: string
  scannedLotBarcodeAt?: number
}

function isValidIsoDate(raw: string): boolean {
  if (!raw.trim()) return true
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim())
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
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
  } = useWarehouseStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [lots, setLots] = useState<InventoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editExpiryDate, setEditExpiryDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLotBarcode, setEditLotBarcode] = useState('')
  const [editWarningDays, setEditWarningDays] = useState('30')
  const [editLowWarningBoxes, setEditLowWarningBoxes] = useState('3')
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  const [moveLot, setMoveLot] = useState<InventoryEntry | null>(null)
  const [targetZoneId, setTargetZoneId] = useState<string | null>(null)
  const [targetTier, setTargetTier] = useState<number | null>(null)
  const [showZoneOptions, setShowZoneOptions] = useState(false)
  const [showTierOptions, setShowTierOptions] = useState(false)
  const [showIssuesOnly, setShowIssuesOnly] = useState(false)
  const [showCategoryL1Picker, setShowCategoryL1Picker] = useState(false)
  const [showCategoryL2Picker, setShowCategoryL2Picker] = useState(false)
  const [categorySaving, setCategorySaving] = useState(false)
  const [auditEntries, setAuditEntries] = useState<AuditLog[]>([])

  const totalLotBoxes = useMemo(
    () => lots.reduce((sum, lot) => sum + lot.quantity_boxes, 0),
    [lots]
  )

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
    setProduct(productData ?? null)
    setLots((lotData as InventoryEntry[]) ?? [])
    setEditWarningDays(String(productData?.warning_days ?? 30))
    setEditLowWarningBoxes(String(productData?.low_warning_boxes ?? 3))
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
    setEditExpiryDate(lot.expiry_date ?? '')
    setEditNotes(lot.notes ?? '')
    setEditLotBarcode(scannedLotBarcode.trim())
    navigation.setParams({
      scannedLotBarcode: undefined,
      scannedLotId: undefined,
      scannedLotBarcodeAt: undefined,
    })
  }, [scannedLotBarcode, scannedLotId, scannedLotBarcodeAt, lots, navigation])

  function openInlineEdit(lot: InventoryEntry) {
    if (editingLotId === lot.id) {
      setEditingLotId(null)
      return
    }
    setEditingLotId(lot.id)
    setEditQuantity(String(lot.quantity_boxes))
    setEditExpiryDate(lot.expiry_date ?? '')
    setEditNotes(lot.notes ?? '')
    setEditLotBarcode(lot.barcode ?? '')
  }

  async function handleSaveLot(lot: InventoryEntry) {
    const quantity = Number(editQuantity)
    if (!Number.isFinite(quantity) || quantity < 0 || quantity !== Math.floor(quantity)) {
      Alert.alert('Số thùng không hợp lệ', 'Số thùng phải là số nguyên lớn hơn hoặc bằng 0.')
      return
    }
    if (!isValidIsoDate(editExpiryDate)) {
      Alert.alert('Hạn không hợp lệ', 'Hạn sử dụng phải theo định dạng YYYY-MM-DD.')
      return
    }

    // Lưu chỉnh sửa lot ngay tại màn chi tiết sản phẩm
    await updateInventoryEntry(lot.id, {
      quantity_boxes: quantity,
      expiry_date: editExpiryDate.trim() || undefined,
      notes: editNotes.trim() || undefined,
      barcode: editLotBarcode.trim() || undefined,
    })
    setLots((prev) => prev.map((item) => (
      item.id === lot.id
        ? {
            ...item,
            quantity_boxes: quantity,
            expiry_date: editExpiryDate.trim() || undefined,
            notes: editNotes.trim() || undefined,
            barcode: editLotBarcode.trim() || undefined,
          }
        : item
    )))
    setEditingLotId(null)
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

  async function handleSaveWarningDays() {
    if (!product) return
    const warningDays = Number(editWarningDays)
    if (!Number.isFinite(warningDays) || warningDays <= 0) {
      Alert.alert('Ngưỡng cảnh báo không hợp lệ', 'Ngưỡng cảnh báo (ngày) phải lớn hơn 0.')
      return
    }
    setIsSavingProduct(true)
    const { data: updated } = await supabase
      .from('products')
      .update({ warning_days: Math.floor(warningDays) })
      .eq('id', product.id)
      .select('*')
      .single()
    if (updated) {
      setProduct(updated)
      useWarehouseStore.setState((s) => ({
        products: s.products.map((p) => (p.id === updated.id ? updated : p)),
      }))
    }
    setIsSavingProduct(false)
  }

  async function handleSaveLowWarningBoxes() {
    if (!product) return
    const lowWarningBoxes = Number(editLowWarningBoxes)
    if (!Number.isFinite(lowWarningBoxes) || lowWarningBoxes < 1) {
      Alert.alert('Ngưỡng không hợp lệ', 'Ngưỡng cảnh báo sắp hết (thùng) phải lớn hơn hoặc bằng 1.')
      return
    }
    setIsSavingProduct(true)
    const updated = await updateProductStockThresholds(product.id, {
      low_warning_boxes: Math.floor(lowWarningBoxes),
    })
    if (updated) setProduct(updated)
    setIsSavingProduct(false)
  }

  async function applyCategoryL1(level1Id: string | null) {
    if (!product) return
    setShowCategoryL1Picker(false)
    const prevL1 = product.category_level1_id ?? null
    const nextL1 = level1Id
    const nextL2 = nextL1 === prevL1 ? (product.category_level2_id ?? null) : null
    if (nextL1 === prevL1 && (product.category_level2_id ?? null) === (nextL2 ?? null)) {
      return
    }
    setCategorySaving(true)
    const res = await updateProductCategory(product.id, {
      category_level1_id: nextL1,
      category_level2_id: nextL2,
    })
    setCategorySaving(false)
    if (res.error) {
      Alert.alert('Lỗi', res.error)
      return
    }
    if (res.product) setProduct(res.product)
  }

  async function applyCategoryL2(level2Id: string | null) {
    if (!product?.category_level1_id) return
    setShowCategoryL2Picker(false)
    const prevL2 = product.category_level2_id ?? null
    if ((level2Id ?? null) === (prevL2 ?? null)) return
    setCategorySaving(true)
    const res = await updateProductCategory(product.id, {
      category_level1_id: product.category_level1_id,
      category_level2_id: level2Id,
    })
    setCategorySaving(false)
    if (res.error) {
      Alert.alert('Lỗi', res.error)
      return
    }
    if (res.product) setProduct(res.product)
  }

  function openMoveLot(lot: InventoryEntry) {
    setMoveLot(lot)
    setTargetZoneId(null)
    setTargetTier(null)
    setShowZoneOptions(false)
    setShowTierOptions(false)
  }

  const availableTargetZones = zones.filter((z) => z.id !== moveLot?.zone_id)
  const selectedTargetZone = zones.find((z) => z.id === targetZoneId) ?? null
  const availableTargetTiers = selectedTargetZone
    ? Array.from({ length: Math.max(selectedTargetZone.tier_count || 1, 1) }, (_, idx) => idx + 1)
    : []

  async function confirmMoveLot() {
    if (!moveLot || !targetZoneId || !targetTier) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn zone đích và tầng đích.')
      return
    }
    await updateInventoryEntry(moveLot.id, { zone_id: targetZoneId, tier: targetTier })
    setLots((prev) => prev.map((lot) => (lot.id === moveLot.id ? { ...lot, zone_id: targetZoneId, tier: targetTier, zone: zones.find((z) => z.id === targetZoneId) } : lot)))
    setMoveLot(null)
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Chi tiết sản phẩm</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.sub }}>Đóng</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
              <Text style={[styles.infoText, { color: colors.sub }]}>
                Ngưỡng cảnh báo: {product?.warning_days ?? 30} ngày
              </Text>
              <View style={styles.warningEditRow}>
                <TextInput
                  style={[styles.warningInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={editWarningDays}
                  onChangeText={setEditWarningDays}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={colors.sub}
                />
                <TouchableOpacity style={[styles.warningSaveBtn, { backgroundColor: colors.accent }]} onPress={handleSaveWarningDays}>
                  <Text style={{ color: colors.card, fontWeight: '700' }}>{isSavingProduct ? '...' : 'Lưu'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.infoText, { color: colors.sub, marginTop: 10 }]}>
                Ngưỡng cảnh báo sắp hết (thùng): {product?.low_warning_boxes ?? 3}
              </Text>
              <View style={styles.warningEditRow}>
                <TextInput
                  style={[styles.warningInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={editLowWarningBoxes}
                  onChangeText={setEditLowWarningBoxes}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor={colors.sub}
                />
                <TouchableOpacity style={[styles.warningSaveBtn, { backgroundColor: colors.accent }]} onPress={handleSaveLowWarningBoxes}>
                  <Text style={{ color: colors.card, fontWeight: '700' }}>{isSavingProduct ? '...' : 'Lưu'}</Text>
                </TouchableOpacity>
              </View>

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
            const dotColor = status === 'expired'
              ? colors.statusExpired
              : status === 'critical'
                ? colors.statusCritical
                : status === 'warning'
                  ? colors.statusWarning
                  : colors.statusOk
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
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      onPress={() => openMoveLot(lot)}
                    >
                      <Text style={styles.deleteBtnText}>→</Text>
                    </TouchableOpacity>
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

                    <Text style={[styles.editLabel, { color: colors.sub }]}>Hạn sử dụng (YYYY-MM-DD)</Text>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      value={editExpiryDate}
                      onChangeText={setEditExpiryDate}
                      placeholder="2026-12-30"
                      placeholderTextColor={colors.sub}
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
      </ScrollView>

      <Modal visible={!!moveLot} transparent animationType="slide" onRequestClose={() => setMoveLot(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setMoveLot(null)} />
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Chuyển lô hàng</Text>

            <Text style={[styles.editLabel, { color: colors.sub }]}>Zone đích</Text>
            <Pressable
              style={[styles.selectBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => {
                setShowZoneOptions((v) => !v)
                setShowTierOptions(false)
              }}
            >
              <Text style={{ color: targetZoneId ? colors.text : colors.sub }}>
                {selectedTargetZone?.name ?? 'Chọn zone đích'}
              </Text>
            </Pressable>
            {showZoneOptions && (
              <View style={[styles.optionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                {availableTargetZones.map((zone) => (
                  <TouchableOpacity
                    key={zone.id}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setTargetZoneId(zone.id)
                      const tiers = Math.max(zone.tier_count || 1, 1)
                      setTargetTier(tiers === 1 ? 1 : null)
                      setShowZoneOptions(false)
                    }}
                  >
                    <Text style={{ color: colors.text }}>{zone.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.editLabel, { color: colors.sub, marginTop: 8 }]}>Tầng đích</Text>
            <Pressable
              style={[styles.selectBtn, { backgroundColor: colors.bg, borderColor: colors.border, opacity: selectedTargetZone ? 1 : 0.5 }]}
              onPress={() => {
                if (!selectedTargetZone || availableTargetTiers.length <= 1) return
                setShowTierOptions((v) => !v)
                setShowZoneOptions(false)
              }}
            >
              <Text style={{ color: targetTier ? colors.text : colors.sub }}>
                {targetTier ? `Tầng ${targetTier}` : 'Chọn tầng đích'}
              </Text>
            </Pressable>
            {showTierOptions && availableTargetTiers.length > 1 && (
              <View style={[styles.optionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                {availableTargetTiers.map((tierNum) => (
                  <TouchableOpacity
                    key={tierNum}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setTargetTier(tierNum)
                      setShowTierOptions(false)
                    }}
                  >
                    <Text style={{ color: colors.text }}>Tầng {tierNum}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.moveActions}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.bg }]} onPress={() => setMoveLot(null)}>
                <Text style={{ color: colors.sub }}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={confirmMoveLot}>
                <Text style={{ color: colors.card, fontWeight: '700' }}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  warningEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  warningInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
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
  warningSaveBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalBox: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  selectBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  optionsWrap: { borderWidth: 1, borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  optionRow: { borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  moveActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  auditSection: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 },
  auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  auditTitle: { fontSize: 15, fontWeight: '700' },
  auditViewAll: { fontSize: 13, fontWeight: '600' },
  auditEntry: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth },
  auditIcon: { fontSize: 14, marginRight: 8, marginTop: 1 },
  auditEntryText: { fontSize: 13 },
  auditFieldsText: { fontSize: 12, marginTop: 1, fontStyle: 'italic' },
})
