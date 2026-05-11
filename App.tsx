import { NavigationContainer } from '@react-navigation/native'
import { StackActions } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { Text } from 'react-native'

import MapScreen from './screens/MapScreen'
import ProductsScreen from './screens/ProductsScreen'
import SettingsScreen from './screens/SettingsScreen'
import DiscontinuedProductsScreen from './screens/DiscontinuedProductsScreen'
import LocationManagementScreen from './screens/LocationManagementScreen'
import AddInventoryScreen from './screens/AddInventoryScreen'
import ProductDetailScreen from './screens/ProductDetailScreen'
import NotificationsScreen from './screens/NotificationsScreen'
import BarcodeScannerScreen from './screens/BarcodeScannerScreen'
import OrderListScreen from './screens/OrderListScreen'
import OrderDetailScreen from './screens/OrderDetailScreen'

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
      <SettingsStack.Screen name="DiscontinuedProducts" component={DiscontinuedProductsScreen} />
    </SettingsStack.Navigator>
  )
}

function TabNavigator() {
  const stackTabPressListener = ({ navigation, route }: any) => ({
    tabPress: (e: any) => {
      const state = navigation.getState()
      const focused = state.routes[state.index]?.key === route.key
      const nestedState = route.state as any
      if (focused && nestedState?.index > 0) {
        e.preventDefault()
        navigation.dispatch({
          ...StackActions.popToTop(),
          target: route.key,
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
