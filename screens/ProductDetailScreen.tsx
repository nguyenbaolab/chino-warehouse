import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import ImageViewerModal from '../components/ImageViewerModal'
import { useThemeStore } from '../stores/themeStore'
import { useWarningStore } from '../stores/warningStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useCanWrite, useIsReadOnly } from '../stores/authStore'
import { getDisplayColor, getDisplayColorContextFromEntry } from '../utils/statusUtils'
import { supabase } from '../lib/supabase'
import {
  formatExpiryDate,
  getCombinedStatus,
  InventoryEntry,
  Location,
  Product,
  ProductBarcode,
  Zone,
  AuditLog,
} from '../types'
import { checkConflict } from '../utils/conflictUtils'
import { isoExpiryToDisplay, isValidDisplayDate, parseDisplayDateToIso } from '../utils/dateUtils'
import { pickImage, uploadProductImage, deleteProductImage } from '../utils/imageUtils'
import { getErrorMessage } from '../utils/errorMessages'
import {
  formatSplitQtyLabel,
  locationTypeOfEntry,
  qtyUnitForLocationType,
} from '../utils/qtyUnitUtils'

type ProductDetailRouteParams = {
  productId: string
  scannedLotBarcode?: string
  scannedLotId?: string
  scannedLotBarcodeAt?: number
}

