import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useIsAdmin } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import {
  bootstrapExpiryNotifications,
  type AppSettings,
} from '../lib/notifications'
import {
  countFromExpiringItems,
  formatWhMarketLabel,
  getExpiringEntriesExactDay,
  getExpiringEntriesRange,
  type ExpiringEntryItem,
} from '../utils/expiryCountUtils'
import { isoExpiryToDisplay } from '../utils/dateUtils'
import type { InventoryEntry, Location, Product, Zone } from '../types'

type SectionDef =
  | { key: string; label: string; kind: 'exact'; daysFromToday: 0 | 1 | 2 | 3 }
  | { key: string; label: string; kind: 'week' }
  | { key: string; label: string; kind: 'month' }

const SECTION_DEFS: SectionDef[] = [
  { key: 'today', label: 'Hôm nay', kind: 'exact', daysFromToday: 0 },
  { key: 'day1', label: '1 ngày tới', kind: 'exact', daysFromToday: 1 },
  { key: 'day2', label: '2 ngày tới', kind: 'exact', daysFromToday: 2 },
  { key: 'day3', label: '3 ngày tới', kind: 'exact', daysFromToday: 3 },
  { key: 'week', label: 'Tuần này (7 ngày)', kind: 'week' },
  { key: 'month', label: 'Tháng này', kind: 'month' },
]

