import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { supabase } from './supabase'
import { buildExpiryCounts, type ExpiryCounts } from '../utils/expiryCountUtils'
import type { InventoryEntry, Location, Product, Zone } from '../types'

export type AppSettings = {
  id: string
  notification_enabled: boolean
  notification_time: string
  updated_at?: string
}

const CHANNEL_ID = 'expiry-alerts'

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

/** Ghép "X lô (kho) · Y SP (siêu thị)" — bỏ phần count = 0 */
function formatWhMarket(warehouse: number, market: number): string | null {
  const parts: string[] = []
  if (warehouse > 0) parts.push(`${warehouse} lô (kho)`)
  if (market > 0) parts.push(`${market} SP (siêu thị)`)
  return parts.length > 0 ? parts.join(' · ') : null
}

function buildDailyBody(counts: ExpiryCounts): string | null {
  const todayPart = formatWhMarket(
    counts.todayExpiredWarehouse,
    counts.todayExpiredMarket,
  )
  const threePart = formatWhMarket(
    counts.threeDayExpiredWarehouse,
    counts.threeDayExpiredMarket,
  )
  const sections: string[] = []
  if (todayPart) sections.push(`Hôm nay: ${todayPart} hết hạn`)
  if (threePart) sections.push(`3 ngày tới: ${threePart}`)
  return sections.length > 0 ? sections.join(' · ') : null
}

function buildWeeklyBody(counts: ExpiryCounts): string | null {
  const part = formatWhMarket(counts.weekExpiredWarehouse, counts.weekExpiredMarket)
  if (!part) return null
  return `Tuần này: ${part} hết hạn trong 7 ngày`
}

function buildMonthlyBody(counts: ExpiryCounts): string | null {
  const part = formatWhMarket(counts.monthExpiredWarehouse, counts.monthExpiredMarket)
  if (!part) return null
  return `Tháng này: ${part} hết hạn`
}

/**
 * Xóa schedule cũ rồi đặt lại daily / weekly / monthly.
 * Monthly dùng trigger MONTHLY (ngày 1) — nội dung vẫn cần reschedule khi mở app (KI-062).
 */
export async function scheduleAllNotifications(
  settings: AppSettings,
  counts: ExpiryCounts,
): Promise<void> {
  await cancelAllNotifications()

  if (!settings.notification_enabled) return

  const { hour, minute } = parseNotificationTime(settings.notification_time)

  const dailyBody = buildDailyBody(counts)
  if (dailyBody) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-expiry',
      content: {
        title: "Chino's Warehouse",
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

  const weeklyBody = buildWeeklyBody(counts)
  if (weeklyBody) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'weekly-expiry',
      content: {
        title: "Chino's Warehouse",
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

  const monthlyBody = buildMonthlyBody(counts)
  if (monthlyBody) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'monthly-expiry',
      content: {
        title: "Chino's Warehouse",
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

/** Fetch settings + data → tính counts → schedule (gọi sau login / sau admin đổi setting) */
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

    const counts = buildExpiryCounts(
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
