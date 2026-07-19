import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { supabase } from './supabase'
import {
  buildScheduleExpiryCounts,
  formatWhMarketLabel,
  type DailyExpiryCounts,
  type ExpiryModeCounts,
  type ScheduleExpiryCounts,
} from '../utils/expiryCountUtils'
import type { InventoryEntry, Location, Product, Zone } from '../types'

export type AppSettings = {
  id: string
  notification_enabled: boolean
  notification_time: string
  updated_at?: string
}

export type { DailyExpiryCounts, ExpiryModeCounts, ScheduleExpiryCounts }

const CHANNEL_ID = 'expiry-alerts'

const DAY_LABELS: { key: keyof DailyExpiryCounts; prefix: string }[] = [
  { key: 'day0', prefix: 'Hôm nay' },
  { key: 'day1', prefix: '1 ngày tới' },
  { key: 'day2', prefix: '2 ngày tới' },
  { key: 'day3', prefix: '3 ngày tới' },
]

/** Handler khi nhận notification lúc app foreground */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Cảnh báo hết hạn',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }
    const { status: existing } = await Notifications.getPermissionsAsync()
    if (existing === 'granted') return true
    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  } catch (e) {
    if (__DEV__) console.error('[notifications] requestPermission:', e)
    return false
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch (e) {
    if (__DEV__) console.error('[notifications] cancelAll:', e)
  }
}

function parseNotificationTime(time: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!m) return { hour: 11, minute: 0 }
  const hour = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  const minute = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  return { hour, minute }
}

/** Daily: 4 mốc exact-day, join "\n"; null nếu cả 4 = 0 */
function buildDailyBody(daily: DailyExpiryCounts): string | null {
  const lines: string[] = []
  for (const { key, prefix } of DAY_LABELS) {
    const part = formatWhMarketLabel(daily[key].warehouse, daily[key].market)
    if (part) lines.push(`${prefix}: ${part}`)
  }
  return lines.length > 0 ? lines.join('\n') : null
}

function buildWeeklyBody(weekly: ExpiryModeCounts): string | null {
  const part = formatWhMarketLabel(weekly.warehouse, weekly.market)
  if (!part) return null
  return `Tuần này: ${part} hết hạn trong 7 ngày`
}

function buildMonthlyBody(monthly: ExpiryModeCounts): string | null {
  const part = formatWhMarketLabel(monthly.warehouse, monthly.market)
  if (!part) return null
  return `Tháng này: ${part} hết hạn`
}

/**
 * Xóa schedule cũ rồi đặt lại daily / weekly / monthly — 3 identifier riêng,
 * schedule độc lập (OS hiện 3 dòng khi trùng ngày, vd. Thứ Hai ngày 1).
 */
export async function scheduleAllNotifications(
  settings: AppSettings,
  counts: ScheduleExpiryCounts,
): Promise<void> {
  await cancelAllNotifications()

  if (!settings.notification_enabled) return

  const { hour, minute } = parseNotificationTime(settings.notification_time)

  const dailyBody = buildDailyBody(counts.daily)
  if (dailyBody) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-expiry',
      content: {
        title: "Chino's Store — Hết hạn",
        body: dailyBody,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    })
  }

  const weeklyBody = buildWeeklyBody(counts.weekly)
  if (weeklyBody) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'weekly-expiry',
      content: {
        title: "Chino's Store — Hết hạn tuần",
        body: weeklyBody,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2, // Monday
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    })
  }

  const monthlyBody = buildMonthlyBody(counts.monthly)
  if (monthlyBody) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'monthly-expiry',
      content: {
        title: "Chino's Store — Hết hạn tháng",
        body: monthlyBody,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: 1,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    })
  }
}

/** Fetch settings + data → 4 exact-day + 2 range → schedule (sau login / admin đổi) */
export async function bootstrapExpiryNotifications(): Promise<void> {
  try {
    setupNotificationHandler()
    const granted = await requestNotificationPermission()
    if (!granted) return

    const { data: settingsRow, error: settingsErr } = await supabase
      .from('app_settings')
      .select('id, notification_enabled, notification_time, updated_at')
      .limit(1)
      .maybeSingle()

    if (settingsErr) {
      if (__DEV__) console.error('[notifications] fetch app_settings:', settingsErr)
      return
    }
    if (!settingsRow) return

    const settings = settingsRow as AppSettings
    if (!settings.notification_enabled) {
      await cancelAllNotifications()
      return
    }

    const [entriesRes, productsRes, locationsRes, zonesRes] = await Promise.all([
      supabase.from('inventory_entries').select('*'),
      supabase.from('products').select('*').eq('is_archived', false),
      supabase.from('locations').select('*'),
      supabase.from('zones').select('*'),
    ])

    if (entriesRes.error && __DEV__) {
      console.error('[notifications] fetch entries:', entriesRes.error)
    }
    if (productsRes.error && __DEV__) {
      console.error('[notifications] fetch products:', productsRes.error)
    }
    if (locationsRes.error && __DEV__) {
      console.error('[notifications] fetch locations:', locationsRes.error)
    }
    if (zonesRes.error && __DEV__) {
      console.error('[notifications] fetch zones:', zonesRes.error)
    }

    const counts = buildScheduleExpiryCounts(
      (entriesRes.data ?? []) as InventoryEntry[],
      (productsRes.data ?? []) as Product[],
      (locationsRes.data ?? []) as Location[],
      (zonesRes.data ?? []) as Zone[],
    )

    await scheduleAllNotifications(settings, counts)
  } catch (e) {
    if (__DEV__) console.error('[notifications] bootstrapExpiryNotifications:', e)
  }
}