/** F35 Done — cài đặt thông báo + 6 section danh sách hết hạn. */
export default function ExpiryAlertScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const isAdmin = useIsAdmin()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [hourDraft, setHourDraft] = useState('11')
  const [minuteDraft, setMinuteDraft] = useState('00')

  const [inventoryEntries, setInventoryEntries] = useState<InventoryEntry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [dataReady, setDataReady] = useState(false)

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    {},
  )

  const lastFetchRef = useRef(0)
  const FOCUS_FETCH_TTL_MS = 30_000

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, entriesRes, productsRes, locationsRes, zonesRes] =
        await Promise.all([
          supabase
            .from('app_settings')
            .select('id, notification_enabled, notification_time, updated_at')
            .limit(1)
            .maybeSingle(),
          supabase.from('inventory_entries').select('*'),
          supabase.from('products').select('*').eq('is_archived', false),
          supabase.from('locations').select('*'),
          supabase.from('zones').select('*'),
        ])

      if (settingsRes.error) {
        if (__DEV__) console.error('[ExpiryAlert] fetch app_settings:', settingsRes.error)
        Alert.alert('Lỗi', 'Không tải được cài đặt thông báo.')
      } else if (settingsRes.data) {
        const row = settingsRes.data as AppSettings
        setSettings(row)
        const [h, m] = (row.notification_time || '11:00').split(':')
        setHourDraft(h?.padStart(2, '0') ?? '11')
        setMinuteDraft(m?.padStart(2, '0') ?? '00')
      }

      if (entriesRes.error && __DEV__) {
        console.error('[ExpiryAlert] fetch entries:', entriesRes.error)
      }
      if (productsRes.error && __DEV__) {
        console.error('[ExpiryAlert] fetch products:', productsRes.error)
      }
      if (locationsRes.error && __DEV__) {
        console.error('[ExpiryAlert] fetch locations:', locationsRes.error)
      }
      if (zonesRes.error && __DEV__) {
        console.error('[ExpiryAlert] fetch zones:', zonesRes.error)
      }

      setInventoryEntries((entriesRes.data ?? []) as InventoryEntry[])
      setProducts((productsRes.data ?? []) as Product[])
      setAllLocations((locationsRes.data ?? []) as Location[])
      setZones((zonesRes.data ?? []) as Zone[])
      setDataReady(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      if (now - lastFetchRef.current < FOCUS_FETCH_TTL_MS) return
      lastFetchRef.current = now
      void loadAll()
    }, [loadAll]),
  )

  const sectionLists = useMemo(() => {
    if (!dataReady) {
      return {
        today: [] as ExpiringEntryItem[],
        day1: [] as ExpiringEntryItem[],
        day2: [] as ExpiringEntryItem[],
        day3: [] as ExpiringEntryItem[],
        week: [] as ExpiringEntryItem[],
        month: [] as ExpiringEntryItem[],
      }
    }

    const today = getExpiringEntriesExactDay(
      inventoryEntries,
      products,
      allLocations,
      zones,
      0,
    )
    const day1 = getExpiringEntriesExactDay(
      inventoryEntries,
      products,
      allLocations,
      zones,
      1,
    )
    const day2 = getExpiringEntriesExactDay(
      inventoryEntries,
      products,
      allLocations,
      zones,
      2,
    )
    const day3 = getExpiringEntriesExactDay(
      inventoryEntries,
      products,
      allLocations,
      zones,
      3,
    )

    const excludeExact = new Set<string>([
      ...today.map((i) => i.entryId),
      ...day1.map((i) => i.entryId),
      ...day2.map((i) => i.entryId),
      ...day3.map((i) => i.entryId),
    ])

    const week = getExpiringEntriesRange(
      inventoryEntries,
      products,
      allLocations,
      zones,
      7,
      excludeExact,
    )

    const excludeWeekAndExact = new Set<string>([
      ...excludeExact,
      ...week.map((i) => i.entryId),
    ])

    const month = getExpiringEntriesRange(
      inventoryEntries,
      products,
      allLocations,
      zones,
      30,
      excludeWeekAndExact,
    )

    return { today, day1, day2, day3, week, month }
  }, [dataReady, inventoryEntries, products, allLocations, zones])

  const sections = useMemo(() => {
    return SECTION_DEFS.map((def) => {
      const entries =
        def.kind === 'exact'
          ? sectionLists[
              (['today', 'day1', 'day2', 'day3'] as const)[def.daysFromToday]
            ]
          : def.kind === 'week'
            ? sectionLists.week
            : sectionLists.month
      const counts = countFromExpiringItems(entries)
      const labelCounts = formatWhMarketLabel(counts.warehouse, counts.market)
      return {
        ...def,
        entries,
        counts,
        subtitle: labelCounts ?? 'Không có',
      }
    })
  }, [sectionLists])

  const allEmpty = useMemo(
    () => sections.every((s) => s.entries.length === 0),
    [sections],
  )

  // Default expand: mở nếu có entries (reset mỗi lần data load)
  useEffect(() => {
    if (!dataReady) return
    const next: Record<string, boolean> = {
      today: sectionLists.today.length > 0,
      day1: sectionLists.day1.length > 0,
      day2: sectionLists.day2.length > 0,
      day3: sectionLists.day3.length > 0,
      week: sectionLists.week.length > 0,
      month: sectionLists.month.length > 0,
    }
    setExpandedSections(next)
  }, [dataReady, sectionLists])

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function persistAndReschedule(patch: {
    notification_enabled?: boolean
    notification_time?: string
  }) {
    if (!settings || !isAdmin || saving) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .update(patch)
        .eq('id', settings.id)
        .select('id, notification_enabled, notification_time, updated_at')
        .maybeSingle()

      if (error || !data) {
        if (__DEV__) console.error('[ExpiryAlert] update app_settings:', error)
        Alert.alert('Lỗi', 'Không lưu được cài đặt. Kiểm tra quyền quản lý.')
        return
      }

      const row = data as AppSettings
      setSettings(row)
      const [h, m] = (row.notification_time || '11:00').split(':')
      setHourDraft(h?.padStart(2, '0') ?? '11')
      setMinuteDraft(m?.padStart(2, '0') ?? '00')

      await bootstrapExpiryNotifications()
    } finally {
      setSaving(false)
    }
  }

  function handleToggle(value: boolean) {
    if (!isAdmin) return
    void persistAndReschedule({ notification_enabled: value })
  }

  function commitTime() {
    if (!isAdmin || !settings) return
    const h = parseInt(hourDraft, 10)
    const m = parseInt(minuteDraft, 10)
    if (
      Number.isNaN(h) ||
      Number.isNaN(m) ||
      h < 0 ||
      h > 23 ||
      m < 0 ||
      m > 59
    ) {
      Alert.alert('Giờ không hợp lệ', 'Nhập giờ 00–23 và phút 00–59.')
      const [oh, om] = (settings.notification_time || '11:00').split(':')
      setHourDraft(oh?.padStart(2, '0') ?? '11')
      setMinuteDraft(om?.padStart(2, '0') ?? '00')
      return
    }
    const next = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    if (next === settings.notification_time) return
    void persistAndReschedule({ notification_time: next })
  }

  function renderEntryCard(item: ExpiringEntryItem) {
    const qtyLabel =
      item.locationType === 'warehouse'
        ? `${item.quantityBoxes} thùng`
        : `${item.quantityBoxes} SP`
    const expiryDisplay = isoExpiryToDisplay(item.expiryDate) || item.expiryDate
    const expiryColor =
      item.daysUntilExpiry <= 0 ? colors.statusExpired : colors.statusWarning

    return (
      <TouchableOpacity
        key={item.entryId}
        style={[
          styles.entryCard,
          { backgroundColor: colors.bg, borderColor: colors.border },
        ]}
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate('ProductDetail', { productId: item.productId })
        }
      >
        {item.productImageUrl ? (
          <Image
            source={{ uri: item.productImageUrl }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumb, { backgroundColor: colors.border }]} />
        )}
        <View style={styles.entryBody}>
          <View style={styles.entryTopRow}>
            <Text
              style={[styles.entryName, { color: colors.text }]}
              numberOfLines={2}
            >
              {item.productName}
            </Text>
            <Text style={[styles.entryQty, { color: colors.text }]}>{qtyLabel}</Text>
          </View>
          <View style={styles.entryMidRow}>
            <Text style={[styles.entryMeta, { color: colors.sub }]} numberOfLines={1}>
              {item.zoneName} — Tầng {item.tier}
            </Text>
            <Text style={[styles.entryExpiry, { color: expiryColor }]}>
              {expiryDisplay}
            </Text>
          </View>
          <View style={styles.entryBottomRow}>
            <Text style={[styles.entryLoc, { color: colors.sub }]} numberOfLines={1}>
              {item.locationName}
            </Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.sub }]}>
                {item.locationType === 'warehouse' ? 'Kho' : 'Siêu thị'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ color: colors.accent, fontSize: 16 }}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>⏰ Thông báo hết hạn</Text>
        <View style={{ width: 72 }} />
      </View>

      {loading && !dataReady ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.note, { color: colors.sub }]}>
            {`Thông báo tự động về hàng hết hạn:
• Hàng ngày: 4 mốc đếm ngược (hôm nay / 1 / 2 / 3 ngày tới)
• Thứ Hai hàng tuần: hàng hết hạn trong 7 ngày
• Ngày 1 hàng tháng: hàng hết hạn trong tháng

Số liệu trong thông báo được cập nhật mỗi khi có người mở app.`}
          </Text>

          <View
            style={[
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.rowLabel}>
              <Text style={[styles.label, { color: colors.text }]}>
                Bật thông báo hết hạn
              </Text>
              {!isAdmin ? (
                <Text style={[styles.hint, { color: colors.sub }]}>
                  (Chỉ quản lý thay đổi)
                </Text>
              ) : null}
            </View>
            <Switch
              value={settings?.notification_enabled ?? false}
              onValueChange={handleToggle}
              disabled={!isAdmin || saving}
              trackColor={{ false: '#ccc', true: colors.accent }}
              thumbColor="#fff"
            />
          </View>

          <View
            style={[
              styles.timeCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.label, { color: colors.text }]}>
              Giờ thông báo hàng ngày
            </Text>
            {!isAdmin ? (
              <Text style={[styles.hint, { color: colors.sub }]}>
                (Chỉ quản lý thay đổi)
              </Text>
            ) : null}
            <View style={styles.timeRow}>
              <TextInput
                style={[
                  styles.timeInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.bg,
                    opacity: isAdmin ? 1 : 0.5,
                  },
                ]}
                value={hourDraft}
                onChangeText={setHourDraft}
                onBlur={commitTime}
                keyboardType="number-pad"
                maxLength={2}
                editable={isAdmin && !saving}
                placeholder="11"
                placeholderTextColor={colors.sub}
              />
              <Text style={[styles.colon, { color: colors.text }]}>:</Text>
              <TextInput
                style={[
                  styles.timeInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.bg,
                    opacity: isAdmin ? 1 : 0.5,
                  },
                ]}
                value={minuteDraft}
                onChangeText={setMinuteDraft}
                onBlur={commitTime}
                keyboardType="number-pad"
                maxLength={2}
                editable={isAdmin && !saving}
                placeholder="00"
                placeholderTextColor={colors.sub}
              />
              {isAdmin ? (
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  onPress={commitTime}
                  disabled={saving}
                >
                  <Text style={{ color: colors.card, fontWeight: '700' }}>
                    Lưu giờ
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.sub }]}>
            Hàng hết hạn
          </Text>

          {allEmpty ? (
            <Text style={[styles.emptyAll, { color: colors.sub }]}>
              Không có hàng hết hạn
            </Text>
          ) : null}

          {sections.map((sec) => {
            const expanded = expandedSections[sec.key] === true
            return (
              <View
                key={sec.key}
                style={[
                  styles.sectionCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  onPress={() => toggleSection(sec.key)}
                  activeOpacity={0.7}
                  style={styles.sectionHeader}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>
                      {expanded ? '▾ ' : '▸ '}
                      {sec.label}
                    </Text>
                    <Text
                      style={[
                        styles.sectionCount,
                        {
                          color:
                            sec.entries.length === 0 ? colors.sub : colors.text,
                        },
                      ]}
                    >
                      {sec.subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>

                {expanded
                  ? sec.entries.map((item) => renderEntryCard(item))
                  : null}
              </View>
            )
          })}
        </ScrollView>
      )}
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
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    paddingBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  note: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  rowLabel: { flex: 1, marginRight: 12 },
  label: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 12, marginTop: 4 },
  timeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  timeInput: {
    width: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  colon: { fontSize: 20, fontWeight: '700' },
  saveBtn: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  emptyAll: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  sectionCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  sectionHeader: { marginBottom: 4 },
  sectionLabel: { fontSize: 15, fontWeight: '700' },
  sectionCount: { fontSize: 13, marginTop: 4 },
  entryCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 10,
  },
  thumb: { width: 48, height: 48, borderRadius: 8 },
  entryBody: { flex: 1, minWidth: 0 },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  entryName: { flex: 1, fontSize: 14, fontWeight: '700' },
  entryQty: { fontSize: 13, fontWeight: '600' },
  entryMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  entryMeta: { flex: 1, fontSize: 12 },
  entryExpiry: { fontSize: 12, fontWeight: '600' },
  entryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  entryLoc: { flex: 1, fontSize: 11 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
})
