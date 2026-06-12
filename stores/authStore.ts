import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../types'

type AuthStore = {
  currentUserProfile: UserProfile | null
  currentUserEmail: string | null
  isLoadingProfile: boolean
  fetchCurrentUserProfile: () => Promise<UserProfile | null>
  clearCurrentUserProfile: () => void
  updateLastLogin: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentUserProfile: null,
  currentUserEmail: null,
  isLoadingProfile: false,

  fetchCurrentUserProfile: async () => {
    set({ isLoadingProfile: true })
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        set({ currentUserProfile: null, currentUserEmail: null, isLoadingProfile: false })
        return null
      }

      const email = session.user.email ?? null
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, role, is_disabled, last_login_at, created_at')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error || !data) {
        set({ currentUserProfile: null, currentUserEmail: email, isLoadingProfile: false })
        return null
      }

      const profile = data as UserProfile
      set({ currentUserProfile: profile, currentUserEmail: email, isLoadingProfile: false })
      return profile
    } catch {
      set({ currentUserProfile: null, currentUserEmail: null, isLoadingProfile: false })
      return null
    }
  },

  clearCurrentUserProfile: () => {
    set({ currentUserProfile: null, currentUserEmail: null, isLoadingProfile: false })
  },

  updateLastLogin: async () => {
    await supabase.rpc('update_my_last_login')
  },
}))

export const useIsReadOnly = () => useAuthStore((s) => s.currentUserProfile?.role === 'guest')

export const useCanWrite = () => useAuthStore((s) => s.currentUserProfile?.role !== 'guest')

export const useIsAdmin = () =>
  useAuthStore((s) => {
    const role = s.currentUserProfile?.role
    return role === 'admin' || role === 'super_admin'
  })

export const useIsSuperAdmin = () => useAuthStore((s) => s.currentUserProfile?.role === 'super_admin')
