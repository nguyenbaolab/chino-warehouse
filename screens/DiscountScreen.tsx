import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import FilterModal, { formatFilterSummary, type FilterMode } from '../components/FilterModal'
import ImageViewerModal from '../components/ImageViewerModal'
import { useCanWrite } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { supabase } from '../lib/supabase'
import { isoExpiryToDisplay } from '../utils/dateUtils'
import { normalizeText } from '../utils/textUtils'
import type { InventoryEntry, Location, Product, Zone } from '../types'

const NUM_COLUMNS = 3
const FOCUS_FETCH_TTL_MS = 30_000

type DiscountCardItem = {
  entry: InventoryEntry
  product: Product
}

/** Tải ảnh SP public URL → base64 để embed HTML/PDF */
async function fetchImageAsBase64(url: string, uniqueKey: string): Promise<string | null> {
  try {
    const result = await FileSystem.downloadAsync(
      url,
      FileSystem.cacheDirectory + 'discount_thumb_' + uniqueKey + '.jpg',
    )
    const base64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    return `data:image/jpeg;base64,${base64}`
  } catch {
    return null
  }
}

export default function DiscountScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const canWrite = useCanWrite()
  const {
    inventoryEntries,
    products,
    fetchProducts,
    fetchAllInventoryEntries,
    fetchInventoryByZone,
    updateInventoryEntry,
  } = useWarehouseStore()

  const [loading, setLoading] = useState(true)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [filterLocationId, setFilterLocationId] = useState<string | null>(null)
  const [filterZoneId, setFilterZoneId] = useState<string | null>(null)
  const [filterLocations, setFilterLocations] = useState<Location[]>([])
  const [zonesForFilterLoc, setZonesForFilterLoc] = useState<Zone[]>([])
  const [modeZoneIds, setModeZoneIds] = useState<Set<string> | null>(null)
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<InventoryEntry | null>(null)
  const [discountInput, setDiscountInput] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // Modal thêm SP vào giảm giá
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [addSearchText, setAddSearchText] = useState('')
  const [addSelectedProduct, setAddSelectedProduct] = useState<Product | null>(null)
  const [addSelectedLotIds, setAddSelectedLotIds] = useState<Set<string>>(new Set())
  const [addDiscountPercent, setAddDiscountPercent] = useState('')
  const [isApplyingAdd, setIsApplyingAdd] = useState(false)

  const lastFetchRef = useRef(0)
  const filterModeMountedRef = useRef(false)

  function resetAddModal() {
    setAddModalVisible(false)
    setAddSearchText('')
    setAddSelectedProduct(null)
    setAddSelectedLotIds(new Set())
    setAddDiscountPercent('')
    setIsApplyingAdd(false)
  }

  async function handleSaveDiscount() {
    if (!editingEntry) return
    const val = parseFloat(discountInput)
    if (Number.isNaN(val) || val < 0 || val > 100) {
      Alert.alert('Không hợp lệ', 'Phần trăm giảm giá phải từ 0 đến 100.')
      return
    }
    await updateInventoryEntry(editingEntry.id, { discount_percent: val })
    setEditingEntry(null)
    setDiscountInput('')
  }

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      if (now - lastFetchRef.current < FOCUS_FETCH_TTL_MS) return
      lastFetchRef.current = now

      let cancelled = false
      void (async () => {
        setLoading(true)
        await fetchProducts()
        await fetchAllInventoryEntries()
        if (!cancelled) setLoading(false)
      })()

      return () => {
        cancelled = true
      }
    }, [fetchAllInventoryEntries, fetchProducts]),
  )

  useEffect(() => {
    let cancelled = false
    async function loadFilterLocations() {
      let query = supabase.from('locations').select('*').order('name')
      if (filterMode !== 'all') query = query.eq('type', filterMode)
      const { data } = await query
      if (!cancelled) setFilterLocations((data as Location[]) ?? [])
    }
    void loadFilterLocations()
    return () => {
      cancelled = true
    }
  }, [filterMode])

  useEffect(() => {
    if (!filterModeMountedRef.current) {
      filterModeMountedRef.current = true
      return
    }
    setFilterLocationId(null)
    setFilterZoneId(null)
  }, [filterMode])

  useEffect(() => {
    if (filterMode === 'all' || filterLocationId) {
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
        if (!cancelled) setModeZoneIds(new Set(((data as { id: string }[]) ?? []).map((z) => z.id)))
      })
    return () => {
      cancelled = true
    }
  }, [filterMode, filterLocations, filterLocationId])

  useEffect(() => {
    if (filterLocationId) return
    void fetchAllInventoryEntries()
  }, [filterLocationId, fetchAllInventoryEntries])

  useEffect(() => {
    if (!filterLocationId) {
      setZonesForFilterLoc([])
      return
    }
    let cancelled = false
    void supabase
      .from('zones')
      .select('*')
      .eq('location_id', filterLocationId)
      .order('name')
      .then(({ data }) => {
        if (!cancelled) setZonesForFilterLoc((data as Zone[]) ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [filterLocationId])

  useEffect(() => {
    if (!filterLocationId || zonesForFilterLoc.length === 0) return
    void Promise.all(zonesForFilterLoc.map((z) => fetchInventoryByZone(z.id)))
  }, [filterLocationId, zonesForFilterLoc, fetchInventoryByZone])

  const locationZoneSet = useMemo(() => {
    if (!filterLocationId) return null
    return new Set(zonesForFilterLoc.map((z) => z.id))
  }, [filterLocationId, zonesForFilterLoc])

  const filterSummary = formatFilterSummary({
    mode: filterMode,
    locationId: filterLocationId,
    zoneId: filterZoneId,
    locations: filterLocations,
    zones: zonesForFilterLoc,
  })

  const hasActiveFilter = filterMode !== 'all' || filterLocationId !== null || filterZoneId !== null
  const filterLabel = hasActiveFilter ? filterSummary : null

  const scopedEntries = useMemo(() => {
    if (filterZoneId) {
      return inventoryEntries.filter((e) => e.zone_id === filterZoneId)
    }
    if (locationZoneSet) {
      return inventoryEntries.filter((e) => locationZoneSet.has(e.zone_id))
    }
    if (modeZoneIds) {
      return inventoryEntries.filter((e) => modeZoneIds.has(e.zone_id))
    }
    return inventoryEntries
  }, [inventoryEntries, locationZoneSet, filterZoneId, modeZoneIds])

  const discountedItems = useMemo(() => {
    const items: DiscountCardItem[] = []
    for (const entry of scopedEntries) {
      if (entry.is_price_reduced !== true) continue
      const product =
        products.find((p) => p.id === entry.product_id) ?? entry.product ?? null
      if (!product || product.is_archived) continue
      items.push({ entry, product })
    }
    return items.sort((a, b) => {
      const da = a.entry.expiry_date ? new Date(a.entry.expiry_date).getTime() : Infinity
      const db = b.entry.expiry_date ? new Date(b.entry.expiry_date).getTime() : Infinity
      if (da !== db) return da - db
      return a.product.name.localeCompare(b.product.name)
    })
  }, [scopedEntries, products])

  const addProductSuggestions = useMemo(() => {
    const q = normalizeText(addSearchText.trim())
    return products
      .filter((p) => !p.is_archived && (!q || normalizeText(p.name).includes(q)))
      .slice(0, 20)
  }, [products, addSearchText])

  const addProductLots = useMemo(() => {
    if (!addSelectedProduct) return []
    return inventoryEntries.filter((e) => e.product_id === addSelectedProduct.id)
  }, [inventoryEntries, addSelectedProduct])

  async function handleApplyAddDiscount() {
    if (!addSelectedProduct || addSelectedLotIds.size === 0 || isApplyingAdd) return

    const raw = addDiscountPercent.trim()
    let pct: number | null = null
    if (raw !== '') {
      const val = parseFloat(raw)
      if (Number.isNaN(val) || val < 0 || val > 100) {
        Alert.alert('Không hợp lệ', 'Phần trăm giảm giá phải từ 0 đến 100.')
        return
      }
      pct = val
    }

    setIsApplyingAdd(true)
    try {
      for (const entryId of addSelectedLotIds) {
        await updateInventoryEntry(entryId, {
          is_price_reduced: true,
          discount_percent: pct,
        })
      }
      resetAddModal()
      await fetchAllInventoryEntries()
    } catch {
      Alert.alert('Lỗi', 'Không thể áp dụng giảm giá. Vui lòng thử lại.')
    } finally {
      setIsApplyingAdd(false)
    }
  }

  const handleExportPDF = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const today = new Date().toLocaleDateString('vi-VN')
      const filterText = filterLabel ? `Bộ lọc: ${filterLabel}` : 'Tất cả hàng giảm giá'

      const rows = await Promise.all(
        discountedItems.map(async ({ entry, product }) => {
          let imgHtml = '<div class="no-img">📷</div>'
          if (product.image_url) {
            const b64 = await fetchImageAsBase64(product.image_url, entry.id)
            if (b64) {
              imgHtml = `<img src="${b64}" class="thumb" />`
            }
          }

          const discountText =
            entry.discount_percent != null && entry.discount_percent > 0
              ? `<span class="badge">Giảm ${entry.discount_percent}%</span>`
              : `<span class="badge-plain">Đã giảm giá</span>`

          const expiryText = entry.expiry_date ? isoExpiryToDisplay(entry.expiry_date) : '—'

          return `
            <tr>
              <td class="img-cell">${imgHtml}</td>
              <td class="name-cell">${product.name}</td>
              <td class="center">${discountText}</td>
              <td class="center">${expiryText}</td>
            </tr>
          `
        }),
      )

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            .meta { font-size: 13px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th {
              background: #f3f4f6; text-align: left;
              padding: 8px 10px; font-size: 13px;
              border-bottom: 2px solid #e5e7eb;
            }
            td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
            .img-cell { width: 60px; }
            .thumb { width: 52px; height: 52px; object-fit: cover; border-radius: 6px; }
            .no-img {
              width: 52px; height: 52px; display: flex;
              align-items: center; justify-content: center;
              background: #f3f4f6; border-radius: 6px;
              font-size: 22px;
            }
            .name-cell { font-size: 14px; font-weight: 600; }
            .center { text-align: center; }
            .badge {
              background: #fff7ed; color: #f97316;
              padding: 3px 8px; border-radius: 4px;
              font-size: 12px; font-weight: 700;
            }
            .badge-plain {
              background: #f3f4f6; color: #6b7280;
              padding: 3px 8px; border-radius: 4px;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <h1>🏷️ Danh sách hàng giảm giá</h1>
          <div class="meta">Chino's Store · ${today} · ${filterText}</div>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Sản phẩm</th>
                <th class="center">Giảm giá</th>
                <th class="center">Hạn sử dụng</th>
              </tr>
            </thead>
            <tbody>
              ${rows.join('')}
            </tbody>
          </table>
        </body>
        </html>
      `

      const { uri } = await Print.printToFileAsync({ html, base64: false })
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Xuất danh sách giảm giá',
        UTI: 'com.adobe.pdf',
      })
    } catch {
      Alert.alert('Lỗi', 'Không thể xuất PDF. Vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }, [discountedItems, filterLabel, isExporting])

  const renderCard = useCallback(
    ({ item }: { item: DiscountCardItem }) => {
      const { entry, product } = item
      const discountPercent =
        entry.discount_percent == null ? null : Number(entry.discount_percent)
      const discountLabel =
        discountPercent != null && Number.isFinite(discountPercent) && discountPercent > 0
          ? `Giảm ${discountPercent}%`
          : 'Đã giảm giá'

      return (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
        >
          <View style={styles.cardImageWrap}>
            {product.image_url ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setZoomImageUrl(product.image_url ?? null)}
              >
                <Image
                  source={{ uri: product.image_url }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.cardImage,
                  styles.cardImagePlaceholder,
                  { backgroundColor: colors.border },
                ]}
              >
                <Text style={{ fontSize: 24 }}>📷</Text>
              </View>
            )}
            {canWrite ? (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  setEditingEntry(item.entry)
                  setDiscountInput(
                    item.entry.discount_percent != null && item.entry.discount_percent > 0
                      ? String(item.entry.discount_percent)
                      : '',
                  )
                }}
              >
                <Text style={{ fontSize: 14 }}>✏️</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
              {product.name}
            </Text>
            <View style={[styles.discountBadge, { backgroundColor: '#F97316' + '26' }]}>
              <Text style={styles.discountBadgeText}>{discountLabel}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )
    },
    [canWrite, colors, navigation],
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.card }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.sub }}>← Đóng</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          🏷️ Hàng giảm giá
        </Text>
        <TouchableOpacity
          onPress={() => void handleExportPDF()}
          disabled={isExporting || discountedItems.length === 0}
          style={styles.exportBtn}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={{ fontSize: 16 }}>📄</Text>
          )}
        </TouchableOpacity>
        {canWrite ? (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.card }]}
            onPress={() => setAddModalVisible(true)}
          >
            <Text style={{ fontSize: 18, color: colors.text }}>＋</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.card }]}
          onPress={() => setFilterModalOpen(true)}
        >
          <Text style={{ fontSize: 16 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {hasActiveFilter ? (
        <View style={[styles.filterBar, { backgroundColor: colors.card }]}>
          <Text style={[styles.filterLabel, { color: colors.sub }]} numberOfLines={1}>
            Đang lọc: {filterSummary}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setFilterMode('all')
              setFilterLocationId(null)
              setFilterZoneId(null)
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 13 }}>Xoá bộ lọc</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : discountedItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.sub }]}>Không có hàng giảm giá nào.</Text>
        </View>
      ) : (
        <FlatList
          data={discountedItems}
          renderItem={renderCard}
          keyExtractor={(item) => item.entry.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      )}

      <FilterModal
        visible={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        selectedMode={filterMode}
        onChangeMode={setFilterMode}
        locations={filterLocations}
        selectedLocationId={filterLocationId}
        onChangeLocation={(id) => {
          setFilterLocationId(id)
          setFilterZoneId(null)
        }}
        zones={zonesForFilterLoc}
        selectedZoneId={filterZoneId}
        onChangeZone={setFilterZoneId}
        onReset={() => {
          setFilterMode('all')
          setFilterLocationId(null)
          setFilterZoneId(null)
        }}
      />

      <Modal
        visible={editingEntry !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingEntry(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditingEntry(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalSheet, { backgroundColor: colors.card }]}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nhập % giảm giá</Text>
            <Text style={[styles.modalSub, { color: colors.sub }]} numberOfLines={2}>
              {editingEntry
                ? discountedItems.find((i) => i.entry.id === editingEntry.id)?.product?.name ?? ''
                : ''}
            </Text>
            <View style={styles.modalInputRow}>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.bg,
                  },
                ]}
                value={discountInput}
                onChangeText={setDiscountInput}
                keyboardType="numeric"
                placeholder="0–100"
                placeholderTextColor={colors.sub}
                maxLength={5}
                autoFocus
              />
              <Text style={{ color: colors.sub, fontSize: 16 }}>%</Text>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setEditingEntry(null)}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                onPress={() => void handleSaveDiscount()}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal thêm SP vào giảm giá — bước 1 chọn SP / bước 2 chọn lô + % */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={resetAddModal}
      >
        <View style={styles.addModalOverlay}>
          <View style={[styles.addModalSheet, { backgroundColor: colors.card }]}>
            {addSelectedProduct === null ? (
              <>
                <View style={styles.addModalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text, flex: 1 }]}>
                    Chọn sản phẩm
                  </Text>
                  <TouchableOpacity onPress={resetAddModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ fontSize: 20, color: colors.sub }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[
                    styles.addSearchInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.bg,
                    },
                  ]}
                  value={addSearchText}
                  onChangeText={setAddSearchText}
                  placeholder="Tìm tên sản phẩm…"
                  placeholderTextColor={colors.sub}
                  autoFocus
                />
                <FlatList
                  data={addProductSuggestions}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 360 }}
                  ListEmptyComponent={
                    <Text style={{ color: colors.sub, padding: 16, textAlign: 'center' }}>
                      Không tìm thấy sản phẩm.
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.addProductRow, { borderBottomColor: colors.border }]}
                      activeOpacity={0.75}
                      onPress={() => {
                        setAddSelectedProduct(item)
                        setAddSelectedLotIds(new Set())
                        setAddDiscountPercent('')
                      }}
                    >
                      {item.image_url ? (
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.addProductThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.addProductThumb,
                            styles.addProductThumbPlaceholder,
                            { backgroundColor: colors.border },
                          ]}
                        >
                          <Text style={{ fontSize: 16 }}>📷</Text>
                        </View>
                      )}
                      <Text
                        style={[styles.addProductName, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : (
              <>
                <View style={styles.addModalHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setAddSelectedProduct(null)
                      setAddSelectedLotIds(new Set())
                      setAddDiscountPercent('')
                    }}
                    style={{ paddingRight: 8 }}
                  >
                    <Text style={{ color: colors.accent, fontSize: 16 }}>←</Text>
                  </TouchableOpacity>
                  <Text
                    style={[styles.modalTitle, { color: colors.text, flex: 1 }]}
                    numberOfLines={2}
                  >
                    {addSelectedProduct.name}
                  </Text>
                  <TouchableOpacity onPress={resetAddModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ fontSize: 20, color: colors.sub }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={addProductLots}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 320 }}
                  ListEmptyComponent={
                    <Text style={{ color: colors.sub, padding: 16, textAlign: 'center' }}>
                      Không có lô nào.
                    </Text>
                  }
                  renderItem={({ item: entry }) => {
                    const alreadyReduced = entry.is_price_reduced === true
                    const ticked = addSelectedLotIds.has(entry.id)
                    return (
                      <View style={[styles.addLotRow, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity
                          disabled={alreadyReduced}
                          onPress={() => {
                            setAddSelectedLotIds((prev) => {
                              const next = new Set(prev)
                              if (ticked) next.delete(entry.id)
                              else next.add(entry.id)
                              return next
                            })
                          }}
                          style={styles.addLotCheckbox}
                        >
                          <Text style={{ fontSize: 18 }}>
                            {alreadyReduced ? '☑️' : ticked ? '✅' : '⬜'}
                          </Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={{
                              color: alreadyReduced ? colors.sub : colors.text,
                              fontWeight: '600',
                              fontSize: 13,
                            }}
                          >
                            {entry.zone?.name ?? 'Zone'} · Tầng {entry.tier}
                          </Text>
                          <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                            Tồn: {entry.quantity_boxes}
                            {entry.expiry_date
                              ? ` · Hạn: ${isoExpiryToDisplay(entry.expiry_date)}`
                              : ''}
                          </Text>
                          {alreadyReduced ? (
                            <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                              Đã giảm giá
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    )
                  }}
                />
                <TextInput
                  style={[
                    styles.addSearchInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.bg,
                      marginTop: 8,
                    },
                  ]}
                  value={addDiscountPercent}
                  onChangeText={setAddDiscountPercent}
                  keyboardType="numeric"
                  placeholder="% giảm giá (tuỳ chọn)"
                  placeholderTextColor={colors.sub}
                  maxLength={5}
                />
                <TouchableOpacity
                  style={[
                    styles.addApplyBtn,
                    {
                      backgroundColor:
                        addSelectedLotIds.size > 0 && !isApplyingAdd
                          ? colors.accent
                          : colors.border,
                    },
                  ]}
                  disabled={addSelectedLotIds.size === 0 || isApplyingAdd}
                  onPress={() => void handleApplyAddDiscount()}
                >
                  {isApplyingAdd ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Áp dụng</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ImageViewerModal uri={zoomImageUrl} onClose={() => setZoomImageUrl(null)} />
    </SafeAreaView>
  )
}

const CARD_MARGIN = 6
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  exportBtn: { padding: 4, marginRight: 4 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterLabel: { fontSize: 13, flex: 1 },
  grid: { padding: CARD_MARGIN },
  row: { gap: CARD_MARGIN },
  card: {
    flex: 1,
    margin: CARD_MARGIN,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImageWrap: { position: 'relative' },
  cardImage: { width: '100%', aspectRatio: 1 },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  editBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    padding: 4,
  },
  cardInfo: { padding: 6, gap: 4 },
  cardName: { fontSize: 12, fontWeight: '600' },
  discountBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  discountBadgeText: { fontSize: 11, fontWeight: '700', color: '#F97316' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSheet: {
    width: 280,
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalSub: { fontSize: 13 },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  addModalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  addModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  addSearchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 8,
  },
  addProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addProductThumb: { width: 40, height: 40, borderRadius: 6 },
  addProductThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  addProductName: { flex: 1, fontSize: 14, fontWeight: '600' },
  addLotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addLotCheckbox: { padding: 4 },
  addApplyBtn: {
    marginTop: 12,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
