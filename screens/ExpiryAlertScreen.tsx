import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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

/** F35 C-part1 — cài đặt thông báo hết hạn (admin toggle + giờ). C-part2: danh sách. */
export default function ExpiryAlertScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const isAdmin = useIsAdmin()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [hourDraft, setHourDraft] = useState('11')
  const [minuteDraft, setMinuteDraft] = useState('00')

  const lastFetchRef = useRef(0)
  const FOCUS_FETCH_TTL_MS = 30_000

  const loadSettings = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('app_settings')
      .select('id, notification_enabled, notification_time, updated_at')
      .limit(1)
      .maybeSingle()

    if (error) {
      if (__DEV__) console.error('[ExpiryAlert] fetch app_settings:', error)
      Alert.alert('Lỗi', 'Không tải được cài đặt thông báo.')
      setLoading(false)
      return
    }

    if (data) {
      const row = data as AppSettings
      setSettings(row)
      const [h, m] = (row.notification_time || '11:00').split(':')
      setHourDraft(h?.padStart(2, '0') ?? '11')
      setMinuteDraft(m?.padStart(2, '0') ?? '00')
    }
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      if (now - lastFetchRef.current < FOCUS_FETCH_TTL_MS) return
      lastFetchRef.current = now
      void loadSettings()
    }, [loadSettings]),
  )

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ color: colors.accent, fontSize: 16 }}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>⏰ Thông báo hết hạn</Text>
        <View style={{ width: 72 }} />
      </View>

      {loading && !settings ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.note, { color: colors.sub }]}>
            {`Thông báo tự động về hàng hết hạn:
• Hàng ngày: hàng hết hạn hôm nay và 3 ngày tới
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

          {/* C-part2: 4 section Hôm nay / 3 ngày / Tuần / Tháng */}
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
})
