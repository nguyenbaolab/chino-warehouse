import { useEffect, useState } from 'react'
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
import { useNavigation, useRoute } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { supabase } from '../lib/supabase'
import { EXPIRY_COLORS, getExpiryStatus, InventoryEntry, Product, Zone } from '../types'

type ProductDetailRouteParams = {
  productId: string
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
  const { productId } = route.params as ProductDetailRouteParams
  const { colors } = useThemeStore()
  const { updateInventoryEntry, deleteInventoryEntry } = useWarehouseStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [lots, setLots] = useState<InventoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editExpiryDate, setEditExpiryDate] = useState('')
  const [editNotes, setEditNotes] = useState('')

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
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [productId])

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
    setEditingLotId(null)
    await loadData()
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
          await loadData()
        },
      },
    ])
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
          {!!product?.notes && <Text style={[styles.infoText, { color: colors.sub }]}>Ghi chú: {product.notes}</Text>}
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
            const dotColor = EXPIRY_COLORS[getExpiryStatus(lot.expiry_date)]
            const zone = lot.zone as Zone | undefined
            return (
              <View key={lot.id} style={[styles.lotWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity style={styles.lotRow} onPress={() => openInlineEdit(lot)}>
                  <View style={styles.lotMain}>
                    <Text style={[styles.lotTitle, { color: colors.text }]}>
                      {zone?.name ?? 'Zone?'} · Tầng {lot.tier}
                    </Text>
                    <Text style={[styles.lotSub, { color: colors.sub }]}>
                      {lot.quantity_boxes} thùng · Hạn: {lot.expiry_date ?? 'Không hạn'}
                    </Text>
                    {!!lot.notes && <Text style={[styles.lotSub, { color: colors.sub }]}>{lot.notes}</Text>}
                  </View>
                  <View style={styles.lotActions}>
                    <View style={[styles.expiryDot, { backgroundColor: dotColor }]} />
                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      onPress={() => handleDeleteLot(lot)}
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

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
  addLotBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 14 },
  addLotBtnText: { fontWeight: '700' },
  lotWrap: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  lotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lotMain: { flex: 1, marginRight: 8 },
  lotTitle: { fontSize: 14, fontWeight: '700' },
  lotSub: { fontSize: 12, marginTop: 2 },
  lotActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expiryDot: { width: 10, height: 10, borderRadius: 5 },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 11 },
  editBox: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 10 },
  editLabel: { fontSize: 12, marginBottom: 4 },
  editInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
})
