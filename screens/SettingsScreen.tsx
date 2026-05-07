import { useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native'
import { useWarehouseStore } from '../stores/warehouseStore'

export default function SettingsScreen() {
  const { zones, selectedLocationId, fetchZones } = useWarehouseStore()

  useEffect(() => {
    if (selectedLocationId) fetchZones(selectedLocationId)
  }, [selectedLocationId])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topSpacer} />
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Cài đặt</Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Quản lý zone trực tiếp trên màn hình <Text style={styles.highlight}>Kho 🗺️</Text>
        </Text>
        <Text style={styles.infoSub}>
          Bấm "+ Zone" để thêm · Bấm vào zone để sửa hoặc xóa
        </Text>
        <Text style={styles.zonCount}>
          Hiện có {zones.length} zone
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  topSpacer: { height: Platform.OS === 'android' ? 16 : 0 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  infoBox: {
    margin: 16, backgroundColor: '#1a1a1a',
    borderRadius: 12, padding: 20
  },
  infoText: { color: '#fff', fontSize: 15, marginBottom: 8 },
  highlight: { color: '#22C55E', fontWeight: 'bold' },
  infoSub: { color: '#666', fontSize: 13, lineHeight: 20 },
  zonCount: { color: '#22C55E', fontSize: 13, marginTop: 12, fontWeight: 'bold' },
})