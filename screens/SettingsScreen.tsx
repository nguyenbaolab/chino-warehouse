import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, Switch, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { useWarningStore } from '../stores/warningStore'
import { supabase } from '../lib/supabase'
import { useIsAdmin } from '../stores/authStore'
import {
  clearBiometricCredentials,
  getBiometricCredentials,
  isBiometricAvailable,
  isBiometricEnabled,
  saveBiometricCredentials,
} from '../lib/biometricAuth'

export default function SettingsScreen() {
  const navigation = useNavigation<any>()
  const {
    zones,
    selectedLocationId,
    fetchZones,
    fetchLocations,
    fetchCategories,
    locations,
    products,
    productCategoriesL1,
    productCategoriesL2,
    internalNotes,
    refreshDiscontinuedContext,
    fetchDiscontinuedProducts,
    fetchLatestAuditEntry,
    fetchInternalNotes,
  } = useWarehouseStore()
  const { isDark, colors, loadTheme, toggleTheme } = useThemeStore()
  const isAdmin = useIsAdmin()
  const {
    expiryWarningEnabled,
    lowStockWarningEnabled,
    toggleExpiryWarning,
    toggleLowStockWarning,
  } = useWarningStore()

  const [auditSubtitle, setAuditSubtitle] = useState('Chưa có thay đổi nào')
  const [stockCheckSubtitle, setStockCheckSubtitle] = useState('Chưa có hàng đặc biệt')
  const [notifSubtitle, setNotifSubtitle] = useState('Đang tải…')
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const lastFetchedAt = useRef(0)
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const FOCUS_FETCH_TTL_MS = 30_000
  const REALTIME_DEBOUNCE_MS = 2_000

  const discontinuedCount = useMemo(
    () => products.filter((p) => !p.is_archived && p.is_discontinued === true).length,
    [products]
  )

  const categorySummary = useMemo(
    () => `${productCategoriesL1.length} nhóm · ${productCategoriesL2.length} loại`,
    [productCategoriesL1.length, productCategoriesL2.length]
  )

  const dashboardSubtitle = useMemo(() => {
    const skuCount = products.filter((p) => !p.is_archived).length
    return `${skuCount} SKU · ${locations.length} kho`
  }, [products, locations.length])

  /** C4 — subtitle Kiểm hàng: X/Y đã kiểm (market + is_special) */
  const refreshStockCheckSubtitle = useCallback(async () => {
    const { data: locs } = await supabase.from('locations').select('id').eq('type', 'market')
    const locIds = (locs ?? []).map((l) => l.id as string)
    if (locIds.length === 0) {
      setStockCheckSubtitle('Chưa có hàng đặc biệt')
      return
    }
    const { data: zones } = await supabase.from('zones').select('id').in('location_id', locIds)
    const zoneIds = (zones ?? []).map((z) => z.id as string)
    if (zoneIds.length === 0) {
      setStockCheckSubtitle('Chưa có hàng đặc biệt')
      return
    }
    const { data: entries } = await supabase
      .from('inventory_entries')
      .select('is_checked')
      .eq('is_special', true)
      .in('zone_id', zoneIds)
    const total = entries?.length ?? 0
    if (total === 0) {
      setStockCheckSubtitle('Chưa có hàng đặc biệt')
      return
    }
    const checked = (entries ?? []).filter((e) => e.is_checked === true).length
    setStockCheckSubtitle(`${checked}/${total} đã kiểm`)
  }, [])

  /** F35 — subtitle Thông báo hết hạn từ app_settings */
  const refreshNotifSubtitle = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('notification_enabled, notification_time')
      .limit(1)
      .maybeSingle()
    if (error || !data) {
      if (__DEV__ && error) console.error('[Settings] fetch app_settings:', error)
      setNotifSubtitle('Chưa cấu hình')
      return
    }
    if (data.notification_enabled) {
      setNotifSubtitle(`Bật · ${data.notification_time as string} hàng ngày`)
    } else {
      setNotifSubtitle('Đã tắt')
    }
  }, [])

  /** F37 — trạng thái biometric */
  const refreshBiometric = useCallback(async () => {
    const available = await isBiometricAvailable()
    setBiometricAvailable(available)
    const enabled = available ? await isBiometricEnabled() : false
    setBiometricEnabled(enabled)
  }, [])

  useEffect(() => {
    loadTheme()
    void fetchLocations()
  }, [loadTheme, fetchLocations])

  useEffect(() => {
    if (selectedLocationId) fetchZones(selectedLocationId)
  }, [selectedLocationId, fetchZones])

  useFocusEffect(
    useCallback(() => {
      // Subtitle Kiểm hàng + thông báo + biometric luôn refresh khi vào Settings
      void refreshStockCheckSubtitle()
      void refreshNotifSubtitle()
      void refreshBiometric()

      if (Date.now() - lastFetchedAt.current <= FOCUS_FETCH_TTL_MS) return

      void (async () => {
        await refreshDiscontinuedContext()
        await fetchInternalNotes()
        if (productCategoriesL1.length === 0 && productCategoriesL2.length === 0) {
          await fetchCategories()
        }
        const entry = await fetchLatestAuditEntry()
        if (!entry) {
          setAuditSubtitle('Chưa có thay đổi nào')
        } else {
          const actionMap: Record<string, string> = { INSERT: 'thêm', UPDATE: 'sửa', DELETE: 'xóa' }
          const tableMap: Record<string, string> = { inventory_entries: 'Lô hàng', products: 'Sản phẩm' }
          const who = entry.changed_by_name ?? 'Không rõ'
          const act = actionMap[entry.action] ?? entry.action
          const tbl = tableMap[entry.table_name] ?? entry.table_name
          const diff = Date.now() - new Date(entry.changed_at).getTime()
          const mins = Math.floor(diff / 60000)
          const hours = Math.floor(diff / 3600000)
          let timeStr: string
          if (mins < 1) timeStr = 'vừa xong'
          else if (mins < 60) timeStr = `${mins} phút trước`
          else if (hours < 24) timeStr = `${hours} giờ trước`
          else {
            const d = new Date(entry.changed_at)
            const pad = (n: number) => String(n).padStart(2, '0')
            timeStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
          }
          setAuditSubtitle(`${who} ${act} ${tbl} · ${timeStr}`)
        }
        lastFetchedAt.current = Date.now()
      })()
    }, [
      refreshDiscontinuedContext,
      fetchInternalNotes,
      refreshStockCheckSubtitle,
      refreshNotifSubtitle,
      refreshBiometric,
      fetchCategories,
      fetchLatestAuditEntry,
      productCategoriesL1.length,
      productCategoriesL2.length,
    ])
  )

  useEffect(() => {
    // Realtime: chỉ products discontinued — không refetch inventory (tránh đụng form đang nhập)
    const scheduleRefreshDiscontinued = () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
      realtimeDebounceRef.current = setTimeout(() => {
        realtimeDebounceRef.current = null
        void fetchDiscontinuedProducts()
      }, REALTIME_DEBOUNCE_MS)
    }

    const channel = supabase
      .channel(`settings-discontinued-${Date.now()}`, {
        config: { private: true }, // SEC-08: yêu cầu authenticated token
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        scheduleRefreshDiscontinued
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_entries' },
        scheduleRefreshDiscontinued
      )
      .subscribe()

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
      realtimeDebounceRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [fetchDiscontinuedProducts])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.topSpacer} />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>⚙️ Cài đặt</Text>
      </View>

      <View style={styles.rowTwoCards}>
        <TouchableOpacity
          style={[styles.linkCard, styles.linkCardHalf, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('LocationManagement')}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkTitle, { color: colors.text }]} numberOfLines={2}>
              Quản lý kho
            </Text>
            <Text style={[styles.linkSub, { color: colors.sub }]}>{locations.length} kho</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.linkCard, styles.linkCardHalf, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('CategoryManagement')}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkTitle, { color: colors.text }]} numberOfLines={2}>
              Phân loại sản phẩm
            </Text>
            <Text style={[styles.linkSub, { color: colors.sub }]} numberOfLines={2}>
              {categorySummary}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('Dashboard')}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.linkTitle, { color: colors.text }]}>Tổng quan kho</Text>
          <Text style={[styles.linkSub, { color: colors.sub }]}>{dashboardSubtitle}</Text>
        </View>
        <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
      </TouchableOpacity>

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

      {/* F31 — Ghi chú nội bộ */}
      <TouchableOpacity
        style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('InternalNotes')}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.linkTitle, { color: colors.text }]}>📝 Ghi chú</Text>
          <Text style={[styles.linkSub, { color: colors.sub }]}>
            {internalNotes.length} ghi chú
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
      </TouchableOpacity>

      {/* C4 — Checklist kiểm hàng (market is_special) */}
      <TouchableOpacity
        style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('StockCheck')}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.linkTitle, { color: colors.text }]}>📋 Kiểm hàng</Text>
          <Text style={[styles.linkSub, { color: colors.sub }]}>{stockCheckSubtitle}</Text>
        </View>
        <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('Discount')}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.linkTitle, { color: colors.text }]}>🏷️ Hàng giảm giá</Text>
          <Text style={[styles.linkSub, { color: colors.sub }]}>Lô đã đánh dấu giảm giá</Text>
        </View>
        <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
      </TouchableOpacity>

      {/* F35 — Thông báo hết hạn (local push) */}
      <TouchableOpacity
        style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('ExpiryAlert')}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.linkTitle, { color: colors.text }]}>⏰ Thông báo hết hạn</Text>
          <Text style={[styles.linkSub, { color: colors.sub }]}>
            {notifSubtitle}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('AuditLog')}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.linkTitle, { color: colors.text }]}>Lịch sử thay đổi</Text>
          <Text style={[styles.linkSub, { color: colors.sub }]} numberOfLines={1}>
            {auditSubtitle}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
      </TouchableOpacity>

      {isAdmin ? (
        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('UserManagement')}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkTitle, { color: colors.text }]}>Quản lý người dùng</Text>
            <Text style={[styles.linkSub, { color: colors.sub }]}>Phân quyền và vô hiệu hóa</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.sub }]}>Cảnh báo</Text>

      <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingRowLabel}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Cảnh báo hết hạn</Text>
          <Text style={[styles.settingDesc, { color: colors.sub }]}>
            Hiện màu cảnh báo cho sản phẩm sắp/đã hết hạn
          </Text>
        </View>
        <Switch
          value={expiryWarningEnabled}
          onValueChange={toggleExpiryWarning}
          trackColor={{ false: '#ccc', true: colors.accent }}
          thumbColor="#fff"
        />
      </View>

      <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingRowLabel}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Cảnh báo hết hàng</Text>
          <Text style={[styles.settingDesc, { color: colors.sub }]}>
            Hiện màu cảnh báo cho sản phẩm sắp/đã hết hàng
          </Text>
        </View>
        <Switch
          value={lowStockWarningEnabled}
          onValueChange={toggleLowStockWarning}
          trackColor={{ false: '#ccc', true: colors.accent }}
          thumbColor="#fff"
        />
      </View>

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

      {/* F37 — Biometric login */}
      <Text style={[styles.sectionTitle, { color: colors.sub }]}>Bảo mật</Text>
      <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingRowLabel}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>
            Đăng nhập bằng vân tay
          </Text>
          <Text style={[styles.settingDesc, { color: colors.sub }]}>
            {biometricAvailable
              ? 'Face ID / vân tay sau khi đăng nhập một lần'
              : '(Thiết bị không hỗ trợ)'}
          </Text>
        </View>
        <Switch
          value={biometricEnabled}
          disabled={!biometricAvailable}
          onValueChange={(value) => {
            void (async () => {
              if (!value) {
                await clearBiometricCredentials()
                setBiometricEnabled(false)
                return
              }
              const creds = await getBiometricCredentials()
              if (!creds) {
                Alert.alert(
                  'Chưa kích hoạt',
                  'Đăng nhập bằng mật khẩu một lần để kích hoạt vân tay / Face ID.',
                )
                return
              }
              await saveBiometricCredentials(creds.email, creds.password)
              setBiometricEnabled(true)
            })()
          }}
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

      {/* Nút đăng xuất — tách biệt rõ với các card cài đặt phía trên */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: '#EF444440' }]}
        activeOpacity={0.7}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  topSpacer: { height: Platform.OS === 'android' ? 16 : 0 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 17, fontWeight: 'bold' },
  rowTwoCards: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkCardHalf: { flex: 1, marginHorizontal: 0, marginBottom: 0, minWidth: 0 },
  linkTitle: { fontSize: 15, fontWeight: '600' },
  linkSub: { fontSize: 13, marginTop: 4 },
  chevron: { fontSize: 22, fontWeight: '300', marginLeft: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    padding: 16, borderRadius: 12, borderWidth: 1,
  },
  settingRowLabel: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  settingDesc: { fontSize: 12, marginTop: 2 },
  infoBox: { marginHorizontal: 16, borderRadius: 12, padding: 16, borderWidth: 1 },
  infoText: { fontSize: 14, marginBottom: 6 },
  infoSub: { fontSize: 13, lineHeight: 20 },
  zoneCount: { fontSize: 13, marginTop: 10, fontWeight: 'bold' },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#EF444418',
    alignItems: 'center',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
})