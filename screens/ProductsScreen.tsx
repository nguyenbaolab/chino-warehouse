import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import ImageViewerModal from '../components/ImageViewerModal'
import LotPickerModal from '../components/LotPickerModal'
import FilterModal, { formatFilterSummary, type FilterMode } from '../components/FilterModal'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { useWarningStore } from '../stores/warningStore'
import {
  CombinedStatus,
  formatExpiryDate,
  getCombinedStatus,
  getCombinedStatusRank,
  InventoryEntry,
  Location,
  Product,
  Zone,
} from '../types'
import {
  getDisplayColor,
  getDisplayColorContextFromEntry,
  getWorstDisplayColorForEntries,
} from '../utils/statusUtils'
import { supabase } from '../lib/supabase'
import { normalizeText } from '../utils/textUtils'
import { pickImage, uploadProductImage } from '../utils/imageUtils'
import {
  formatSplitQtyLabel,
  locationTypeOfEntry,
  qtyUnitForLocationType,
} from '../utils/qtyUnitUtils'
import { useCanWrite, useIsReadOnly } from '../stores/authStore'

const PAGE_SIZE = 10
/** UUID sentinel — SP chưa tạo; mọi barcode đã gán SP khác đều là conflict. */
const NEW_PRODUCT_CONFLICT_SENTINEL = '00000000-0000-0000-0000-000000000000'

