import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { EXPIRY_COLORS, getExpiryStatus, InventoryEntry, Zone } from '../types'

type ZoneDetailSheetProps = {
  visible: boolean
  zone: Zone | null
  onClose: () => void
  navigation: any
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

export default function ZoneDetailSheet({ visible, zone, onClose, navigation }: ZoneDetailSheetProps) {
  const { colors } = useThemeStore()
  const { fetchInventoryByZone } = useWarehouseStore()

  const [entries, setEntries] = useState<InventoryEntry[]>([])
  const [selectedTier, setSelectedTier] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

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

  const tierCount = zone?.tier_count ?? 1
  const tiers = Array.from({ length: Math.max(tierCount, 1) }, (_, index) => index + 1)

  const currentTierEntries = useMemo(
    () => entries.filter((entry) => entry.tier === selectedTier),
    [entries, selectedTier]
  )

  function handlePressProduct(entry: InventoryEntry) {
    // Placeholder cho ProductDetail ở bước sau
    console.log('ZoneDetailSheet: selected product entry', entry)
  }

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

        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              <ScrollView showsVerticalScrollIndicator={false}>
                {currentTierEntries.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={[styles.itemRow, { borderBottomColor: colors.border }]}
                    onPress={() => handlePressProduct(entry)}
                  >
                    <View style={styles.itemMain}>
                      <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                        {entry.product?.name ?? 'Sản phẩm không xác định'}
                      </Text>
                      <Text style={[styles.itemQty, { color: colors.sub }]}>{entry.quantity_boxes} thùng</Text>
                    </View>
                    <View
                      style={[
                        styles.expiryDot,
                        { backgroundColor: EXPIRY_COLORS[getExpiryStatus(entry.expiry_date)] },
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={handlePressAddInventory}>
            <Text style={[styles.addBtnText, { color: colors.card }]}>Thêm hàng</Text>
          </TouchableOpacity>
        </View>
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
    borderBottomWidth: 1,
    paddingVertical: 12,
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
