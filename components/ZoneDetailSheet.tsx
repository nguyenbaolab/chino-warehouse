import { useEffect, useMemo, useRef, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useIsFocused } from '@react-navigation/native'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useCanWrite, useIsReadOnly } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { useWarningStore } from '../stores/warningStore'
import { formatExpiryDate, getCombinedStatus, getCombinedStatusRank, InventoryEntry, Zone } from '../types'
import { getDisplayColor, getDisplayColorContextFromEntry } from '../utils/statusUtils'
import { normalizeText } from '../utils/textUtils'
import { checkConflict } from '../utils/conflictUtils'
import { isoExpiryToDisplay, isValidDisplayDate, parseDisplayDateToIso } from '../utils/dateUtils'

type ZoneDetailSheetProps = {
  visible: boolean
  zone: Zone | null
  onClose: () => void
  /** Gọi trước mutation (MapScreen C1 — bỏ qua Realtime self-refresh) */
  onBeforeMutation?: () => void
  navigation: any
  scannedLotBarcode?: string
  scannedLotId?: string
  scannedLotBarcodeAt?: number
  scrollToProductId?: string | null
}

const GROUP_SCROLL_ESTIMATE_HEIGHT = 140

// Chuyển HEX sang RGBA để làm lớp phủ trong suốt theo theme
function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return `rgba(0,0,0,${alpha})`
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function ZoneDetailSheet({
  visible,
  zone,
  onClose,
  onBeforeMutation,
  navigation,
  scannedLotBarcode,
  scannedLotId,
  scannedLotBarcodeAt,
  scrollToProductId,
}: ZoneDetailSheetProps) {
  const { colors } = useThemeStore()
  const { expiryWarningEnabled, lowStockWarningEnabled } = useWarningStore()
  const canWrite = useCanWrite()
  const isReadOnly = useIsReadOnly()
  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const {
    selectedLocationId,
    fetchInventoryByZone,
    updateInventoryEntry,
    deleteInventoryEntry,
    checkBarcodeConflict,
    upsertProductBarcode,
    logBarcodeConflict,
    updateProductName,
    getQtyUnit,
  } = useWarehouseStore()
  const qtyUnit = getQtyUnit()

  const [entries, setEntries] = useState<InventoryEntry[]>([])
  const [selectedTier, setSelectedTier] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [tierSearchQueries, setTierSearchQueries] = useState<Record<number, string>>({})
  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editExpiryDate, setEditExpiryDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLotBarcode, setEditLotBarcode] = useState('')
  const [lotSnapshotUpdatedAt, setLotSnapshotUpdatedAt] = useState<string>('')
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productNameInput, setProductNameInput] = useState('')
  const [originalProductName, setOriginalProductName] = useState('')
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null)
  const productListScrollRef = useRef<ScrollView>(null)
  const pendingScrollProductIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!visible || !zone) return

    // Mở sheet thủ công → reset tầng 1; mở từ search (scrollToProductId) → giữ để effect scroll chọn đúng tầng
    if (!scrollToProductId) {
      setSelectedTier(1)
      pendingScrollProductIdRef.current = null
    }
    setHighlightedProductId(null)
  }, [visible, zone?.id, scrollToProductId])

  useEffect(() => {
    if (!visible) {
      setHighlightedProductId(null)
      pendingScrollProductIdRef.current = null
      return
    }
    if (scrollToProductId) {
      pendingScrollProductIdRef.current = scrollToProductId
    }
  }, [visible, scrollToProductId])

  useEffect(() => {
    if (!visible || !zone) return

    let isMounted = true
    const zoneId = zone.id

    async function loadInventory() {
      setIsLoading(true)
      const data = await fetchInventoryByZone(zoneId)
      if (isMounted) {
        setEntries(data)
        setIsLoading(false)
      }
    }
    loadInventory()

    return () => {
      isMounted = false
    }
  }, [fetchInventoryByZone, visible, zone?.id])

  // F8: sau goBack từ ZonePicker, MapMain focus lại → reload sheet (cùng zone.id)
  useEffect(() => {
    if (!visible || !zone || !isFocused) return
    let cancelled = false
    void (async () => {
      const data = await fetchInventoryByZone(zone.id)
      if (!cancelled) setEntries(data)
    })()
    return () => {
      cancelled = true
    }
  }, [isFocused, visible, zone?.id, fetchInventoryByZone])

  async function reloadCurrentZoneInventory() {
    if (!zone) return
    const data = await fetchInventoryByZone(zone.id)
    setEntries(data)
  }

  const tierCount = zone?.tier_count ?? 1
  const tiers = Array.from({ length: Math.max(tierCount, 1) }, (_, index) => index + 1)

  // F3: ẩn lô SP is_archived — filter sớm trước group/search/render
  const currentTierEntries = useMemo(
    () =>
      entries.filter(
        (entry) => entry.tier === selectedTier && !entry.product?.is_archived,
      ),
    [entries, selectedTier],
  )

  const groupedProducts = useMemo(() => {
    const map = new Map<string, { productId: string; productName: string; totalBoxes: number; lots: InventoryEntry[] }>()

    for (const entry of currentTierEntries) {
      const productId = entry.product_id
      const current = map.get(productId)
      if (current) {
        current.totalBoxes += entry.quantity_boxes
        current.lots.push(entry)
      } else {
        map.set(productId, {
          productId,
          productName: entry.product?.name ?? 'Sản phẩm không xác định',
          totalBoxes: entry.quantity_boxes,
          lots: [entry],
        })
      }
    }

    // Sắp xếp lot theo hạn gần nhất trước để hiển thị và lấy "lô xấu nhất"
    const groups = Array.from(map.values()).map((group) => {
      const sortedLots = [...group.lots].sort((a, b) => {
        const aTime = a.expiry_date ? new Date(`${a.expiry_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
        const bTime = b.expiry_date ? new Date(`${b.expiry_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
        return aTime - bTime
      })
      return { ...group, lots: sortedLots }
    })

    return groups.sort((a, b) => a.productName.localeCompare(b.productName))
  }, [currentTierEntries])

  const currentSearchQuery = normalizeText((tierSearchQueries[selectedTier] ?? '').trim())
  const filteredGroupedProducts = useMemo(() => {
    if (!currentSearchQuery) return groupedProducts
    return groupedProducts.filter((group) => normalizeText(group.productName).includes(currentSearchQuery))
  }, [groupedProducts, currentSearchQuery])

  function handlePressLot(entry: InventoryEntry) {
    if (isReadOnly) return
    // Tap lô để mở/đóng inline form chỉnh sửa
    if (editingLotId === entry.id) {
      setEditingLotId(null)
      return
    }
    setEditingLotId(entry.id)
    setLotSnapshotUpdatedAt(entry.updated_at ?? '')
    setEditQuantity(String(entry.quantity_boxes))
    setEditExpiryDate(isoExpiryToDisplay(entry.expiry_date))
    setEditNotes(entry.notes ?? '')
    setEditLotBarcode(entry.barcode ?? '')
  }

  async function handleSaveLot(entry: InventoryEntry) {
    if (isReadOnly) return
    const quantity = Number(editQuantity)
    if (!Number.isFinite(quantity) || quantity < 0 || quantity !== Math.floor(quantity)) {
      Alert.alert(`Số ${qtyUnit} không hợp lệ`, `Số ${qtyUnit} phải là số nguyên lớn hơn hoặc bằng 0.`)
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

    async function doSaveLot(entryId: string, payloadToSend: Partial<InventoryEntry>) {
      await updateInventoryEntry(entryId, payloadToSend)
      if (payloadToSend.barcode) {
        await upsertProductBarcode(entry.product_id, payloadToSend.barcode)
      }
      setEditingLotId(null)
      await reloadCurrentZoneInventory()
    }

    if (editLotBarcode.trim()) {
      const conflicting = await checkBarcodeConflict(editLotBarcode.trim(), entry.product_id)
      if (conflicting) {
        Alert.alert(
          'Mã vạch đã tồn tại',
          `Mã vạch "${editLotBarcode.trim()}" đã thuộc về sản phẩm "${conflicting.name}".`,
          [{ text: 'OK' }],
        )
        void logBarcodeConflict(
          editLotBarcode.trim(),
          entry.product_id,
          conflicting.id,
          entry.product?.name ?? '',
          conflicting.name,
        )
        return
      }
    }

    const { hasConflict, changedByName } = await checkConflict(
      'inventory_entries',
      entry.id,
      lotSnapshotUpdatedAt,
    )

    if (hasConflict) {
      Alert.alert(
        'Có xung đột',
        `Lô này vừa được ${changedByName ?? 'người khác'} cập nhật.\nBạn có muốn ghi đè không?`,
        [
          {
            text: 'Xem lại',
            style: 'cancel',
            onPress: () => {
              setEditingLotId(null)
              void reloadCurrentZoneInventory()
            },
          },
          {
            text: 'Ghi đè',
            style: 'destructive',
            onPress: () => void doSaveLot(entry.id, payload),
          },
        ],
      )
      return
    }

    await doSaveLot(entry.id, payload)
  }

  function handleDeleteLot(entry: InventoryEntry) {
    if (isReadOnly) return
    // KI-058: chỉ cho xóa khi hết hàng
    if (entry.quantity_boxes > 0) return
    Alert.alert('Xóa lô hàng', 'Xóa lô hàng này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteInventoryEntry(entry.id)
          if (editingLotId === entry.id) setEditingLotId(null)
          await reloadCurrentZoneInventory()
        },
      },
    ])
  }

  function openMoveLot(entry: InventoryEntry) {
    if (isReadOnly) return
    const locationId = selectedLocationId ?? zone?.location_id
    if (!locationId) {
      Alert.alert('Thiếu thông tin', 'Không xác định được kho hiện tại.')
      return
    }
    // F8: map fullscreen chọn zone đích
    navigation.navigate('ZonePicker', {
      entryId: entry.id,
      sourceZoneId: entry.zone_id,
      sourceTier: entry.tier,
      locationId,
      markOwnMutation: onBeforeMutation,
    })
  }

  async function handleSaveProductName(productId: string) {
    if (isReadOnly) return
    if (editingProductId !== productId) return
    const trimmed = productNameInput.trim()
    if (!trimmed) {
      setEditingProductId(null)
      return
    }
    await updateProductName(productId, trimmed)
    setEditingProductId(null)
    await reloadCurrentZoneInventory()
  }

  function startEditProductName(productId: string, productName: string) {
    setEditingProductId(productId)
    setProductNameInput(productName)
    setOriginalProductName(productName)
  }

  function cancelEditProductName() {
    setProductNameInput(originalProductName)
    setEditingProductId(null)
  }

  function handleProductNameEditButtonPress(productId: string, productName: string) {
    if (isReadOnly) return
    const isEditingThis = editingProductId === productId
    if (!isEditingThis) {
      startEditProductName(productId, productName)
      return
    }
    if (productNameInput !== originalProductName) {
      void handleSaveProductName(productId)
    } else {
      cancelEditProductName()
    }
  }

  useEffect(() => {
    if (!visible || !scannedLotBarcodeAt || !scannedLotId || isReadOnly) return
    const target = entries.find((entry) => entry.id === scannedLotId)
    if (!target) return
    setEditingLotId(target.id)
    setEditQuantity(String(target.quantity_boxes))
    setEditExpiryDate(isoExpiryToDisplay(target.expiry_date))
    setEditNotes(target.notes ?? '')
    setEditLotBarcode(scannedLotBarcode ?? '')
    navigation.setParams({
      scannedZoneLotBarcode: undefined,
      scannedZoneLotId: undefined,
      scannedZoneLotBarcodeAt: undefined,
    })
  }, [visible, scannedLotBarcodeAt, scannedLotId, scannedLotBarcode, entries, navigation, isReadOnly])

  useEffect(() => {
    if (!visible || isLoading || !pendingScrollProductIdRef.current) return

    const productId = pendingScrollProductIdRef.current
    const targetEntry = entries.find((e) => e.product_id === productId)
    if (targetEntry && targetEntry.tier !== selectedTier) {
      setSelectedTier(targetEntry.tier)
      return
    }

    const index = filteredGroupedProducts.findIndex((g) => g.productId === productId)
    if (index < 0) return

    pendingScrollProductIdRef.current = null
    const scrollY = index * GROUP_SCROLL_ESTIMATE_HEIGHT
    requestAnimationFrame(() => {
      productListScrollRef.current?.scrollTo({ y: scrollY, animated: true })
      setHighlightedProductId(productId)
    })
  }, [visible, isLoading, entries, selectedTier, filteredGroupedProducts])

  useEffect(() => {
    if (!highlightedProductId) return
    const timer = setTimeout(() => setHighlightedProductId(null), 1000)
    return () => clearTimeout(timer)
  }, [highlightedProductId])

  function handlePressAddInventory() {
    if (isReadOnly) return
    if (!zone) return
    onClose()
    // Đóng sheet trước rồi mới navigate để tránh giật transition
    setTimeout(() => {
      navigation.navigate('AddInventory', {
        zoneId: zone.id,
        zoneName: zone.name,
        zoneColor: zone.color,
        tier: selectedTier,
      })
    }, 120)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: hexToRgba(colors.bg, 0.5) }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropArea} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom + 8, 24),
            },
          ]}
          behavior="padding"
        >
          <View style={[styles.zoneColorBar, { backgroundColor: zone?.color ?? colors.accent }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {zone?.name ?? 'Zone'}
            </Text>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.bg }]} onPress={onClose}>
              <Text style={[styles.closeBtnText, { color: colors.sub }]}>Đóng</Text>
            </TouchableOpacity>
          </View>

          {tierCount > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {tiers.map((tier) => {
                const isActive = tier === selectedTier
                return (
                  <TouchableOpacity
                    key={tier}
                    style={[
                      styles.tabBtn,
                      {
                        backgroundColor: isActive ? colors.accent : colors.bg,
                        borderColor: isActive ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedTier(tier)}
                  >
                    <Text style={[styles.tabText, { color: isActive ? colors.card : colors.sub }]}>
                      Tầng {tier}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}

          <View style={styles.searchWrap}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              value={tierSearchQueries[selectedTier] ?? ''}
              onChangeText={(text) => setTierSearchQueries((prev) => ({ ...prev, [selectedTier]: text }))}
              placeholder="Tìm sản phẩm trong tầng..."
              placeholderTextColor={colors.sub}
              maxLength={100}
            />
          </View>

          <View style={styles.content}>
            {isLoading ? (
              <ActivityIndicator color={colors.accent} style={styles.loading} />
            ) : currentTierEntries.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.sub }]}>Chưa có hàng trong zone này</Text>
                {canWrite ? (
                  <TouchableOpacity
                    style={[styles.emptyAddBtn, { backgroundColor: colors.accent }]}
                    onPress={handlePressAddInventory}
                  >
                    <Text style={[styles.emptyAddBtnText, { color: colors.card }]}>Thêm hàng</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <ScrollView
                ref={productListScrollRef}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {filteredGroupedProducts.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptyText, { color: colors.sub }]}>Không tìm thấy sản phẩm phù hợp</Text>
                  </View>
                ) : filteredGroupedProducts.map((group) => {
                  const worstLot = [...group.lots].sort((a, b) => {
                    const statusA = getCombinedStatus(
                      a.quantity_boxes,
                      a.expiry_date,
                      a.product?.low_warning_boxes ?? 3,
                      a.product?.low_critical_boxes ?? 1,
                      a.product?.warning_days ?? 30
                    )
                    const statusB = getCombinedStatus(
                      b.quantity_boxes,
                      b.expiry_date,
                      b.product?.low_warning_boxes ?? 3,
                      b.product?.low_critical_boxes ?? 1,
                      b.product?.warning_days ?? 30
                    )
                    return getCombinedStatusRank(statusA) - getCombinedStatusRank(statusB)
                  })[0]
                  const worstStatus = getCombinedStatus(
                    worstLot?.quantity_boxes ?? 0,
                    worstLot?.expiry_date,
                    worstLot?.product?.low_warning_boxes ?? 3,
                    worstLot?.product?.low_critical_boxes ?? 1,
                    worstLot?.product?.warning_days ?? 30
                  )
                  const worstColor = getDisplayColor(
                    worstStatus,
                    colors,
                    expiryWarningEnabled,
                    lowStockWarningEnabled,
                    worstLot
                      ? getDisplayColorContextFromEntry(worstLot, worstLot.product)
                      : undefined,
                  )

                  const isEditingProductName = editingProductId === group.productId
                  const productNameHasChanges =
                    isEditingProductName && productNameInput !== originalProductName
                  const productNameEditIcon = !isEditingProductName
                    ? '✏️'
                    : productNameHasChanges
                      ? '✓'
                      : '✕'

                  const isHighlighted = highlightedProductId === group.productId

                  return (
                    <View
                      key={group.productId}
                      style={[
                        styles.groupWrap,
                        { borderBottomColor: colors.border },
                        isHighlighted && {
                          backgroundColor: hexToRgba(colors.accent, 0.18),
                          borderRadius: 8,
                          paddingHorizontal: 6,
                        },
                      ]}
                    >
                      <View style={styles.itemRow}>
                        <View style={styles.itemMain}>
                          {isEditingProductName ? (
                            <TextInput
                              value={productNameInput}
                              onChangeText={setProductNameInput}
                              autoFocus
                              style={[
                                styles.itemName,
                                styles.itemNameInput,
                                { color: colors.text, borderColor: colors.accent },
                              ]}
                              maxLength={200}
                            />
                          ) : (
                            <TouchableOpacity
                              onPress={() =>
                                navigation.navigate('ProductDetail', { productId: group.productId })
                              }
                            >
                              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                                {group.productName}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <Text style={[styles.itemQty, { color: colors.sub }]}>{group.totalBoxes} {qtyUnit}</Text>
                        </View>
                        <View style={[styles.expiryDot, { backgroundColor: worstColor }]} />
                      </View>

                      {/* Danh sách từng lô của sản phẩm, luôn expanded */}
                      <View style={styles.lotList}>
                        {group.lots.map((lot) => {
                          const lotStatus = getCombinedStatus(
                            lot.quantity_boxes,
                            lot.expiry_date,
                            lot.product?.low_warning_boxes ?? 3,
                            lot.product?.low_critical_boxes ?? 1,
                            lot.product?.warning_days ?? 30
                          )
                          const lotColor = getDisplayColor(
                            lotStatus,
                            colors,
                            expiryWarningEnabled,
                            lowStockWarningEnabled,
                            getDisplayColorContextFromEntry(lot, lot.product),
                          )
                          const lotExpiry = formatExpiryDate(lot.expiry_date)
                          return (
                            <View key={lot.id}>
                              <TouchableOpacity
                                style={[styles.lotRow, { borderColor: colors.border, backgroundColor: colors.bg }]}
                                onPress={() => handlePressLot(lot)}
                                disabled={isReadOnly}
                              >
                                <View style={styles.lotInfo}>
                                  <Text style={[styles.lotText, { color: colors.text }]}>{lot.quantity_boxes} {qtyUnit}</Text>
                                  <Text style={[styles.lotSubText, { color: colors.sub }]}>Hạn: {lotExpiry}</Text>
                                  {!!lot.barcode && <Text style={[styles.lotSubText, { color: colors.sub }]}>Barcode: {lot.barcode}</Text>}
                                </View>
                                <View style={styles.lotRight}>
                                  <View style={[styles.expiryDot, { backgroundColor: lotColor }]} />
                                  {canWrite ? (
                                    <>
                                      <TouchableOpacity
                                        style={[styles.deleteLotBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={() =>
                                          handleProductNameEditButtonPress(group.productId, group.productName)
                                        }
                                      >
                                        <Text
                                          style={[
                                            styles.deleteLotBtnText,
                                            productNameHasChanges ? { color: '#22C55E' } : null,
                                          ]}
                                        >
                                          {productNameEditIcon}
                                        </Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        style={[styles.deleteLotBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={() => openMoveLot(lot)}
                                      >
                                        <Text style={styles.deleteLotBtnText}>→</Text>
                                      </TouchableOpacity>
                                      {lot.quantity_boxes === 0 ? (
                                        <TouchableOpacity
                                          style={[styles.deleteLotBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                          onPress={() => handleDeleteLot(lot)}
                                        >
                                          <Text style={styles.deleteLotBtnText}>🗑️</Text>
                                        </TouchableOpacity>
                                      ) : null}
                                    </>
                                  ) : null}
                                </View>
                              </TouchableOpacity>

                              {canWrite && editingLotId === lot.id && (
                                <View style={[styles.editBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                                  <Text style={[styles.editLabel, { color: colors.sub }]}>Số {qtyUnit}</Text>
                                  <TextInput
                                    style={[styles.editInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                                    keyboardType="numeric"
                                    value={editQuantity}
                                    onChangeText={setEditQuantity}
                                    placeholder="1"
                                    placeholderTextColor={colors.sub}
                                    maxLength={6}
                                  />

                                  <Text style={[styles.editLabel, { color: colors.sub }]}>Hạn sử dụng (DD/MM/YYYY)</Text>
                                  <TextInput
                                    style={[styles.editInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                                    value={editExpiryDate}
                                    onChangeText={setEditExpiryDate}
                                    placeholder="30/12/2026"
                                    placeholderTextColor={colors.sub}
                                    keyboardType="default"
                                    maxLength={10}
                                  />

                                  <Text style={[styles.editLabel, { color: colors.sub }]}>Ghi chú</Text>
                                  <TextInput
                                    style={[styles.editInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                                    value={editNotes}
                                    onChangeText={setEditNotes}
                                    placeholder="Optional"
                                    placeholderTextColor={colors.sub}
                                    maxLength={500}
                                  />

                                  <Text style={[styles.editLabel, { color: colors.sub }]}>Barcode lô</Text>
                                  <View style={styles.barcodeRow}>
                                    <TextInput
                                      style={[styles.barcodeInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                                      value={editLotBarcode}
                                      onChangeText={setEditLotBarcode}
                                      placeholder="Optional"
                                      placeholderTextColor={colors.sub}
                                      autoCapitalize="none"
                                      autoCorrect={false}
                                      maxLength={50}
                                    />
                                    <TouchableOpacity
                                      style={[styles.barcodeScanBtn, { backgroundColor: colors.accent }]}
                                      onPress={() =>
                                        navigation.navigate('BarcodeScanner', {
                                          mode: 'search',
                                          onScanFillBarcode: (barcode: string) => {
                                            setEditingLotId(lot.id)
                                            setEditLotBarcode(barcode.trim())
                                          },
                                        })
                                      }
                                    >
                                      <Text style={[styles.barcodeScanBtnText, { color: colors.card }]}>📷</Text>
                                    </TouchableOpacity>
                                  </View>

                                  <View style={styles.editActions}>
                                    <TouchableOpacity
                                      style={[styles.editCancelBtn, { backgroundColor: colors.bg }]}
                                      onPress={() => setEditingLotId(null)}
                                    >
                                      <Text style={{ color: colors.sub }}>Huỷ</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={[styles.editSaveBtn, { backgroundColor: colors.accent }]}
                                      onPress={() => handleSaveLot(lot)}
                                    >
                                      <Text style={{ color: colors.card, fontWeight: '700' }}>Lưu</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              )}
                            </View>
                          )
                        })}
                      </View>
                    </View>
                  )
                })}
              </ScrollView>
            )}
          </View>

          {canWrite ? (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={handlePressAddInventory}>
              <Text style={[styles.addBtnText, { color: colors.card }]}>Thêm hàng</Text>
            </TouchableOpacity>
          ) : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropArea: {
    flex: 1,
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  zoneColorBar: {
    height: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tabBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  content: {
    paddingHorizontal: 16,
    minHeight: 220,
    maxHeight: 340,
  },
  loading: {
    marginTop: 24,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 12,
  },
  emptyAddBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  groupWrap: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 8,
  },
  itemMain: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemNameInput: {
    borderBottomWidth: 1,
    paddingVertical: 2,
    marginBottom: 2,
  },
  itemQty: {
    marginTop: 2,
    fontSize: 12,
  },
  expiryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lotList: {
    gap: 8,
  },
  lotRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lotRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lotInfo: {
    flex: 1,
    marginRight: 8,
  },
  deleteLotBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLotBtnText: {
    fontSize: 11,
  },
  editBox: {
    marginTop: -2,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  editLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  barcodeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  barcodeScanBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeScanBtnText: {
    fontSize: 18,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  lotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lotSubText: {
    marginTop: 2,
    fontSize: 12,
  },
  addBtn: {
    margin: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
