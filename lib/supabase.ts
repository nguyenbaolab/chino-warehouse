import { createClient } from '@supabase/supabase-js'

// Đọc từ biến môi trường — không hardcode key vào đây
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// persistSession: false = session thuần trong RAM của Supabase client,
// không đụng storage → kill app = RAM mất = phải login lại.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
