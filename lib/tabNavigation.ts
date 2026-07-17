/**
 * Payload nested cho `navigation.navigate('Tabs', …)` (root) hoặc
 * `tabNavigator.navigate(screen, params)` (từ stack con trong tab).
 */
export function getMainScreenName(tab: string | undefined): string {
  switch (tab || 'Products') {
    case 'Map':
      return 'MapMain'
    case 'Products':
      return 'ProductsMain'
    case 'Orders':
      return 'OrderListMain'
    case 'Notifications':
      return 'NotificationsMain'
    case 'Settings':
      return 'SettingsMain'
    default:
      return 'ProductsMain'
  }
}

export function tabsParamsForReturnTabMain(returnTab: string | undefined): Record<string, unknown> {
  const tab = returnTab || 'Products'
  return { screen: tab, params: { screen: getMainScreenName(tab) } }
}

/**
 * KI-057: nested navigate chỉ `ProductDetail` dễ để stack cụt `[ProductDetail]` (thiếu Main).
 * Build state tường minh: Main + ProductDetail để Đóng luôn pop về Main.
 */
export function tabsParamsForProductDetail(
  returnTab: string | undefined,
  productId: string,
): Record<string, unknown> {
  const tab = returnTab || 'Products'
  return {
    screen: tab,
    params: {
      state: {
        routes: [
          { name: getMainScreenName(tab) },
          { name: 'ProductDetail', params: { productId } },
        ],
        index: 1,
      },
    },
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
