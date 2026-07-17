import { useState, useEffect, useRef, useCallback } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { StackActions } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { Text, View, ActivityIndicator, StyleSheet, AppState, Alert } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import type { RealtimeChannel, Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { joinPresenceChannel, leavePresenceChannel } from './lib/presence'
import { useWarningStore } from './stores/warningStore'
import { useAuthStore } from './stores/authStore'
import ConfigErrorScreen from './components/ConfigErrorScreen'
import LoginScreen from './screens/LoginScreen'

import MapScreen from './screens/MapScreen'
import ProductsScreen from './screens/ProductsScreen'
import SettingsScreen from './screens/SettingsScreen'
import DiscontinuedProductsScreen from './screens/DiscontinuedProductsScreen'
import LocationManagementScreen from './screens/LocationManagementScreen'
import CategoryManagementScreen from './screens/CategoryManagementScreen'
import AddInventoryScreen from './screens/AddInventoryScreen'
import ProductDetailScreen from './screens/ProductDetailScreen'
import NotificationsScreen from './screens/NotificationsScreen'
import BarcodeScannerScreen from './screens/BarcodeScannerScreen'
import OrderListScreen from './screens/OrderListScreen'
import OrderDetailScreen from './screens/OrderDetailScreen'
import ZoneLayoutEditorScreen from './screens/ZoneLayoutEditorScreen'
import ZonePickerScreen from './screens/ZonePickerScreen'
import AuditLogScreen from './screens/AuditLogScreen'
import DashboardScreen from './screens/DashboardScreen'
import UserManagementScreen from './screens/UserManagementScreen'
import InternalNotesScreen from './screens/InternalNotesScreen'

const Tab = createBottomTabNavigator()
const RootStack = createNativeStackNavigator()
const MapStack = createNativeStackNavigator()
const ProductsStack = createNativeStackNavigator()
const NotificationsStack = createNativeStackNavigator()
const OrdersStack = createNativeStackNavigator()
const SettingsStack = createNativeStackNavigator()

function MapStackNavigator() {
  return (
    <MapStack.Navigator screenOptions={{ headerShown: false }}>
      <MapStack.Screen name="MapMain" component={MapScreen} />
      <MapStack.Screen name="ZoneLayoutEditor" component={ZoneLayoutEditorScreen} />
      <MapStack.Screen name="ZonePicker" component={ZonePickerScreen} />
      <MapStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <MapStack.Screen name="AddInventory" component={AddInventoryScreen} />
      <MapStack.Screen name="AuditLog" component={AuditLogScreen} />
    </MapStack.Navigator>
  )
}

function ProductsStackNavigator() {
  return (
    <ProductsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductsStack.Screen name="ProductsMain" component={ProductsScreen} />
      <ProductsStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <ProductsStack.Screen name="AddInventory" component={AddInventoryScreen} />
      <ProductsStack.Screen name="AuditLog" component={AuditLogScreen} />
    </ProductsStack.Navigator>
  )
}

function NotificationsStackNavigator() {
  return (
    <NotificationsStack.Navigator screenOptions={{ headerShown: false }}>
      <NotificationsStack.Screen name="NotificationsMain" component={NotificationsScreen} />
      <NotificationsStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <NotificationsStack.Screen name="AddInventory" component={AddInventoryScreen} />
      <NotificationsStack.Screen name="AuditLog" component={AuditLogScreen} />
    </NotificationsStack.Navigator>
  )
}

function OrdersStackNavigator() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="OrderListMain" component={OrderListScreen} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </OrdersStack.Navigator>
  )
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="LocationManagement" component={LocationManagementScreen} />
      <SettingsStack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <SettingsStack.Screen name="DiscontinuedProducts" component={DiscontinuedProductsScreen} />
      <SettingsStack.Screen name="InternalNotes" component={InternalNotesScreen} />
      <SettingsStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <SettingsStack.Screen name="Dashboard" component={DashboardScreen} />
      <SettingsStack.Screen name="NotificationsFromDashboard" component={NotificationsScreen} />
      <SettingsStack.Screen name="UserManagement" component={UserManagementScreen} />
      <SettingsStack.Screen name="AuditLog" component={AuditLogScreen} />
    </SettingsStack.Navigator>
  )
}

