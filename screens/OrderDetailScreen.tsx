import { useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { OrderListStatus } from '../types'

type RouteParams = {
  orderListId: string
}

function statusLabel(status: OrderListStatus): string {
  if (status === 'confirmed') return 'Đã confirm'
  if (status === 'placed') return 'Đã đặt hàng'
  return 'Đang soạn'
}

export default function OrderDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { orderListId } = (route.params || {}) as RouteParams
  const { colors } = useThemeStore()
  const {
    products,
    orderLists,
    orderItems,
    fetchProducts,
    fetchOrderLists,
    addOrderItem,
    updateOrderItem,
    deleteOrderItem,
    updateOrderList,
    confirmOrderList,
    markOrderPlaced,
  } = useWarehouseStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [qtyInput, setQtyInput] = useState('1')
  const [noteInput, setNoteInput] = useState('')

  useEffect(() => {
    void fetchProducts()
    void fetchOrderLists()
  }, [fetchProducts, fetchOrderLists])

  const orderList = useMemo(
    () => orderLists.find((list) => list.id === orderListId) ?? null,
    [orderLists, orderListId]
  )
  const items = useMemo(
    () => orderItems.filter((item) => item.order_list_id === orderListId),
    [orderItems, orderListId]
  )
  const isLocked = orderList?.status === 'confirmed' || orderList?.status === 'placed'

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [products, searchQuery])

  async function addOrMergeItem(name: string, productId?: string | null, isManual = false) {
    if (!orderList) return
    const qty = Number(qtyInput)
    if (!Number.isFinite(qty) || qty <= 0 || qty !== Math.floor(qty)) {
      Alert.alert('Số thùng không hợp lệ', 'Số thùng phải là số nguyên lớn hơn 0.')
      return
    }
    const normalizedName = name.trim().toLowerCase()
    const existing = items.find((item) => (
      (productId && item.product_id === productId) ||
      item.product_name.trim().toLowerCase() === normalizedName
    ))
    if (existing && orderList.status === 'draft') {
      await updateOrderItem(existing.id, {
        quantity_boxes: existing.quantity_boxes + qty,
        notes: noteInput.trim() || existing.notes || null,
      })
    } else {
      await addOrderItem({
        order_list_id: orderList.id,
        product_id: productId ?? null,
        product_name: name.trim(),
        quantity_boxes: qty,
        notes: noteInput.trim() || null,
        is_manual: isManual,
      })
    }
    setSearchQuery('')
    setQtyInput('1')
    setNoteInput('')
  }

  async function handleAddFromQuery() {
    if (!orderList || isLocked) return
    const text = searchQuery.trim()
    if (!text) return
    const matched = products.find((p) => p.name.toLowerCase() === text.toLowerCase())
    if (matched) {
      await addOrMergeItem(matched.name, matched.id, false)
      return
    }
    Alert.alert('Sản phẩm chưa có trong kho', `Thêm "${text}" vào list với đánh dấu ⭐ tự thêm?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'OK',
        onPress: () => {
          void addOrMergeItem(text, null, true)
        },
      },
    ])
  }

  if (!orderList) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.sub }}>Không tìm thấy list đặt hàng.</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.text }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {orderList.title}
        </Text>
      </View>
      <Text style={[styles.status, { color: colors.sub }]}>Trạng thái: {statusLabel(orderList.status)}</Text>

      <View style={[styles.addBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.sub }]}>Thêm sản phẩm vào list</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Nhập tên sản phẩm..."
          placeholderTextColor={colors.sub}
          editable={!isLocked}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.qtyInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
            value={qtyInput}
            onChangeText={setQtyInput}
            keyboardType="numeric"
            placeholder="Số thùng"
            placeholderTextColor={colors.sub}
            editable={!isLocked}
          />
          <TextInput
            style={[styles.input, styles.noteInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
            value={noteInput}
            onChangeText={setNoteInput}
            placeholder="Ghi chú"
            placeholderTextColor={colors.sub}
            editable={!isLocked}
          />
        </View>
        {suggestions.length > 0 && !isLocked && (
          <View style={[styles.suggestionWrap, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            {suggestions.map((p) => (
              <TouchableOpacity key={p.id} style={[styles.suggestionItem, { borderBottomColor: colors.border }]} onPress={() => void addOrMergeItem(p.name, p.id, false)}>
                <Text style={{ color: colors.text }}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: isLocked ? colors.border : colors.accent }]}
          onPress={() => void handleAddFromQuery()}
          disabled={isLocked}
        >
          <Text style={{ color: colors.card, fontWeight: '700' }}>Thêm sản phẩm</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.itemName, { color: colors.text }]}>
              {item.product_name} {item.is_manual ? '⭐' : ''}
            </Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.qtyInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                value={String(item.quantity_boxes)}
                onChangeText={(v) => {
                  if (isLocked) return
                  const qty = Number(v)
                  if (!Number.isFinite(qty) || qty <= 0 || qty !== Math.floor(qty)) return
                  void updateOrderItem(item.id, { quantity_boxes: qty })
                }}
                keyboardType="numeric"
                editable={!isLocked}
              />
              <TextInput
                style={[styles.input, styles.noteInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                value={item.notes ?? ''}
                onChangeText={(v) => {
                  if (isLocked) return
                  void updateOrderItem(item.id, { notes: v })
                }}
                placeholder="Ghi chú"
                placeholderTextColor={colors.sub}
                editable={!isLocked}
              />
            </View>
            {!isLocked && (
              <TouchableOpacity style={[styles.deleteItemBtn, { borderColor: colors.border, backgroundColor: colors.bg }]} onPress={() => void deleteOrderItem(item.id)}>
                <Text style={{ color: colors.text }}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footerActions}>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => console.log('[Order] export PDF placeholder', orderList.id)}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Xuất PDF</Text>
        </TouchableOpacity>
        {orderList.status === 'draft' && (
          <>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.accent }]} onPress={() => void confirmOrderList(orderList.id)}>
              <Text style={{ color: colors.card, fontWeight: '700' }}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.accent }]} onPress={() => void markOrderPlaced(orderList.id)}>
              <Text style={{ color: colors.card, fontWeight: '700' }}>Đã đặt hàng</Text>
            </TouchableOpacity>
          </>
        )}
        {orderList.status === 'confirmed' && (
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => void updateOrderList(orderList.id, { status: 'draft' })}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Mở lại</Text>
          </TouchableOpacity>
        )}
        {orderList.status === 'placed' && (
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Alert.alert('Mở lại list đã đặt?', 'Chỉ dùng trong trường hợp đặc biệt.', [
                { text: 'Huỷ', style: 'cancel' },
                { text: 'Mở lại', onPress: () => void updateOrderList(orderList.id, { status: 'draft' }) },
              ])
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>Mở lại</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  backBtn: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  status: { paddingHorizontal: 16, marginTop: 8, marginBottom: 8, fontSize: 12 },
  addBox: { marginHorizontal: 16, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  label: { fontSize: 12, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, marginBottom: 8 },
  qtyInput: { width: 90 },
  noteInput: { flex: 1 },
  addBtn: { borderRadius: 9, paddingVertical: 10, alignItems: 'center' },
  suggestionWrap: { borderWidth: 1, borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  suggestionItem: { paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 12 },
  itemCard: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  itemName: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  deleteItemBtn: { alignSelf: 'flex-start', marginTop: 2, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  footerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  footerBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
})
