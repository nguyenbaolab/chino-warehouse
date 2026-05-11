import { useCallback, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, Switch } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { supabase } from '../lib/supabase'

export default function SettingsScreen() {
  const navigation = useNavigation<any>()
  const { zones, selectedLocationId, fetchZones, fetchLocations, products, refreshDiscontinuedContext } =
    useWarehouseStore()
  const { isDark, colors, loadTheme, toggleTheme } = useThemeStore()

  const discontinuedCount = useMemo(
    () => products.filter((p) => !p.is_archived && p.is_discontinued === true).length,
    [products]
  )

  useEffect(() => {
    loadTheme()
    void fetchLocations()
  }, [loadTheme, fetchLocations])

  useEffect(() => {
    if (selectedLocationId) fetchZones(selectedLocationId)
  }, [selectedLocationId, fetchZones])

  useFocusEffect(
    useCallback(() => {
      void refreshDiscontinuedContext()
    }, [refreshDiscontinuedContext])
  )

  useEffect(() => {
    const channel = supabase
      .channel(`settings-discontinued-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          void refreshDiscontinuedContext()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_entries' },
        () => {
          void refreshDiscontinuedContext()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refreshDiscontinuedContext])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.topSpacer} />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>⚙️ Cài đặt</Text>
      </View>

      <TouchableOpacity
        style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('DiscontinuedProducts')}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.linkTitle, { color: colors.text }]}>Sản phẩm không nhập nữa</Text>
          <Text style={[styles.linkSub, { color: colors.sub }]}>
            {discontinuedCount} sản phẩm
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
      </TouchableOpacity>

      {/* Theme toggle */}
      <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.settingLabel, { color: colors.text }]}>
            {isDark ? '🌙 Giao diện tối' : '☀️ Giao diện sáng'}
          </Text>
          <Text style={[styles.settingDesc, { color: colors.sub }]}>
            Đổi theme cho app
          </Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#ccc', true: colors.accent }}
          thumbColor="#fff"
        />
      </View>

      {/* Zone info */}
      <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Quản lý zone trực tiếp trên màn hình{' '}
          <Text style={{ color: colors.accent, fontWeight: 'bold' }}>Kho 🗺️</Text>
        </Text>
        <Text style={[styles.infoSub, { color: colors.sub }]}>
          Bấm "+ Zone" để thêm · Bấm vào zone để sửa hoặc xóa
        </Text>
        <Text style={[styles.zoneCount, { color: colors.accent }]}>
          Hiện có {zones.length} zone
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSpacer: { height: Platform.OS === 'android' ? 16 : 0 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 17, fontWeight: 'bold' },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkTitle: { fontSize: 15, fontWeight: '600' },
  linkSub: { fontSize: 13, marginTop: 4 },
  chevron: { fontSize: 22, fontWeight: '300', marginLeft: 8 },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    padding: 16, borderRadius: 12, borderWidth: 1,
  },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  settingDesc: { fontSize: 12, marginTop: 2 },
  infoBox: { marginHorizontal: 16, borderRadius: 12, padding: 16, borderWidth: 1 },
  infoText: { fontSize: 14, marginBottom: 6 },
  infoSub: { fontSize: 13, lineHeight: 20 },
  zoneCount: { fontSize: 13, marginTop: 10, fontWeight: 'bold' },
})