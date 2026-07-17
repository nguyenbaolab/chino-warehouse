import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import type { Zone, ZoneCell } from '../types'

const CELL_SIZE = 56
const DEFAULT_GRID = 6

export type ZonePickerParams = {
  entryId: string
  sourceZoneId: string
  sourceTier: number
  locationId: string
  /** MapScreen C1 — bỏ qua Realtime self-refresh sau mutation */
  markOwnMutation?: () => void
}

function getCenterCell(cells: ZoneCell[]): ZoneCell {
  if (cells.length === 0) return { row: 1, col: 1 }
  const avgRow = cells.reduce((s, c) => s + c.row, 0) / cells.length
  const avgCol = cells.reduce((s, c) => s + c.col, 0) / cells.length
  return cells.reduce((best, c) => {
    const dBest = Math.abs(best.row - avgRow) + Math.abs(best.col - avgCol)
    const dCurr = Math.abs(c.row - avgRow) + Math.abs(c.col - avgCol)
    return dCurr < dBest ? c : best
  }, cells[0])
}

function getCellRadius(cells: ZoneCell[], row: number, col: number) {
  const has = (r: number, c: number) => cells.some((cell) => cell.row === r && cell.col === c)
  const top = has(row - 1, col)
  const bottom = has(row + 1, col)
  const left = has(row, col - 1)
  const right = has(row, col + 1)
  return {
    borderTopLeftRadius: top || left ? 2 : 10,
    borderTopRightRadius: top || right ? 2 : 10,
    borderBottomLeftRadius: bottom || left ? 2 : 10,
    borderBottomRightRadius: bottom || right ? 2 : 10,
  }
}

function zoneBgColor(hex: string, opacity = 0.25): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

