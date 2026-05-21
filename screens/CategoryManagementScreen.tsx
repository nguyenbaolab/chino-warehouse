import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
import { useNavigation } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'

type NameModalState =
  | { open: false }
  | { open: true; mode: 'add-l1' }
  | { open: true; mode: 'add-l2'; level1Id: string }
  | { open: true; mode: 'edit-l1'; id: string; initialName: string }
  | { open: true; mode: 'edit-l2'; id: string; initialName: string }

export default function CategoryManagementScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const {
    productCategoriesL1,
    productCategoriesL2,
    fetchCategories,
    addCategoryL1,
    updateCategoryL1,
    deleteCategoryL1,
    addCategoryL2,
    updateCategoryL2,
    deleteCategoryL2,
  } = useWarehouseStore()

  const [loading, setLoading] = useState(true)
  const [expandedL1, setExpandedL1] = useState<Set<string>>(new Set())
  const [nameModal, setNameModal] = useState<NameModalState>({ open: false })
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { error } = await fetchCategories()
      if (error) {
        Alert.alert('Lỗi', error)
      }
    } finally {
      setLoading(false)
    }
  }, [fetchCategories])

  useEffect(() => {
    void load()
  }, [load])

  const sortedL1 = useMemo(
    () => [...productCategoriesL1].sort((a, b) => a.name.localeCompare(b.name)),
    [productCategoriesL1]
  )

  function l2For(l1Id: string) {
    return productCategoriesL2
      .filter((c) => c.level1_id === l1Id)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  function toggleExpand(id: string) {
    setExpandedL1((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openAddL1() {
    setNameInput('')
    setNameModal({ open: true, mode: 'add-l1' })
  }

  function openAddL2(level1Id: string) {
    setNameInput('')
    setNameModal({ open: true, mode: 'add-l2', level1Id })
  }

  function openEditL1(id: string, name: string) {
    setNameInput(name)
    setNameModal({ open: true, mode: 'edit-l1', id, initialName: name })
  }

  function openEditL2(id: string, name: string) {
    setNameInput(name)
    setNameModal({ open: true, mode: 'edit-l2', id, initialName: name })
  }

  function closeNameModal() {
    setNameModal({ open: false })
    setNameInput('')
  }

  async function saveNameModal() {
    if (!nameModal.open) return
    const trimmed = nameInput.trim()
    if (!trimmed) {
      Alert.alert('Thiếu thông tin', 'Tên không được để trống.')
      return
    }
    setSaving(true)
    try {
      if (nameModal.mode === 'add-l1') {
        const { error } = await addCategoryL1(trimmed)
        if (error) Alert.alert('Không tạo được', error)
        else closeNameModal()
        return
      }
      if (nameModal.mode === 'add-l2') {
        const { error } = await addCategoryL2(nameModal.level1Id, trimmed)
        if (error) Alert.alert('Không tạo được', error)
        else closeNameModal()
        return
      }
      if (nameModal.mode === 'edit-l1') {
        const { error } = await updateCategoryL1(nameModal.id, { name: trimmed })
        if (error) Alert.alert('Không cập nhật được', error)
        else closeNameModal()
        return
      }
      if (nameModal.mode === 'edit-l2') {
        const { error } = await updateCategoryL2(nameModal.id, { name: trimmed })
        if (error) Alert.alert('Không cập nhật được', error)
        else closeNameModal()
      }
    } finally {
      setSaving(false)
    }
  }

  function confirmDeleteL1(id: string, name: string) {
    Alert.alert('Xóa nhóm', `Xóa nhóm "${name}"? Không thể hoàn tác.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteCategoryL1(id)
          if (error) {
            Alert.alert('Không xóa được', error)
          } else {
            setExpandedL1((prev) => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          }
        },
      },
    ])
  }

  function confirmDeleteL2(id: string, name: string) {
    Alert.alert('Xóa loại', `Xóa loại "${name}"? Không thể hoàn tác.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteCategoryL2(id)
          if (error) {
            Alert.alert('Không xóa được', error)
          }
        },
      },
    ])
  }

  const modalTitle =
    nameModal.open && nameModal.mode === 'add-l1'
      ? 'Thêm nhóm (cấp 1)'
      : nameModal.open && nameModal.mode === 'add-l2'
        ? 'Thêm loại (cấp 2)'
        : nameModal.open && nameModal.mode === 'edit-l1'
          ? 'Sửa nhóm'
          : nameModal.open && nameModal.mode === 'edit-l2'
            ? 'Sửa loại'
            : ''

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Phân loại sản phẩm</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.sub }}>Đóng</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {sortedL1.map((l1) => {
            const open = expandedL1.has(l1.id)
            const l2list = l2For(l1.id)
            return (
              <View key={l1.id} style={[styles.l1Block, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable style={styles.l1Row} onPress={() => toggleExpand(l1.id)}>
                  <Text style={[styles.chevron, { color: colors.sub }]}>{open ? '▼' : '▶'}</Text>
                  <Text style={[styles.l1Name, { color: colors.text }]} numberOfLines={2}>
                    {l1.name}
                  </Text>
                  <TouchableOpacity
                    style={[styles.iconBtn, { borderColor: colors.border }]}
                    onPress={() => openEditL1(l1.id, l1.name)}
                    hitSlop={8}
                  >
                    <Text style={{ color: colors.accent, fontSize: 14 }}>Sửa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, { borderColor: colors.border }]}
                    onPress={() => confirmDeleteL1(l1.id, l1.name)}
                    hitSlop={8}
                  >
                    <Text style={{ color: colors.statusExpired, fontSize: 14 }}>Xóa</Text>
                  </TouchableOpacity>
                </Pressable>
                {open ? (
                  <View style={[styles.l2Wrap, { borderTopColor: colors.border }]}>
                    {l2list.map((l2) => (
                      <View key={l2.id} style={styles.l2Row}>
                        <Text style={[styles.l2Name, { color: colors.text }]} numberOfLines={2}>
                          {l2.name}
                        </Text>
                        <TouchableOpacity onPress={() => openEditL2(l2.id, l2.name)} hitSlop={8}>
                          <Text style={{ color: colors.accent, fontSize: 13 }}>Sửa</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDeleteL2(l2.id, l2.name)} hitSlop={8}>
                          <Text style={{ color: colors.statusExpired, fontSize: 13 }}>Xóa</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={[styles.addL2Btn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      onPress={() => openAddL2(l1.id)}
                    >
                      <Text style={{ color: colors.accent, fontWeight: '600' }}>+ Thêm loại</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            )
          })}

          <TouchableOpacity
            style={[styles.addL1Btn, { backgroundColor: colors.accent }]}
            onPress={openAddL1}
            activeOpacity={0.85}
          >
            <Text style={[styles.addL1BtnText, { color: colors.card }]}>+ Thêm nhóm</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={nameModal.open} transparent animationType="fade" onRequestClose={closeNameModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeNameModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKav}
          >
          <Pressable style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{modalTitle}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Tên…"
              placeholderTextColor={colors.sub}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={closeNameModal} disabled={saving}>
                <Text style={{ color: colors.sub }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                onPress={() => void saveNameModal()}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={colors.card} /> : <Text style={{ color: colors.card, fontWeight: '700' }}>Lưu</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modalKav: { width: '100%', justifyContent: 'center', paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 17, fontWeight: 'bold', flex: 1 },
  backBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  l1Block: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  l1Row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
  chevron: { width: 28, fontSize: 12 },
  l1Name: { flex: 1, fontSize: 15, fontWeight: '600' },
  iconBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, marginLeft: 6 },
  l2Wrap: { borderTopWidth: 1, paddingHorizontal: 12, paddingBottom: 10, paddingTop: 4 },
  l2Row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 28, gap: 12 },
  l2Name: { flex: 1, fontSize: 14 },
  addL2Btn: {
    marginTop: 8,
    marginLeft: 28,
    marginRight: 0,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  addL1Btn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  addL1BtnText: { fontSize: 15, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 14, padding: 18, borderWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, minWidth: 88, alignItems: 'center' },
})
