import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  useWindowDimensions,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { ZoneCell } from '../types'
import { normalizeText } from '../utils/textUtils'

const H_PADDING = 16
const CONFLICT = '#EF4444'

function zoneRgba(hex: string, opacity: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

function cellsFromAnchor(shape: ZoneCell[], anchorRow: number, anchorCol: number): ZoneCell[] {
  return shape.map((c) => ({ row: c.row + anchorRow, col: c.col + anchorCol }))
}

function zoneAbbrev(name: string): string {
  const t = name.trim()
  if (t.length <= 5) return t
  return `${t.slice(0, 4)}…`
}

/** Badge: max cột × max hàng (span theo shape gốc 0,0). */
function shapeBadge(shape: ZoneCell[]): string {
  if (shape.length === 0) return '0×0'
  let maxR = 0
  let maxC = 0
  for (const c of shape) {
    maxR = Math.max(maxR, c.row)
    maxC = Math.max(maxC, c.col)
  }
  const colSpan = maxC + 1
  const rowSpan = maxR + 1
  return `${colSpan}×${rowSpan}`
}

function cellsEqual(a: ZoneCell[], b: ZoneCell[]): boolean {
  const sa = [...a].sort((x, y) => x.row - y.row || x.col - y.col)
  const sb = [...b].sort((x, y) => x.row - y.row || x.col - y.col)
  if (sa.length !== sb.length) return false
  return sa.every((c, i) => c.row === sb[i].row && c.col === sb[i].col)
}

function buildOccupancy(
  zoneIds: string[],
  getCells: (id: string) => ZoneCell[]
): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const id of zoneIds) {
    for (const c of getCells(id)) {
      const k = `${c.row},${c.col}`
      const arr = m.get(k) ?? []
      arr.push(id)
      m.set(k, arr)
    }
  }
  return m
}

function conflictZoneIdsFromOccupancy(occ: Map<string, string[]>): Set<string> {
  const out = new Set<string>()
  for (const [, ids] of occ) {
    const uniq = [...new Set(ids)]
    if (uniq.length > 1) uniq.forEach((z) => out.add(z))
  }
  return out
}

function conflictCellKeysFromOccupancy(occ: Map<string, string[]>): Set<string> {
  const out = new Set<string>()
  for (const [key, ids] of occ) {
    if ([...new Set(ids)].length > 1) out.add(key)
  }
  return out
}

