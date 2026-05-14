import { createClient } from '@supabase/supabase-js'

// Session chỉ sống trong RAM — kill app = mất session = phải login lại.
// Background ngắn (switch app rồi quay lại) vẫn giữ session vì RAM chưa bị clear.
const memoryStorage = {
  getItem: (_key: string) => Promise.resolve(null),
  setItem: (_key: string, _value: string) => Promise.resolve(),
  removeItem: (_key: string) => Promise.resolve(),
}

// Đọc từ biến môi trường — không hardcode key vào đây
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: memoryStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})