import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { formatExpiryDate, getCombinedStatus, getCombinedStatusRank, InventoryEntry, Zone } from '../types'
import { normalizeText } from '../utils/textUtils'

type ZoneDetailSheetProps = {
  visible: boolean
  zone: Zone | null
  onClose: () => void
  navigation: any
  scannedLotBarcode?: string
  scannedLotId?: string
  scannedLotBarcodeAt?: number
}

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
  navigation,
  scannedLotBarcode,
  scannedLotId,
  scannedLotBarcodeAt,
}: ZoneDetailSheetProps) {
  const { colors } = useThemeStore()
  const { zones, fetchInventoryByZone, updateInventoryEntry, deleteInventoryEntry } = useWarehouseStore()

  const [entries, setEntries] = useState<InventoryEntry[]>([])
  const [selectedTier, setSelectedTier] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [tierSearchQueries, setTierSearchQueries] = useState<Record<number, string>>({})
  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editExpiryDate, setEditExpiryDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLotBarcode, setEditLotBarcode] = useState('')
  const [moveLot, setMoveLot] = useState<InventoryEntry | null>(null)
  const [targetZoneId, setTargetZoneId] = useState<string | null>(null)
  const [targetTier, setTargetTier] = useState<number | null>(null)
  const [showZoneOptions, setShowZoneOptions] = useState(false)
  const [showTierOptions, setShowTierOptions] = useState(false)

  useEffect(() => {
    if (!visible || !zone) return

    // Mỗi lần mở sheet theo zone mới thì reset về tầng 1
    setSelectedTier(1)
  }, [visible, zone?.id])

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

  // Validate định dạng YYYY-MM-DD
  function isValidIsoDate(raw: string): boolean {
    if (!raw.trim()) return true
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim())
    if (!match) return false
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(year, month - 1, day)
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    )
  }

  async function reloadCurrentZoneInventory() {
    if (!zone) return
    const data = await fetchInventoryByZone(zone.id)
    setEntries(data)
  }

  const tierCount = zone?.tier_count ?? 1
  const tiers = Array.from({ length: Math.max(tierCount, 1) }, (_, index) => index + 1)

  const currentTierEntries = useMemo(
    () => entries.filter((entry) => entry.tier === selectedTier),
    [entries, selectedTier]
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
    // Tap lô để mở/đóng inline form chỉnh sửa
    if (editingLotId === entry.id) {
      setEditingLotId(null)
      return
    }
    setEditingLotId(entry.id)
    setEditQuantity(String(entry.quantity_boxes))
    setEditExpiryDate(entry.expiry_date ?? '')
    setEditNotes(entry.notes ?? '')
    setEditLotBarcode(entry.barcode ?? '')
  }

  async function handleSaveLot(entry: InventoryEntry) {
    const quantity = Number(editQuantity)
    if (!Number.isFinite(quantity) || quantity < 0 || quantity !== Math.floor(quantity)) {
      Alert.alert('Số thùng không hợp lệ', 'Số thùng phải là số nguyên lớn hơn hoặc bằng 0.')
      return
    }
    if (!isValidIsoDate(editExpiryDate)) {
      Alert.alert('Hạn không hợp lệ', 'Hạn sử dụng phải theo định dạng YYYY-MM-DD.')
      return
    }

    // Lưu lot đang sửa vào Supabase qua store
    await updateInventoryEntry(entry.id, {
      quantity_boxes: quantity,
      expiry_date: editExpiryDate.trim() || undefined,
      notes: editNotes.trim() || undefined,
      barcode: editLotBarcode.trim() || undefined,
    })
    setEditingLotId(null)
    await reloadCurrentZoneInventory()
  }

  function handleDeleteLot(entry: InventoryEntry) {
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
    setMoveLot(entry)
    setTargetZoneId(null)
    setTargetTier(null)
    setShowZoneOptions(false)
    setShowTierOptions(false)
  }

  const availableTargetZones = zones.filter((z) => z.id !== moveLot?.zone_id)
  const selectedTargetZone = zones.find((z) => z.id === targetZoneId) ?? null
  const availableTargetTiers = selectedTargetZone
    ? Array.from({ length: Math.max(selectedTargetZone.tier_count || 1, 1) }, (_, idx) => idx + 1)
    : []

  async function confirmMoveLot() {
    if (!moveLot || !targetZoneId || !targetTier) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn zone đích và tầng đích.')
      return
    }
    await updateInventoryEntry(moveLot.id, { zone_id: targetZoneId, tier: targetTier })
    setMoveLot(null)
    await reloadCurrentZoneInventory()
  }

  useEffect(() => {
    if (!visible || !scannedLotBarcodeAt || !scannedLotId) return
    const target = entries.find((entry) => entry.id === scannedLotId)
    if (!target) return
    setEditingLotId(target.id)
    setEditQuantity(String(target.quantity_boxes))
    setEditExpiryDate(target.expiry_date ?? '')
    setEditNotes(target.notes ?? '')
    setEditLotBarcode(scannedLotBarcode ?? '')
    navigation.setParams({
      scannedZoneLotBarcode: undefined,
      scannedZoneLotId: undefined,
      scannedZoneLotBarcodeAt: undefined,
    })
  }, [visible, scannedLotBarcodeAt, scannedLotId, scannedLotBarcode, entries, navigation])

  function handlePressAddInventory() {
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
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            />
          </View>

          <View style={styles.content}>
            {isLoading ? (
              <ActivityIndicator color={colors.accent} style={styles.loading} />
            ) : currentTierEntries.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.sub }]}>Chưa có hàng trong zone này</Text>
                <TouchableOpacity
                  style={[styles.emptyAddBtn, { backgroundColor: colors.accent }]}
                  onPress={handlePressAddInventory}
                >
                  <Text style={[styles.emptyAddBtnText, { color: colors.card }]}>Thêm hàng</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                  const worstColor = worstStatus === 'expired'
                    ? colors.statusExpired
                    : worstStatus === 'critical'
                      ? colors.statusCritical
                      : worstStatus === 'warning'
                        ? colors.statusWarning
                        : colors.statusOk

                  return (
                    <View key={group.productId} style={[styles.groupWrap, { borderBottomColor: colors.border }]}>
                      <View style={styles.itemRow}>
                        <View style={styles.itemMain}>
                          <TouchableOpacity
                            onPress={() => navigation.navigate('ProductDetail', { productId: group.productId })}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                              {group.productName}
                            </Text>
                          </TouchableOpacity>
                          <Text style={[styles.itemQty, { color: colors.sub }]}>{group.totalBoxes} thùng</Text>
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
                          const lotColor = lotStatus === 'expired'
                            ? colors.statusExpired
                            : lotStatus === 'critical'
                              ? colors.statusCritical
                              : lotStatus === 'warning'
                                ? colors.statusWarning
                                : colors.statusOk
                          const lotExpiry = formatExpiryDate(lot.expiry_date)
                          return (
                            <View key={lot.id}>
                              <TouchableOpacity
                                style={[styles.lotRow, { borderColor: colors.border, backgroundColor: colors.bg }]}
                                onPress={() => handlePressLot(lot)}
                              >
                                <View style={styles.lotInfo}>
                                  <Text style={[styles.lotText, { color: colors.text }]}>{lot.quantity_boxes} thùng</Text>
                                  <Text style={[styles.lotSubText, { color: colors.sub }]}>Hạn: {lotExpiry}</Text>
                                  {!!lot.barcode && <Text style={[styles.lotSubText, { color: colors.sub }]}>Barcode: {lot.barcode}</Text>}
                                </View>
                                <View style={styles.lotRight}>
                                  <View style={[styles.expiryDot, { backgroundColor: lotColor }]} />
                                  <TouchableOpacity
                                    style={[styles.deleteLotBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => openMoveLot(lot)}
                                  >
                                    <Text style={styles.deleteLotBtnText}>→</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.deleteLotBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => handleDeleteLot(lot)}
                                  >
                                    <Text style={styles.deleteLotBtnText}>🗑️</Text>
                                  </TouchableOpacity>
                                </View>
                              </TouchableOpacity>

                              {editingLotId === lot.id && (
                                <View style={[styles.editBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                                  <Text style={[styles.editLabel, { color: colors.sub }]}>Số thùng</Text>
                                  <TextInput
                                    style={[styles.editInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                                    keyboardType="numeric"
                                    value={editQuantity}
                                    onChangeText={setEditQuantity}
                                    placeholder="1"
                                    placeholderTextColor={colors.sub}
                                  />

                                  <Text style={[styles.editLabel, { color: colors.sub }]}>Hạn sử dụng (YYYY-MM-DD)</Text>
                                  <TextInput
                                    style={[styles.editInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                                    value={editExpiryDate}
                                    onChangeText={setEditExpiryDate}
                                    placeholder="2026-12-30"
                                    placeholderTextColor={colors.sub}
                                  />

                                  <Text style={[styles.editLabel, { color: colors.sub }]}>Ghi chú</Text>
                                  <TextInput
                                    style={[styles.editInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                                    value={editNotes}
                                    onChangeText={setEditNotes}
                                    placeholder="Optional"
                                    placeholderTextColor={colors.sub}
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

          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={handlePressAddInventory}>
            <Text style={[styles.addBtnText, { color: colors.card }]}>Thêm hàng</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>

        <Modal visible={!!moveLot} transparent animationType="slide" onRequestClose={() => setMoveLot(null)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setMoveLot(null)} />
            <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView
                style={styles.moveModalScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <Text style={[styles.modalTitle, { color: colors.text }]}>Chuyển lô hàng</Text>

                <Text style={[styles.editLabel, { color: colors.sub }]}>Zone đích</Text>
                <Pressable
                  style={[styles.selectBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                  onPress={() => {
                    setShowZoneOptions((v) => !v)
                    setShowTierOptions(false)
                  }}
                >
                  <Text style={{ color: selectedTargetZone ? colors.text : colors.sub }}>
                    {selectedTargetZone?.name ?? 'Chọn zone đích'}
                  </Text>
                </Pressable>
                {showZoneOptions && (
                  <View style={[styles.optionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    {availableTargetZones.map((zoneItem) => (
                      <TouchableOpacity
                        key={zoneItem.id}
                        style={[styles.optionRow, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setTargetZoneId(zoneItem.id)
                          const tiersCount = Math.max(zoneItem.tier_count || 1, 1)
                          setTargetTier(tiersCount === 1 ? 1 : null)
                          setShowZoneOptions(false)
                        }}
                      >
                        <Text style={{ color: colors.text }}>{zoneItem.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={[styles.editLabel, { color: colors.sub, marginTop: 8 }]}>Tầng đích</Text>
                <Pressable
                  style={[styles.selectBtn, { backgroundColor: colors.bg, borderColor: colors.border, opacity: selectedTargetZone ? 1 : 0.5 }]}
                  onPress={() => {
                    if (!selectedTargetZone || availableTargetTiers.length <= 1) return
                    setShowTierOptions((v) => !v)
                    setShowZoneOptions(false)
                  }}
                >
                  <Text style={{ color: targetTier ? colors.text : colors.sub }}>
                    {targetTier ? `Tầng ${targetTier}` : 'Chọn tầng đích'}
                  </Text>
                </Pressable>
                {showTierOptions && availableTargetTiers.length > 1 && (
                  <View style={[styles.optionsWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    {availableTargetTiers.map((tierNum) => (
                      <TouchableOpacity
                        key={tierNum}
                        style={[styles.optionRow, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setTargetTier(tierNum)
                          setShowTierOptions(false)
                        }}
                      >
                        <Text style={{ color: colors.text }}>Tầng {tierNum}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>

              <View style={[styles.editActions, styles.moveModalActions]}>
                <TouchableOpacity style={[styles.editCancelBtn, { backgroundColor: colors.bg }]} onPress={() => setMoveLot(null)}>
                  <Text style={{ color: colors.sub }}>Huỷ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.editSaveBtn, { backgroundColor: colors.accent }]} onPress={confirmMoveLot}>
                  <Text style={{ color: colors.card, fontWeight: '700' }}>Xác nhận</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  moveModalScroll: { maxHeight: 360 },
  moveModalActions: { marginTop: 16 },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalBox: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  selectBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  optionsWrap: { borderWidth: 1, borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  optionRow: { borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
})
