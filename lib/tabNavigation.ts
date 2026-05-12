/**
 * Payload nested cho `navigation.navigate('Tabs', …)` (root) hoặc
 * `tabNavigator.navigate(screen, params)` (từ stack con trong tab).
 */
export function tabsParamsForReturnTabMain(returnTab: string | undefined): Record<string, unknown> {
  switch (returnTab || 'Products') {
    case 'Map':
      return { screen: 'Map', params: { screen: 'MapMain' } }
    case 'Products':
      return { screen: 'Products', params: { screen: 'ProductsMain' } }
    case 'Orders':
      return { screen: 'Orders', params: { screen: 'OrderListMain' } }
    case 'Notifications':
      return { screen: 'Notifications', params: { screen: 'NotificationsMain' } }
    case 'Settings':
      return { screen: 'Settings', params: { screen: 'SettingsMain' } }
    default:
      return { screen: 'Products', params: { screen: 'ProductsMain' } }
  }
}

/** Từ màn trong stack của tab (vd AddInventory): lên tab bar rồi về màn gốc — tương đương root `navigate('Tabs', payload)`. */
export function navigateToTabMainFromNestedStack(navigation: any, returnTab: string | undefined) {
  if (!returnTab) {
    navigation.goBack()
    return
  }
  const payload = tabsParamsForReturnTabMain(returnTab) as { screen: string; params: Record<string, unknown> }
  const tabNav = navigation.getParent()
  if (tabNav?.navigate) {
    tabNav.navigate(payload.screen, payload.params)
  } else {
    navigation.goBack()
  }
}
