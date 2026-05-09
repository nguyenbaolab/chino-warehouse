import { useEffect, useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { supabase } from '../lib/supabase'
import { formatExpiryDate, getCombinedStatus, InventoryEntry, Product, Zone } from '../types'

type ProductDetailRouteParams = {
  productId: string
  scannedBarcode?: string
  barcodeAssignedAt?: number
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

export default function ProductDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const { productId, scannedBarcode, barcodeAssignedAt } = route.params as ProductDetailRouteParams
  const { colors } = useThemeStore()
  const { zones, updateInventoryEntry, deleteInventoryEntry, updateProductStockThresholds, updateBarcode } = useWarehouseStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [lots, setLots] = useState<InventoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editExpiryDate, setEditExpiryDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editBarcode, setEditBarcode] = useState('')
  const [editWarningDays, setEditWarningDays] = useState('30')
  const [editLowWarningBoxes, setEditLowWarningBoxes] = useState('3')
  const [editLowCriticalBoxes, setEditLowCriticalBoxes] = useState('1')
  const [isSavingProduct, setIsSavingProduct] = useState(false)

  const [moveLot, setMoveLot] = useState<InventoryEntry | null>(null)
  const [targetZoneId, setTargetZoneId] = useState<string | null>(null)
  const [targetTier, setTargetTier] = useState<number | null>(null)
  const [showZoneOptions, setShowZoneOptions] = useState(false)
  const [showTierOptions, setShowTierOptions] = useState(false)

  async function loadData() {
    setIsLoading(true)
    const [{ data: productData }, { data: lotData }] = await Promise.all([
      supabase.from('products').select('*').eq('id', productId).single(),
      supabase
        .from('inventory_entries')
        .select('*, zone:zones(*)')
        .eq('product_id', productId)
        .gt('quantity_boxes', 0),
    ])
    setProduct(productData ?? null)
    setLots((lotData as InventoryEntry[]) ?? [])
    setEditBarcode(productData?.barcode ?? '')
    setEditWarningDays(String(productData?.warning_days ?? 30))
    setEditLowWarningBoxes(String(productData?.low_warning_boxes ?? 3))
    setEditLowCriticalBoxes(String(productData?.low_critical_boxes ?? 1))
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [productId])

  useEffect(() => {
    if (!scannedBarcode) return
    setEditBarcode(scannedBarcode)
    navigation.setParams({ scannedBarcode: undefined, barcodeAssignedAt: undefined })
  }, [scannedBarcode, barcodeAssignedAt])

  function openInlineEdit(lot: InventoryEntry) {
    if (editingLotId === lot.id) {
      setEditingLotId(null)
      return
    }
    setEditingLotId(lot.id)
    setEditQuantity(String(lot.quantity_boxes))
    setEditExpiryDate(lot.expiry_date ?? '')
    setEditNotes(lot.notes ?? '')
  }

  async function handleSaveLot(lot: InventoryEntry) {
    const quantity = Number(editQuantity)
    if (!Number.isFinite(quantity) || quantity < 1) {
      Alert.alert('Số thùng không hợp lệ', 'Số thùng phải lớn hơn hoặc bằng 1.')
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
    })
    setLots((prev) => prev.map((item) => (item.id === lot.id ? { ...item, quantity_boxes: quantity, expiry_date: editExpiryDate.trim() || undefined, notes: editNotes.trim() || undefined } : item)))
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

  async function handleSaveBarcode() {
    if (!product) return
    setIsSavingProduct(true)
    const updated = await updateBarcode(product.id, editBarcode)
    if (updated) {
      setProduct(updated)
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

  async function handleSaveLowCriticalBoxes() {
    if (!product) return
    const lowCriticalBoxes = Number(editLowCriticalBoxes)
    const lowWarningBoxes = Number(editLowWarningBoxes)
    if (!Number.isFinite(lowCriticalBoxes) || lowCriticalBoxes < 0) {
      Alert.alert('Ngưỡng không hợp lệ', 'Ngưỡng còn rất ít (thùng) phải lớn hơn hoặc bằng 0.')
      return
    }
    if (Number.isFinite(lowWarningBoxes) && lowCriticalBoxes > lowWarningBoxes) {
      Alert.alert('Ngưỡng không hợp lệ', 'Ngưỡng còn rất ít không được lớn hơn ngưỡng cảnh báo sắp hết.')
      return
    }
    setIsSavingProduct(true)
    const updated = await updateProductStockThresholds(product.id, {
      low_critical_boxes: Math.floor(lowCriticalBoxes),
    })
    if (updated) setProduct(updated)
    setIsSavingProduct(false)
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
          {!!product?.barcode && <Text style={[styles.infoText, { color: colors.sub }]}>Barcode: {product.barcode}</Text>}
          <Text style={[styles.infoText, { color: colors.sub, marginTop: 10 }]}>
            Mã vạch
          </Text>
          <View style={styles.warningEditRow}>
            <TextInput
              style={[styles.warningInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={editBarcode}
              onChangeText={setEditBarcode}
              placeholder="Chưa có mã vạch"
              placeholderTextColor={colors.sub}
            />
            <TouchableOpacity
              style={[styles.scanBarcodeBtn, { backgroundColor: colors.accent }]}
              onPress={() => navigation.navigate('BarcodeScanner', { mode: 'assign', productId })}
            >
              <Text style={[styles.scanBarcodeText, { color: colors.card }]}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.warningSaveBtn, { backgroundColor: colors.accent }]} onPress={handleSaveBarcode}>
              <Text style={{ color: colors.card, fontWeight: '700' }}>{isSavingProduct ? '...' : 'Lưu'}</Text>
            </TouchableOpacity>
          </View>
          {!!product?.notes && <Text style={[styles.infoText, { color: colors.sub }]}>Ghi chú: {product.notes}</Text>}
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
          <Text style={[styles.infoText, { color: colors.sub, marginTop: 10 }]}>
            Ngưỡng cảnh báo còn rất ít (thùng): {product?.low_critical_boxes ?? 1}
          </Text>
          <View style={styles.warningEditRow}>
            <TextInput
              style={[styles.warningInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={editLowCriticalBoxes}
              onChangeText={setEditLowCriticalBoxes}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={colors.sub}
            />
            <TouchableOpacity style={[styles.warningSaveBtn, { backgroundColor: colors.accent }]} onPress={handleSaveLowCriticalBoxes}>
              <Text style={{ color: colors.card, fontWeight: '700' }}>{isSavingProduct ? '...' : 'Lưu'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.addLotBtn, { backgroundColor: colors.accent }]} onPress={handleAddNewLot}>
          <Text style={[styles.addLotBtnText, { color: colors.card }]}>Thêm lô hàng mới</Text>
        </TouchableOpacity>

        {isLoading ? (
          <Text style={{ color: colors.sub }}>Đang tải...</Text>
        ) : lots.length === 0 ? (
          <Text style={{ color: colors.sub }}>Chưa có lô hàng cho sản phẩm này.</Text>
        ) : (
          lots.map((lot) => {
            const status = getCombinedStatus(
              lot.quantity_boxes,
              lot.expiry_date,
              product?.low_warning_boxes ?? 3,
              product?.low_critical_boxes ?? 1,
              product?.warning_days ?? 30
            )
            const dotColor = status === 'expired'
              ? colors.statusExpired
              : status === 'critical'
                ? colors.statusCritical
                : status === 'warning'
                  ? colors.statusWarning
                  : colors.statusOk
            const zone = lot.zone as Zone | undefined
            return (
              <View key={lot.id} style={[styles.lotWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.lotRow}>
                  <View style={styles.lotMain}>
                    <Text style={[styles.lotTitle, { color: colors.text }]}>
                      {zone?.name ?? 'Zone?'} · Tầng {lot.tier}
                    </Text>
                    <Text style={[styles.lotSub, { color: colors.sub }]}>
                      {lot.quantity_boxes} thùng · Hạn: {formatExpiryDate(lot.expiry_date)}
                    </Text>
                    {!!lot.notes && <Text style={[styles.lotSub, { color: colors.sub }]}>{lot.notes}</Text>}
                  </View>
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
                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      onPress={() => handleDeleteLot(lot)}
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
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
  warningSaveBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  addLotBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 14 },
  addLotBtnText: { fontWeight: '700' },
  lotWrap: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
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
})
