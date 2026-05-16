import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Đọc env Expo — trả về `configured: false` nếu thiếu/sai (APK build không embed .env). */
export function readSupabaseEnv(): {
  url: string
  anonKey: string
  configured: boolean
} {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim()
  const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
  const configured =
    url.startsWith('https://') &&
    anonKey.length >= 20 &&
    !url.includes('your-project') &&
    !anonKey.toLowerCase().includes('your-anon-key')

  return { url, anonKey, configured }
}

const env = readSupabaseEnv()
export const isSupabaseConfigured = env.configured

// createClient ném lỗi nếu url/key rỗng — dùng placeholder khi chưa cấu hình (App sẽ chặn trước khi gọi API).
const CLIENT_URL = env.configured
  ? env.url
  : 'https://placeholder.supabase.co'
const CLIENT_KEY = env.configured
  ? env.anonKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI0MDAsImV4cCI6MTk2MDc2ODQwMH0.placeholder'

// persistSession: false = session thuần trong RAM của Supabase client,
// không đụng storage → kill app = RAM mất = phải login lại.
export const supabase: SupabaseClient = createClient(CLIENT_URL, CLIENT_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: env.configured,
    detectSessionInUrl: false,
  },
})
