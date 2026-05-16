import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
import { OrderItem, OrderListStatus } from '../types'

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
    deleteOrderList,
    confirmOrderList,
    markOrderPlaced,
  } = useWarehouseStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [qtyInput, setQtyInput] = useState('1')
  const [noteInput, setNoteInput] = useState('')

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemEditQty, setItemEditQty] = useState('')
  const [itemEditNotes, setItemEditNotes] = useState('')
  const itemSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listScrollRef = useRef<ScrollView>(null)

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
  const isDraft = orderList?.status === 'draft'

  useEffect(() => {
    if (orderList && !editingTitle) {
      setTitleDraft(orderList.title)
    }
  }, [orderList?.title, orderList, editingTitle])

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [products, searchQuery])

  function cancelItemSaveTimer() {
    if (itemSaveTimer.current) {
      clearTimeout(itemSaveTimer.current)
      itemSaveTimer.current = null
    }
  }

  useEffect(() => () => cancelItemSaveTimer(), [])

  async function persistItemEdit(itemId: string): Promise<boolean> {
    if (editingItemId !== itemId) return true
    const qty = Number(itemEditQty)
    if (!Number.isFinite(qty) || qty <= 0 || qty !== Math.floor(qty)) {
      Alert.alert('Số thùng không hợp lệ', 'Số thùng phải là số nguyên lớn hơn 0.')
      return false
    }
    await updateOrderItem(itemId, { quantity_boxes: qty, notes: itemEditNotes.trim() || null })
    setEditingItemId(null)
    return true
  }

  function schedulePersistItem(itemId: string) {
    cancelItemSaveTimer()
    itemSaveTimer.current = setTimeout(() => {
      itemSaveTimer.current = null
      void persistItemEdit(itemId)
    }, 200)
  }

  async function flushItemEditIfAny(): Promise<boolean> {
    if (!editingItemId) return true
    cancelItemSaveTimer()
    return persistItemEdit(editingItemId)
  }

  async function handleItemBodyPress(item: OrderItem) {
    if (isLocked) return
    if (editingItemId === item.id) {
      Keyboard.dismiss()
      cancelItemSaveTimer()
      await persistItemEdit(item.id)
      return
    }
    if (editingItemId && editingItemId !== item.id) {
      const ok = await flushItemEditIfAny()
      if (!ok) return
    }
    setEditingItemId(item.id)
    setItemEditQty(String(item.quantity_boxes))
    setItemEditNotes(item.notes ?? '')
  }

  async function commitTitle() {
    if (!orderList || orderList.status !== 'draft') {
      setEditingTitle(false)
      return
    }
    const next = titleDraft.trim() || orderList.title
    if (next !== orderList.title) {
      await updateOrderList(orderList.id, { title: next })
    }
    setEditingTitle(false)
  }

  function requestDeleteList() {
    if (!orderList || orderList.status !== 'draft') return
    Alert.alert(
      'Bạn có chắc muốn xóa danh sách này không?',
      'Hành động này không thể hoàn tác.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await deleteOrderList(orderList.id)
              navigation.navigate('OrderListMain')
            })()
          },
        },
      ]
    )
  }

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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.text }}>←</Text>
        </TouchableOpacity>
        {isDraft && editingTitle ? (
          <TextInput
            style={[styles.titleInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            value={titleDraft}
            onChangeText={setTitleDraft}
            onBlur={() => void commitTitle()}
            onSubmitEditing={() => void commitTitle()}
            returnKeyType="done"
            blurOnSubmit
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity
            style={styles.titleTouchable}
            onPress={() => {
              if (!isDraft) return
              setTitleDraft(orderList.title)
              setEditingTitle(true)
            }}
            disabled={!isDraft}
            activeOpacity={isDraft ? 0.7 : 1}
          >
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {orderList.title}
            </Text>
          </TouchableOpacity>
        )}
        {isDraft && (
          <TouchableOpacity style={[styles.deleteListBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={requestDeleteList}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Xóa list</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.status, { color: colors.sub }]}>Trạng thái: {statusLabel(orderList.status)}</Text>

      <View style={[styles.addBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.sub }]}>Thêm sản phẩm vào list</Text>
        <TextInput
          style={[styles.input, styles.searchField, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Nhập tên sản phẩm..."
          placeholderTextColor={colors.sub}
          editable={!isLocked}
        />
        <View style={styles.qtyNoteRow}>
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
            onFocus={() => {
              setTimeout(() => listScrollRef.current?.scrollTo({ y: 0, animated: true }), 100)
            }}
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

      <ScrollView
        ref={listScrollRef}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item) => {
          const editing = editingItemId === item.id
          return (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity activeOpacity={0.75} onPress={() => void handleItemBodyPress(item)} disabled={isLocked}>
                <View style={styles.itemLine1}>
                  {item.is_manual ? <Text style={styles.star}>⭐ </Text> : null}
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                    {item.product_name}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.itemLine2Row}>
                <TouchableOpacity
                  style={styles.itemLine2Main}
                  activeOpacity={0.75}
                  onPress={() => void handleItemBodyPress(item)}
                  disabled={isLocked}
                >
                  {editing ? (
                    <View style={styles.itemLine2Inner}>
                      <TextInput
                        style={[styles.input, styles.inlineQty, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                        value={itemEditQty}
                        onChangeText={setItemEditQty}
                        keyboardType="numeric"
                        editable={!isLocked}
                        onFocus={cancelItemSaveTimer}
                        onBlur={() => schedulePersistItem(item.id)}
                        returnKeyType="next"
                      />
                      <Text style={[styles.sep, { color: colors.sub }]}> | </Text>
                      <TextInput
                        style={[styles.input, styles.inlineNote, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                        value={itemEditNotes}
                        onChangeText={setItemEditNotes}
                        placeholder="Ghi chú"
                        placeholderTextColor={colors.sub}
                        editable={!isLocked}
                        onFocus={cancelItemSaveTimer}
                        onBlur={() => schedulePersistItem(item.id)}
                        returnKeyType="done"
                        blurOnSubmit
                        onSubmitEditing={() => {
                          void persistItemEdit(item.id)
                        }}
                      />
                    </View>
                  ) : (
                    <View style={styles.itemLine2Inner}>
                      <Text style={[styles.itemLine2Text, { color: colors.text }]}>{item.quantity_boxes}</Text>
                      <Text style={[styles.sep, { color: colors.sub }]}> | </Text>
                      <Text style={[styles.itemLine2Text, styles.itemNotesText, { color: colors.sub }]} numberOfLines={1}>
                        {item.notes?.trim() ? item.notes : '—'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                {!isLocked && (
                  <TouchableOpacity
                    style={[styles.deleteItemBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                    onPress={() => void deleteOrderItem(item.id)}
                  >
                    <Text style={{ color: colors.text, fontSize: 12 }}>Xóa</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        })}
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
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  backBtn: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  titleTouchable: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, fontWeight: '700' },
  titleInput: { flex: 1, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, fontWeight: '700' },
  deleteListBtn: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  status: { paddingHorizontal: 16, marginTop: 8, marginBottom: 8, fontSize: 12 },
  addBox: { marginHorizontal: 16, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  label: { fontSize: 12, marginBottom: 6 },
  searchField: { marginBottom: 8 },
  qtyNoteRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, marginBottom: 0 },
  qtyInput: { width: 90 },
  noteInput: { flex: 1 },
  addBtn: { borderRadius: 9, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  suggestionWrap: { borderWidth: 1, borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  suggestionItem: { paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 12 },
  itemCard: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  itemLine1: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  star: { fontSize: 14, lineHeight: 20 },
  itemName: { flex: 1, fontSize: 14, fontWeight: '700' },
  itemLine2Row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemLine2Main: { flex: 1, minWidth: 0 },
  itemLine2Inner: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
  itemLine2Text: { fontSize: 13 },
  itemNotesText: { flex: 1, minWidth: 0 },
  sep: { fontSize: 13 },
  inlineQty: { width: 72, paddingVertical: 6, marginBottom: 0 },
  inlineNote: { flex: 1, minWidth: 0, paddingVertical: 6, marginBottom: 0 },
  deleteItemBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  footerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  footerBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
})
