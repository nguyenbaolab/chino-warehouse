import { useCallback, useMemo, useRef, useState } from 'react'
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
import { deleteNoteImage, pickImage, uploadNoteImage } from '../utils/imageUtils'
import type { InternalNote, Product } from '../types'
import ImageViewerModal from '../components/ImageViewerModal'

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
  const [createImageUri, setCreateImageUri] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [editNote, setEditNote] = useState<InternalNote | null>(null)
  const [editReason, setEditReason] = useState('')
  const [editImageUri, setEditImageUri] = useState<string | null>(null)
  /** Tap-to-zoom ảnh SP */
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)

  // KI-039: TTL 30s — tránh fetchProducts mỗi lần re-focus
  const FOCUS_FETCH_TTL_MS = 30_000
  const lastFetchRef = useRef(0)

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      if (now - lastFetchRef.current < FOCUS_FETCH_TTL_MS) return
      lastFetchRef.current = now

      let cancelled = false
      void (async () => {
        setLoading(true)
        // Luôn refresh products — tránh dropdown rỗng sau archived toggle (Fix 2)
        await fetchProducts()
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
      .slice(0, 20)
  }, [products, productQuery, selectedProduct])

  const canSaveCreate =
    (!!selectedProduct || productQuery.trim().length > 0) &&
    createReason.trim().length > 0 &&
    !saving &&
    !uploadingImage

  function isLocalImageUri(uri: string): boolean {
    return uri.startsWith('file://') || uri.startsWith('content://')
  }

  function handlePickNoteImage(onDone: (uri: string) => void) {
    Alert.alert('Thêm ảnh', 'Chọn nguồn ảnh', [
      {
        text: 'Chụp ảnh',
        onPress: () => {
          void (async () => {
            const uri = await pickImage('camera')
            if (uri) onDone(uri)
          })()
        },
      },
      {
        text: 'Thư viện',
        onPress: () => {
          void (async () => {
            const uri = await pickImage('library')
            if (uri) onDone(uri)
          })()
        },
      },
      { text: 'Huỷ', style: 'cancel' },
    ])
  }

  function renderNoteImagePicker(
    imageUri: string | null,
    onSet: (uri: string | null) => void,
  ) {
    return (
      <>
        <Text style={[styles.label, { color: colors.sub }]}>Ảnh đính kèm</Text>
        {imageUri ? (
          <View style={styles.noteImageWrap}>
            <TouchableOpacity onPress={() => setZoomImageUrl(imageUri)}>
              <Image source={{ uri: imageUri }} style={styles.noteImagePreview} resizeMode="cover" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeImageBtn} onPress={() => onSet(null)}>
              <Text style={{ color: colors.sub, fontSize: 12 }}>✕ Xoá ảnh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addImageBtn, { borderColor: colors.border }]}
            onPress={() => handlePickNoteImage((uri) => onSet(uri))}
          >
            <Text style={{ fontSize: 22 }}>📷</Text>
            <Text style={[styles.addImageText, { color: colors.sub }]}>Thêm ảnh</Text>
          </TouchableOpacity>
        )}
      </>
    )
  }

  function noteDisplayName(note: InternalNote): string {
    if (note.product_id && note.product?.name) return note.product.name
    if (note.custom_product_name?.trim()) return note.custom_product_name.trim()
    return 'Sản phẩm không xác định'
  }

  function resetCreateForm() {
    setProductQuery('')
    setSelectedProduct(null)
    setCreateReason('')
    setCreateImageUri(null)
  }

  function closeCreateModal() {
    setCreateOpen(false)
    resetCreateForm()
  }

  function openEdit(note: InternalNote) {
    setEditNote(note)
    setEditReason(note.reason)
    setEditImageUri(note.image_url ?? null)
  }

  function closeEditModal() {
    setEditNote(null)
    setEditReason('')
    setEditImageUri(null)
  }

  async function handleCreateSave() {
    if (!createReason.trim()) return
    if (!selectedProduct && !productQuery.trim()) return
    setSaving(true)
    setUploadingImage(true)
    try {
      const result = await addInternalNote({
        productId: selectedProduct?.id,
        customName: !selectedProduct ? productQuery.trim() : undefined,
        reason: createReason.trim(),
        imageUrl: null,
      })
      if (result.error || !result.note) {
        Alert.alert('Lỗi', result.error ?? 'Không thể tạo ghi chú.')
        return
      }
      if (createImageUri && result.note.id) {
        try {
          const url = await uploadNoteImage(result.note.id, createImageUri)
          await updateInternalNote(result.note.id, createReason.trim(), url)
        } catch {
          /* Ảnh upload thất bại — note vẫn tạo được */
        }
      }
      closeCreateModal()
    } finally {
      setSaving(false)
      setUploadingImage(false)
    }
  }

  async function handleEditSave() {
    if (!editNote || !editReason.trim()) return
    setSaving(true)
    setUploadingImage(true)
    try {
      let imageUrlParam: string | null | undefined = undefined
      const imageChanged = editImageUri !== (editNote.image_url ?? null)

      if (imageChanged) {
        if (!editImageUri) {
          if (editNote.image_url) {
            try {
              await deleteNoteImage(editNote.id)
            } catch {
              /* bỏ qua */
            }
          }
          imageUrlParam = null
        } else if (isLocalImageUri(editImageUri)) {
          try {
            imageUrlParam = await uploadNoteImage(editNote.id, editImageUri)
          } catch {
            Alert.alert('Lỗi', 'Không thể upload ảnh ghi chú.')
            return
          }
        } else {
          imageUrlParam = editImageUri
        }
      }

      const { error } = await updateInternalNote(editNote.id, editReason, imageUrlParam)
      if (error) {
        Alert.alert('Lỗi', error)
        return
      }
      closeEditModal()
    } finally {
      setSaving(false)
      setUploadingImage(false)
    }
  }

  function confirmDelete(note: InternalNote) {
    const name = noteDisplayName(note)
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

  function openProductDetail(productId: string) {
    navigation.navigate('ProductDetail', { productId })
  }

  async function handlePickCardNoteImage(note: InternalNote) {
    Alert.alert('Thêm ảnh', 'Chọn nguồn ảnh', [
      {
        text: 'Chụp ảnh',
        onPress: () => {
          void (async () => {
            const uri = await pickImage('camera')
            if (!uri) return
            try {
              const url = await uploadNoteImage(note.id, uri)
              await updateInternalNote(note.id, note.reason, url)
            } catch {
              Alert.alert('Lỗi', 'Không thể upload ảnh.')
            }
          })()
        },
      },
      {
        text: 'Thư viện',
        onPress: () => {
          void (async () => {
            const uri = await pickImage('library')
            if (!uri) return
            try {
              const url = await uploadNoteImage(note.id, uri)
              await updateInternalNote(note.id, note.reason, url)
            } catch {
              Alert.alert('Lỗi', 'Không thể upload ảnh.')
            }
          })()
        },
      },
      { text: 'Huỷ', style: 'cancel' },
    ])
  }

  function renderNoteCard({ item }: { item: InternalNote }) {
    const hasLinkedProduct = !!item.product_id
    const imageUrl = item.image_url ?? item.product?.image_url ?? null
    const displayName = noteDisplayName(item)
    const isCustomOnly = !hasLinkedProduct && !!item.custom_product_name?.trim()

    const mainContent = (
      <View style={styles.cardRowMain}>
        <View style={styles.thumbnailContainer}>
          {imageUrl ? (
            <TouchableOpacity activeOpacity={0.85} onPress={() => setZoomImageUrl(imageUrl)}>
              <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
            </TouchableOpacity>
          ) : canWrite ? (
            <TouchableOpacity
              onPress={() => void handlePickCardNoteImage(item)}
              style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 24 }}>📷</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: colors.border }]}>
              <Text style={{ fontSize: 22 }}>{isCustomOnly ? '📝' : '📷'}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {displayName}
          </Text>
          {isCustomOnly ? (
            <Text style={[styles.customHint, { color: colors.sub }]}>
              Sản phẩm chưa có trong hệ thống
            </Text>
          ) : null}
          <Text style={[styles.reason, { color: colors.text }]}>{item.reason}</Text>
          <Text style={[styles.date, { color: colors.sub }]}>{formatNoteDate(item.created_at)}</Text>
        </View>
      </View>
    )

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardRow}>
          {hasLinkedProduct ? (
            <TouchableOpacity
              style={styles.cardPressable}
              activeOpacity={0.7}
              onPress={() => openProductDetail(item.product_id!)}
            >
              {mainContent}
            </TouchableOpacity>
          ) : (
            <View style={styles.cardPressable}>{mainContent}</View>
          )}
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
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setZoomImageUrl(selectedProduct.image_url ?? null)}
                      >
                        <Image
                          source={{ uri: selectedProduct.image_url }}
                          style={styles.selectedThumb}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
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
                        <ScrollView
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled
                          style={{ maxHeight: 220 }}
                        >
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
                        </ScrollView>
                      </View>
                    ) : null}
                    {productQuery.trim().length > 0 && productSuggestions.length === 0 ? (
                      <Text style={[styles.hint, { color: colors.sub }]}>
                        Không khớp SP có sẵn — sẽ lưu tên tự do.
                      </Text>
                    ) : productQuery.trim().length > 0 && !selectedProduct ? (
                      <Text style={[styles.hint, { color: colors.sub }]}>
                        Chọn gợi ý hoặc lưu tên đã gõ.
                      </Text>
                    ) : null}
                  </>
                )}

                {renderNoteImagePicker(createImageUri, setCreateImageUri)}

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
                      {saving || uploadingImage ? 'Đang lưu...' : 'Lưu'}
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
                {editNote ? (
                  <Text style={[styles.editProductName, { color: colors.sub }]} numberOfLines={2}>
                    {noteDisplayName(editNote)}
                  </Text>
                ) : null}
                {renderNoteImagePicker(editImageUri, setEditImageUri)}
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
                        opacity: editReason.trim().length > 0 && !saving && !uploadingImage ? 1 : 0.45,
                      },
                    ]}
                    onPress={() => void handleEditSave()}
                    disabled={editReason.trim().length === 0 || saving || uploadingImage}
                  >
                    <Text style={{ color: colors.card, fontWeight: '600' }}>
                      {saving || uploadingImage ? 'Đang lưu...' : 'Lưu'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
      <ImageViewerModal uri={zoomImageUrl} onClose={() => setZoomImageUrl(null)} />
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
  cardPressable: { flex: 1, minWidth: 0 },
  cardRowMain: { flexDirection: 'row', alignItems: 'flex-start' },
  thumbnailContainer: { width: 64, height: 64 },
  thumbnail: { width: 64, height: 64, borderRadius: 8 },
  thumbnailPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, paddingLeft: 10, minWidth: 0 },
  productName: { fontSize: 15, fontWeight: '700' },
  customHint: { fontSize: 12, marginTop: 2 },
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
  noteImageWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  noteImagePreview: { width: 80, height: 80, borderRadius: 8 },
  removeImageBtn: { padding: 4 },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  addImageText: { fontSize: 11 },
})
