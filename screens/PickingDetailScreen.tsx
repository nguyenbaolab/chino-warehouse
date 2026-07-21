import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useCanWrite, useIsReadOnly } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { normalizeText } from '../utils/textUtils'
import ImageViewerModal from '../components/ImageViewerModal'
import LotPickerModal from '../components/LotPickerModal'
import {
  InventoryEntry,
  Location,
  PickingListItem,
  PickingListStatus,
  Product,
} from '../types'

type RouteParams = {
  pickingListId: string
}

type GroupSection = {
  locationId: string
  locationName: string
  zoneId: string
  zoneName: string
  tier: number
  items: PickingListItem[]
  showLocationHeader: boolean
}

function statusLabel(status: PickingListStatus): string {
  if (status === 'in_progress') return 'Đang lấy'
  if (status === 'completed') return 'Hoàn thành'
  return 'Đang soạn'
}

function formatViDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN')
}

export default function PickingDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { pickingListId } = (route.params || {}) as RouteParams
  const { colors } = useThemeStore()
  const canWrite = useCanWrite()
  const isReadOnly = useIsReadOnly()

  const {
    products,
    inventoryEntries,
    pickingLists,
    pickingListItems,
    fetchProducts,
    fetchAllInventoryEntries,
    fetchPickingLists,
    addPickingItem,
    deletePickingItem,
    togglePickedItem,
    updatePickingItem,
    updatePickingList,
    deletePickingList,
    startPicking,
    revertPickingToDraft,
    completePicking,
    lookupProductByBarcode,
  } = useWarehouseStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showLotModal, setShowLotModal] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [isCompleting, setIsCompleting] = useState(false)
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null)
  const [qtyInput, setQtyInput] = useState('')
  const [warehouseLocations, setWarehouseLocations] = useState<Location[]>([])
  const [warehouseZoneIds, setWarehouseZoneIds] = useState<Set<string>>(new Set())
  /** Tap-to-zoom ảnh SP */
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)

  const FOCUS_FETCH_TTL_MS = 30_000
  const lastFetchRef = useRef(0)

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      if (now - lastFetchRef.current < FOCUS_FETCH_TTL_MS) return
      lastFetchRef.current = now

      let cancelled = false
      void (async () => {
        const { data: locs, error: locErr } = await supabase
          .from('locations')
          .select('*')
          .eq('type', 'warehouse')
        if (locErr) {
          if (__DEV__) console.error('[PickingDetail] fetch warehouse locations:', locErr)
        }
        const whLocs = (locs ?? []) as Location[]
        const locIds = whLocs.map((l) => l.id)

        let zoneIdSet = new Set<string>()
        if (locIds.length > 0) {
          const { data: zones, error: zoneErr } = await supabase
            .from('zones')
            .select('id, location_id, name')
            .in('location_id', locIds)
          if (zoneErr) {
            if (__DEV__) console.error('[PickingDetail] fetch warehouse zones:', zoneErr)
          } else {
            zoneIdSet = new Set((zones ?? []).map((z) => z.id as string))
          }
        }

        await Promise.all([fetchPickingLists(), fetchProducts(), fetchAllInventoryEntries()])
        if (!cancelled) {
          setWarehouseLocations(whLocs)
          setWarehouseZoneIds(zoneIdSet)
        }
      })()

      return () => {
        cancelled = true
      }
    }, [fetchPickingLists, fetchProducts, fetchAllInventoryEntries]),
  )

  const pickingList = useMemo(
    () => pickingLists.find((list) => list.id === pickingListId) ?? null,
    [pickingLists, pickingListId],
  )
  const items = useMemo(
    () => pickingListItems.filter((item) => item.picking_list_id === pickingListId),
    [pickingListItems, pickingListId],
  )

  const isDraft = pickingList?.status === 'draft'
  const isInProgress = pickingList?.status === 'in_progress'
  const isCompleted = pickingList?.status === 'completed'
  const canEditItems = isDraft && canWrite && !isReadOnly

  // Warehouse entries có tồn > 0
  const warehouseEntries = useMemo(
    () =>
      inventoryEntries.filter(
        (e) => warehouseZoneIds.has(e.zone_id) && e.quantity_boxes > 0,
      ),
    [inventoryEntries, warehouseZoneIds],
  )

  const productIdsWithStock = useMemo(() => {
    const ids = new Set<string>()
    for (const e of warehouseEntries) ids.add(e.product_id)
    return ids
  }, [warehouseEntries])

  const suggestions = useMemo(() => {
    const q = normalizeText(searchQuery.trim())
    if (q.length < 2 || selectedProduct) return []
    return products
      .filter(
        (p) =>
          !p.is_archived &&
          productIdsWithStock.has(p.id) &&
          normalizeText(p.name).includes(q),
      )
      .slice(0, 20)
  }, [products, searchQuery, productIdsWithStock, selectedProduct])

  const lotsForSelected = useMemo(() => {
    if (!selectedProduct) return [] as InventoryEntry[]
    return warehouseEntries
      .filter((e) => e.product_id === selectedProduct.id)
      .sort((a, b) => {
        const za = a.zone?.name ?? ''
        const zb = b.zone?.name ?? ''
        if (za !== zb) return za.localeCompare(zb, 'vi')
        return a.tier - b.tier
      })
  }, [selectedProduct, warehouseEntries])

  // Mở modal chọn nhiều lô khi có selectedProduct
  useEffect(() => {
    if (selectedProduct) {
      setShowLotModal(true)
    } else {
      setShowLotModal(false)
    }
  }, [selectedProduct])

  const addedEntryIds = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) set.add(item.inventory_entry_id)
    return set
  }, [items])

  const locationNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const loc of warehouseLocations) map.set(loc.id, loc.name)
    return map
  }, [warehouseLocations])

  const groupedSections = useMemo(() => {
    const sections: Omit<GroupSection, 'showLocationHeader'>[] = []
    const keyIndex = new Map<string, number>()

    for (const item of items) {
      const zone = item.zone
      const locationId = zone?.location_id ?? 'unknown'
      const locationName = locationNameById.get(locationId) ?? 'Kho'
      const zoneName = zone?.name ?? 'Zone'
      const key = `${locationId}|${item.zone_id}|${item.tier}`
      const existing = keyIndex.get(key)
      if (existing === undefined) {
        keyIndex.set(key, sections.length)
        sections.push({
          locationId,
          locationName,
          zoneId: item.zone_id,
          zoneName,
          tier: item.tier,
          items: [item],
        })
      } else {
        sections[existing].items.push(item)
      }
    }

    sections.sort((a, b) => {
      if (a.locationName !== b.locationName) {
        return a.locationName.localeCompare(b.locationName, 'vi')
      }
      if (a.zoneName !== b.zoneName) return a.zoneName.localeCompare(b.zoneName, 'vi')
      return a.tier - b.tier
    })

    let lastLoc = ''
    return sections.map((s) => {
      const showLocationHeader = s.locationId !== lastLoc
      lastLoc = s.locationId
      return { ...s, showLocationHeader }
    })
  }, [items, locationNameById])

  const pickedCount = items.filter((i) => i.is_picked).length
  const totalCount = items.length

  useEffect(() => {
    if (pickingList && !editingTitle) {
      setTitleDraft(pickingList.title)
    }
  }, [pickingList?.title, pickingList, editingTitle])

  async function commitTitle() {
    if (!pickingList || pickingList.status !== 'draft') {
      setEditingTitle(false)
      return
    }
    const next = titleDraft.trim() || pickingList.title
    if (next !== pickingList.title) {
      await updatePickingList(pickingList.id, { title: next })
    }
    setEditingTitle(false)
  }

  async function handleSaveItemQty(itemId: string, originalQty: number) {
    const val = parseInt(qtyInput, 10)
    if (Number.isNaN(val) || val <= 0) {
      Alert.alert('Không hợp lệ', 'Số lượng phải là số nguyên lớn hơn 0.')
      return
    }
    if (val === originalQty) {
      setEditingQtyId(null)
      setQtyInput('')
      return
    }
    await updatePickingItem(itemId, { quantity_boxes: val })
    setEditingQtyId(null)
    setQtyInput('')
  }

  function cancelQtyEdit() {
    setEditingQtyId(null)
    setQtyInput('')
  }

  function handleQtyEditBlur(itemId: string, originalQty: number) {
    const val = parseInt(qtyInput, 10)
    if (qtyInput.trim() === '' || Number.isNaN(val) || val === originalQty) {
      cancelQtyEdit()
      return
    }
    void handleSaveItemQty(itemId, originalQty)
  }

  function clearProductPanel() {
    setSelectedProduct(null)
  }

  const handleBarcodeScan = useCallback(() => {
    navigation.navigate('BarcodeScanner', {
      mode: 'search',
      onScanFillBarcode: async (barcode: string) => {
        const result = await lookupProductByBarcode(barcode)
        if (!result) {
          Alert.alert('Không tìm thấy', 'Không có sản phẩm nào khớp mã barcode này.')
          return
        }
        if (!productIdsWithStock.has(result.product.id)) {
          Alert.alert('Không có lô', 'Sản phẩm này hiện không có lô nào trong kho.')
          return
        }
        setSelectedProduct(result.product)
        setSearchQuery('')
      },
    })
  }, [navigation, lookupProductByBarcode, productIdsWithStock])

  async function handleAddTicked(selected: { entry: InventoryEntry; qty: number }[]) {
    if (!pickingList || !selectedProduct || !canEditItems) return
    for (const { entry, qty } of selected) {
      await addPickingItem(pickingList.id, {
        inventory_entry_id: entry.id,
        product_id: entry.product_id,
        zone_id: entry.zone_id,
        tier: entry.tier ?? 1,
        quantity_boxes: qty,
        notes: null,
      })
    }
    setShowLotModal(false)
    clearProductPanel()
    setSearchQuery('')
  }

  function requestDeleteList() {
    if (!pickingList || !canWrite) return
    Alert.alert('Xóa đơn lấy hàng?', 'Hành động này không thể hoàn tác.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deletePickingList(pickingList.id)
            navigation.goBack()
          })()
        },
      },
    ])
  }

  function requestStartPicking() {
    if (!pickingList || !canWrite) return
    if (items.length === 0) {
      Alert.alert('Đơn trống', 'Thêm ít nhất một lô trước khi bắt đầu lấy hàng.')
      return
    }
    Alert.alert('Bắt đầu lấy hàng?', 'Sau khi bắt đầu sẽ không thêm/xóa lô được nữa.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Bắt đầu',
        onPress: () => {
          void startPicking(pickingList.id)
        },
      },
    ])
  }

  function requestRevertToDraft() {
    if (!pickingList || !canWrite || isReadOnly) return
    if (pickingList.status !== 'in_progress') return
    Alert.alert(
      'Quay lại chỉnh sửa?',
      'Đơn sẽ quay về trạng thái nháp, bạn có thể thêm/xóa lô.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: () => {
            void revertPickingToDraft(pickingList.id)
          },
        },
      ],
    )
  }

  async function runComplete() {
    if (!pickingList || isCompleting) return
    setIsCompleting(true)
    try {
      const result = await completePicking(pickingList.id)
      if (result.success) {
        Alert.alert('Hoàn thành!', `Đã trừ ${result.deducted} mặt hàng.`)
        return
      }
      if (result.deducted > 0 && result.failed.length > 0) {
        Alert.alert(
          'Trừ tồn không hoàn tất',
          `Đã trừ ${result.deducted} mặt hàng.\nLỗi ${result.failed.length} mặt hàng:\n${result.failed.join('\n')}\n\nĐơn vẫn ở trạng thái Đang lấy — kiểm tra và thử lại.`,
        )
        return
      }
      const reason =
        result.failed.length > 0
          ? result.failed.join('\n')
          : 'Chưa có hàng nào được đánh dấu đã lấy.'
      Alert.alert('Không thể trừ tồn', reason)
    } finally {
      setIsCompleting(false)
    }
  }

  function requestComplete() {
    if (!pickingList || !canWrite || isCompleting) return

    const unpickedCount = items.filter((i) => !i.is_picked).length

    if (pickedCount === 0) {
      Alert.alert('Chưa có hàng nào được đánh dấu đã lấy.')
      return
    }

    if (unpickedCount > 0) {
      Alert.alert(
        `Có ${unpickedCount} mặt hàng chưa lấy`,
        `Chỉ trừ tồn kho cho ${pickedCount} mặt hàng đã lấy. Bỏ qua ${unpickedCount} mặt hàng chưa lấy?`,
        [
          { text: 'Huỷ', style: 'cancel' },
          { text: 'Tiếp tục', onPress: () => void runComplete() },
        ],
      )
      return
    }

    Alert.alert('Hoàn thành đơn?', `Sẽ trừ tồn kho cho ${pickedCount} mặt hàng đã lấy.`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Hoàn thành', onPress: () => void runComplete() },
    ])
  }

  function renderThumb(uri?: string | null, size = 48) {
    if (uri) {
      return (
        <TouchableOpacity activeOpacity={0.85} onPress={() => setZoomImageUrl(uri)}>
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: 8 }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )
    }
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          backgroundColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 16 }}>📷</Text>
      </View>
    )
  }

  if (!pickingList) {
    return (
      <SafeAreaView style={[styles.emptyWrap, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.sub }}>Không tìm thấy đơn lấy hàng.</Text>
        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.accent }}>← Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeInner}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: colors.text }}>←</Text>
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            {isDraft && editingTitle ? (
              <TextInput
                style={[
                  styles.titleInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={titleDraft}
                onChangeText={setTitleDraft}
                onBlur={() => void commitTitle()}
                onSubmitEditing={() => void commitTitle()}
                returnKeyType="done"
                blurOnSubmit
                autoFocus
                selectTextOnFocus
                maxLength={100}
              />
            ) : (
              <TouchableOpacity
                style={styles.titleTouchable}
                onPress={() => {
                  if (!isDraft || !canWrite) return
                  setTitleDraft(pickingList.title)
                  setEditingTitle(true)
                }}
                disabled={!isDraft || !canWrite}
                activeOpacity={isDraft && canWrite ? 0.7 : 1}
              >
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {pickingList.title}
                </Text>
              </TouchableOpacity>
            )}
            {pickingList.status === 'completed' && pickingList.completed_at ? (
              <Text style={[styles.completedAt, { color: colors.sub }]}>
                ✅ Hoàn thành:{' '}
                {new Date(pickingList.completed_at).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={[styles.status, { color: colors.sub }]}>
          Trạng thái: {statusLabel(pickingList.status)}
        </Text>

        {/* Add box — chỉ draft + canWrite */}
        {canEditItems ? (
          <View style={[styles.addBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {!selectedProduct ? (
              <>
                <Text style={[styles.label, { color: colors.sub }]}>Thêm lô từ kho</Text>
                <View style={styles.searchRow}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.searchInput,
                      { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border },
                    ]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Tìm tên sản phẩm..."
                    placeholderTextColor={colors.sub}
                    maxLength={100}
                  />
                  <TouchableOpacity
                    style={[styles.scanBtn, { backgroundColor: colors.accent }]}
                    onPress={handleBarcodeScan}
                  >
                    <Text style={[styles.scanBtnText, { color: colors.card }]}>📷</Text>
                  </TouchableOpacity>
                </View>
                {suggestions.length > 0 ? (
                  <View
                    style={[
                      styles.suggestionWrap,
                      { borderColor: colors.border, backgroundColor: colors.bg },
                    ]}
                  >
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                      style={{ maxHeight: 220 }}
                    >
                      {suggestions.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                          onPress={() => {
                            setSelectedProduct(p)
                            setSearchQuery('')
                          }}
                        >
                          {renderThumb(p.image_url)}
                          <Text style={[styles.suggestionName, { color: colors.text }]} numberOfLines={2}>
                            {p.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          {items.length === 0 ? (
            <Text style={{ color: colors.sub, textAlign: 'center', marginTop: 24 }}>
              Chưa có lô trong đơn.
            </Text>
          ) : (
            groupedSections.map((section) => (
                <View key={`${section.locationId}|${section.zoneId}|${section.tier}`}>
                  {section.showLocationHeader ? (
                    <Text style={[styles.locHeader, { color: colors.text }]}>
                      {section.locationName}
                    </Text>
                  ) : null}
                  <Text style={[styles.zoneHeader, { color: colors.sub }]}>
                    {section.zoneName} — Tầng {section.tier}
                  </Text>
                  {section.items.map((item) => {
                    const product =
                      item.product ?? products.find((p) => p.id === item.product_id) ?? null
                    const isEditingQty = canEditItems && editingQtyId === item.id
                    const qtyChanged =
                      isEditingQty &&
                      qtyInput.trim() !== '' &&
                      !Number.isNaN(parseInt(qtyInput, 10)) &&
                      parseInt(qtyInput, 10) !== item.quantity_boxes
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.itemCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            opacity: item.is_picked ? 0.55 : 1,
                          },
                        ]}
                      >
                        <View style={styles.itemRow}>
                          {isInProgress && canWrite ? (
                            <TouchableOpacity
                              style={[
                                styles.checkbox,
                                {
                                  borderColor: colors.border,
                                  backgroundColor: item.is_picked ? colors.accent : colors.bg,
                                },
                              ]}
                              onPress={() => void togglePickedItem(item.id, !item.is_picked)}
                            >
                              {item.is_picked ? (
                                <Text style={{ color: colors.card, fontSize: 12, fontWeight: '700' }}>
                                  ✓
                                </Text>
                              ) : null}
                            </TouchableOpacity>
                          ) : null}
                          {renderThumb(product?.image_url)}
                          <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() =>
                                navigation.navigate('ProductDetail', {
                                  productId: item.product_id,
                                })
                              }
                            >
                              <Text
                                style={[
                                  styles.itemName,
                                  {
                                    color: colors.text,
                                    textDecorationLine: item.is_picked ? 'line-through' : 'none',
                                  },
                                ]}
                                numberOfLines={2}
                              >
                                {product?.name ?? 'Sản phẩm'}
                              </Text>
                            </TouchableOpacity>
                            {isEditingQty ? (
                              <View style={styles.qtyEditRow}>
                                <TextInput
                                  style={[
                                    styles.qtyEditInput,
                                    {
                                      color: colors.text,
                                      borderColor: colors.border,
                                      backgroundColor: colors.bg,
                                    },
                                  ]}
                                  value={qtyInput}
                                  onChangeText={setQtyInput}
                                  keyboardType="numeric"
                                  maxLength={4}
                                  autoFocus
                                  textAlignVertical="center"
                                  onBlur={() => handleQtyEditBlur(item.id, item.quantity_boxes)}
                                  onSubmitEditing={() => void handleSaveItemQty(item.id, item.quantity_boxes)}
                                />
                                <Text style={{ color: colors.sub, fontSize: 13 }}>thùng</Text>
                                <TouchableOpacity
                                  onPress={() => {
                                    if (qtyChanged) {
                                      void handleSaveItemQty(item.id, item.quantity_boxes)
                                    } else {
                                      cancelQtyEdit()
                                    }
                                  }}
                                  hitSlop={8}
                                >
                                  {qtyChanged ? (
                                    <Text style={{ color: '#22C55E', fontSize: 16, fontWeight: '700' }}>
                                      ✓
                                    </Text>
                                  ) : (
                                    <Text style={{ color: colors.sub, fontSize: 13 }}>Huỷ</Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            ) : canEditItems ? (
                              <View style={styles.qtyReadRow}>
                                <Text style={[styles.itemQty, { color: colors.text }]}>
                                  {item.quantity_boxes} thùng
                                </Text>
                                <TouchableOpacity
                                  onPress={() => {
                                    setEditingQtyId(item.id)
                                    setQtyInput(String(item.quantity_boxes))
                                  }}
                                  style={styles.editQtyBtn}
                                >
                                  <Text style={{ fontSize: 14 }}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => void deletePickingItem(item.id)}
                                  style={styles.editQtyBtn}
                                >
                                  <Text style={{ fontSize: 14 }}>🗑️</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                                {item.quantity_boxes} thùng
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    )
                  })}
                </View>
              ))
          )}
        </ScrollView>

        {canWrite ? (
          <View style={styles.footerActions}>
            {isDraft ? (
              <>
                <TouchableOpacity
                  style={[styles.footerBtn, { backgroundColor: colors.accent }]}
                  onPress={requestStartPicking}
                >
                  <Text style={{ color: colors.card, fontWeight: '700' }}>Bắt đầu lấy hàng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={requestDeleteList}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Xóa đơn</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {isInProgress ? (
              <>
                <Text style={{ color: colors.sub, width: '100%', marginBottom: 4 }}>
                  Đã lấy {pickedCount}/{totalCount}
                </Text>
                {canWrite && !isReadOnly ? (
                  <TouchableOpacity
                    style={[
                      styles.footerBtn,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    onPress={requestRevertToDraft}
                    disabled={isCompleting}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      ✏️ Quay lại chỉnh sửa
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.footerBtn,
                    { backgroundColor: isCompleting ? colors.border : colors.accent },
                  ]}
                  onPress={requestComplete}
                  disabled={isCompleting}
                >
                  <Text style={{ color: colors.card, fontWeight: '700' }}>
                    {isCompleting ? 'Đang xử lý...' : 'Hoàn thành'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={requestDeleteList}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Xóa đơn</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {isCompleted ? (
              <>
                <Text style={{ color: colors.sub, width: '100%', marginBottom: 4 }}>
                  Đã hoàn thành · {formatViDate(pickingList.updated_at)}
                </Text>
                <TouchableOpacity
                  style={[styles.footerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={requestDeleteList}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Xóa đơn</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ) : null}
      </SafeAreaView>
      <LotPickerModal
        visible={showLotModal}
        product={selectedProduct}
        lots={lotsForSelected}
        alreadyAddedIds={addedEntryIds}
        onClose={() => {
          setShowLotModal(false)
          clearProductPanel()
        }}
        onConfirm={handleAddTicked}
      />
      <ImageViewerModal uri={zoomImageUrl} onClose={() => setZoomImageUrl(null)} />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeInner: { flex: 1, paddingTop: 12 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  backBtn: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1, minWidth: 0 },
  titleTouchable: { minWidth: 0 },
  title: { fontSize: 18, fontWeight: '700' },
  completedAt: { fontSize: 12, marginTop: 2, marginLeft: 4 },
  titleInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
  },
  status: { paddingHorizontal: 16, marginTop: 8, marginBottom: 8, fontSize: 12 },
  addBox: { marginHorizontal: 16, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  label: { fontSize: 12, marginBottom: 6 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  scanBtnText: {
    fontSize: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 8,
  },
  suggestionWrap: { borderWidth: 1, borderRadius: 8, marginBottom: 4, overflow: 'hidden' },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  suggestionName: { flex: 1, fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 12 },
  locHeader: { fontSize: 15, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  zoneHeader: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 2 },
  itemCard: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  itemName: { fontSize: 14, fontWeight: '700' },
  itemQty: { fontSize: 12, marginTop: 2 },
  qtyEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  qtyEditInput: {
    width: 60,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'android' ? 0 : 6,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  qtyReadRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  editQtyBtn: { padding: 4 },
  deleteItemBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  footerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  footerBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
})