function isExpiredBeforeToday(expiryDate?: string): boolean {
  if (!expiryDate) return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiryDate.trim())
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const expiry = new Date(year, month - 1, day)
  if (Number.isNaN(expiry.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  return expiry.getTime() < today.getTime()
}

export default function ProductDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const { productId, scannedLotBarcode, scannedLotId, scannedLotBarcodeAt } = route.params as ProductDetailRouteParams
  const { colors } = useThemeStore()
  const { expiryWarningEnabled, lowStockWarningEnabled } = useWarningStore()
  const canWrite = useCanWrite()
  const isReadOnly = useIsReadOnly()
  const {
    zones,
    updateInventoryEntry,
    deleteInventoryEntry,
    checkBarcodeConflict,
    upsertProductBarcode,
    logBarcodeConflict,
    fetchProductBarcodes,
    deleteProductBarcode,
    updateProductBarcode,
    updateProductName,
    productCategoriesL1,
    productCategoriesL2,
    fetchCategories,
    updateProductCategory,
    fetchAuditLogsForProduct,
    deleteProduct,
    setLocateIntent,
    updateProductImage,
    removeProductImage,
  } = useWarehouseStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [lots, setLots] = useState<InventoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  /** All locations — tên kho + đơn vị không phụ thuộc appMode Map */
  const [allLocations, setAllLocations] = useState<Location[]>([])

  // A5: snapshot used for optimistic locking (conflict detection)
  const lotSnapshotsRef = useRef<Record<string, string>>({})
  const productSnapshotRef = useRef('')

  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editExpiryDate, setEditExpiryDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLotBarcode, setEditLotBarcode] = useState('')
  const [editWarningDays, setEditWarningDays] = useState('30')
  const [editLowWarningBoxes, setEditLowWarningBoxes] = useState('3')
  const [isEditingThresholds, setIsEditingThresholds] = useState(false)
  const [originalWarningDays, setOriginalWarningDays] = useState('')
  const [originalLowWarningBoxes, setOriginalLowWarningBoxes] = useState('')
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  const [showIssuesOnly, setShowIssuesOnly] = useState(false)
  const [showCategoryL1Picker, setShowCategoryL1Picker] = useState(false)
  const [showCategoryL2Picker, setShowCategoryL2Picker] = useState(false)
  const [categorySaving, setCategorySaving] = useState(false)
  const [auditEntries, setAuditEntries] = useState<AuditLog[]>([])
  const [viewingImage, setViewingImage] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  const [productBarcodes, setProductBarcodes] = useState<ProductBarcode[]>([])
  const [barcodesLoading, setBarcodesLoading] = useState(false)
  const [barcodeSectionExpanded, setBarcodeSectionExpanded] = useState(false)
  const [barcodeInputModalOpen, setBarcodeInputModalOpen] = useState(false)
  const [barcodeInputValue, setBarcodeInputValue] = useState('')
  const [barcodeInputTargetId, setBarcodeInputTargetId] = useState<string | null>(null)

  const locationById = useMemo(
    () => new Map(allLocations.map((l) => [l.id, l])),
    [allLocations],
  )

  const lotQtySplit = useMemo(() => {
    let warehouse = 0
    let market = 0
    for (const lot of lots) {
      if (locationTypeOfEntry(lot, locationById) === 'warehouse') warehouse += lot.quantity_boxes
      else market += lot.quantity_boxes
    }
    return { warehouse, market }
  }, [lots, locationById])

  const editingLotUnit = useMemo(() => {
    if (!editingLotId) return 'thùng'
    const lot = lots.find((l) => l.id === editingLotId)
    if (!lot) return 'thùng'
    return qtyUnitForLocationType(locationTypeOfEntry(lot, locationById))
  }, [editingLotId, lots, locationById])

  const hasThresholdChanged =
    editWarningDays !== originalWarningDays ||
    editLowWarningBoxes !== originalLowWarningBoxes

  const nameHasChanges = isEditingName && nameInput.trim() !== originalName.trim()
  const nameEditIcon = !isEditingName ? '✏️' : nameHasChanges && nameInput.trim().length > 0 ? '✅' : '❌'

  const loadProductBarcodes = useCallback(async () => {
    setBarcodesLoading(true)
    try {
      const rows = await fetchProductBarcodes(productId)
      setProductBarcodes(rows)
    } finally {
      setBarcodesLoading(false)
    }
  }, [fetchProductBarcodes, productId])

  useEffect(() => {
    if (useWarehouseStore.getState().productCategoriesL1.length === 0) {
      void fetchCategories()
    }
  }, [fetchCategories])

  useEffect(() => {
    let cancelled = false
    void supabase
      .from('locations')
      .select('id, type, name')
      .then(({ data }) => {
        if (!cancelled) setAllLocations((data as Location[]) ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categoryL2Options = useMemo(() => {
    const l1 = product?.category_level1_id
    if (!l1) return []
    return productCategoriesL2.filter((c) => c.level1_id === l1)
  }, [product?.category_level1_id, productCategoriesL2])

  const displayedLots = useMemo(() => {
    if (!showIssuesOnly) return lots
    return lots.filter((lot) => {
      const st = getCombinedStatus(
        lot.quantity_boxes,
        lot.expiry_date,
        product?.low_warning_boxes ?? 3,
        1,
        product?.warning_days ?? 30
      )
      return st !== 'ok'
    })
  }, [lots, showIssuesOnly, product])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const [{ data: productData }, { data: lotData }] = await Promise.all([
      supabase.from('products').select('*').eq('id', productId).single(),
      supabase
        .from('inventory_entries')
        .select('*, zone:zones(*)')
        .eq('product_id', productId),
    ])
    const nextProduct = productData ?? null
    const nextLots = (lotData as InventoryEntry[]) ?? []

    setProduct(nextProduct)
    setLots(nextLots)
    productSnapshotRef.current = nextProduct?.updated_at ?? ''
    lotSnapshotsRef.current = Object.fromEntries(nextLots.map((l) => [l.id, l.updated_at ?? '']))

    setEditWarningDays(String(nextProduct?.warning_days ?? 30))
    setEditLowWarningBoxes(String(nextProduct?.low_warning_boxes ?? 3))
    setIsLoading(false)
  }, [productId])

  // Refetch khi màn có focus (ví dụ quay lại từ AddInventory) — state `lots` là local, không đọc từ store
  // KI-039: TTL 30s; đổi productId → force fetch
  const FOCUS_FETCH_TTL_MS = 30_000
  const lastFetchRef = useRef(0)
  const lastProductIdRef = useRef<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      const productChanged = lastProductIdRef.current !== productId
      if (!productChanged && now - lastFetchRef.current < FOCUS_FETCH_TTL_MS) return
      lastFetchRef.current = now
      lastProductIdRef.current = productId

      void loadData()
      void loadProductBarcodes()
      void fetchAuditLogsForProduct(productId, 10).then(setAuditEntries)
    }, [loadData, loadProductBarcodes, fetchAuditLogsForProduct, productId])
  )

  useEffect(() => {
    if (!scannedLotBarcode || !scannedLotId) return
    const lot = lots.find((item) => item.id === scannedLotId)
    if (!lot) return
    setEditingLotId(lot.id)
    setEditQuantity(String(lot.quantity_boxes))
    setEditExpiryDate(isoExpiryToDisplay(lot.expiry_date))
    setEditNotes(lot.notes ?? '')
    setEditLotBarcode(scannedLotBarcode.trim())
    navigation.setParams({
      scannedLotBarcode: undefined,
      scannedLotId: undefined,
      scannedLotBarcodeAt: undefined,
    })
  }, [scannedLotBarcode, scannedLotId, scannedLotBarcodeAt, lots, navigation])

  function handleConflictReview() {
    setEditingLotId(null)
    setIsEditingThresholds(false)
    setShowCategoryL1Picker(false)
    setShowCategoryL2Picker(false)
    void loadData()
  }

  function startEditName() {
    const current = product?.name ?? ''
    setNameInput(current)
    setOriginalName(current)
    setIsEditingName(true)
  }

  function cancelEditName() {
    setNameInput(originalName)
    setIsEditingName(false)
  }

  async function saveProductName() {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setIsSavingName(true)
    try {
      await updateProductName(productId, trimmed)
      setProduct((p) => (p ? { ...p, name: trimmed } : p))
      setOriginalName(trimmed)
      setIsEditingName(false)
    } finally {
      setIsSavingName(false)
    }
  }

  function handleNameEditButtonPress() {
    if (isReadOnly) return
    if (!isEditingName) {
      startEditName()
      return
    }
    if (nameHasChanges && nameInput.trim().length > 0) {
      void saveProductName()
    } else {
      cancelEditName()
    }
  }

  function isDuplicateInList(barcode: string, excludeId?: string | null) {
    const normalized = barcode.trim().toLowerCase()
    return productBarcodes.some(
      (row) => row.barcode.toLowerCase() === normalized && row.id !== excludeId,
    )
  }

  async function commitBarcodeAdd(barcode: string, reassign = false) {
    await upsertProductBarcode(productId, barcode, reassign ? { reassign: true } : undefined)
    await loadProductBarcodes()
  }

  async function commitBarcodeUpdate(barcodeId: string, newBarcode: string, reassign = false) {
    const normalized = newBarcode.trim().toLowerCase()
    if (reassign) {
      const { data: conflictRow } = await supabase
        .from('product_barcodes')
        .select('id')
        .eq('barcode', normalized)
        .maybeSingle()
      if (conflictRow && conflictRow.id !== barcodeId) {
        await deleteProductBarcode(conflictRow.id)
      }
    }
    const result = await updateProductBarcode(barcodeId, newBarcode)
    if (result.error) {
      Alert.alert('Lỗi', result.error)
      return
    }
    await loadProductBarcodes()
  }

  function promptBarcodeConflict(
    barcode: string,
    conflicting: Product,
    onConfirm: () => void | Promise<void>,
  ) {
    Alert.alert(
      'Mã vạch trùng',
      `Mã "${barcode.trim()}" đang thuộc sản phẩm "${conflicting.name}". Vẫn thêm vào sản phẩm này?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Vẫn thêm',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await logBarcodeConflict(
                barcode,
                productId,
                conflicting.id,
                product?.name ?? 'Không rõ',
                conflicting.name,
              )
              await onConfirm()
            })()
          },
        },
      ],
    )
  }

  async function applyNewBarcode(barcode: string) {
    const trimmed = barcode.trim()
    if (!trimmed) return
    if (isDuplicateInList(trimmed)) {
      Alert.alert('Trùng mã', 'Mã này đã có trong danh sách.')
      return
    }
    const conflicting = await checkBarcodeConflict(trimmed, productId)
    if (conflicting) {
      promptBarcodeConflict(trimmed, conflicting, () => commitBarcodeAdd(trimmed, true))
      return
    }
    await commitBarcodeAdd(trimmed)
  }

  async function applyBarcodeChange(barcodeId: string, newBarcode: string) {
    const trimmed = newBarcode.trim()
    if (!trimmed) return
    const current = productBarcodes.find((row) => row.id === barcodeId)
    if (current && current.barcode.toLowerCase() === trimmed.toLowerCase()) return
    if (isDuplicateInList(trimmed, barcodeId)) {
      Alert.alert('Trùng mã', 'Mã này đã có trong danh sách.')
      return
    }
    const conflicting = await checkBarcodeConflict(trimmed, productId)
    if (conflicting) {
      promptBarcodeConflict(trimmed, conflicting, () => commitBarcodeUpdate(barcodeId, trimmed, true))
      return
    }
    await commitBarcodeUpdate(barcodeId, trimmed)
  }

  function openAddBarcodeChooser() {
    if (isReadOnly) return
    Alert.alert('Thêm mã vạch', undefined, [
      {
        text: '📷 Quét',
        onPress: () => {
          navigation.navigate('BarcodeScanner', {
            mode: 'search',
            onScanFillBarcode: (bc: string) => {
              void applyNewBarcode(bc)
            },
          })
        },
      },
      {
        text: '⌨️ Nhập tay',
        onPress: () => {
          setBarcodeInputTargetId(null)
          setBarcodeInputValue('')
          setBarcodeInputModalOpen(true)
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ])
  }

  function openEditBarcodeManual(barcodeId: string, currentBarcode: string) {
    setBarcodeInputTargetId(barcodeId)
    setBarcodeInputValue(currentBarcode)
    setBarcodeInputModalOpen(true)
  }

  function openEditBarcodeScan(barcodeId: string) {
    navigation.navigate('BarcodeScanner', {
      mode: 'search',
      onScanFillBarcode: (bc: string) => {
        void applyBarcodeChange(barcodeId, bc)
      },
    })
  }

  function submitBarcodeInputModal() {
    const value = barcodeInputValue.trim()
    if (!value) return
    setBarcodeInputModalOpen(false)
    if (barcodeInputTargetId) {
      void applyBarcodeChange(barcodeInputTargetId, value)
    } else {
      void applyNewBarcode(value)
    }
  }

  function confirmDeleteBarcode(row: ProductBarcode) {
    Alert.alert(
      'Xóa mã vạch',
      `Xóa mã vạch "${row.barcode}" khỏi sản phẩm này?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await deleteProductBarcode(row.id)
              await loadProductBarcodes()
            })()
          },
        },
      ],
    )
  }

  async function handleThresholdEditButtonPress() {
    if (isReadOnly) return
    if (!isEditingThresholds) {
      setOriginalWarningDays(editWarningDays)
      setOriginalLowWarningBoxes(editLowWarningBoxes)
      setIsEditingThresholds(true)
      return
    }
    if (!hasThresholdChanged) {
      setEditWarningDays(originalWarningDays)
      setEditLowWarningBoxes(originalLowWarningBoxes)
      setIsEditingThresholds(false)
      return
    }
    const ok = await handleSaveThresholds()
    if (ok) {
      setOriginalWarningDays(editWarningDays)
      setOriginalLowWarningBoxes(editLowWarningBoxes)
      setIsEditingThresholds(false)
    }
  }

  function openInlineEdit(lot: InventoryEntry) {
    if (isReadOnly) return
    if (editingLotId === lot.id) {
      setEditingLotId(null)
      return
    }
    setEditingLotId(lot.id)
    setEditQuantity(String(lot.quantity_boxes))
    setEditExpiryDate(isoExpiryToDisplay(lot.expiry_date))
    setEditNotes(lot.notes ?? '')
    setEditLotBarcode(lot.barcode ?? '')
  }

  async function handleSaveLot(lot: InventoryEntry) {
    const quantity = Number(editQuantity)
    if (!Number.isFinite(quantity) || quantity < 0 || quantity !== Math.floor(quantity)) {
      Alert.alert(`Số ${editingLotUnit} không hợp lệ`, `Số ${editingLotUnit} phải là số nguyên lớn hơn hoặc bằng 0.`)
      return
    }
    if (!isValidDisplayDate(editExpiryDate)) {
      Alert.alert('Hạn không hợp lệ', 'Hạn sử dụng phải theo định dạng DD/MM/YYYY hoặc MM/YYYY.')
      return
    }

    const payload = {
      quantity_boxes: quantity,
      expiry_date: parseDisplayDateToIso(editExpiryDate),
      notes: editNotes.trim() || undefined,
      barcode: editLotBarcode.trim() || undefined,
    }

    async function doSaveLot(lotId: string, payloadToSend: Partial<InventoryEntry>) {
      await updateInventoryEntry(lotId, payloadToSend)
      if (payloadToSend.barcode) {
        await upsertProductBarcode(lot.product_id, payloadToSend.barcode)
      }

      // Lấy updated_at mới để update snapshot, tránh prompt conflict lặp khi user bấm edit lại
      let nextUpdatedAt = new Date().toISOString()
      try {
        const { data: row } = await supabase
          .from('inventory_entries')
          .select('updated_at')
          .eq('id', lotId)
          .maybeSingle()
        if (row?.updated_at) nextUpdatedAt = row.updated_at
      } catch {
        // keep fallback
      }

      lotSnapshotsRef.current = { ...lotSnapshotsRef.current, [lotId]: nextUpdatedAt }
      setLots((prev) =>
        prev.map((item) =>
          item.id === lotId
            ? {
                ...item,
                quantity_boxes: quantity,
                expiry_date: payload.expiry_date,
                notes: payload.notes,
                barcode: payload.barcode,
                updated_at: nextUpdatedAt,
              }
            : item,
        ),
      )
      setEditingLotId(null)
    }

    if (editLotBarcode.trim()) {
      const conflicting = await checkBarcodeConflict(editLotBarcode.trim(), lot.product_id)
      if (conflicting) {
        Alert.alert(
          'Mã vạch đã tồn tại',
          `Mã vạch "${editLotBarcode.trim()}" đã thuộc về sản phẩm "${conflicting.name}".`,
          [{ text: 'OK' }],
        )
        void logBarcodeConflict(
          editLotBarcode.trim(),
          lot.product_id,
          conflicting.id,
          lot.product?.name ?? '',
          conflicting.name,
        )
        return
      }
    }

    const { hasConflict, changedByName } = await checkConflict(
      'inventory_entries',
      lot.id,
      lotSnapshotsRef.current[lot.id],
    )

    if (hasConflict) {
      Alert.alert(
        'Có xung đột',
        `Lô này vừa được ${changedByName ?? 'người khác'} cập nhật.\nBạn có muốn ghi đè không?`,
        [
          { text: 'Xem lại', style: 'cancel', onPress: handleConflictReview },
          { text: 'Ghi đè', style: 'destructive', onPress: () => void doSaveLot(lot.id, payload) },
        ],
      )
      return
    }

    await doSaveLot(lot.id, payload)
  }

  function handleDeleteLot(lot: InventoryEntry) {
    if (isReadOnly) return
    // KI-058: chỉ cho xóa khi hết hàng
    if (lot.quantity_boxes > 0) return
    Alert.alert('Xóa lô hàng', 'Xóa lô hàng này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteInventoryEntry(lot.id)
          if (editingLotId === lot.id) setEditingLotId(null)
          setLots((prev) => prev.filter((item) => item.id !== lot.id))
        },
      },
    ])
  }

  async function doSaveThresholds(days: number, boxes: number): Promise<boolean> {
    if (!product) return false
    const productId = product.id

    const { data: updated, error } = await supabase
      .from('products')
      .update({ warning_days: days, low_warning_boxes: boxes })
      .eq('id', productId)
      .select('*')
      .single()

    if (error || !updated) {
      Alert.alert('Lỗi', 'Không thể lưu, vui lòng thử lại.')
      return false
    }

    setProduct(updated)
    productSnapshotRef.current = updated.updated_at ?? productSnapshotRef.current
    useWarehouseStore.setState((s) => ({
      products: s.products.map((p) => (p.id === productId ? { ...p, ...updated } : p)),
    }))
    return true
  }

  async function handleToggleIgnoreWarning(
    field: 'ignore_expiry_warning' | 'ignore_stock_warning',
    value: boolean,
  ) {
    if (!product) return
    const { data: updated, error } = await supabase
      .from('products')
      .update({ [field]: value })
      .eq('id', product.id)
      .select('*')
      .single()

    if (error || !updated) {
      Alert.alert('Lỗi', 'Không thể lưu.')
      return
    }
    setProduct(updated)
    productSnapshotRef.current = updated.updated_at ?? productSnapshotRef.current
    useWarehouseStore.setState((s) => ({
      products: s.products.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
    }))
  }

  async function handleSaveThresholds(): Promise<boolean> {
    if (!product) return false
    const productId = product.id
    const days = parseInt(editWarningDays, 10)
    const boxes = parseInt(editLowWarningBoxes, 10)

    if (Number.isNaN(days) || days < 1) {
      Alert.alert('Lỗi', 'Ngưỡng cảnh báo hạn phải là số nguyên dương.')
      return false
    }
    if (Number.isNaN(boxes) || boxes < 1) {
      Alert.alert('Lỗi', 'Ngưỡng cảnh báo tồn phải là số nguyên dương.')
      return false
    }

    const { hasConflict, changedByName } = await checkConflict(
      'products',
      productId,
      productSnapshotRef.current,
    )
    if (hasConflict) {
      Alert.alert(
        'Có xung đột',
        `Sản phẩm vừa được ${changedByName ?? 'người khác'} cập nhật.\nBạn có muốn ghi đè không?`,
        [
          { text: 'Xem lại', style: 'cancel', onPress: handleConflictReview },
          {
            text: 'Ghi đè',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                const ok = await doSaveThresholds(days, boxes)
                if (ok) {
                  setOriginalWarningDays(editWarningDays)
                  setOriginalLowWarningBoxes(editLowWarningBoxes)
                  setIsEditingThresholds(false)
                }
              })()
            },
          },
        ],
      )
      return false
    }

    return doSaveThresholds(days, boxes)
  }

  async function applyCategoryL1(level1Id: string | null) {
    if (!product) return
    const productId = product.id
    setShowCategoryL1Picker(false)
    const prevL1 = product.category_level1_id ?? null
    const nextL1 = level1Id
    const nextL2 = nextL1 === prevL1 ? (product.category_level2_id ?? null) : null
    if (nextL1 === prevL1 && (product.category_level2_id ?? null) === (nextL2 ?? null)) {
      return
    }
    async function doApplyCategoryL1() {
      setCategorySaving(true)
      const res = await updateProductCategory(productId, {
        category_level1_id: nextL1,
        category_level2_id: nextL2,
      })
      setCategorySaving(false)
      if (res.error) {
        Alert.alert('Lỗi', res.error)
        return
      }
      if (res.product) {
        setProduct(res.product)
        productSnapshotRef.current = res.product.updated_at ?? productSnapshotRef.current
      }
    }

    const { hasConflict, changedByName } = await checkConflict(
      'products',
      productId,
      productSnapshotRef.current,
    )

    if (hasConflict) {
      Alert.alert(
        'Có xung đột',
        `Sản phẩm này vừa được ${changedByName ?? 'người khác'} cập nhật.\nBạn có muốn ghi đè không?`,
        [
          { text: 'Xem lại', style: 'cancel', onPress: handleConflictReview },
          { text: 'Ghi đè', style: 'destructive', onPress: () => void doApplyCategoryL1() },
        ],
      )
      return
    }

    await doApplyCategoryL1()
  }

  async function applyCategoryL2(level2Id: string | null) {
    if (!product) return
    if (!product.category_level1_id) return
    const productId = product.id
    const categoryLevel1Id = product.category_level1_id
    setShowCategoryL2Picker(false)
    const prevL2 = product.category_level2_id ?? null
    if ((level2Id ?? null) === (prevL2 ?? null)) return

    async function doApplyCategoryL2() {
      setCategorySaving(true)
      const res = await updateProductCategory(productId, {
        category_level1_id: categoryLevel1Id,
        category_level2_id: level2Id,
      })
      setCategorySaving(false)
      if (res.error) {
        Alert.alert('Lỗi', res.error)
        return
      }
      if (res.product) {
        setProduct(res.product)
        productSnapshotRef.current = res.product.updated_at ?? productSnapshotRef.current
      }
    }

    const { hasConflict, changedByName } = await checkConflict(
      'products',
      productId,
      productSnapshotRef.current,
    )

    if (hasConflict) {
      Alert.alert(
        'Có xung đột',
        `Sản phẩm này vừa được ${changedByName ?? 'người khác'} cập nhật.\nBạn có muốn ghi đè không?`,
        [
          { text: 'Xem lại', style: 'cancel', onPress: handleConflictReview },
          { text: 'Ghi đè', style: 'destructive', onPress: () => void doApplyCategoryL2() },
        ],
      )
      return
    }

    await doApplyCategoryL2()
  }

  function handleLocateLot(lot: InventoryEntry) {
    if (!product?.name) return
    const locationId = lot.zone?.location_id ?? zones.find((z) => z.id === lot.zone_id)?.location_id
    if (!locationId || !lot.zone_id) {
      Alert.alert('Thiếu thông tin', 'Không xác định được kho của lô này.')
      return
    }
    setLocateIntent({
      productName: product.name,
      locationId,
      zoneId: lot.zone_id,
    })
    navigation.getParent()?.navigate('Map' as never)
  }

  function handleAddNewLot() {
    if (isReadOnly) return
    // Prefill productId để AddInventoryScreen tự chọn sẵn sản phẩm
    const fallbackLot = lots[0]
    if (!fallbackLot?.zone_id || !fallbackLot?.zone?.name) {
      Alert.alert('Thiếu thông tin zone', 'Sản phẩm này chưa có lô để prefill zone/tầng.')
      return
    }

    navigation.navigate('AddInventory', {
      productId,
      zoneId: fallbackLot.zone_id,
      zoneName: fallbackLot.zone.name,
      zoneColor: fallbackLot.zone.color ?? colors.accent,
      tier: fallbackLot.tier,
    })
  }

  function showImageOptions() {
    if (isReadOnly) return
    if (!product) return

    const pickAndUpload = async (source: 'camera' | 'library') => {
      setIsUploadingImage(true)
      try {
        const uri = await pickImage(source)
        if (!uri) {
          setIsUploadingImage(false)
          return
        }
        const url = await uploadProductImage(product.id, uri)
        await updateProductImage(product.id, url)
        setProduct((prev) => (prev ? { ...prev, image_url: url } : prev))
        setIsUploadingImage(false)
      } catch {
        setIsUploadingImage(false)
        Alert.alert('Lỗi', 'Có lỗi khi tải ảnh lên')
      }
    }

    const options = ['Chụp ảnh', 'Chọn từ thư viện', 'Hủy']
    const cancelButtonIndex = 2

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) void pickAndUpload('camera')
          else if (buttonIndex === 1) void pickAndUpload('library')
        },
      )
    } else {
      Alert.alert('Chọn ảnh', undefined, [
        { text: 'Chụp ảnh', onPress: () => void pickAndUpload('camera') },
        { text: 'Chọn từ thư viện', onPress: () => void pickAndUpload('library') },
        { text: 'Hủy', style: 'cancel' },
      ])
    }
  }

  function handleDeleteImage() {
    if (isReadOnly) return
    if (!product) return

    Alert.alert('Xóa ảnh?', 'Ảnh sản phẩm sẽ bị xóa vĩnh viễn.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await removeProductImage(product.id)
              await deleteProductImage(product.id)
              setProduct((prev) => (prev ? { ...prev, image_url: undefined } : prev))
            } catch {
              Alert.alert('Lỗi', 'Có lỗi khi xóa ảnh')
            }
          })()
        },
      },
    ])
  }

  function handleArchiveToggle() {
    if (isReadOnly) return
    if (!product) return
    const nextArchived = !product.is_archived
    const isHiding = nextArchived

    Alert.alert(
      isHiding ? 'Ẩn sản phẩm?' : 'Khôi phục sản phẩm?',
      isHiding
        ? 'Sản phẩm sẽ không hiện trong danh sách. Bạn có thể khôi phục bất cứ lúc nào.'
        : 'Sản phẩm sẽ hiện lại trong danh sách sản phẩm.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: isHiding ? 'Ẩn' : 'Khôi phục',
          style: isHiding ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              const { data: updated, error } = await supabase
                .from('products')
                .update({ is_archived: nextArchived })
                .eq('id', product.id)
                .select('*')
                .single()

              if (error || !updated) {
                Alert.alert('Có lỗi xảy ra', 'Không thể cập nhật trạng thái sản phẩm. Vui lòng thử lại.')
                return
              }

              useWarehouseStore.setState((s) => ({
                products: nextArchived
                  ? s.products.filter((p) => p.id !== updated.id)
                  : s.products.map((p) => (p.id === updated.id ? updated : p)),
                // KI-059: sync nested product — Notifications fallback entries[0].product
                inventoryEntries: s.inventoryEntries.map((e) =>
                  e.product_id === updated.id ? { ...e, product: updated } : e,
                ),
              }))
              navigation.goBack()
            })()
          },
        },
      ],
    )
  }

  function handleDeleteProduct() {
    if (isReadOnly) return
    if (!product) return
    Alert.alert(
      'Xóa sản phẩm',
      `Bạn có chắc muốn xóa sản phẩm ${product.name}? Hành động này không thể hoàn tác.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteProduct(product.id)
                navigation.goBack()
              } catch (err) {
                if (__DEV__) console.error('[ProductDetail] deleteProduct failed:', err)
                const msg = err instanceof Error ? err.message : getErrorMessage(err, 'delete')
                Alert.alert('Không thể xóa', msg)
              }
            })()
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Chi tiết sản phẩm</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.sub }}>Đóng</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.imageBlock}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isUploadingImage}
            onPress={() => {
              if (isUploadingImage) return
              if (product?.image_url) {
                setViewingImage(true)
              } else if (canWrite) {
                showImageOptions()
              }
            }}
          >
            {isUploadingImage ? (
              <View style={[styles.imagePreview, styles.imagePlaceholder, { backgroundColor: colors.border }]}>
                <ActivityIndicator />
              </View>
            ) : product?.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <View style={[styles.imagePreview, styles.imagePlaceholder, { backgroundColor: colors.border }]}>
                <Text style={{ fontSize: 32 }}>📷</Text>
              </View>
            )}
          </TouchableOpacity>

          {canWrite && product?.image_url && !isUploadingImage && (
            <View style={styles.imageActionsRow}>
              <TouchableOpacity onPress={showImageOptions}>
                <Text style={{ color: colors.accent, fontSize: 13 }}>✏️ Đổi ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteImage}>
                <Text style={{ color: colors.statusExpired, fontSize: 13 }}>🗑️ Xóa ảnh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.productNameRow}>
            {isEditingName ? (
              <TextInput
                style={[
                  styles.productName,
                  styles.productNameInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
                ]}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                editable={!isSavingName}
                maxLength={200}
              />
            ) : (
              <Text style={[styles.productName, styles.productNameFlex, { color: colors.text }]}>
                {product?.name ?? 'Không xác định'}
              </Text>
            )}
            {canWrite ? (
              <TouchableOpacity
                style={[styles.nameEditBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                onPress={handleNameEditButtonPress}
                disabled={isSavingName}
              >
                <Text style={styles.nameEditBtnText}>{nameEditIcon}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {!!product?.notes && <Text style={[styles.infoText, { color: colors.sub }]}>Ghi chú: {product.notes}</Text>}
          <TouchableOpacity
            style={[styles.detailsToggleRow, { borderColor: colors.border, backgroundColor: colors.bg }]}
            onPress={() => setDetailsExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.detailsToggleLabel, { color: colors.text }]}>
              {detailsExpanded ? 'Thu gọn' : 'Chi tiết'}
            </Text>
            <Text style={[styles.detailsToggleArrow, { color: colors.sub }]}>{detailsExpanded ? '▴' : '▾'}</Text>
          </TouchableOpacity>
          {detailsExpanded && (
            <>
              <View style={styles.thresholdsHeaderRow}>
                <Text style={[styles.infoText, { color: colors.sub, marginTop: 0, flex: 1 }]}>
                  Ngưỡng cảnh báo · sắp hết
                </Text>
                {canWrite ? (
                  <TouchableOpacity
                    style={[styles.thresholdEditBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => void handleThresholdEditButtonPress()}
                  >
                    <Text
                      style={[
                        styles.thresholdEditBtnText,
                        isEditingThresholds && hasThresholdChanged ? { color: '#22C55E' } : null,
                      ]}
                    >
                      {!isEditingThresholds ? '✏️' : hasThresholdChanged ? '✓' : '✕'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {canWrite ? (
                <Text style={[styles.infoText, { color: colors.sub }]}>
                  Ngưỡng cảnh báo: {product?.warning_days ?? 30} ngày
                </Text>
              ) : (
                <Text style={[styles.infoText, { color: colors.sub }]}>
                  Ngưỡng cảnh báo: {product?.warning_days ?? 30} ngày
                </Text>
              )}
              {canWrite ? (
                <TextInput
                  style={[
                    styles.warningInput,
                    {
                      backgroundColor: colors.bg,
                      color: colors.text,
                      borderColor: colors.border,
                      opacity: isEditingThresholds ? 1 : 0.65,
                    },
                  ]}
                  value={editWarningDays}
                  onChangeText={setEditWarningDays}
                  editable={isEditingThresholds}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={colors.sub}
                  maxLength={4}
                />
              ) : (
                <Text style={[styles.infoText, { color: colors.text }]}>{product?.warning_days ?? 30} ngày</Text>
              )}
              {canWrite ? (
                <Text style={[styles.infoText, { color: colors.sub, marginTop: 10 }]}>
                  Ngưỡng cảnh báo sắp hết (đơn vị): {product?.low_warning_boxes ?? 3}
                </Text>
              ) : (
                <Text style={[styles.infoText, { color: colors.sub, marginTop: 10 }]}>
                  Ngưỡng cảnh báo sắp hết (đơn vị): {product?.low_warning_boxes ?? 3}
                </Text>
              )}
              {canWrite ? (
                <TextInput
                  style={[
                    styles.warningInput,
                    {
                      backgroundColor: colors.bg,
                      color: colors.text,
                      borderColor: colors.border,
                      opacity: isEditingThresholds ? 1 : 0.65,
                    },
                  ]}
                  value={editLowWarningBoxes}
                  onChangeText={setEditLowWarningBoxes}
                  editable={isEditingThresholds}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor={colors.sub}
                  maxLength={6}
                />
              ) : (
                <Text style={[styles.infoText, { color: colors.text }]}>{product?.low_warning_boxes ?? 3} đơn vị</Text>
              )}

              {/* F32 — bỏ qua cảnh báo per SP */}
              <View style={[styles.ignoreWarningRow, { borderColor: colors.border }]}>
                <Text style={[styles.ignoreWarningLabel, { color: colors.text }]}>
                  Bỏ qua cảnh báo hết hạn
                </Text>
                <Switch
                  value={product?.ignore_expiry_warning === true}
                  onValueChange={(v) => void handleToggleIgnoreWarning('ignore_expiry_warning', v)}
                  disabled={!canWrite}
                  trackColor={{ false: '#ccc', true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.ignoreWarningRow, { borderColor: colors.border }]}>
                <Text style={[styles.ignoreWarningLabel, { color: colors.text }]}>
                  Bỏ qua cảnh báo hết hàng
                </Text>
                <Switch
                  value={product?.ignore_stock_warning === true}
                  onValueChange={(v) => void handleToggleIgnoreWarning('ignore_stock_warning', v)}
                  disabled={!canWrite}
                  trackColor={{ false: '#ccc', true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={[styles.infoText, { color: colors.sub, marginTop: 12 }]}>Nhóm (Cấp 1)</Text>
              {canWrite ? (
                <>
                  <Pressable
                    style={[styles.selectBtn, { backgroundColor: colors.bg, borderColor: colors.border, marginTop: 6 }]}
                    onPress={() => {
                      setShowCategoryL1Picker((v) => !v)
                      setShowCategoryL2Picker(false)
                    }}
                  >
                    <Text style={{ color: colors.text }}>
                      {categorySaving
                        ? '...'
                        : !product?.category_level1_id
                          ? 'Không phân loại'
                          : productCategoriesL1.find((c) => c.id === product.category_level1_id)?.name ?? 'Không phân loại'}
                    </Text>
                  </Pressable>
                  {showCategoryL1Picker && (
                    <View style={[styles.optionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <TouchableOpacity
                        style={[styles.optionRow, { borderBottomColor: colors.border }]}
                        onPress={() => void applyCategoryL1(null)}
                      >
                        <Text style={{ color: colors.text }}>Không phân loại</Text>
                      </TouchableOpacity>
                      {productCategoriesL1.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.optionRow, { borderBottomColor: colors.border }]}
                          onPress={() => void applyCategoryL1(cat.id)}
                        >
                          <Text style={{ color: colors.text }}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <Text style={[styles.infoText, { color: colors.text, marginTop: 4 }]}>
                  {!product?.category_level1_id
                    ? 'Không phân loại'
                    : productCategoriesL1.find((c) => c.id === product.category_level1_id)?.name ?? 'Không phân loại'}
                </Text>
              )}

              {!!product?.category_level1_id && (
                <>
                  <Text style={[styles.infoText, { color: colors.sub, marginTop: 10 }]}>Loại (Cấp 2)</Text>
                  {canWrite ? (
                    <>
                      <Pressable
                        style={[styles.selectBtn, { backgroundColor: colors.bg, borderColor: colors.border, marginTop: 6 }]}
                        onPress={() => {
                          setShowCategoryL2Picker((v) => !v)
                          setShowCategoryL1Picker(false)
                        }}
                      >
                        <Text style={{ color: colors.text }}>
                          {categorySaving
                            ? '...'
                            : !product?.category_level2_id
                              ? 'Không phân loại'
                              : productCategoriesL2.find((c) => c.id === product.category_level2_id)?.name ?? 'Không phân loại'}
                        </Text>
                      </Pressable>
                      {showCategoryL2Picker && (
                        <View style={[styles.optionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                          <TouchableOpacity
                            style={[styles.optionRow, { borderBottomColor: colors.border }]}
                            onPress={() => void applyCategoryL2(null)}
                          >
                            <Text style={{ color: colors.text }}>Không phân loại</Text>
                          </TouchableOpacity>
                          {categoryL2Options.map((cat) => (
                            <TouchableOpacity
                              key={cat.id}
                              style={[styles.optionRow, { borderBottomColor: colors.border }]}
                              onPress={() => void applyCategoryL2(cat.id)}
                            >
                              <Text style={{ color: colors.text }}>{cat.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={[styles.infoText, { color: colors.text, marginTop: 4 }]}>
                      {!product?.category_level2_id
                        ? 'Không phân loại'
                        : productCategoriesL2.find((c) => c.id === product.category_level2_id)?.name ?? 'Không phân loại'}
                    </Text>
                  )}
                </>
              )}
            </>
          )}
        </View>

        <View style={[styles.barcodeSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.barcodeSectionHeader}
            onPress={() => setBarcodeSectionExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.barcodeSectionTitle, { color: colors.text }]}>
              Mã vạch đã dùng ({productBarcodes.length})
            </Text>
            <Text style={[styles.barcodeChevron, { color: colors.sub }]}>
              {barcodeSectionExpanded ? '⌃' : '⌄'}
            </Text>
          </TouchableOpacity>
          {barcodeSectionExpanded ? (
            <View style={[styles.barcodeSectionBody, { borderTopColor: colors.border }]}>
              {barcodesLoading && productBarcodes.length === 0 ? (
                <ActivityIndicator color={colors.accent} style={{ marginVertical: 8 }} />
              ) : productBarcodes.length === 0 ? (
                <Text style={[styles.barcodeEmpty, { color: colors.sub }]}>Chưa có mã vạch nào được ghi nhận</Text>
              ) : (
                productBarcodes.map((row) => (
                  <View key={row.id} style={[styles.barcodeRow, { borderTopColor: colors.border }]}>
                    <View style={styles.barcodeRowMain}>
                      <Text style={[styles.barcodeValue, { color: colors.text }]}>{row.barcode}</Text>
                    </View>
                    {canWrite ? (
                      <View style={styles.barcodeRowActions}>
                        <TouchableOpacity
                          style={[styles.barcodeActionBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                          onPress={() => openEditBarcodeManual(row.id, row.barcode)}
                        >
                          <Text style={styles.barcodeActionText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.barcodeActionBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                          onPress={() => openEditBarcodeScan(row.id)}
                        >
                          <Text style={styles.barcodeActionText}>📷</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.barcodeActionBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                          onPress={() => confirmDeleteBarcode(row)}
                        >
                          <Text style={styles.barcodeActionText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
              {canWrite ? (
                <TouchableOpacity
                  style={[styles.barcodeAddBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                  onPress={openAddBarcodeChooser}
                >
                  <Text style={{ color: colors.accent, fontWeight: '600' }}>+ Thêm mã vạch</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={[styles.lotsToolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.totalBoxesToolbar, { color: colors.text }]}>
            Tổng {formatSplitQtyLabel(lotQtySplit.warehouse, lotQtySplit.market)}
          </Text>
          <View style={styles.issuesToggleInner}>
            <Text style={{ color: colors.sub, fontSize: 13 }}>Có vấn đề</Text>
            <Switch
              value={showIssuesOnly}
              onValueChange={setShowIssuesOnly}
              trackColor={{ false: '#ccc', true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {canWrite ? (
          <TouchableOpacity style={[styles.addLotBtn, { backgroundColor: colors.accent }]} onPress={handleAddNewLot}>
            <Text style={[styles.addLotBtnText, { color: colors.card }]}>Thêm lô hàng mới</Text>
          </TouchableOpacity>
        ) : null}

        {isLoading ? (
          <Text style={{ color: colors.sub }}>Đang tải...</Text>
        ) : lots.length === 0 ? (
          <Text style={{ color: colors.sub }}>Chưa có lô hàng cho sản phẩm này.</Text>
        ) : displayedLots.length === 0 ? (
          <Text style={{ color: colors.sub }}>Không có lô đỏ/vàng (đang bật lọc Có vấn đề).</Text>
        ) : (
          displayedLots.map((lot) => {
            const isExpiredLot = isExpiredBeforeToday(lot.expiry_date)
            const status = getCombinedStatus(
              lot.quantity_boxes,
              lot.expiry_date,
              product?.low_warning_boxes ?? 3,
              1,
              product?.warning_days ?? 30
            )
            const dotColor = getDisplayColor(
              status,
              colors,
              expiryWarningEnabled,
              lowStockWarningEnabled,
              getDisplayColorContextFromEntry(lot, product ?? lot.product),
            )
            const zoneResolved = (lot.zone as Zone | undefined) ?? zones.find((z) => z.id === lot.zone_id)
            const locType = locationTypeOfEntry(
              { zone: zoneResolved ?? lot.zone },
              locationById,
            )
            const locationName = zoneResolved?.location_id
              ? locationById.get(zoneResolved.location_id)?.name
              : undefined
            const lotPlaceTitle = `${locationName ?? '—'} · ${zoneResolved?.name ?? '—'} · Tầng ${lot.tier}`
            const lotUnit = qtyUnitForLocationType(locType)
            return (
              <View key={lot.id} style={[styles.lotWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {lot.quantity_boxes === 0 && (
                  <View style={[styles.depletedRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.depletedLabel, { color: colors.sub }]}>Lô này đã hết hàng</Text>
                    {canWrite ? (
                      <TouchableOpacity onPress={() => handleDeleteLot(lot)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={[styles.deleteLotLink, { color: colors.statusCritical }]}>Xóa lô</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
                {isExpiredLot && (
                  <View style={[styles.depletedRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.depletedLabel, { color: colors.sub }]}>Lô này đã hết hạn</Text>
                    {canWrite && lot.quantity_boxes === 0 ? (
                      <TouchableOpacity onPress={() => handleDeleteLot(lot)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={[styles.deleteLotLink, { color: colors.statusCritical }]}>Xóa lô</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
                <View style={styles.lotRow}>
                  <TouchableOpacity
                    style={styles.lotMain}
                    activeOpacity={0.75}
                    onPress={() => openInlineEdit(lot)}
                    disabled={isReadOnly}
                  >
                    <Text style={[styles.lotTitle, { color: colors.text }]}>{lotPlaceTitle}</Text>
                    <Text style={[styles.lotSub, { color: colors.sub }]}>
                      {lot.quantity_boxes} {lotUnit} · Hạn: {formatExpiryDate(lot.expiry_date)}
                    </Text>
                    {!!lot.barcode && <Text style={[styles.lotSub, { color: colors.sub }]}>Barcode: {lot.barcode}</Text>}
                    {!!lot.notes && <Text style={[styles.lotSub, { color: colors.sub }]}>{lot.notes}</Text>}
                  </TouchableOpacity>
                  <View style={styles.lotActions}>
                    <View style={[styles.expiryDot, { backgroundColor: dotColor }]} />
                    {canWrite ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                        onPress={() => openInlineEdit(lot)}
                      >
                        <Text style={styles.deleteBtnText}>✏️</Text>
                      </TouchableOpacity>
                    ) : null}
                    {lot.quantity_boxes > 0 && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                        onPress={() => handleLocateLot(lot)}
                      >
                        <Text style={styles.deleteBtnText}>📍</Text>
                      </TouchableOpacity>
                    )}
                    {canWrite && lot.quantity_boxes === 0 ? (
                      <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                        onPress={() => handleDeleteLot(lot)}
                      >
                        <Text style={styles.deleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {canWrite && editingLotId === lot.id && (
                  <View style={[styles.editBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                    <Text style={[styles.editLabel, { color: colors.sub }]}>Số {editingLotUnit}</Text>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      keyboardType="numeric"
                      value={editQuantity}
                      onChangeText={setEditQuantity}
                      placeholder="1"
                      placeholderTextColor={colors.sub}
                      maxLength={6}
                    />

                    <Text style={[styles.editLabel, { color: colors.sub }]}>Hạn sử dụng (DD/MM/YYYY)</Text>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      value={editExpiryDate}
                      onChangeText={setEditExpiryDate}
                      placeholder="30/12/2026"
                      placeholderTextColor={colors.sub}
                      keyboardType="default"
                      maxLength={10}
                    />

                    <Text style={[styles.editLabel, { color: colors.sub }]}>Ghi chú</Text>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      value={editNotes}
                      onChangeText={setEditNotes}
                      placeholder="Optional"
                      placeholderTextColor={colors.sub}
                      maxLength={500}
                    />

                    <Text style={[styles.editLabel, { color: colors.sub }]}>Barcode lô</Text>
                    <View style={styles.lotBarcodeRow}>
                      <TextInput
                        style={[styles.lotBarcodeInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                        value={editLotBarcode}
                        onChangeText={setEditLotBarcode}
                        placeholder="Optional"
                        placeholderTextColor={colors.sub}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={50}
                      />
                      <TouchableOpacity
                        style={[styles.scanBarcodeBtn, { backgroundColor: colors.accent }]}
                        onPress={() => navigation.navigate('BarcodeScanner', {
                          mode: 'search',
                          onScanFillBarcode: (barcode: string) => {
                            setEditingLotId(lot.id)
                            setEditLotBarcode(barcode.trim())
                          },
                        })}
                      >
                        <Text style={[styles.scanBarcodeText, { color: colors.card }]}>📷</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={[styles.cancelBtn, { backgroundColor: colors.card }]}
                        onPress={() => setEditingLotId(null)}
                      >
                        <Text style={{ color: colors.sub }}>Huỷ</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={() => handleSaveLot(lot)}>
                        <Text style={{ color: colors.card, fontWeight: '700' }}>Lưu</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )
          })
        )}

        {/* SEC-11: Section Lịch sử thay đổi */}
        {auditEntries.length > 0 && (
          <View style={[styles.auditSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.auditHeader}>
              <Text style={[styles.auditTitle, { color: colors.text }]}>Lịch sử thay đổi</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AuditLog', { filterProductId: productId })}>
                <Text style={[styles.auditViewAll, { color: colors.accent }]}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>
            {auditEntries.map((entry) => {
              const ignored = new Set(['updated_at', 'created_at'])
              const fields = entry.old_data && entry.new_data
                ? Object.keys(entry.new_data).filter((k) => !ignored.has(k) && JSON.stringify(entry.old_data![k]) !== JSON.stringify(entry.new_data![k]))
                : []
              const icon = entry.action === 'INSERT' ? '➕' : entry.action === 'UPDATE' ? '✏️' : '🗑️'
              const tableLabel = entry.table_name === 'inventory_entries' ? 'Lô hàng' : 'Sản phẩm'
              const time = new Date(entry.changed_at)
              const pad = (n: number) => String(n).padStart(2, '0')
              const timeStr = `${pad(time.getDate())}/${pad(time.getMonth() + 1)} ${pad(time.getHours())}:${pad(time.getMinutes())}`
              return (
                <View key={entry.id} style={[styles.auditEntry, { borderColor: colors.border }]}>
                  <Text style={styles.auditIcon}>{icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.auditEntryText, { color: colors.text }]}>
                      {entry.changed_by_name ?? 'Không rõ'} · {tableLabel} · {timeStr}
                    </Text>
                    {fields.length > 0 && (
                      <Text style={[styles.auditFieldsText, { color: colors.sub }]}>{fields.join(', ')}</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {canWrite ? (
          <View style={styles.productActionsRow}>
            <TouchableOpacity
              style={[
                styles.archiveProductBtn,
                {
                  borderColor: product?.is_archived ? colors.statusOk : colors.statusWarning,
                  backgroundColor: colors.card,
                },
              ]}
              onPress={handleArchiveToggle}
            >
              <Text
                style={[
                  styles.archiveProductBtnText,
                  { color: product?.is_archived ? colors.statusOk : colors.statusWarning },
                ]}
              >
                {product?.is_archived ? 'Khôi phục sản phẩm' : 'Ẩn sản phẩm'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteProductBtn, { borderColor: colors.statusExpired, backgroundColor: colors.card }]}
              onPress={handleDeleteProduct}
            >
              <Text style={[styles.deleteProductBtnText, { color: colors.statusExpired }]}>Xóa sản phẩm</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>

      <ImageViewerModal
        uri={viewingImage && product?.image_url ? product.image_url : null}
        onClose={() => setViewingImage(false)}
        onChangeImage={
          canWrite
            ? () => {
                setViewingImage(false)
                showImageOptions()
              }
            : undefined
        }
      />

      <Modal
        visible={barcodeInputModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBarcodeInputModalOpen(false)}
      >
        <Pressable style={styles.barcodeModalOverlay} onPress={() => setBarcodeInputModalOpen(false)}>
          <Pressable
            style={[styles.barcodeModalBox, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.barcodeModalTitle, { color: colors.text }]}>
              {barcodeInputTargetId ? 'Sửa mã vạch' : 'Nhập mã vạch'}
            </Text>
            <TextInput
              style={[
                styles.barcodeModalInput,
                { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border },
              ]}
              value={barcodeInputValue}
              onChangeText={setBarcodeInputValue}
              placeholder="Mã vạch"
              placeholderTextColor={colors.sub}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              maxLength={50}
            />
            <View style={styles.barcodeModalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.bg }]}
                onPress={() => setBarcodeInputModalOpen(false)}
              >
                <Text style={{ color: colors.sub }}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                onPress={submitBarcodeInputModal}
              >
                <Text style={{ color: colors.card, fontWeight: '700' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '700' },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  content: { padding: 16, paddingBottom: 20 },
  imageBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageActionsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  productActionsRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 16,
    gap: 10,
  },
  archiveProductBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  archiveProductBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteProductBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteProductBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  detailsToggleRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailsToggleLabel: { fontSize: 14, fontWeight: '600' },
  detailsToggleArrow: { fontSize: 14, fontWeight: '700' },
  lotsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  totalBoxesToolbar: { fontSize: 15, fontWeight: '700' },
  issuesToggleInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  productName: { fontSize: 18, fontWeight: '700' },
  productNameFlex: { flex: 1 },
  productNameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nameEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameEditBtnText: { fontSize: 14 },
  barcodeSection: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  barcodeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  barcodeSectionTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  barcodeChevron: { fontSize: 14, marginLeft: 8 },
  barcodeSectionBody: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 4,
  },
  barcodeAddBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  barcodeEmpty: { fontSize: 13, fontStyle: 'italic' },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  barcodeRowMain: { flex: 1, minWidth: 0 },
  barcodeValue: { fontSize: 15, fontWeight: '400' },
  barcodeRowActions: { flexDirection: 'row', gap: 6 },
  barcodeActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeActionText: { fontSize: 14 },
  barcodeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  barcodeModalBox: { borderRadius: 14, padding: 16 },
  barcodeModalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  barcodeModalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  barcodeModalActions: { flexDirection: 'row', gap: 10 },
  infoText: { fontSize: 13, marginTop: 2 },
  thresholdsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  ignoreWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  ignoreWarningLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  thresholdEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thresholdEditBtnText: { fontSize: 11 },
  warningInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 8 },
  scanBarcodeBtn: {
    width: 40,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBarcodeText: { fontSize: 16 },
  lotBarcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  lotBarcodeInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  addLotBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 14 },
  addLotBtnText: { fontWeight: '700' },
  lotWrap: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  depletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  depletedLabel: { flex: 1, fontSize: 13, marginRight: 8 },
  deleteLotLink: { fontSize: 13, fontWeight: '700' },
  lotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lotMain: { flex: 1, marginRight: 8 },
  lotTitle: { fontSize: 14, fontWeight: '700' },
  lotSub: { fontSize: 12, marginTop: 2 },
  lotActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expiryDot: { width: 10, height: 10, borderRadius: 5 },
  actionBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 11 },
  editBox: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 10 },
  editLabel: { fontSize: 12, marginBottom: 4 },
  editInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  selectBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  optionsWrap: { borderWidth: 1, borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  optionRow: { borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  auditSection: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 },
  auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  auditTitle: { fontSize: 15, fontWeight: '700' },
  auditViewAll: { fontSize: 13, fontWeight: '600' },
  auditEntry: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth },
  auditIcon: { fontSize: 14, marginRight: 8, marginTop: 1 },
  auditEntryText: { fontSize: 13 },
  auditFieldsText: { fontSize: 12, marginTop: 1, fontStyle: 'italic' },
})
