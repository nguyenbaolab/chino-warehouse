import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../utils/errorMessages'
import type { UserProfile, UserProfileWithEmail, UserRole } from '../types'

type AuthStore = {
  currentUserProfile: UserProfile | null
  currentUserEmail: string | null
  isLoadingProfile: boolean
  users: UserProfileWithEmail[]
  isLoadingUsers: boolean
  fetchCurrentUserProfile: (opts?: { silent?: boolean }) => Promise<UserProfile | null>
  clearCurrentUserProfile: () => void
  updateLastLogin: () => Promise<void>
  fetchUsers: () => Promise<string | null>
  updateUserRole: (userId: string, newRole: UserRole) => Promise<string | null>
  updateUserDisabled: (userId: string, isDisabled: boolean) => Promise<string | null>
  onlineUserIds: Set<string>
  setOnlineUserIds: (ids: Set<string>) => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentUserProfile: null,
  currentUserEmail: null,
  isLoadingProfile: false,
  users: [],
  isLoadingUsers: false,
  onlineUserIds: new Set<string>(),

  fetchCurrentUserProfile: async (opts) => {
    const silent = opts?.silent ?? false
    if (!silent) set({ isLoadingProfile: true })
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        set({
          currentUserProfile: null,
          currentUserEmail: null,
          ...(silent ? {} : { isLoadingProfile: false }),
        })
        return null
      }

      const email = session.user.email ?? null
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, role, is_disabled, last_login_at, created_at')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error || !data) {
        set({
          currentUserProfile: null,
          currentUserEmail: email,
          ...(silent ? {} : { isLoadingProfile: false }),
        })
        return null
      }

      const profile = data as UserProfile
      set({
        currentUserProfile: profile,
        currentUserEmail: email,
        ...(silent ? {} : { isLoadingProfile: false }),
      })
      return profile
    } catch {
      set({
        currentUserProfile: null,
        currentUserEmail: null,
        ...(silent ? {} : { isLoadingProfile: false }),
      })
      return null
    }
  },

  clearCurrentUserProfile: () => {
    set({
      currentUserProfile: null,
      currentUserEmail: null,
      isLoadingProfile: false,
      users: [],
      isLoadingUsers: false,
      onlineUserIds: new Set<string>(),
    })
  },

  setOnlineUserIds: (ids) => {
    set({ onlineUserIds: new Set(ids) })
  },

  updateLastLogin: async () => {
    const { error } = await supabase.rpc('update_my_last_login')
    if (error) {
      if (__DEV__) console.error('[authStore] updateLastLogin failed:', error)
    }
  },

  fetchUsers: async () => {
    set({ isLoadingUsers: true })
    try {
      const { data, error } = await supabase.rpc('list_user_profiles_with_email')
      if (error) {
        if (__DEV__) console.error('[authStore] fetchUsers:', error)
        set({ isLoadingUsers: false })
        return getErrorMessage(error, 'fetch')
      }
      const rows = (data ?? []) as UserProfileWithEmail[]
      set({ users: rows, isLoadingUsers: false })
      return null
    } catch (e) {
      if (__DEV__) console.error('[authStore] fetchUsers:', e)
      set({ isLoadingUsers: false })
      return getErrorMessage(e, 'fetch')
    }
  },

  updateUserRole: async (userId, newRole) => {
    const { error } = await supabase.from('user_profiles').update({ role: newRole }).eq('id', userId)
    if (error) {
      if (__DEV__) console.error('[authStore] updateUserRole:', error)
      return getErrorMessage(error, 'update')
    }
    return get().fetchUsers()
  },

  updateUserDisabled: async (userId, isDisabled) => {
    const { error } = await supabase.from('user_profiles').update({ is_disabled: isDisabled }).eq('id', userId)
    if (error) {
      if (__DEV__) console.error('[authStore] updateUserDisabled:', error)
      return getErrorMessage(error, 'update')
    }
    return get().fetchUsers()
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