function TabNavigator() {
  /**
   * Bấm tab: nếu stack con không sâu (index === 0) → không can thiệp.
   * Đang focus tab đó và stack sâu → preventDefault + popToTop.
   * Chưa focus (đang ở tab khác) và stack sâu → preventDefault + navigate sang tab + popToTop (một lần bấm về màn gốc).
   */
  const stackTabPressListener = ({ navigation, route }: any) => ({
    tabPress: (e: any) => {
      const state = navigation.getState()
      const focused = state.routes[state.index]?.key === route.key
      const nestedState = route.state as { key?: string; index?: number } | undefined
      const stackKey = nestedState?.key
      const hasDeepStack = !!(nestedState && (nestedState.index ?? 0) > 0 && stackKey)

      if (!hasDeepStack) return

      e.preventDefault()

      if (focused) {
        navigation.dispatch({
          ...StackActions.popToTop(),
          target: stackKey,
        })
      } else {
        navigation.navigate(route.name)
        navigation.dispatch({
          ...StackActions.popToTop(),
          target: stackKey,
        })
      }
    },
  })

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1a1a1a' },
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapStackNavigator}
        listeners={stackTabPressListener}
        options={{ tabBarLabel: 'Kho', tabBarIcon: () => <Text>🗺️</Text> }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsStackNavigator}
        listeners={stackTabPressListener}
        options={{ tabBarLabel: 'Sản phẩm', tabBarIcon: () => <Text>📦</Text> }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersStackNavigator}
        listeners={stackTabPressListener}
        options={{ tabBarLabel: 'Đặt hàng', tabBarIcon: () => <Text>📋</Text> }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsStackNavigator}
        listeners={stackTabPressListener}
        options={{ tabBarLabel: 'Thông báo', tabBarIcon: () => <Text>🔔</Text> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        listeners={stackTabPressListener}
        options={{ tabBarLabel: 'Cài đặt', tabBarIcon: () => <Text>⚙️</Text> }}
      />
    </Tab.Navigator>
  )
}

const INACTIVITY_LIMIT_MS = 20 * 60 * 1000   // 20 phút
const CHECK_INTERVAL_MS = 30 * 1000           // check mỗi 30 giây

