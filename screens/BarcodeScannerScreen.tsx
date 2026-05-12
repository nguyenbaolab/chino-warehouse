import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { CameraView, Camera } from 'expo-camera'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { tabsParamsForReturnTabMain } from '../lib/tabNavigation'

type BarcodeScannerParams = {
  mode?: 'search' | 'locate'
  returnTab?: string
  /** Callback điền barcode tại màn mở scanner rồi đóng scanner. */
  onScanFillBarcode?: (barcode: string) => void
  /** Params merge vào `AddInventory` khi scanner mở từ màn này (vẫn dùng mode `search`). */
  addInventoryParams?: Record<string, unknown>
  /** Params để quay về ProductDetail và điền barcode cho đúng lô. */
  productDetailParams?: { productId: string; lotId: string }
}

type RootNav = {
  navigate: (name: string, params?: object) => void
  goBack: () => void
  canGoBack?: () => boolean
}

/** Đóng modal scanner sau khi nested `navigate('Tabs', …)` đã được xử lý (tránh goBack() cùng frame làm mất params / không đóng modal). */
function scheduleDismissModal(navigation: RootNav) {
  setTimeout(() => {
    if (typeof navigation.canGoBack === 'function' && !navigation.canGoBack()) return
    navigation.goBack()
  }, 160)
}

export default function BarcodeScannerScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const {
    mode = 'search',
    returnTab,
    onScanFillBarcode,
    addInventoryParams,
    productDetailParams,
  } = (route.params || {}) as BarcodeScannerParams
  const { colors } = useThemeStore()
  const { searchByBarcode } = useWarehouseStore()

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isScanLocked, setIsScanLocked] = useState(false)
  const processingRef = useRef(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted')
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      processingRef.current = false
      setIsScanLocked(false)
      setIsSearching(false)
      return () => {
        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current)
          dismissTimerRef.current = null
        }
      }
    }, [])
  )

  function navigateTabsThenCloseModal(tabsParams: Record<string, unknown>) {
    navigation.navigate('Tabs', tabsParams)
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null
      scheduleDismissModal(navigation)
    }, 160)
  }

  /** Không tìm thấy lô — locate & search dùng chung 3 nút: Thử lại / Thêm thủ công / Huỷ */
  function openBarcodeNotFoundAlert(effectiveReturnTab: string) {
    processingRef.current = false
    Alert.alert(
      'Không tìm thấy mã vạch',
      'Mã vạch lô này chưa có trong hệ thống. Bạn có thể thử lại, thêm thủ công hoặc huỷ.',
      [
        {
          text: 'Thử lại',
          onPress: () => {
            processingRef.current = false
            setIsScanLocked(false)
          },
        },
        {
          text: 'Thêm thủ công',
          onPress: () => {
            navigateTabsThenCloseModal({
              screen: effectiveReturnTab,
              params: {
                screen: 'AddInventory',
                params: { returnTab: effectiveReturnTab },
              },
            })
          },
        },
        {
          text: 'Huỷ',
          style: 'cancel',
          onPress: () => {
            processingRef.current = false
            setIsScanLocked(false)
            navigateTabsThenCloseModal(tabsParamsForReturnTabMain(effectiveReturnTab))
          },
        },
      ],
      { cancelable: true }
    )
  }

  async function handleScanned({ data }: { data: string }) {
    if (processingRef.current) return
    processingRef.current = true
    setIsScanLocked(true)
    setIsSearching(true)

    const barcode = data.trim()
    console.log('[BarcodeScanner] scanned barcode:', barcode, 'mode:', mode)

    if (mode === 'search' && typeof onScanFillBarcode === 'function') {
      setIsSearching(false)
      onScanFillBarcode(barcode)
      navigation.goBack()
      return
    }

    if (mode === 'search' && addInventoryParams) {
      setIsSearching(false)
      const tab = returnTab || 'Products'
      navigateTabsThenCloseModal({
        screen: tab,
        params: {
          screen: 'AddInventory',
          params: {
            ...(addInventoryParams ?? {}),
            scannedBarcode: barcode,
            barcodeScannedAt: Date.now(),
            returnTab: tab,
          },
        },
      })
      return
    }

    if (mode === 'search' && productDetailParams) {
      const tab = returnTab || 'Products'
      navigateTabsThenCloseModal({
        screen: tab,
        params: {
          screen: 'ProductDetail',
          params: {
            productId: productDetailParams.productId,
            scannedLotBarcode: barcode,
            scannedLotId: productDetailParams.lotId,
            scannedLotBarcodeAt: Date.now(),
          },
        },
      })
      return
    }

    const entry = await searchByBarcode(barcode)
    setIsSearching(false)
    console.log('[BarcodeScanner] searchByBarcode lot:', entry?.id ?? null)

    if (mode === 'locate') {
      if (entry) {
        const params = {
          scannedBarcode: barcode,
          scannedInventoryEntryId: entry.id,
          scannedProductName: entry.product?.name,
          locateScannedAt: Date.now(),
        }
        console.log('[BarcodeScanner][locate] lot found, navigating params:', params)
        navigateTabsThenCloseModal({
          screen: 'Map',
          params: {
            screen: 'MapMain',
            params,
          },
        })
      } else {
        console.log('[BarcodeScanner][locate] product not found for barcode')
        openBarcodeNotFoundAlert(returnTab || 'Map')
      }
      return
    }

    if (entry) {
      navigateTabsThenCloseModal({
        screen: 'Products',
        params: {
          screen: 'ProductsMain',
          params: {
            scannedBarcode: barcode,
            scannedInventoryEntryId: entry.id,
            scannedAt: Date.now(),
          },
        },
      })
      return
    }

    openBarcodeNotFoundAlert(returnTab || 'Products')
  }

  if (hasPermission === null) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={{ color: colors.sub, marginTop: 10 }}>Đang xin quyền camera...</Text>
      </SafeAreaView>
    )
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.permissionTitle, { color: colors.text }]}>Không có quyền camera</Text>
        <Text style={[styles.permissionSub, { color: colors.sub }]}>
          Vui lòng bật quyền camera để quét mã vạch.
        </Text>
        <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: colors.accent }]} onPress={() => Linking.openSettings()}>
          <Text style={[styles.settingsBtnText, { color: colors.card }]}>Mở cài đặt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.closeFallbackBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.sub }}>Đóng</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={isScanLocked ? undefined : handleScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'qr'],
        }}
      />

      <View style={styles.overlay}>
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.scanAreaWrap}>
          <Text style={styles.scanHint}>
            {mode === 'locate'
              ? 'Quét mã vạch để định vị trong kho'
              : addInventoryParams
                ? 'Quét mã vạch để điền vào Thêm hàng'
                : 'Đưa mã vạch vào khung'}
          </Text>
          <View style={[styles.scanFrame, { borderColor: colors.accent }]} />
          {isSearching && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.text }]}>Đang tìm sản phẩm...</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  closeBtn: {
    marginTop: 64,
    marginLeft: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  scanAreaWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scanHint: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scanFrame: {
    width: '86%',
    maxWidth: 320,
    aspectRatio: 1.8,
    borderWidth: 2.5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  loadingWrap: { marginTop: 18, alignItems: 'center' },
  loadingText: { fontSize: 12, marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  permissionTitle: { fontSize: 18, fontWeight: '700' },
  permissionSub: { fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  settingsBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  settingsBtnText: { fontWeight: '700' },
  closeFallbackBtn: { marginTop: 10, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
})
