import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Alert, Modal
} from 'react-native'
import { useWarehouseStore } from '../stores/warehouseStore'

export default function SettingsScreen() {
  const { zones, selectedLocationId, fetchZones, addZone, updateZone, deleteZone } = useWarehouseStore()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingZone, setEditingZone] = useState<any>(null)
  const [form, setForm] = useState({ name: '', row_index: '0', col_index: '0', tier_count: '1' })

  useEffect(() => {
    if (selectedLocationId) fetchZones(selectedLocationId)
  }, [selectedLocationId])

  function openAdd() {
    setEditingZone(null)
    setForm({ name: '', row_index: '0', col_index: '0', tier_count: '1' })
    setModalVisible(true)
  }

  function openEdit(zone: any) {
    setEditingZone(zone)
    setForm({
      name: zone.name,
      row_index: String(zone.row_index),
      col_index: String(zone.col_index),
      tier_count: String(zone.tier_count),
    })
    setModalVisible(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Tên zone không được để trống')
      return
    }
    const data = {
      name: form.name.trim(),
      row_index: parseInt(form.row_index) || 0,
      col_index: parseInt(form.col_index) || 0,
      tier_count: parseInt(form.tier_count) || 1,
      has_tiers: parseInt(form.tier_count) > 1,
      location_id: selectedLocationId ?? undefined,
    }
    if (editingZone) {
      await updateZone(editingZone.id, data)
    } else {
      await addZone(data)
    }
    setModalVisible(false)
  }

  async function handleDelete(zone: any) {
    Alert.alert(
      'Xóa zone',
      `Xóa zone "${zone.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa', style: 'destructive',
          onPress: async () => {
            const ok = await deleteZone(zone.id)
            if (!ok) Alert.alert('Không thể xóa', 'Zone này vẫn còn hàng. Hãy xóa hàng trước.')
          }
        }
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Quản lý Zone</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Thêm zone</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {zones.length === 0 && (
          <Text style={styles.empty}>Chưa có zone nào. Bấm "+ Thêm zone" để bắt đầu.</Text>
        )}
        {zones.map(zone => (
          <View key={zone.id} style={styles.zoneCard}>
            <View style={styles.zoneInfo}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Text style={styles.zoneMeta}>
                Hàng {zone.row_index}, Cột {zone.col_index} · {zone.tier_count} tầng
              </Text>
            </View>
            <View style={styles.zoneActions}>
              <TouchableOpacity onPress={() => openEdit(zone)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(zone)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal thêm/sửa zone */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingZone ? 'Sửa zone' : 'Thêm zone mới'}</Text>

            <Text style={styles.label}>Tên zone *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={t => setForm({ ...form, name: t })}
              placeholder="VD: A1, Khu lạnh..."
              placeholderTextColor="#555"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Hàng (row)</Text>
                <TextInput
                  style={styles.input}
                  value={form.row_index}
                  onChangeText={t => setForm({ ...form, row_index: t })}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Cột (col)</Text>
                <TextInput
                  style={styles.input}
                  value={form.col_index}
                  onChangeText={t => setForm({ ...form, col_index: t })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>Số tầng kệ</Text>
            <TextInput
              style={styles.input}
              value={form.tier_count}
              onChangeText={t => setForm({ ...form, tier_count: t })}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#22C55E', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  list: { flex: 1, paddingHorizontal: 16 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40 },
  zoneCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10
  },
  zoneInfo: { flex: 1 },
  zoneName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  zoneMeta: { color: '#666', fontSize: 12, marginTop: 3 },
  zoneActions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#1e3a5f', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  editBtnText: { color: '#60a5fa' },
  deleteBtn: { backgroundColor: '#3a1e1e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  deleteBtnText: { color: '#ef4444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 16 },
  label: { color: '#888', fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#222', color: '#fff', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 14
  },
  row: { flexDirection: 'row' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#222', padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#888' },
  saveBtn: { flex: 1, backgroundColor: '#22C55E', padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
})