export default function ZoneLayoutEditorScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { width: screenWidth } = useWindowDimensions()
  const { colors, loadTheme } = useThemeStore()
  const { locations, zones, fetchZones, batchUpdateZoneCells } = useWarehouseStore()

  const locationId: string | undefined = route.params?.locationId
  const markOwnMutation: (() => void) | undefined = route.params?.markOwnMutation
  const location = useMemo(
    () => locations.find((l) => l.id === locationId),
    [locations, locationId]
  )
  const gridRows = location?.grid_rows ?? 6
  const gridCols = location?.grid_cols ?? 6

  const [pendingAnchors, setPendingAnchors] = useState<Map<string, { row: number; col: number }>>(new Map())
  const [originalShapes, setOriginalShapes] = useState<Map<string, ZoneCell[]>>(new Map())
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [zoneSearchQuery, setZoneSearchQuery] = useState('')
  const [zoneMeta, setZoneMeta] = useState<Map<string, { name: string; color: string }>>(new Map())

  useEffect(() => {
    loadTheme()
  }, [loadTheme])

  useFocusEffect(
    useCallback(() => {
      if (locationId) void fetchZones(locationId)
    }, [locationId, fetchZones])
  )

  const zonesContentKey = useMemo(
    () =>
      locationId
        ? zones
            .filter((z) => z.location_id === locationId)
            .map((z) => `${z.id}:${JSON.stringify(z.cells)}`)
            .join('|')
        : '',
    [zones, locationId]
  )

  // Khởi tạo anchor + shape từ server (theo snapshot cells của từng zone)
  useEffect(() => {
    if (!locationId) return
    const list = zones.filter((z) => z.location_id === locationId)
    const anchors = new Map<string, { row: number; col: number }>()
    const shapes = new Map<string, ZoneCell[]>()
    const meta = new Map<string, { name: string; color: string }>()
    for (const z of list) {
      const cells = (z.cells as ZoneCell[]) ?? []
      if (cells.length === 0) continue
      const minR = Math.min(...cells.map((c) => c.row))
      const minC = Math.min(...cells.map((c) => c.col))
      anchors.set(z.id, { row: minR, col: minC })
      shapes.set(
        z.id,
        cells.map((c) => ({ row: c.row - minR, col: c.col - minC }))
      )
      meta.set(z.id, { name: z.name, color: z.color })
    }
    setPendingAnchors(anchors)
    setOriginalShapes(shapes)
    setZoneMeta(meta)
    setSelectedZoneId(null)
  }, [locationId, zonesContentKey])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const zoneIds = useMemo(() => [...originalShapes.keys()], [originalShapes])

  const filteredZoneIds = useMemo(() => {
    const q = normalizeText(zoneSearchQuery.trim())
    if (!q) return zoneIds
    return zoneIds.filter((zid) => {
      const name = zoneMeta.get(zid)?.name ?? ''
      return normalizeText(name).includes(q)
    })
  }, [zoneIds, zoneMeta, zoneSearchQuery])

  const getCellsForZone = useCallback(
    (zid: string) => {
      const anchor = pendingAnchors.get(zid)
      const shape = originalShapes.get(zid)
      if (!anchor || !shape) return []
      return cellsFromAnchor(shape, anchor.row, anchor.col)
    },
    [pendingAnchors, originalShapes]
  )

  const occupancy = useMemo(
    () => buildOccupancy(zoneIds, getCellsForZone),
    [zoneIds, getCellsForZone]
  )

  const conflictZoneIds = useMemo(
    () => conflictZoneIdsFromOccupancy(occupancy),
    [occupancy]
  )

  const conflictCellKeys = useMemo(
    () => conflictCellKeysFromOccupancy(occupancy),
    [occupancy]
  )

  const cellSize = useMemo(() => {
    const inner = screenWidth - H_PADDING * 2
    return Math.max(28, Math.floor(inner / gridCols))
  }, [screenWidth, gridCols])

  function onGridCellPress(row: number, col: number) {
    if (selectedZoneId == null) return
    const shape = originalShapes.get(selectedZoneId)
    if (!shape) return
    const newCells = cellsFromAnchor(shape, row, col)
    for (const c of newCells) {
      if (c.row < 1 || c.row > gridRows || c.col < 1 || c.col > gridCols) {
        setToast('Zone không vừa vị trí này')
        return
      }
    }
    setPendingAnchors((prev) => {
      const next = new Map(prev)
      next.set(selectedZoneId, { row, col })
      return next
    })
  }

  function toggleTile(zoneId: string) {
    setSelectedZoneId((cur) => (cur === zoneId ? null : zoneId))
  }

  async function onConfirm() {
    if (conflictZoneIds.size > 0) {
      Alert.alert('Chồng lên nhau', 'Còn zone chồng nhau, vui lòng xếp lại trước khi lưu')
      return
    }
    if (!locationId) return
    const updates: { id: string; cells: ZoneCell[] }[] = []
    const list = zones.filter((z) => z.location_id === locationId)
    for (const z of list) {
      const shape = originalShapes.get(z.id)
      const anchor = pendingAnchors.get(z.id)
      if (!shape || !anchor) continue
      const finalCells = cellsFromAnchor(shape, anchor.row, anchor.col)
      const orig = (z.cells as ZoneCell[]) ?? []
      if (!cellsEqual(finalCells, orig)) {
        updates.push({ id: z.id, cells: finalCells })
      }
    }
    if (updates.length === 0) {
      navigation.goBack()
      return
    }
    markOwnMutation?.()
    const { error } = await batchUpdateZoneCells(locationId, updates)
    if (error) {
      Alert.alert('Lỗi', error)
      return
    }
    navigation.goBack()
  }

  function renderGrid() {
    const rows: ReactNode[] = []
    for (let r = 1; r <= gridRows; r++) {
      const cols: ReactNode[] = []
      for (let c = 1; c <= gridCols; c++) {
        const key = `${r},${c}`
        const owners = occupancy.get(key) ?? []
        const isConflictCell = conflictCellKeys.has(key)
        const selMeta = selectedZoneId ? zoneMeta.get(selectedZoneId) : undefined
        let bg = colors.cellEmpty
        let borderColor = colors.cellBorder
        let borderWidth = 1.5

        if (owners.length > 0) {
          const soleSelected =
            selectedZoneId != null &&
            owners.length === 1 &&
            owners[0] === selectedZoneId &&
            selMeta
          if (soleSelected) {
            bg = zoneRgba(selMeta.color, 0.35)
            borderColor = selMeta.color
          } else {
            const primary = owners[0]
            const zm = zoneMeta.get(primary)
            if (zm) bg = zoneRgba(zm.color, 0.85)
            borderColor = zm?.color ?? colors.cellBorder
          }
        }

        if (isConflictCell) {
          borderColor = CONFLICT
          borderWidth = 2
        }

        const label =
          owners.length === 1
            ? zoneAbbrev(zoneMeta.get(owners[0])?.name ?? '')
            : owners.length > 1
              ? '!'
              : ''

        cols.push(
          <TouchableOpacity
            key={key}
            style={[
              styles.cell,
              {
                width: cellSize,
                height: cellSize,
                backgroundColor: bg,
                borderColor,
                borderWidth,
              },
            ]}
            onPress={() => onGridCellPress(r, c)}
            activeOpacity={0.75}
          >
            {label ? (
              <Text style={styles.cellAbbr} numberOfLines={1}>
                {label}
              </Text>
            ) : null}
          </TouchableOpacity>
        )
      }
      rows.push(
        <View key={r} style={styles.gridRow}>
          {cols}
        </View>
      )
    }
    return rows
  }

  if (!locationId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text, padding: 16 }}>Thiếu locationId</Text>
      </SafeAreaView>
    )
  }

  if (!location) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text, padding: 16 }}>Không tìm thấy kho.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 16 }}>
          <Text style={{ color: colors.accent }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.kavRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.topSpacer} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sắp xếp Zone</Text>
          <TouchableOpacity
            style={[styles.confirmHeaderBtn, { backgroundColor: colors.accent }]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmHeaderBtnText}>Xác nhận</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridWrap}>
          <ScrollView
            style={styles.gridScrollOuter}
            contentContainerStyle={styles.gridScrollContent}
            nestedScrollEnabled
          >
            <ScrollView horizontal nestedScrollEnabled>
              <View style={{ paddingHorizontal: H_PADDING, paddingVertical: 8 }}>{renderGrid()}</View>
            </ScrollView>
          </ScrollView>
        </View>

        <View style={[styles.bottomPanel, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.zoneSearchRow}>
          <View style={styles.zoneSearchInputWrap}>
            <TextInput
              style={[
                styles.zoneSearchInput,
                { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border },
              ]}
              value={zoneSearchQuery}
              onChangeText={setZoneSearchQuery}
              placeholder="Tìm zone theo tên..."
              placeholderTextColor={colors.sub}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {zoneSearchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.zoneSearchClearBtn}
                onPress={() => setZoneSearchQuery('')}
                hitSlop={8}
              >
                <Text style={{ color: colors.text }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {filteredZoneIds.length === 0 && zoneSearchQuery.trim().length > 0 ? (
          <Text style={[styles.zoneSearchEmpty, { color: colors.sub }]}>Không tìm thấy zone</Text>
        ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tileRow}
          keyboardShouldPersistTaps="handled"
        >
          {filteredZoneIds.map((zid) => {
            const zm = zoneMeta.get(zid)
            const shape = originalShapes.get(zid) ?? []
            const selected = selectedZoneId === zid
            const conflict = conflictZoneIds.has(zid)
            const badge = shapeBadge(shape)
            return (
              <TouchableOpacity
                key={zid}
                onPress={() => toggleTile(zid)}
                style={[
                  styles.tile,
                  {
                    backgroundColor: zm ? zoneRgba(zm.color, 0.9) : colors.border,
                    marginRight: 10,
                    borderWidth: selected ? 2 : conflict ? 2 : 0,
                    borderColor: conflict ? CONFLICT : '#ffffff',
                  },
                ]}
                activeOpacity={0.85}
              >
                <Text style={styles.tileName} numberOfLines={1}>
                  {zm?.name ?? zid}
                </Text>
                <Text style={styles.tileBadge}>{badge}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        )}
        </View>
      </KeyboardAvoidingView>

      {toast ? (
        <View style={[styles.toast, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, fontSize: 14 }}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kavRoot: { flex: 1 },
  topSpacer: { height: Platform.OS === 'android' ? 8 : 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PADDING,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  confirmHeaderBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  confirmHeaderBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  gridWrap: { flex: 1, minHeight: 120 },
  gridScrollOuter: { flex: 1 },
  gridScrollContent: { flexGrow: 1 },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  cell: {
    marginHorizontal: 1,
    marginVertical: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cellAbbr: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 2,
    textAlign: 'center',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomPanel: {
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  zoneSearchRow: {
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  zoneSearchInputWrap: {
    position: 'relative',
  },
  zoneSearchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 40,
    paddingVertical: 10,
    fontSize: 14,
  },
  zoneSearchClearBtn: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  zoneSearchEmpty: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tileRow: { alignItems: 'center', paddingHorizontal: 8, flexDirection: 'row' },
  tile: {
    width: 120,
    height: 72,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  tileName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tileBadge: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4, fontWeight: '600' },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
})
