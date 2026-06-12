import { useCallback, useEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useAuthStore, useIsAdmin } from '../stores/authStore'
import type { UserProfile, UserProfileWithEmail, UserRole } from '../types'

function emailLocalPart(email: string): string {
  return email.split('@')[0] ?? email
}

function formatLastLogin(iso: string | null): string {
  if (!iso) return 'Chưa đăng nhập'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Chưa đăng nhập'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function roleBadge(role: UserRole): { label: string; color: string } {
  switch (role) {
    case 'super_admin':
      return { label: 'Super Admin', color: '#7C3AED' }
    case 'admin':
      return { label: 'Admin', color: '#3B82F6' }
    case 'staff':
      return { label: 'Staff', color: '#22C55E' }
    case 'guest':
      return { label: 'Guest', color: '#6B7280' }
  }
}

function showGuestSwitch(viewer: UserProfile, target: UserProfileWithEmail): boolean {
  if (viewer.id === target.id) return false
  if (target.role === 'super_admin' || target.role === 'admin') return false
  if (viewer.role === 'super_admin') return true
  if (viewer.role === 'admin' && (target.role === 'staff' || target.role === 'guest')) return true
  return false
}

function showDisabledSwitch(viewer: UserProfile, target: UserProfileWithEmail): boolean {
  if (viewer.id === target.id) return false
  if (target.role === 'super_admin') return false
  if (viewer.role === 'super_admin') return true
  if (viewer.role === 'admin' && (target.role === 'staff' || target.role === 'guest')) return true
  return false
}

function showAdminSwitch(viewer: UserProfile, target: UserProfileWithEmail): boolean {
  if (viewer.id === target.id) return false
  if (viewer.role !== 'super_admin') return false
  if (target.role === 'super_admin') return false
  return true
}

