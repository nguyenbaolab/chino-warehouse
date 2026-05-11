import { useCallback, useEffect, useState } from 'react'
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
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'

export default function LocationManagementScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { colors } = useThemeStore()
  const { locations, fetchLocations, addLocation } = useWarehouseStore()

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRows, setNewRows] = useState('6')
  const [newCols, setNewCols] = useState('6')
  const [saving, setSaving] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void fetchLocations()
    }, [fetchLocations])
  )

  useEffect(() => {
    if (route.params?.openCreateModal === true) {
      setNewName('')
      setNewRows('6')
      setNewCols('6')
      setCreateOpen(true)
      navigation.setParams({ openCreateModal: undefined })
    }
  }, [route.params?.openCreateModal, navigation])

  async function handleCreateSave() {
    const rows = Number(newRows)
    const cols = Number(newCols)
    setSaving(true)
    try {
      const { error } = await addLocation(newName, rows, cols)
      if (error) {
        Alert.alert('Không tạo được', error)
        return
      }
      setCreateOpen(false)
      setNewName('')
      setNewRows('6')
      setNewCols('6')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.sub }}>Đóng</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Quản lý kho</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {locations.map((loc) => (
          <View
            key={loc.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.cardName, { color: colors.text }]}>{loc.name}</Text>
            <Text style={[styles.cardSub, { color: colors.sub }]}>
              Lưới: {(loc.grid_rows ?? 6)} × {(loc.grid_cols ?? 6)}
            </Text>
          </View>
        ))}
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          onPress={() => {
            setNewName('')
            setNewRows('6')
            setNewCols('6')
            setCreateOpen(true)
          }}
        >
          <Text style={[styles.addBtnText, { color: colors.card }]}>+ Thêm kho mới</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCreateOpen(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Thêm kho mới</Text>
            <Text style={[styles.label, { color: colors.sub }]}>Tên kho</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="VD: Kho chính"
              placeholderTextColor={colors.sub}
            />
            <Text style={[styles.label, { color: colors.sub }]}>Số hàng lưới</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={newRows}
              onChangeText={setNewRows}
              keyboardType="number-pad"
            />
            <Text style={[styles.label, { color: colors.sub }]}>Số cột lưới</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={newCols}
              onChangeText={setNewCols}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btnGhost, { borderColor: colors.border }]} onPress={() => setCreateOpen(false)}>
                <Text style={{ color: colors.text }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
                disabled={saving}
                onPress={() => void handleCreateSave()}
              >
                <Text style={{ color: colors.card, fontWeight: '700' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
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
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  title: { fontSize: 17, fontWeight: 'bold' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 13, marginTop: 6 },
  addBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  addBtnText: { fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 28 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  label: { fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnGhost: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
})