export default function ProductsScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const {
    products,
    productsPage,
    productsPageLoading,
    inventoryEntries,
    productCategoriesL1,
    productCategoriesL2,
    pickingLists,
    pickingListItems,
    fetchProducts,
    fetchProductsPage,
    fetchInventoryByLocation,
    fetchAllInventoryEntries,
    fetchCategories,
    fetchPickingLists,
    createPickingList,
    addPickingItem,
    addProduct,
    updateProductImage,
    checkBarcodeConflict,
    upsertProductBarcode,
    logBarcodeConflict,
    lookupProductByBarcode,
  } = useWarehouseStore()
  const { colors } = useThemeStore()
  const { expiryWarningEnabled, lowStockWarningEnabled } = useWarningStore()
  const canWrite = useCanWrite()
  const isReadOnly = useIsReadOnly()
  const [searchQuery, setSearchQuery] = useState('')
  /** Debounced search cho KI-040 server-side */
  const [debouncedSearch, setDebouncedSearch] = useState('')
  /** null = Tất cả zone (chỉ khi đã chọn kho cụ thể) */
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [showArchived, setShowArchived] = useState(false)
  const [showOutOfStockOnly, setShowOutOfStockOnly] = useState(false)
  const [showSpecialOnly, setShowSpecialOnly] = useState(false)
  const [showNoImageOnly, setShowNoImageOnly] = useState(false)

  const [scannedLotId, setScannedLotId] = useState<string | null>(null)
  const [viewingImage, setViewingImage] = useState<{ uri: string; productId: string } | null>(null)
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null)

  /** FilterModal — mặc định Tất cả (catalog đủ cả 2 mode) */
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [filterLocationId, setFilterLocationId] = useState<string | null>(null)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filterLocations, setFilterLocations] = useState<Location[]>([])
  /** false khi đang fetch locations theo filterMode (tránh dùng list kho cũ) */
  const [filterLocationsReady, setFilterLocationsReady] = useState(true)
  /** All locations — đơn vị thùng/sản phẩm theo type (cách A) */
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [zonesForFilterLoc, setZonesForFilterLoc] = useState<Zone[]>([])
  /** false khi đang fetch zones của kho đã chọn (tránh Set zone rỗng lọc hết mọi lô) */
  const [filterZonesReady, setFilterZonesReady] = useState(true)
  /** Zone IDs thuộc filterMode khi chưa chọn kho cụ thể (null khi Mode = all) */
  const [modeZoneIds, setModeZoneIds] = useState<Set<string> | null>(null)

  const [showCreateProductModal, setShowCreateProductModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createBarcode, setCreateBarcode] = useState('')
  const [createNotes, setCreateNotes] = useState('')
  const [createImageUri, setCreateImageUri] = useState<string | null>(null)
  const [createCategoryL1Id, setCreateCategoryL1Id] = useState<string | null>(null)
  const [createCategoryL2Id, setCreateCategoryL2Id] = useState<string | null>(null)
  const [showCreateCatL1, setShowCreateCatL1] = useState(false)
  const [showCreateCatL2, setShowCreateCatL2] = useState(false)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [isUploadingCreateImage, setIsUploadingCreateImage] = useState(false)
  const [existingProductWarning, setExistingProductWarning] = useState<string | null>(null)
  const [createBarcodeWarning, setCreateBarcodeWarning] = useState<string | null>(null)
  const [cartProduct, setCartProduct] = useState<Product | null>(null)
  const [cartLots, setCartLots] = useState<InventoryEntry[]>([])
  const [cartPickingListId, setCartPickingListId] = useState<string | null>(null)
  const [showCartModal, setShowCartModal] = useState(false)
  const flatListRef = useRef<FlatList<Product>>(null)

  useEffect(() => {
    if (useWarehouseStore.getState().productCategoriesL1.length === 0) {
      void fetchCategories()
    }
  }, [fetchCategories])

  useEffect(() => {
    void fetchPickingLists()
  }, [fetchPickingLists])

  useEffect(() => {
    if (!showCreateProductModal) return
    if (useWarehouseStore.getState().productCategoriesL1.length === 0) {
      void fetchCategories()
    }
  }, [showCreateProductModal, fetchCategories])

  // Catalog full (không archived) — dùng khi resolve + tạo SP
  useEffect(() => {
    if (showArchived) return
    void fetchProducts()
  }, [fetchProducts, showArchived])

  // All locations cho đơn vị theo type (không phụ thuộc filterMode / appMode)
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

  const locationById = useMemo(
    () => new Map(allLocations.map((l) => [l.id, l])),
    [allLocations],
  )

  // KI-040: debounce search 300ms trước khi gọi server
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // KI-040: productsPage = catalog base (search/archived/no-image)
  useEffect(() => {
    void fetchProductsPage({
      page: 0,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      showArchived,
      showNoImageOnly,
    })
  }, [fetchProductsPage, debouncedSearch, showArchived, showNoImageOnly])

  // FilterModal: danh sách kho theo filterMode (all = mọi type) — clear stale trước khi fetch
  useEffect(() => {
    let cancelled = false
    setFilterLocations([])
    setFilterLocationsReady(false)
    async function loadFilterLocations() {
      let query = supabase.from('locations').select('*').order('name')
      if (filterMode !== 'all') query = query.eq('type', filterMode)
      const { data } = await query
      if (!cancelled) {
        setFilterLocations((data as Location[]) ?? [])
        setFilterLocationsReady(true)
      }
    }
    void loadFilterLocations()
    return () => {
      cancelled = true
    }
  }, [filterMode])

  // Đổi mode filter → reset kho + zone
  useEffect(() => {
    setFilterLocationId(null)
    setSelectedZoneId(null)
  }, [filterMode])

  // Mode all hoặc đã chọn kho → không dùng modeZoneIds
  useEffect(() => {
    if (filterMode === 'all' || filterLocationId) {
      setModeZoneIds(null)
      return
    }
    if (!filterLocationsReady) {
      setModeZoneIds(null)
      return
    }
    const locIds = filterLocations.map((l) => l.id)
    if (locIds.length === 0) {
      setModeZoneIds(new Set())
      return
    }
    let cancelled = false
    void supabase
      .from('zones')
      .select('id')
      .in('location_id', locIds)
      .then(({ data }) => {
        if (!cancelled) {
          setModeZoneIds(new Set(((data as { id: string }[]) ?? []).map((z) => z.id)))
        }
      })
    return () => {
      cancelled = true
    }
  }, [filterMode, filterLocations, filterLocationId, filterLocationsReady])

  // KI-064: đảm bảo inventoryEntries đủ cho filter Mode/Kho (không phụ thuộc Map realtime)
  useEffect(() => {
    if (filterLocationId) {
      void fetchInventoryByLocation(filterLocationId)
      return
    }
    // all | warehouse | market chưa chọn kho → cần full entries để match modeZoneIds
    void fetchAllInventoryEntries()
  }, [filterMode, filterLocationId, fetchInventoryByLocation, fetchAllInventoryEntries])

  useEffect(() => {
    if (!filterLocationId) {
      setZonesForFilterLoc([])
      setFilterZonesReady(true)
      return
    }
    setFilterZonesReady(false)
    let cancelled = false
    void supabase
      .from('zones')
      .select('*')
      .eq('location_id', filterLocationId)
      .order('name')
      .then(({ data }) => {
        if (!cancelled) {
          setZonesForFilterLoc((data as Zone[]) ?? [])
          setFilterZonesReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [filterLocationId])

  useEffect(() => {
    setSelectedZoneId(null)
  }, [filterLocationId])

  useEffect(() => {
    setCurrentPage(0)
  }, [searchQuery, filterMode, filterLocationId, selectedZoneId, showOutOfStockOnly, showSpecialOnly, showArchived, showNoImageOnly])

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
  }, [currentPage])

  useEffect(() => {
    const scannedInventoryEntryId: string | undefined = route.params?.scannedInventoryEntryId
    if (!scannedInventoryEntryId) return
    const lot = inventoryEntries.find((entry) => entry.id === scannedInventoryEntryId)
    if (lot) {
      setScannedLotId(lot.id)
      setSelectedZoneId(lot.zone_id)
      setSearchQuery(lot.product?.name ?? '')
    }
    navigation.setParams({
      scannedInventoryEntryId: undefined,
      scannedBarcode: undefined,
      scannedAt: undefined,
    })
  }, [route.params?.scannedInventoryEntryId, route.params?.scannedBarcode, route.params?.scannedAt, inventoryEntries, navigation])

  function clearSearch() {
    setSearchQuery('')
    setScannedLotId(null)
    setSelectedZoneId(null)
  }

  const locationZoneSet = useMemo(() => {
    if (!filterLocationId || !filterZonesReady) return null
    return new Set(zonesForFilterLoc.map((z) => z.id))
  }, [filterLocationId, filterZonesReady, zonesForFilterLoc])

  /** Có lọc Mode/Kho/Zone → list theo SP có lô trong scope; Không → catalog đủ */
  const placeFilterActive =
    filterMode !== 'all' || filterLocationId != null || selectedZoneId != null

  const placeFilterReady =
    !(filterMode !== 'all' && !filterLocationId && (!filterLocationsReady || modeZoneIds === null)) &&
    !(filterLocationId != null && !filterZonesReady)

  const filterSummary = formatFilterSummary({
    mode: filterMode,
    locationId: filterLocationId,
    zoneId: selectedZoneId,
    locations: filterLocations,
    zones: zonesForFilterLoc,
  })

  const productById = useMemo(() => {
    const map = new Map<string, Product>()
    for (const p of products) map.set(p.id, p)
    for (const p of productsPage) map.set(p.id, p)
    for (const entry of inventoryEntries) {
      if (entry.product?.id) map.set(entry.product.id, entry.product)
    }
    return map
  }, [products, productsPage, inventoryEntries])

  function entryInFilterScope(entry: { zone_id: string }): boolean {
    if (selectedZoneId != null && entry.zone_id !== selectedZoneId) return false
    // Đã chọn kho nhưng zone set chưa sẵn → chưa match
    if (filterLocationId && locationZoneSet === null) return false
    if (locationZoneSet && !locationZoneSet.has(entry.zone_id)) return false
    if (!locationZoneSet && modeZoneIds && !modeZoneIds.has(entry.zone_id)) return false
    return true
  }

  const qtySplitByProduct = useMemo(() => {
    const map = new Map<string, { warehouse: number; market: number; total: number }>()
    for (const entry of inventoryEntries) {
      if (!entryInFilterScope(entry)) continue
      const locType = locationTypeOfEntry(entry, locationById)
      const prev = map.get(entry.product_id) ?? { warehouse: 0, market: 0, total: 0 }
      if (locType === 'warehouse') prev.warehouse += entry.quantity_boxes
      else prev.market += entry.quantity_boxes
      prev.total = prev.warehouse + prev.market
      map.set(entry.product_id, prev)
    }
    return map
  }, [inventoryEntries, selectedZoneId, filterLocationId, locationZoneSet, modeZoneIds, locationById])

  const filteredProducts = useMemo(() => {
    if (placeFilterActive && !placeFilterReady) return []

    const searchNorm = normalizeText(debouncedSearch.trim())
    const looksLikeBarcode = /^\d{4,}$/.test(debouncedSearch.trim())

    let candidates: Product[]
    if (!placeFilterActive) {
      // Mode Tất cả + không chọn kho/zone → catalog đủ (kể cả chưa có lô)
      candidates = [...productsPage]
    } else {
      // Mode Kho/Siêu thị hoặc kho/zone → chỉ SP có lô trong scope
      const idsInScope = new Set<string>()
      for (const entry of inventoryEntries) {
        if (entryInFilterScope(entry)) idsInScope.add(entry.product_id)
      }
      candidates = []
      for (const id of idsInScope) {
        const product = productById.get(id)
        if (product) candidates.push(product)
      }
    }

    const list: Product[] = []
    for (const product of candidates) {
      if (showArchived) {
        if (!product.is_archived) continue
      } else if (product.is_archived) {
        continue
      }
      if (showNoImageOnly && product.image_url) continue

      if (showOutOfStockOnly && (qtySplitByProduct.get(product.id)?.total ?? 0) !== 0) {
        continue
      }
      if (showSpecialOnly) {
        const hasSpecial = inventoryEntries.some((entry) => {
          if (entry.product_id !== product.id || !entry.is_special) return false
          return entryInFilterScope(entry)
        })
        if (!hasSpecial) continue
      }

      if (searchNorm && looksLikeBarcode) {
        const nameOk = normalizeText(product.name).includes(searchNorm)
        const barcodeOk = inventoryEntries.some(
          (entry) =>
            entry.product_id === product.id &&
            entry.barcode &&
            entry.barcode.toLowerCase().includes(debouncedSearch.trim().toLowerCase()),
        )
        if (!nameOk && !barcodeOk) continue
      } else if (searchNorm && placeFilterActive) {
        // Inventory-scoped list: search tên local (productsPage đã search khi catalog)
        if (!normalizeText(product.name).includes(searchNorm)) continue
      }

      list.push(product)
    }

    list.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    return list
  }, [
    placeFilterActive,
    placeFilterReady,
    productsPage,
    productById,
    inventoryEntries,
    selectedZoneId,
    filterLocationId,
    locationZoneSet,
    modeZoneIds,
    showArchived,
    showNoImageOnly,
    showOutOfStockOnly,
    showSpecialOnly,
    qtySplitByProduct,
    debouncedSearch,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const pagedProducts = useMemo(
    () => filteredProducts.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filteredProducts, currentPage],
  )
  const canGoPrev = currentPage > 0
  const canGoNext = currentPage < totalPages - 1
  const hasPaginationFooter = filteredProducts.length > PAGE_SIZE
  const fabBottom = hasPaginationFooter ? 80 : 28

  const createCategoryL2Options = useMemo(() => {
    if (!createCategoryL1Id) return []
    return productCategoriesL2.filter((c) => c.level1_id === createCategoryL1Id)
  }, [createCategoryL1Id, productCategoriesL2])

  const createNameSuggestions = useMemo(() => {
    const query = normalizeText(createName.trim())
    if (!query) return []
    return products.filter((p) => normalizeText(p.name).includes(query)).slice(0, 8)
  }, [products, createName])

  const createSaveBlocked = !!existingProductWarning || !!createBarcodeWarning

  function resetCreateForm() {
    setCreateName('')
    setCreateBarcode('')
    setCreateNotes('')
    setCreateImageUri(null)
    setCreateCategoryL1Id(null)
    setCreateCategoryL2Id(null)
    setShowCreateCatL1(false)
    setShowCreateCatL2(false)
    setExistingProductWarning(null)
    setCreateBarcodeWarning(null)
  }

  function closeCreateProductModal() {
    setShowCreateProductModal(false)
    resetCreateForm()
  }

  function showCreateImageOptions() {
    const pick = async (source: 'camera' | 'library') => {
      const uri = await pickImage(source)
      if (uri) setCreateImageUri(uri)
    }

    const options = ['Chụp ảnh', 'Chọn từ thư viện', 'Hủy']
    const cancelButtonIndex = 2

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) void pick('camera')
          else if (buttonIndex === 1) void pick('library')
        },
      )
    } else {
      Alert.alert('Chọn ảnh', undefined, [
        { text: 'Chụp ảnh', onPress: () => void pick('camera') },
        { text: 'Chọn từ thư viện', onPress: () => void pick('library') },
        { text: 'Hủy', style: 'cancel' },
      ])
    }
  }

  function openCreateBarcodeScanner() {
    navigation.navigate('BarcodeScanner', {
      mode: 'search',
      onScanFillBarcode: (barcode: string) => {
        void (async () => {
          const trimmed = barcode.trim()
          setCreateBarcode(trimmed)
          const lookup = await lookupProductByBarcode(trimmed)
          if (lookup) {
            setCreateBarcodeWarning(`Sản phẩm "${lookup.product.name}" đã có mã vạch này.`)
          } else {
            setCreateBarcodeWarning(null)
          }
        })()
      },
    })
  }

  async function handleCreateProduct() {
    if (isReadOnly) return
    const trimmedName = createName.trim()
    if (!trimmedName) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên sản phẩm.')
      return
    }
    if (existingProductWarning || createBarcodeWarning) return

    const trimmedBarcode = createBarcode.trim()
    if (trimmedBarcode) {
      const conflicting = await checkBarcodeConflict(trimmedBarcode, NEW_PRODUCT_CONFLICT_SENTINEL)
      if (conflicting) {
        Alert.alert(
          'Mã vạch đã tồn tại',
          `Mã vạch "${trimmedBarcode}" đã thuộc về sản phẩm "${conflicting.name}".`,
          [{ text: 'OK' }],
        )
        void logBarcodeConflict(
          trimmedBarcode,
          NEW_PRODUCT_CONFLICT_SENTINEL,
          conflicting.id,
          trimmedName,
          conflicting.name,
        )
        return
      }
    }

    setIsCreatingProduct(true)
    const created = await addProduct({
      name: trimmedName,
      notes: createNotes.trim() || undefined,
      warning_days: 30,
      is_archived: false,
      category_level1_id: createCategoryL1Id ?? null,
      category_level2_id: createCategoryL1Id ? (createCategoryL2Id ?? null) : null,
    })

    if (!created) {
      setIsCreatingProduct(false)
      Alert.alert('Lỗi', 'Không thể tạo sản phẩm mới.')
      return
    }

    if (createImageUri) {
      try {
        setIsUploadingCreateImage(true)
        const url = await uploadProductImage(created.id, createImageUri)
        await updateProductImage(created.id, url)
      } catch {
        Alert.alert('Lưu ý', 'Tạo sản phẩm thành công nhưng không thể tải ảnh lên.')
      } finally {
        setIsUploadingCreateImage(false)
      }
    }

    if (trimmedBarcode) {
      try {
        await upsertProductBarcode(created.id, trimmedBarcode)
      } catch {
        Alert.alert('Lưu ý', 'Tạo sản phẩm thành công nhưng không thể lưu mã vạch.')
      }
    }

    if (filterLocationId !== null) {
      setFilterLocationId(null)
    }

    setIsCreatingProduct(false)
    closeCreateProductModal()
    void fetchProducts()
    void fetchProductsPage({
      page: 0,
      search: debouncedSearch,
      showArchived,
      showNoImageOnly,
    })
  }

  function showImageOptions(product: Product) {
    if (isReadOnly) return
    if (__DEV__) console.log('[F08] showImageOptions called', product.id)
    const pickAndUpload = async (source: 'camera' | 'library') => {
      setUploadingProductId(product.id)
      try {
        const uri = await pickImage(source)
        if (__DEV__) console.log('[F08] pickImage result:', uri)
        if (!uri) {
          setUploadingProductId(null)
          return
        }
        const url = await uploadProductImage(product.id, uri)
        if (__DEV__) console.log('[F08] uploadProductImage result:', url)
        await updateProductImage(product.id, url)
        if (__DEV__) console.log('[F08] updateProductImage done')
        setUploadingProductId(null)
      } catch (e) {
        if (__DEV__) console.log('[F08] ERROR:', e)
        setUploadingProductId(null)
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

  async function handleCartPress(product: Product) {
    const lots = inventoryEntries.filter(
      (e) => e.product_id === product.id && (e.quantity_boxes ?? 0) > 0,
    )
    if (lots.length === 0) {
      Alert.alert('Không có lô', 'Sản phẩm này hiện không có lô nào trong kho.')
      return
    }

    const drafts = pickingLists.filter((l) => l.status === 'draft')

    if (drafts.length === 0) {
      const today = new Date().toLocaleDateString('vi-VN')
      const newList = await createPickingList(`Đơn lấy hàng ${today}`)
      if (!newList) {
        Alert.alert('Lỗi', 'Không thể tạo đơn lấy hàng.')
        return
      }
      setCartPickingListId(newList.id)
      setCartProduct(product)
      setCartLots(lots)
      setShowCartModal(true)
    } else if (drafts.length === 1) {
      setCartPickingListId(drafts[0].id)
      setCartProduct(product)
      setCartLots(lots)
      setShowCartModal(true)
    } else {
      Alert.alert('Chọn đơn lấy hàng', 'Thêm vào đơn nào?', [
        ...drafts.map((d) => ({
          text: d.title,
          onPress: () => {
            setCartPickingListId(d.id)
            setCartProduct(product)
            setCartLots(lots)
            setShowCartModal(true)
          },
        })),
        { text: 'Huỷ', style: 'cancel' as const },
      ])
    }
  }

  async function handleCartConfirm(selected: { entry: InventoryEntry; qty: number }[]) {
    if (!cartPickingListId || !cartProduct) return
    for (const { entry, qty } of selected) {
      await addPickingItem(cartPickingListId, {
        inventory_entry_id: entry.id,
        product_id: cartProduct.id,
        zone_id: entry.zone_id,
        tier: entry.tier ?? 1,
        quantity_boxes: qty,
        notes: null,
      })
    }
    setShowCartModal(false)
    setCartProduct(null)
    setCartLots([])
    setCartPickingListId(null)
  }

  function renderProductItem({ item: product }: { item: Product }) {
    const groupedLots = getFilteredLotsByExpiry(product.id)
    const categoryLine = getProductCategoryLine(product)
    const productDotColor = getWorstDisplayColorForEntries(
      groupedLots,
      product,
      colors,
      expiryWarningEnabled,
      lowStockWarningEnabled,
    )
    const isUploading = uploadingProductId === product.id
    const totalSplit = qtySplitByProduct.get(product.id) ?? { warehouse: 0, market: 0, total: 0 }
    const metaLine = categoryLine
      ? `Tổng ${formatSplitQtyLabel(totalSplit.warehouse, totalSplit.market)} · ${categoryLine}`
      : `Tổng ${formatSplitQtyLabel(totalSplit.warehouse, totalSplit.market)}`
    return (
      <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.itemRow}>
          <TouchableOpacity
            style={styles.thumbnailContainer}
            activeOpacity={0.8}
            disabled={isUploading}
            onPress={() => {
              if (isUploading) return
              if (product.image_url) {
                setViewingImage({ uri: product.image_url, productId: product.id })
              } else if (canWrite) {
                showImageOptions(product)
              }
            }}
          >
            {isUploading ? (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: colors.border }]}>
                <ActivityIndicator />
              </View>
            ) : product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: colors.border }]}>
                <Text style={{ fontSize: 24 }}>📷</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.itemContent}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
          >
            <View style={styles.itemTitleRow}>
              <View style={[styles.titleDot, { backgroundColor: productDotColor }]} />
              <Text
                style={[
                  styles.itemName,
                  { color: colors.text, opacity: product.is_archived ? 0.55 : 1 },
                ]}
              >
                {product.name}
              </Text>
            </View>
            <Text style={[styles.itemMetaLine, { color: colors.sub }]} numberOfLines={2}>
              {metaLine}
            </Text>
            {product.is_archived && (
              <Text style={[styles.archivedTag, { color: colors.sub }]}>Đã ẩn</Text>
            )}
            {scannedLotId && inventoryEntries.some((entry) => entry.id === scannedLotId && entry.product_id === product.id) && (
              <Text style={[styles.itemSub, { color: colors.accent }]} numberOfLines={1}>
                Kết quả quét barcode theo lô
              </Text>
            )}

            {groupedLots.length === 0 ? (
              <Text style={[styles.noLotText, { color: colors.sub }]}>Chưa có lô hàng</Text>
            ) : (
              <View style={styles.lotGroupWrap}>
                {groupedLots.map((lot, index) => {
                  const lotStatus = getCombinedStatus(
                    lot.quantity_boxes,
                    lot.expiry_date,
                    product.low_warning_boxes ?? 3,
                    product.low_critical_boxes ?? 1,
                    product.warning_days ?? 30
                  )
                  const dotColor = getDisplayColor(
                    lotStatus,
                    colors,
                    expiryWarningEnabled,
                    lowStockWarningEnabled,
                    getDisplayColorContextFromEntry(lot, product),
                  )
                  return (
                    <View key={`${product.id}-${lot.expiry_date ?? 'none'}-${index}`} style={styles.lotGroupItem}>
                      <View style={styles.lotRow}>
                        <View style={[styles.lotDot, { backgroundColor: dotColor }]} />
                        <Text style={[styles.lotText, { color: colors.sub }]}>
                          Hạn: {formatExpiryDate(lot.expiry_date)} · {lot.quantity_boxes}{' '}
                          {qtyUnitForLocationType(locationTypeOfEntry(lot, locationById))}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </TouchableOpacity>
        </View>
        {canWrite ? (
          <View style={styles.cartRow}>
            <TouchableOpacity
              style={[styles.cartBtn, { backgroundColor: colors.accent + '26' }]}
              onPress={() => void handleCartPress(product)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={{ fontSize: 16 }}>🛒</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    )
  }

  function getFilteredLotsByExpiry(productId: string) {
    const relevantEntries = inventoryEntries.filter(
      (entry) => entry.product_id === productId && entryInFilterScope(entry),
    )

    return [...relevantEntries].sort((a, b) => {
      const aTime = a.expiry_date ? new Date(`${a.expiry_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
      const bTime = b.expiry_date ? new Date(`${b.expiry_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
      return aTime - bTime
    })
  }

  function getWorstStatusForProduct(productId: string): CombinedStatus {
    const entries = inventoryEntries.filter(
      (entry) => entry.product_id === productId && entryInFilterScope(entry),
    )
    if (entries.length === 0) return 'ok'

    let worstStatus: CombinedStatus = 'ok'
    let worstRank = 99
    for (const entry of entries) {
      const status = getCombinedStatus(
        entry.quantity_boxes,
        entry.expiry_date,
        entry.product?.low_warning_boxes ?? 3,
        entry.product?.low_critical_boxes ?? 1,
        entry.product?.warning_days ?? 30
      )
      const rank = getCombinedStatusRank(status)
      if (rank < worstRank) {
        worstRank = rank
        worstStatus = status
      }
    }
    return worstStatus
  }

  function getProductCategoryLine(product: Product): string | null {
    const l1name = product.category_level1_id
      ? productCategoriesL1.find((c) => c.id === product.category_level1_id)?.name
      : undefined
    const l2name = product.category_level2_id
      ? productCategoriesL2.find((c) => c.id === product.category_level2_id)?.name
      : undefined
    if (l1name && l2name) return `${l1name} · ${l2name}`
    if (l1name) return l1name
    return null
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>📦 Sản phẩm</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.archivedToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowArchived((v) => !v)}
        >
          <Text style={[styles.toggleLabel, { color: colors.sub }]}>
            {showArchived ? '✅ Đang xem SP đã ẩn' : '⬜ Chỉ sản phẩm đã ẩn'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.archivedToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowOutOfStockOnly((v) => !v)}
        >
          <Text style={[styles.toggleLabel, { color: colors.sub }]}>
            {showOutOfStockOnly ? '✅ Đang chỉ hết lô' : '⬜ Chỉ hết lô'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.archivedToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowSpecialOnly((v) => !v)}
        >
          <Text style={[styles.toggleLabel, { color: colors.sub }]}>
            {showSpecialOnly ? '✅ Đang xem hàng đặc biệt' : '⬜ Hàng đặc biệt'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.archivedToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowNoImageOnly((v) => !v)}
        >
          <Text style={[styles.toggleLabel, { color: colors.sub }]}>
            {showNoImageOnly ? '✅ Đang xem chưa có ảnh' : '⬜ Chưa có ảnh'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setFilterModalOpen(true)}
        activeOpacity={0.75}
      >
        <Text style={[styles.filterBtnText, { color: colors.text }]} numberOfLines={1}>
          {filterSummary}
        </Text>
        <Text style={{ color: colors.sub }}>▾</Text>
      </TouchableOpacity>

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm sản phẩm theo tên..."
              placeholderTextColor={colors.sub}
              maxLength={100}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity style={styles.searchClearInsideBtn} onPress={clearSearch}>
                <Text style={{ color: colors.text }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('BarcodeScanner', { mode: 'search', returnTab: 'Products' })}
          >
            <Text style={styles.scanBtnText}>📷</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chờ zone IDs (Mode Kho/Siêu thị) hoặc zones của kho đã chọn */}
      {!placeFilterReady || (productsPageLoading && !placeFilterActive && filteredProducts.length === 0) ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.sub }}>Không có sản phẩm phù hợp.</Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          <FlatList
            ref={flatListRef}
            data={pagedProducts}
            keyExtractor={(item) => item.id}
            renderItem={renderProductItem}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          />
          {filteredProducts.length > PAGE_SIZE && (
            <View style={[styles.footer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.pageBtn, { opacity: canGoPrev ? 1 : 0.3 }]}
                disabled={!canGoPrev}
                onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
              >
                <Text style={[styles.pageBtnText, { color: colors.text }]}>←</Text>
              </TouchableOpacity>
              <Text style={[styles.pageLabel, { color: colors.sub }]}>
                Trang {currentPage + 1} / {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageBtn, { opacity: canGoNext ? 1 : 0.3 }]}
                disabled={!canGoNext}
                onPress={() => setCurrentPage((p) => p + 1)}
              >
                <Text style={[styles.pageBtnText, { color: colors.text }]}>→</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <FilterModal
        visible={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        selectedMode={filterMode}
        onChangeMode={setFilterMode}
        locations={filterLocations}
        selectedLocationId={filterLocationId}
        onChangeLocation={setFilterLocationId}
        zones={zonesForFilterLoc}
        selectedZoneId={selectedZoneId}
        onChangeZone={setSelectedZoneId}
        allowAllMode
        onReset={() => {
          setFilterMode('all')
          setFilterLocationId(null)
          setSelectedZoneId(null)
        }}
      />

      <ImageViewerModal
        uri={viewingImage?.uri ?? null}
        onClose={() => setViewingImage(null)}
        onChangeImage={
          canWrite && viewingImage?.productId
            ? () => {
                const product = products.find((p) => p.id === viewingImage?.productId)
                setViewingImage(null)
                if (product) showImageOptions(product)
              }
            : undefined
        }
      />

      <LotPickerModal
        visible={showCartModal}
        product={cartProduct}
        lots={cartLots}
        alreadyAddedIds={
          new Set(
            pickingListItems
              .filter((i) => i.picking_list_id === cartPickingListId)
              .map((i) => i.inventory_entry_id),
          )
        }
        onClose={() => {
          setShowCartModal(false)
          setCartProduct(null)
          setCartLots([])
          setCartPickingListId(null)
        }}
        onConfirm={handleCartConfirm}
      />

      {canWrite ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent, bottom: fabBottom }]}
          activeOpacity={0.85}
          onPress={() => setShowCreateProductModal(true)}
        >
          <Text style={[styles.fabText, { color: colors.card }]}>+</Text>
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={showCreateProductModal}
        transparent
        animationType="slide"
        onRequestClose={closeCreateProductModal}
      >
        <Pressable style={styles.createModalOverlay} onPress={closeCreateProductModal}>
          <Pressable
            style={[styles.createModalBox, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
                <Text style={[styles.createModalTitle, { color: colors.text }]}>Tạo sản phẩm mới</Text>

                <Text style={[styles.createLabel, { color: colors.sub }]}>Tên sản phẩm *</Text>
                <Text style={[styles.createSearchNoteAbove, { color: colors.sub }]}>
                  Quét mã / tra tên sản phẩm trước để kiểm tra đã có chưa
                </Text>
                <TextInput
                  style={[styles.createInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  value={createName}
                  onChangeText={(text) => {
                    setCreateName(text)
                    setExistingProductWarning(null)
                  }}
                  placeholder="Tên sản phẩm *"
                  placeholderTextColor={colors.sub}
                  autoFocus
                  maxLength={200}
                />
                {createName.trim().length > 0 && !existingProductWarning && createNameSuggestions.length > 0 && (
                  <View style={[styles.createProductList, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                    {createNameSuggestions.map((product) => (
                      <TouchableOpacity
                        key={product.id}
                        style={[styles.createProductRow, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setCreateName(product.name)
                          setExistingProductWarning(product.name)
                        }}
                      >
                        <Text style={{ color: colors.text, fontSize: 14 }}>{product.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {existingProductWarning ? (
                  <Text style={[styles.createWarningText, { color: colors.statusWarning }]}>
                    Sản phẩm này đã có trong hệ thống, không thể tạo thêm.
                  </Text>
                ) : null}

                <Text style={[styles.createLabel, { color: colors.sub }]}>Mã vạch</Text>
                <View style={styles.createBarcodeRow}>
                  <TextInput
                    style={[
                      styles.createBarcodeInput,
                      { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border },
                    ]}
                    value={createBarcode}
                    onChangeText={(text) => {
                      setCreateBarcode(text)
                      setCreateBarcodeWarning(null)
                    }}
                    placeholder="Mã vạch (tuỳ chọn)"
                    placeholderTextColor={colors.sub}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={50}
                  />
                  <TouchableOpacity
                    style={[styles.createBarcodeScanBtn, { backgroundColor: colors.accent }]}
                    onPress={openCreateBarcodeScanner}
                    disabled={isCreatingProduct || isUploadingCreateImage}
                  >
                    <Text style={{ color: colors.card, fontSize: 16 }}>📷</Text>
                  </TouchableOpacity>
                </View>
                {createBarcodeWarning ? (
                  <Text style={[styles.createWarningText, { color: colors.statusWarning }]}>{createBarcodeWarning}</Text>
                ) : null}
                <Text style={[styles.createSearchHintMuted, { color: colors.sub }]}>
                  Hỏi anh/chị chủ xem hàng đã từng được nhập chưa để tránh tạo thừa tên cho cùng 1 sản phẩm
                </Text>

                <Text style={[styles.createLabel, { color: colors.sub }]}>Ảnh</Text>
                <View style={styles.createImageWrap}>
                  {createImageUri ? (
                    <>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setViewingImage({ uri: createImageUri, productId: '' })}
                      >
                        <Image source={{ uri: createImageUri }} style={styles.createImagePreview} resizeMode="cover" />
                      </TouchableOpacity>
                      <View style={styles.createImageActions}>
                        <TouchableOpacity onPress={showCreateImageOptions}>
                          <Text style={{ color: colors.accent, fontSize: 13 }}>Đổi ảnh</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setCreateImageUri(null)}>
                          <Text style={{ color: colors.statusWarning, fontSize: 13 }}>Xóa ảnh</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.createImagePreview, styles.createImagePlaceholder, { backgroundColor: colors.border }]}
                      activeOpacity={0.85}
                      onPress={showCreateImageOptions}
                    >
                      <Text style={{ fontSize: 24 }}>📷</Text>
                      <Text style={{ fontSize: 11, color: colors.sub, marginTop: 4 }}>Thêm ảnh</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={[styles.createLabel, { color: colors.sub }]}>Ghi chú</Text>
                <TextInput
                  style={[
                    styles.createInput,
                    styles.createNotesInput,
                    { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border },
                  ]}
                  value={createNotes}
                  onChangeText={setCreateNotes}
                  placeholder="Ghi chú (tuỳ chọn)"
                  placeholderTextColor={colors.sub}
                  multiline
                  maxLength={500}
                />

                <Text style={[styles.createLabel, { color: colors.sub }]}>Nhóm (Cấp 1)</Text>
                <Pressable
                  style={[styles.createSelectBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                  onPress={() => {
                    setShowCreateCatL1((v) => !v)
                    setShowCreateCatL2(false)
                  }}
                >
                  <Text style={{ color: createCategoryL1Id ? colors.text : colors.sub }}>
                    {!createCategoryL1Id
                      ? 'Không phân loại'
                      : productCategoriesL1.find((c) => c.id === createCategoryL1Id)?.name ?? 'Không phân loại'}
                  </Text>
                </Pressable>
                {showCreateCatL1 && (
                  <View style={[styles.createOptionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.createOptionRow, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setCreateCategoryL1Id(null)
                        setCreateCategoryL2Id(null)
                        setShowCreateCatL1(false)
                      }}
                    >
                      <Text style={{ color: colors.text }}>Không phân loại</Text>
                    </TouchableOpacity>
                    {productCategoriesL1.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.createOptionRow, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setCreateCategoryL1Id(cat.id)
                          setCreateCategoryL2Id(null)
                          setShowCreateCatL1(false)
                        }}
                      >
                        <Text style={{ color: colors.text }}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {!!createCategoryL1Id && (
                  <>
                    <Text style={[styles.createLabel, { color: colors.sub }]}>Loại (Cấp 2)</Text>
                    <Pressable
                      style={[styles.createSelectBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      onPress={() => {
                        setShowCreateCatL2((v) => !v)
                        setShowCreateCatL1(false)
                      }}
                    >
                      <Text style={{ color: createCategoryL2Id ? colors.text : colors.sub }}>
                        {!createCategoryL2Id
                          ? 'Không phân loại'
                          : productCategoriesL2.find((c) => c.id === createCategoryL2Id)?.name ?? 'Không phân loại'}
                      </Text>
                    </Pressable>
                    {showCreateCatL2 && (
                      <View style={[styles.createOptionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                        <TouchableOpacity
                          style={[styles.createOptionRow, { borderBottomColor: colors.border }]}
                          onPress={() => {
                            setCreateCategoryL2Id(null)
                            setShowCreateCatL2(false)
                          }}
                        >
                          <Text style={{ color: colors.text }}>Không phân loại</Text>
                        </TouchableOpacity>
                        {createCategoryL2Options.map((cat) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[styles.createOptionRow, { borderBottomColor: colors.border }]}
                            onPress={() => {
                              setCreateCategoryL2Id(cat.id)
                              setShowCreateCatL2(false)
                            }}
                          >
                            <Text style={{ color: colors.text }}>{cat.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}

                <View style={styles.createFormActions}>
                  <TouchableOpacity
                    style={[styles.createCancelBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                    onPress={closeCreateProductModal}
                    disabled={isCreatingProduct || isUploadingCreateImage}
                  >
                    <Text style={{ color: colors.text, fontWeight: '600' }}>Huỷ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createSaveBtn, { backgroundColor: colors.accent }]}
                    onPress={() => void handleCreateProduct()}
                    disabled={isCreatingProduct || isUploadingCreateImage || createSaveBlocked}
                  >
                    {isCreatingProduct || isUploadingCreateImage ? (
                      <ActivityIndicator color={colors.card} />
                    ) : (
                      <Text style={{ color: colors.card, fontWeight: '700' }}>Lưu</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  archivedToggle: {
    flexGrow: 1,
    flexBasis: '45%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  toggleLabel: { fontSize: 12 },
  filterBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterBtnText: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInputWrap: { flex: 1, position: 'relative' },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 38,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchClearInsideBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtn: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnText: { fontSize: 16 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listWrap: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pageBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pageBtnText: { fontSize: 20, fontWeight: '700' },
  pageLabel: { fontSize: 13 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemContent: { flex: 1, paddingLeft: 10 },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cartBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailContainer: { width: 64, height: 64 },
  thumbnail: { width: 64, height: 64, borderRadius: 8 },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitleRow: { flexDirection: 'row', alignItems: 'flex-start', marginRight: 4, minWidth: 0 },
  itemMetaLine: { fontSize: 12, marginTop: 4 },
  itemName: { fontSize: 15, fontWeight: '700', flex: 1, flexShrink: 1 },
  archivedTag: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  itemSub: { fontSize: 12, marginTop: 3 },
  noLotText: { fontSize: 12, marginTop: 8 },
  lotGroupWrap: { marginTop: 8, gap: 6 },
  lotGroupItem: { gap: 2 },
  lotRow: { flexDirection: 'row', alignItems: 'center' },
  lotText: { fontSize: 12, marginLeft: 6, flex: 1 },
  titleDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8, marginTop: 2 },
  lotDot: { width: 8, height: 8, borderRadius: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { fontSize: 28, fontWeight: '300', marginTop: -2 },
  createModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  createModalBox: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '92%',
  },
  createModalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  createLabel: { fontSize: 12, marginBottom: 6, marginTop: 10 },
  createInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  createNotesInput: { minHeight: 72, textAlignVertical: 'top' },
  createBarcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createBarcodeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  createBarcodeScanBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createImageWrap: { marginTop: 4 },
  createImagePreview: { width: 96, height: 96, borderRadius: 10 },
  createImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  createImageActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  createSelectBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  createOptionsWrap: { borderWidth: 1, borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  createOptionRow: { paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  createFormActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  createCancelBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createSaveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createSearchNoteAbove: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  createSearchHintMuted: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  createProductList: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  createProductRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  createWarningText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
})