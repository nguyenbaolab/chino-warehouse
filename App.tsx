import { useState, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { StackActions } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
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
      <MapStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <MapStack.Screen name="AddInventory" component={AddInventoryScreen} />
    </MapStack.Navigator>
  )
}

function ProductsStackNavigator() {
  return (
    <ProductsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductsStack.Screen name="ProductsMain" component={ProductsScreen} />
      <ProductsStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <ProductsStack.Screen name="AddInventory" component={AddInventoryScreen} />
    </ProductsStack.Navigator>
  )
}

function NotificationsStackNavigator() {
  return (
    <NotificationsStack.Navigator screenOptions={{ headerShown: false }}>
      <NotificationsStack.Screen name="NotificationsMain" component={NotificationsScreen} />
      <NotificationsStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <NotificationsStack.Screen name="AddInventory" component={AddInventoryScreen} />
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

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  // null = chưa kiểm tra xong, true = đã kiểm tra
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Lấy session hiện tại khi app khởi động
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsReady(true)
    })

    // Lắng nghe thay đổi trạng thái auth (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Màn loading trong lúc chờ kiểm tra session lần đầu
  if (!isReady) {
    return (
      <View style={authStyles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    )
  }

  // Chưa đăng nhập → hiện màn LoginScreen
  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen />
      </>
    )
  }

  // Đã đăng nhập → hiện navigation chính
  return (
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
