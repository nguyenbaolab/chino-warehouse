import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { useCanWrite } from '../stores/authStore'
import { normalizeText } from '../utils/textUtils'
import type { InternalNote, Product } from '../types'

/** Format created_at ISO → DD/MM/YYYY HH:mm */
function formatNoteDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function InternalNotesScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const canWrite = useCanWrite()
  const {
    internalNotes,
    products,
    fetchInternalNotes,
    fetchProducts,
    addInternalNote,
    updateInternalNote,
    deleteInternalNote,
  } = useWarehouseStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [createReason, setCreateReason] = useState('')

  const [editNote, setEditNote] = useState<InternalNote | null>(null)
  const [editReason, setEditReason] = useState('')

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      void (async () => {
        setLoading(true)
        if (useWarehouseStore.getState().products.length === 0) {
          await fetchProducts()
        }
        await fetchInternalNotes()
        if (!cancelled) setLoading(false)
      })()
      return () => {
        cancelled = true
      }
    }, [fetchInternalNotes, fetchProducts]),
  )

  const productSuggestions = useMemo(() => {
    if (selectedProduct) return []
    const q = normalizeText(productQuery.trim())
    if (!q) return []
    return products
      .filter((p) => !p.is_archived && normalizeText(p.name).includes(q))
      .slice(0, 8)
  }, [products, productQuery, selectedProduct])

  const canSaveCreate =
    !!selectedProduct && createReason.trim().length > 0 && !saving

  function resetCreateForm() {
    setProductQuery('')
    setSelectedProduct(null)
    setCreateReason('')
  }

  function closeCreateModal() {
    setCreateOpen(false)
    resetCreateForm()
  }

  function openEdit(note: InternalNote) {
    setEditNote(note)
    setEditReason(note.reason)
  }

  function closeEditModal() {
    setEditNote(null)
    setEditReason('')
  }

  async function handleCreateSave() {
    if (!selectedProduct || !createReason.trim()) return
    setSaving(true)
    try {
      const { error } = await addInternalNote(selectedProduct.id, createReason)
      if (error) {
        Alert.alert('Lỗi', error)
        return
      }
      closeCreateModal()
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSave() {
    if (!editNote || !editReason.trim()) return
    setSaving(true)
    try {
      const { error } = await updateInternalNote(editNote.id, editReason)
      if (error) {
        Alert.alert('Lỗi', error)
        return
      }
      closeEditModal()
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(note: InternalNote) {
    const name = note.product?.name ?? 'sản phẩm này'
    Alert.alert('Xóa ghi chú?', `Xóa ghi chú cho «${name}»?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const { error } = await deleteInternalNote(note.id)
            if (error) Alert.alert('Lỗi', error)
          })()
        },
      },
    ])
  }

  function renderNoteCard({ item }: { item: InternalNote }) {
    const imageUrl = item.product?.image_url
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardRow}>
          <View style={styles.thumbnailContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: colors.border }]}>
                <Text style={{ fontSize: 22 }}>📷</Text>
              </View>
            )}
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
              {item.product?.name ?? 'Sản phẩm không xác định'}
            </Text>
            <Text style={[styles.reason, { color: colors.text }]}>{item.reason}</Text>
            <Text style={[styles.date, { color: colors.sub }]}>{formatNoteDate(item.created_at)}</Text>
          </View>
          {canWrite ? (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                onPress={() => openEdit(item)}
                hitSlop={8}
              >
                <Text style={{ fontSize: 16 }}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                onPress={() => confirmDelete(item)}
                hitSlop={8}
              >
                <Text style={{ fontSize: 16 }}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Ghi chú</Text>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.sub }}>← Đóng</Text>
        </TouchableOpacity>
      </View>

      {loading && internalNotes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : internalNotes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.sub }}>Chưa có ghi chú nào</Text>
        </View>
      ) : (
        <FlatList
          data={internalNotes}
          keyExtractor={(item) => item.id}
          renderItem={renderNoteCard}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {canWrite ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          activeOpacity={0.85}
          onPress={() => setCreateOpen(true)}
        >
          <Text style={[styles.fabText, { color: colors.card }]}>+</Text>
        </TouchableOpacity>
      ) : null}

      {/* Modal tạo ghi chú */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={closeCreateModal}>
        <Pressable style={styles.modalOverlay} onPress={closeCreateModal}>
          <Pressable
            style={[styles.modalBox, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <Text style={[styles.modalTitle, { color: colors.text }]}>Thêm ghi chú</Text>

                <Text style={[styles.label, { color: colors.sub }]}>Sản phẩm *</Text>
                {selectedProduct ? (
                  <View style={[styles.selectedProductRow, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                    {selectedProduct.image_url ? (
                      <Image
                        source={{ uri: selectedProduct.image_url }}
                        style={styles.selectedThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.selectedThumb,
                          styles.thumbnailPlaceholder,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <Text style={{ fontSize: 16 }}>📷</Text>
                      </View>
                    )}
                    <Text style={[styles.selectedName, { color: colors.text }]} numberOfLines={2}>
                      {selectedProduct.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedProduct(null)
                        setProductQuery('')
                      }}
                      hitSlop={8}
                    >
                      <Text style={{ color: colors.sub, fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border },
                      ]}
                      value={productQuery}
                      onChangeText={setProductQuery}
                      placeholder="Gõ tên sản phẩm..."
                      placeholderTextColor={colors.sub}
                      autoFocus
                    />
                    {productSuggestions.length > 0 ? (
                      <View style={[styles.suggestList, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                        {productSuggestions.map((p) => (
                          <TouchableOpacity
                            key={p.id}
                            style={[styles.suggestRow, { borderBottomColor: colors.border }]}
                            onPress={() => {
                              setSelectedProduct(p)
                              setProductQuery(p.name)
                            }}
                          >
                            <Text style={{ color: colors.text, fontSize: 14 }}>{p.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                    {productQuery.trim().length > 0 && productSuggestions.length === 0 ? (
                      <Text style={[styles.hint, { color: colors.sub }]}>
                        Không tìm thấy sản phẩm. Chỉ chọn SP đã có trong hệ thống.
                      </Text>
                    ) : null}
                  </>
                )}

                <Text style={[styles.label, { color: colors.sub }]}>Lý do / ghi chú *</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputMultiline,
                    { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border },
                  ]}
                  value={createReason}
                  onChangeText={setCreateReason}
                  placeholder="Nhập lý do / ghi chú..."
                  placeholderTextColor={colors.sub}
                  multiline
                  textAlignVertical="top"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.btnGhost, { borderColor: colors.border }]}
                    onPress={closeCreateModal}
                    disabled={saving}
                  >
                    <Text style={{ color: colors.sub }}>Huỷ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: colors.accent, opacity: canSaveCreate ? 1 : 0.45 },
                    ]}
                    onPress={() => void handleCreateSave()}
                    disabled={!canSaveCreate}
                  >
                    <Text style={{ color: colors.card, fontWeight: '600' }}>
                      {saving ? 'Đang lưu...' : 'Lưu'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal sửa lý do */}
      <Modal visible={!!editNote} transparent animationType="slide" onRequestClose={closeEditModal}>
        <Pressable style={styles.modalOverlay} onPress={closeEditModal}>
          <Pressable
            style={[styles.modalBox, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Sửa ghi chú</Text>
                {editNote?.product?.name ? (
                  <Text style={[styles.editProductName, { color: colors.sub }]} numberOfLines={2}>
                    {editNote.product.name}
                  </Text>
                ) : null}
                <Text style={[styles.label, { color: colors.sub }]}>Lý do / ghi chú *</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputMultiline,
                    { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border },
                  ]}
                  value={editReason}
                  onChangeText={setEditReason}
                  placeholder="Nhập lý do / ghi chú..."
                  placeholderTextColor={colors.sub}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.btnGhost, { borderColor: colors.border }]}
                    onPress={closeEditModal}
                    disabled={saving}
                  >
                    <Text style={{ color: colors.sub }}>Huỷ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.btnPrimary,
                      {
                        backgroundColor: colors.accent,
                        opacity: editReason.trim().length > 0 && !saving ? 1 : 0.45,
                      },
                    ]}
                    onPress={() => void handleEditSave()}
                    disabled={editReason.trim().length === 0 || saving}
                  >
                    <Text style={{ color: colors.card, fontWeight: '600' }}>
                      {saving ? 'Đang lưu...' : 'Lưu'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
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
  title: { fontSize: 20, fontWeight: '700' },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  thumbnailContainer: { width: 64, height: 64 },
  thumbnail: { width: 64, height: 64, borderRadius: 8 },
  thumbnailPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, paddingLeft: 10, minWidth: 0 },
  productName: { fontSize: 15, fontWeight: '700' },
  reason: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  date: { fontSize: 12, marginTop: 6 },
  cardActions: { marginLeft: 8, gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { fontSize: 28, fontWeight: '300', marginTop: -2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  editProductName: { fontSize: 14, marginBottom: 8 },
  label: { fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 96 },
  suggestList: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 6,
    maxHeight: 180,
    overflow: 'hidden',
  },
  suggestRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectedProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    gap: 10,
  },
  selectedThumb: { width: 40, height: 40, borderRadius: 6 },
  selectedName: { flex: 1, fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, marginTop: 6 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  btnGhost: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnPrimary: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
})
