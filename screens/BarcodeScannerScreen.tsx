import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { CameraView, Camera } from 'expo-camera'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'

type BarcodeScannerParams = {
  mode?: 'search' | 'assign' | 'locate' | 'addInventory'
  productId?: string
  /** Tab chứa stack (Map / Products / Notifications) — dùng khi `assign` để quay lại ProductDetail sau quét */
  returnTab?: string
  /** Params merge vào `AddInventory` khi `mode === 'addInventory'` */
  addInventoryParams?: Record<string, unknown>
}

export default function BarcodeScannerScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const {
    mode = 'search',
    productId: assignProductId,
    returnTab,
    addInventoryParams,
  } = (route.params || {}) as BarcodeScannerParams
  const { colors } = useThemeStore()
  const { searchByBarcode, products } = useWarehouseStore()

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isScanLocked, setIsScanLocked] = useState(false)

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted')
    })
  }, [])

  async function handleScanned({ data }: { data: string }) {
    if (isSearching || isScanLocked) return
    setIsScanLocked(true)
    setIsSearching(true)

    const barcode = data.trim()
    console.log('[BarcodeScanner] scanned barcode:', barcode, 'mode:', mode)

    if (mode === 'assign') {
      setIsSearching(false)
      if (returnTab && assignProductId) {
        navigation.navigate('Tabs', {
          screen: returnTab,
          params: {
            screen: 'ProductDetail',
            params: {
              productId: assignProductId,
              scannedBarcode: barcode,
              barcodeAssignedAt: Date.now(),
            },
          },
        })
      }
      navigation.goBack()
      return
    }

    if (mode === 'addInventory') {
      setIsSearching(false)
      const tab = returnTab || 'Products'
      navigation.navigate('Tabs', {
        screen: tab,
        params: {
          screen: 'AddInventory',
          params: {
            ...(addInventoryParams ?? {}),
            scannedBarcode: barcode,
            barcodeScannedAt: Date.now(),
          },
        },
      })
      navigation.goBack()
      return
    }

    const product = searchByBarcode(barcode)
    setIsSearching(false)
    console.log('[BarcodeScanner] searchByBarcode product:', product?.id ?? null)

    if (mode === 'locate') {
      if (product) {
        const params = {
          scannedProductName: product.name,
          locateScannedAt: Date.now(),
        }
        console.log('[BarcodeScanner][locate] product found, navigating params:', params)
        navigation.navigate('Tabs', {
          screen: 'Map',
          params: {
            screen: 'MapMain',
            params,
          },
        })
        navigation.goBack()
      } else {
        console.log('[BarcodeScanner][locate] product not found for barcode')
        Alert.alert('Không tìm thấy sản phẩm với mã vạch này', '', [
          {
            text: 'Quét lại',
            style: 'cancel',
            onPress: () => setIsScanLocked(false),
          },
          {
            text: 'Đóng',
            onPress: () => navigation.goBack(),
          },
        ])
      }
      return
    }

    if (product) {
      const productId = product.id
      navigation.navigate('Tabs', {
        screen: 'Products',
        params: {
          screen: 'ProductDetail',
          params: { productId },
        },
      })
      navigation.goBack()
      return
    }

    Alert.alert(
      'Không tìm thấy mã vạch',
      'Mã vạch này chưa có trong hệ thống. Bạn muốn thêm thủ công?',
      [
        {
          text: 'Thêm thủ công',
          onPress: () => {
            navigation.navigate('Tabs', {
              screen: 'Products',
              params: { screen: 'AddInventory', params: {} },
            })
            navigation.goBack()
          },
        },
        {
          text: 'Quét lại',
          style: 'cancel',
          onPress: () => {
            setIsScanLocked(false)
          },
        },
      ]
    )
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
        onBarcodeScanned={isScanLocked || (mode === 'locate' && products.length === 0) ? undefined : handleScanned}
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
            {mode === 'assign'
              ? 'Quét mã vạch để gán cho sản phẩm'
              : mode === 'addInventory'
                ? 'Quét mã vạch để điền vào Thêm hàng'
                : mode === 'locate'
                ? 'Quét mã vạch để định vị trong kho'
                : 'Đưa mã vạch vào khung'}
          </Text>
          <View style={[styles.scanFrame, { borderColor: colors.accent }]} />
          {mode === 'locate' && products.length === 0 && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.text }]}>Đang tải dữ liệu sản phẩm...</Text>
            </View>
          )}
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