export default function App() {
  const fetchCurrentUserProfile = useAuthStore((s) => s.fetchCurrentUserProfile)
  const clearCurrentUserProfile = useAuthStore((s) => s.clearCurrentUserProfile)
  const updateLastLogin = useAuthStore((s) => s.updateLastLogin)
  const isLoadingProfile = useAuthStore((s) => s.isLoadingProfile)
  const currentUserProfile = useAuthStore((s) => s.currentUserProfile)

  const [session, setSession] = useState<Session | null>(null)
  // null = chưa kiểm tra xong, true = đã kiểm tra
  const [isReady, setIsReady] = useState(false)
  const [authBootstrapError, setAuthBootstrapError] = useState<string | null>(null)

  // Dùng ref thay state để tránh re-render toàn app mỗi lần chạm màn hình
  const lastActivityRef = useRef<number>(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Phân biệt auto-logout (inactivity) vs user tự bấm đăng xuất / kill app
  const isAutoLogoutRef = useRef(false)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const profileRealtimeChannelRef = useRef<RealtimeChannel | null>(null)

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const checkInactivity = useCallback(() => {
    if (!isSupabaseConfigured) return
    if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT_MS) {
      isAutoLogoutRef.current = true
      void supabase.auth.signOut().catch((err) => {
        if (__DEV__) console.error('[App] signOut failed', err)
      })
    }
  }, [])

  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL_MS)
  }, [checkInactivity])

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    void useWarningStore.getState().loadWarningSettings()
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsReady(true)
      return
    }

    let cancelled = false

    const bootstrapAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!cancelled) {
          setSession(session)
          setAuthBootstrapError(null)
        }
      } catch (err) {
        if (__DEV__) console.error('[App] getSession failed', err)
        if (!cancelled) {
          setAuthBootstrapError('Không thể khởi tạo phiên đăng nhập. Kiểm tra mạng và thử mở lại app.')
          setSession(null)
        }
      } finally {
        if (!cancelled) setIsReady(true)
      }
    }

    void bootstrapAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!cancelled) {
          setSession(session)
          setAuthBootstrapError(null)
        }
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  // Inactivity timer: start khi có session, stop khi không có
  useEffect(() => {
    if (session) {
      updateActivity()
      startTimer()
    } else {
      stopTimer()
      // Toast chỉ hiện khi auto-logout do inactivity
      if (isAutoLogoutRef.current) {
        Alert.alert(
          'Hết phiên',
          'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
        )
        isAutoLogoutRef.current = false
      }
    }
    return () => stopTimer()
  }, [session, updateActivity, startTimer, stopTimer])

  // F24: load user_profiles sau khi có session; guard disabled / thiếu profile
  useEffect(() => {
    if (!session) {
      clearCurrentUserProfile()
      return
    }

    let cancelled = false

    const loadProfile = async () => {
      const profile = await fetchCurrentUserProfile()
      if (cancelled) return

      if (!profile) {
        Alert.alert('Lỗi', 'Không tìm thấy hồ sơ tài khoản')
        await supabase.auth.signOut()
        clearCurrentUserProfile()
        return
      }

      if (profile.is_disabled) {
        Alert.alert('Tài khoản đã bị vô hiệu hóa')
        await supabase.auth.signOut()
        clearCurrentUserProfile()
        return
      }

      void updateLastLogin()
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [session, fetchCurrentUserProfile, clearCurrentUserProfile, updateLastLogin])

  // F24: Realtime kick disable + presence tracking (sau profile OK)
  useEffect(() => {
    const userId = session?.user?.id
    const email = session?.user?.email ?? ''

    const cleanupChannels = () => {
      if (profileRealtimeChannelRef.current) {
        void supabase.removeChannel(profileRealtimeChannelRef.current)
        profileRealtimeChannelRef.current = null
      }
      if (presenceChannelRef.current) {
        void leavePresenceChannel(presenceChannelRef.current)
        presenceChannelRef.current = null
      }
    }

    if (!userId || !currentUserProfile || currentUserProfile.is_disabled) {
      cleanupChannels()
      return
    }

    const profileChannel = supabase
      .channel(`user-profile-self-${userId}-${Date.now()}`, {
        config: { private: true },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newRecord = payload.new as { is_disabled?: boolean }
          if (newRecord.is_disabled === true) {
            Alert.alert('Tài khoản đã bị vô hiệu hóa', 'Bạn sẽ bị đăng xuất.')
            void supabase.auth.signOut()
            clearCurrentUserProfile()
            return
          }
          void fetchCurrentUserProfile({ silent: true })
        },
      )
      .subscribe()

    profileRealtimeChannelRef.current = profileChannel
    presenceChannelRef.current = joinPresenceChannel(userId, email)

    return cleanupChannels
  }, [
    session?.user?.id,
    session?.user?.email,
    currentUserProfile?.id,
    currentUserProfile?.is_disabled,
    fetchCurrentUserProfile,
    clearCurrentUserProfile,
  ])

  // AppState: check inactivity khi app quay lại foreground, dừng timer khi background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkInactivity()
        // Nếu session vẫn còn (chưa bị auto-logout) → restart interval
        if (lastActivityRef.current && Date.now() - lastActivityRef.current <= INACTIVITY_LIMIT_MS) {
          startTimer()
        }
      } else if (nextState === 'background') {
        stopTimer()
      }
    })
    return () => sub.remove()
  }, [checkInactivity, startTimer, stopTimer])

  if (!isSupabaseConfigured) {
    return (
      <ConfigErrorScreen
        message="Thiếu EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_ANON_KEY trong bản build."
        hint="Dev: tạo file .env từ .env.example. APK EAS: chạy eas env:create cho cả hai biến (profile preview/production) rồi build lại."
      />
    )
  }

  // Màn loading trong lúc chờ kiểm tra session lần đầu
  if (!isReady) {
    return (
      <View style={authStyles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    )
  }

  if (authBootstrapError) {
    return (
      <ConfigErrorScreen
        title="Lỗi khởi động"
        message={authBootstrapError}
        hint="Kiểm tra kết nối Internet và cấu hình Supabase trên máy chủ."
      />
    )
  }

  // Chưa đăng nhập → hiện màn LoginScreen
  if (!session) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LoginScreen />
      </SafeAreaProvider>
    )
  }

  // Đã có session — chờ fetch profile (F24)
  if (isLoadingProfile || !currentUserProfile) {
    return (
      <View style={authStyles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    )
  }

  // Đã đăng nhập + profile OK → wrap navigator trong View bắt touch để reset timer
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onTouchStart={updateActivity} onTouchEnd={updateActivity}>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Tabs" component={TabNavigator} />
            <RootStack.Screen
              name="BarcodeScanner"
              component={BarcodeScannerScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
          </RootStack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  )
}

const authStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
  },
})