export default function UserManagementScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const isAdmin = useIsAdmin()
  const currentUserProfile = useAuthStore((s) => s.currentUserProfile)
  const users = useAuthStore((s) => s.users)
  const isLoadingUsers = useAuthStore((s) => s.isLoadingUsers)
  const fetchUsers = useAuthStore((s) => s.fetchUsers)
  const updateUserRole = useAuthStore((s) => s.updateUserRole)
  const updateUserDisabled = useAuthStore((s) => s.updateUserDisabled)

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Bạn không có quyền truy cập')
      navigation.goBack()
    }
  }, [isAdmin, navigation])

  const loadUsers = useCallback(async () => {
    const err = await fetchUsers()
    if (err) {
      console.log('[UserManagement] fetchUsers failed:', err)
      Alert.alert('Không thể tải danh sách người dùng')
    }
  }, [fetchUsers])

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) void loadUsers()
    }, [isAdmin, loadUsers])
  )

  async function handleUpdateError(err: string | null) {
    if (err) {
      Alert.alert('Không có quyền thực hiện thao tác này')
      await loadUsers()
    }
  }

  function onGuestSwitchChange(user: UserProfileWithEmail, newValue: boolean) {
    const name = emailLocalPart(user.email)
    if (newValue) {
      Alert.alert('Xác nhận', `Chuyển ${name} thành Guest?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => void updateUserRole(user.id, 'guest').then(handleUpdateError),
        },
      ])
    } else {
      Alert.alert('Xác nhận', `Chuyển ${name} thành Staff?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => void updateUserRole(user.id, 'staff').then(handleUpdateError),
        },
      ])
    }
  }

  function onDisabledSwitchChange(user: UserProfileWithEmail, newValue: boolean) {
    const name = emailLocalPart(user.email)
    if (newValue) {
      Alert.alert('Xác nhận', `Vô hiệu hóa ${name}?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => void updateUserDisabled(user.id, true).then(handleUpdateError),
        },
      ])
    } else {
      Alert.alert('Xác nhận', `Kích hoạt lại ${name}?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => void updateUserDisabled(user.id, false).then(handleUpdateError),
        },
      ])
    }
  }

  function onAdminSwitchChange(user: UserProfileWithEmail, newValue: boolean) {
    const name = emailLocalPart(user.email)
    if (newValue) {
      Alert.alert('Xác nhận', `Cấp quyền Admin cho ${name}?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => void updateUserRole(user.id, 'admin').then(handleUpdateError),
        },
      ])
    } else {
      Alert.alert('Xác nhận', `Thu quyền Admin của ${name} (về Staff)?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => void updateUserRole(user.id, 'staff').then(handleUpdateError),
        },
      ])
    }
  }

  if (!currentUserProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    )
  }

  const viewer = currentUserProfile

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Quản lý người dùng</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.sub }}>Đóng</Text>
        </TouchableOpacity>
      </View>

      {isLoadingUsers && users.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {users.length === 0 ? (
            <Text style={[styles.empty, { color: colors.sub }]}>Không có người dùng nào</Text>
          ) : (
            users.map((user) => {
              const badge = roleBadge(user.role)
              const displayName = emailLocalPart(user.email)
              const guestOn = showGuestSwitch(viewer, user)
              const disabledOn = showDisabledSwitch(viewer, user)
              const adminOn = showAdminSwitch(viewer, user)
              const hasSwitches = guestOn || disabledOn || adminOn

              return (
                <View
                  key={user.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.badge, { backgroundColor: badge.color + '22' }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    <Text style={[styles.metaDot, { color: colors.sub }]}>·</Text>
                    <Text
                      style={[
                        styles.statusText,
                        { color: user.is_disabled ? '#EF4444' : '#22C55E' },
                      ]}
                    >
                      {user.is_disabled ? 'Đã vô hiệu hóa' : 'Đang hoạt động'}
                    </Text>
                  </View>
                  <Text style={[styles.lastLogin, { color: colors.sub }]}>
                    Đăng nhập cuối: {formatLastLogin(user.last_login_at)}
                  </Text>

                  {hasSwitches ? (
                    <View style={[styles.switchSection, { borderTopColor: colors.border }]}>
                      {guestOn ? (
                        <View style={styles.switchRow}>
                          <Text style={[styles.switchLabel, { color: colors.text }]}>Guest</Text>
                          <Switch
                            value={user.role === 'guest'}
                            onValueChange={(v) => onGuestSwitchChange(user, v)}
                            trackColor={{ false: '#ccc', true: colors.accent }}
                            thumbColor="#fff"
                          />
                        </View>
                      ) : null}
                      {disabledOn ? (
                        <View style={styles.switchRow}>
                          <Text style={[styles.switchLabel, { color: colors.text }]}>Vô hiệu hóa</Text>
                          <Switch
                            value={user.is_disabled}
                            onValueChange={(v) => onDisabledSwitchChange(user, v)}
                            trackColor={{ false: '#ccc', true: colors.accent }}
                            thumbColor="#fff"
                          />
                        </View>
                      ) : null}
                      {adminOn ? (
                        <View style={styles.switchRow}>
                          <Text style={[styles.switchLabel, { color: colors.text }]}>Admin</Text>
                          <Switch
                            value={user.role === 'admin'}
                            onValueChange={(v) => onAdminSwitchChange(user, v)}
                            trackColor={{ false: '#ccc', true: colors.accent }}
                            thumbColor="#fff"
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              )
            })
          )}
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
    paddingVertical: 12,
  },
  title: { fontSize: 17, fontWeight: 'bold', flex: 1, marginRight: 12 },
  backBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 14 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  userName: { fontSize: 16, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  metaDot: { fontSize: 13 },
  statusText: { fontSize: 13, fontWeight: '500' },
  lastLogin: { fontSize: 12, marginTop: 8 },
  switchSection: { borderTopWidth: 1, marginTop: 12, paddingTop: 4 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  switchLabel: { fontSize: 15, fontWeight: '500' },
})