export default function ZonePickerScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const {
    entryId,
    sourceZoneId,
    locationId,
    markOwnMutation,
  } = (route.params as ZonePickerParams) || {}

  const { colors } = useThemeStore()
  const { locations, zones, fetchZones, updateInventoryEntry } = useWarehouseStore()

  const [loading, setLoading] = useState(false)
  const [moving, setMoving] = useState(false)
  const [tierPickZone, setTierPickZone] = useState<Zone | null>(null)

  const location = useMemo(
    () => locations.find((l) => l.id === locationId),
    [locations, locationId],
  )
  const gridRows = location?.grid_rows ?? DEFAULT_GRID
  const gridCols = location?.grid_cols ?? DEFAULT_GRID

  const locationZones = useMemo(
    () => zones.filter((z) => z.location_id === locationId),
    [zones, locationId],
  )

  useFocusEffect(
    useCallback(() => {
      if (!locationId) return
      let cancelled = false
      void (async () => {
        const needFetch =
          useWarehouseStore.getState().zones.length === 0 ||
          !useWarehouseStore.getState().zones.some((z) => z.location_id === locationId)
        if (!needFetch) return
        setLoading(true)
        await fetchZones(locationId)
        if (!cancelled) setLoading(false)
      })()
      return () => {
        cancelled = true
      }
    }, [locationId, fetchZones]),
  )

  function getCellZone(r: number, c: number): Zone | null {
    return locationZones.find((z) => z.cells?.some((cell) => cell.row === r && cell.col === c)) ?? null
  }

  async function confirmMove(targetZone: Zone, targetTier: number) {
    if (!entryId || moving) return
    setMoving(true)
    try {
      markOwnMutation?.()
      await updateInventoryEntry(entryId, { zone_id: targetZone.id, tier: targetTier })
      setTierPickZone(null)
      navigation.goBack()
    } catch {
      Alert.alert('Lỗi', 'Không thể chuyển lô. Vui lòng thử lại.')
    } finally {
      setMoving(false)
    }
  }

  function askConfirmMove(targetZone: Zone, targetTier: number) {
    const sameZone = targetZone.id === sourceZoneId
    const message = sameZone
      ? `Chuyển lô sang tầng ${targetTier} trong zone «${targetZone.name}»?`
      : `Chuyển lô sang «${targetZone.name}» — tầng ${targetTier}?`
    Alert.alert('Xác nhận chuyển lô', message, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: () => void confirmMove(targetZone, targetTier),
      },
    ])
  }

  function handleZoneTap(zone: Zone) {
    if (moving) return
    const tierCount = Math.max(zone.tier_count || 1, 1)
    if (tierCount === 1) {
      askConfirmMove(zone, 1)
      return
    }
    setTierPickZone(zone)
  }

  function renderGrid() {
    const rows = []
    for (let r = 1; r <= gridRows; r++) {
      const cols = []
      for (let c = 1; c <= gridCols; c++) {
        const zone = getCellZone(r, c)
        const isSource = zone?.id === sourceZoneId
        const zoneColor = zone?.color ?? colors.accent
        const centerCell = zone ? getCenterCell(zone.cells) : null
        const isCenter = centerCell?.row === r && centerCell?.col === c
        const radius = zone
          ? getCellRadius(zone.cells, r, c)
          : {
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
              borderBottomLeftRadius: 10,
              borderBottomRightRadius: 10,
            }

        let bgColor = colors.cellEmpty
        let borderColor = colors.cellBorder
        let borderWidth = 1.5
        let opacity = 1

        if (zone) {
          bgColor = zoneBgColor(zoneColor, isSource ? 0.45 : 0.25)
          borderColor = zoneColor
          borderWidth = isSource ? 3 : 1.5
          opacity = isSource ? 1 : 0.92
        }

        cols.push(
          <TouchableOpacity
            key={`${r}-${c}`}
            style={[
              styles.cell,
              { backgroundColor: bgColor, borderColor, borderWidth, opacity },
              radius,
            ]}
            onPress={() => {
              if (zone) handleZoneTap(zone)
            }}
            activeOpacity={zone ? 0.7 : 1}
            disabled={!zone || moving}
          >
            {isCenter && zone ? (
              <Text style={[styles.zoneLabel, { color: zoneColor }]} numberOfLines={2}>
                {zone.name}
              </Text>
            ) : null}
            {isSource && isCenter ? (
              <Text style={[styles.sourceBadge, { color: colors.sub }]}>đang ở</Text>
            ) : null}
          </TouchableOpacity>,
        )
      }
      rows.push(
        <View key={r} style={styles.gridRow}>
          <Text style={[styles.axisLabel, { color: colors.sub }]}>{r}</Text>
          {cols}
        </View>,
      )
    }
    return rows
  }

  const tierOptions = tierPickZone
    ? Array.from({ length: Math.max(tierPickZone.tier_count || 1, 1) }, (_, i) => i + 1)
    : []

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          onPress={() => navigation.goBack()}
          disabled={moving}
        >
          <Text style={{ color: colors.sub }}>← Huỷ</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          Chọn zone đích
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={[styles.hint, { color: colors.sub }]}>
        Zone đang chứa lô được viền đậm. Tap zone trống / đích để chuyển.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.gridScroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <View style={styles.axisCorner} />
              {Array.from({ length: gridCols }, (_, i) => (
                <Text key={i} style={[styles.axisLabel, styles.colLabel, { color: colors.sub }]}>
                  {i + 1}
                </Text>
              ))}
            </View>
            {renderGrid()}
          </View>
        </ScrollView>
      )}

      {/* Modal chọn tầng khi zone nhiều tầng */}
      <Modal
        visible={!!tierPickZone}
        transparent
        animationType="slide"
        onRequestClose={() => setTierPickZone(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTierPickZone(null)}>
          <Pressable
            style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Chọn tầng — {tierPickZone?.name ?? ''}
            </Text>
            {tierOptions.map((tierNum) => (
              <TouchableOpacity
                key={tierNum}
                style={[styles.tierRow, { borderBottomColor: colors.border }]}
                disabled={moving}
                onPress={() => {
                  if (!tierPickZone) return
                  const zone = tierPickZone
                  setTierPickZone(null)
                  askConfirmMove(zone, tierNum)
                }}
              >
                <Text style={{ color: colors.text, fontSize: 15 }}>Tầng {tierNum}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalCancel, { backgroundColor: colors.bg }]}
              onPress={() => setTierPickZone(null)}
            >
              <Text style={{ color: colors.sub }}>Huỷ</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  headerSpacer: { width: 72 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 12, paddingHorizontal: 16, marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridScroll: { paddingBottom: 32 },
  grid: { padding: 16 },
  gridRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  axisCorner: { width: 20, height: CELL_SIZE },
  axisLabel: { width: 20, fontSize: 10, textAlign: 'center' },
  colLabel: { width: CELL_SIZE, marginHorizontal: 2, marginBottom: 4 },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    marginHorizontal: 2,
    marginVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoneLabel: { fontSize: 10, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 2 },
  sourceBadge: { fontSize: 8, marginTop: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  tierRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCancel: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
})
