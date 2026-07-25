import { useEffect, useState } from 'react'
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { useThemeStore } from '../stores/themeStore'
import ImageViewerModal from './ImageViewerModal'
import { formatExpiryDate, InventoryEntry, Product } from '../types'

export type LotPickerSelection = { entry: InventoryEntry; qty: number }

export type LotPickerModalProps = {
  visible: boolean
  product: Product | null
  lots: InventoryEntry[]
  alreadyAddedIds: Set<string>
  onClose: () => void
  onConfirm: (selected: LotPickerSelection[]) => Promise<void>
}

export default function LotPickerModal({
  visible,
  product,
  lots,
  alreadyAddedIds,
  onClose,
  onConfirm,
}: LotPickerModalProps) {
  const { colors } = useThemeStore()
  const [tickedLotIds, setTickedLotIds] = useState<Set<string>>(new Set())
  const [lotQtyInputs, setLotQtyInputs] = useState<Record<string, string>>({})
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  // Reset khi mở modal (visible false → true)
  useEffect(() => {
    if (!visible) return
    setTickedLotIds(new Set())
    setLotQtyInputs(Object.fromEntries(lots.map((e) => [e.id, '1'])))
  }, [visible, lots])

  async function handleConfirm() {
    const selected: LotPickerSelection[] = []
    for (const entry of lots) {
      if (!tickedLotIds.has(entry.id) || alreadyAddedIds.has(entry.id)) continue
      const raw = lotQtyInputs[entry.id]?.trim() ?? '1'
      const qty = Number(raw)
      if (!Number.isFinite(qty) || qty <= 0 || qty !== Math.floor(qty)) {
        Alert.alert('Số thùng không hợp lệ', 'Số thùng phải là số nguyên lớn hơn 0.')
        return
      }
      if (qty > entry.quantity_boxes) {
        Alert.alert(
          'Vượt tồn kho',
          `${entry.zone?.name ?? 'Lô'} · Tầng ${entry.tier}: chỉ còn ${entry.quantity_boxes} thùng.`,
        )
        return
      }
      selected.push({ entry, qty })
    }
    if (selected.length === 0) return
    setIsConfirming(true)
    try {
      await onConfirm(selected)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              {product?.image_url ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setZoomImageUrl(product.image_url!)}
                >
                  <Image source={{ uri: product.image_url }} style={styles.modalThumb} contentFit="cover" cachePolicy="disk" />
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.modalThumb,
                    { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>📦</Text>
                </View>
              )}
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>
                {product?.name}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 20, color: colors.sub }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
              {lots.length === 0 ? (
                <Text style={{ color: colors.sub, padding: 16 }}>Không có lô nào trong kho.</Text>
              ) : (
                lots.map((entry) => {
                  const alreadyAdded = alreadyAddedIds.has(entry.id)
                  const ticked = tickedLotIds.has(entry.id)
                  return (
                    <View
                      key={entry.id}
                      style={[styles.modalLotRow, { borderBottomColor: colors.border }]}
                    >
                      <TouchableOpacity
                        disabled={alreadyAdded}
                        onPress={() => {
                          setTickedLotIds((prev) => {
                            const next = new Set(prev)
                            if (ticked) next.delete(entry.id)
                            else next.add(entry.id)
                            return next
                          })
                        }}
                        style={styles.modalCheckbox}
                      >
                        <Text style={{ fontSize: 18 }}>
                          {alreadyAdded ? '☑️' : ticked ? '✅' : '⬜'}
                        </Text>
                      </TouchableOpacity>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            color: alreadyAdded ? colors.sub : colors.text,
                            fontWeight: '600',
                            fontSize: 13,
                          }}
                        >
                          {entry.zone?.name ?? 'Zone'} · Tầng {entry.tier}
                        </Text>
                        <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                          Tồn: {entry.quantity_boxes} thùng
                          {entry.expiry_date
                            ? ` · Hạn: ${formatExpiryDate(entry.expiry_date)}`
                            : ''}
                        </Text>
                        {alreadyAdded ? (
                          <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                            Đã thêm
                          </Text>
                        ) : null}
                      </View>

                      {!alreadyAdded && ticked ? (
                        <TextInput
                          style={[
                            styles.qtyInput,
                            {
                              color: colors.text,
                              borderColor: colors.border,
                              backgroundColor: colors.bg,
                            },
                          ]}
                          keyboardType="numeric"
                          value={lotQtyInputs[entry.id] ?? '1'}
                          onChangeText={(v) =>
                            setLotQtyInputs((prev) => ({ ...prev, [entry.id]: v }))
                          }
                          maxLength={4}
                        />
                      ) : null}
                    </View>
                  )
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.addTickedBtn,
                {
                  backgroundColor: tickedLotIds.size > 0 ? colors.accent : colors.border,
                },
              ]}
              disabled={tickedLotIds.size === 0 || isConfirming}
              onPress={() => void handleConfirm()}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {tickedLotIds.size > 0
                  ? `Thêm ${tickedLotIds.size} lô`
                  : 'Chưa chọn lô nào'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ImageViewerModal uri={zoomImageUrl} onClose={() => setZoomImageUrl(null)} />
    </>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalThumb: { width: 40, height: 40, borderRadius: 6 },
  modalTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  modalLotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  modalCheckbox: { width: 32, alignItems: 'center' },
  qtyInput: {
    width: 56,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingHorizontal: 4,
    fontSize: 14,
    includeFontPadding: false,
  },
  addTickedBtn: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
})
