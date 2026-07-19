import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { supabase } from '../lib/supabase'
import { Location } from '../types'
import { useCanWrite, useIsReadOnly } from '../stores/authStore'

const DEFAULT_GRID = 6

async function buildSkuCountByLocation(locationsList: Location[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  for (const loc of locationsList) {
    const { data: zoneRows } = await supabase.from('zones').select('id').eq('location_id', loc.id)
    const zids = (zoneRows ?? []).map((z) => z.id)
    if (zids.length === 0) {
      map.set(loc.id, 0)
      continue
    }
    const { data: inv } = await supabase.from('inventory_entries').select('product_id').in('zone_id', zids)
    const distinct = new Set((inv ?? []).map((r) => r.product_id))
    map.set(loc.id, distinct.size)
  }
  return map
}

export default function LocationManagementScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { colors } = useThemeStore()
  const canWrite = useCanWrite()
  const isReadOnly = useIsReadOnly()
  const { fetchLocations, addLocation, updateLocation, deleteLocation, setSelectedLocation } =
    useWarehouseStore()

  const [viewMode, setViewMode] = useState<'all' | 'warehouse' | 'market'>('all')
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [skuCounts, setSkuCounts] = useState<Map<string, number>>(new Map())
  const [countsLoading, setCountsLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRows, setNewRows] = useState('6')
  const [newCols, setNewCols] = useState('6')
  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState<Location | null>(null)
  const [editName, setEditName] = useState('')
  const [editRows, setEditRows] = useState('6')
  const [editCols, setEditCols] = useState('6')
  const [editSaving, setEditSaving] = useState(false)

  const createScrollRef = useRef<ScrollView>(null)
  const editScrollRef = useRef<ScrollView>(null)

  // KI-039: TTL 30s
  const FOCUS_FETCH_TTL_MS = 30_000
  const lastFetchRef = useRef(0)

  function scrollModalToEnd(ref: React.RefObject<ScrollView | null>) {
    setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 100)
  }

  async function refetchAllLocations() {
    const { data } = await supabase.from('locations').select('*').order('name')
    if (data) setAllLocations(data as Location[])
  }

  async function refreshCounts() {
    if (allLocations.length === 0) {
      setSkuCounts(new Map())
      return
    }
    setCountsLoading(true)
    try {
      const m = await buildSkuCountByLocation(allLocations)
      setSkuCounts(m)
    } finally {
      setCountsLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      if (now - lastFetchRef.current < FOCUS_FETCH_TTL_MS) return
      lastFetchRef.current = now

      void (async () => {
        // Vẫn gọi fetchLocations() cho store (các màn khác cần)
        await fetchLocations()
        // Fetch riêng tất cả locations cho màn này
        await refetchAllLocations()
      })()
    }, [fetchLocations])
  )

  useEffect(() => {
    void refreshCounts()
  }, [allLocations])

  useEffect(() => {
    if (route.params?.openCreateModal === true) {
      setNewName('')
      setNewRows('6')
      setNewCols('6')
      setCreateOpen(true)
      navigation.setParams({ openCreateModal: undefined })
    }
  }, [route.params?.openCreateModal, navigation])

  useEffect(() => {
    if (isReadOnly) {
      Alert.alert('Bạn không có quyền thực hiện thao tác này')
      navigation.goBack()
    }
  }, [isReadOnly, navigation])

  const sortedLocations = useMemo(() => {
    const filtered =
      viewMode === 'all' ? allLocations : allLocations.filter((l) => l.type === viewMode)
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [allLocations, viewMode])

  function openEdit(loc: Location) {
    setEditing(loc)
    setEditName(loc.name)
    setEditRows(String(loc.grid_rows ?? DEFAULT_GRID))
    setEditCols(String(loc.grid_cols ?? DEFAULT_GRID))
  }

  async function handleCreateSave() {
    if (!newName.trim()) {
      Alert.alert('Thiếu thông tin', 'Tên kho không được để trống.')
      return
    }
    const rows = Number(newRows)
    const cols = Number(newCols)
    if (!Number.isFinite(rows) || rows < 1 || !Number.isFinite(cols) || cols < 1) {
      Alert.alert('Lưới không hợp lệ', 'Số hàng và số cột phải là số ≥ 1.')
      return
    }
    setSaving(true)
    try {
      const { error } = await addLocation(newName.trim(), rows, cols)
      if (error) {
        Alert.alert('Không tạo được', error)
        return
      }
      await refetchAllLocations()
      setCreateOpen(false)
      setNewName('')
      setNewRows('6')
      setNewCols('6')
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSave() {
    if (!editing) return
    if (!editName.trim()) {
      Alert.alert('Thiếu thông tin', 'Tên kho không được để trống.')
      return
    }
    const rows = Number(editRows)
    const cols = Number(editCols)
    if (!Number.isFinite(rows) || rows < 1 || !Number.isFinite(cols) || cols < 1) {
      Alert.alert('Lưới không hợp lệ', 'Số hàng và số cột phải là số ≥ 1.')
      return
    }
    setEditSaving(true)
    try {
      const { error } = await updateLocation(editing.id, {
        name: editName.trim(),
        grid_rows: rows,
        grid_cols: cols,
      })
      if (error) {
        Alert.alert('Không cập nhật được', error)
        return
      }
      await refetchAllLocations()
      setEditing(null)
    } finally {
      setEditSaving(false)
    }
  }

  function confirmDelete(loc: Location) {
    Alert.alert('Xóa kho', `Xóa kho "${loc.name}"? Không thể hoàn tác.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteLocation(loc.id)
          if (error) {
            const stockBlocked =
              error.includes('lô hàng') || error.includes('Còn') || error.includes('còn')
            Alert.alert('Không xóa được', stockBlocked ? 'Kho còn hàng, không thể xóa.' : error)
          } else {
            await refetchAllLocations()
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Quản lý kho</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.sub }}>Đóng</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.modeRow}>
        {(
          [
            { value: 'all' as const, label: 'Tất cả' },
            { value: 'warehouse' as const, label: 'Kho' },
            { value: 'market' as const, label: 'Siêu thị' },
          ] as const
        ).map((opt) => {
          const active = viewMode === opt.value
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.modeBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: active ? colors.accent + '22' : colors.card,
                },
              ]}
              onPress={() => setViewMode(opt.value)}
              activeOpacity={0.75}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: active ? '700' : '500',
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {countsLoading && sortedLocations.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {sortedLocations.map((loc) => {
            const gr = loc.grid_rows ?? DEFAULT_GRID
            const gc = loc.grid_cols ?? DEFAULT_GRID
            const sku = skuCounts.get(loc.id) ?? 0
            const typeLabel = loc.type === 'market' ? 'Siêu thị' : 'Kho'
            return (
              <View key={loc.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardTop}>
                  {/* F4: tap body → tab Map + chọn kho */}
                  <TouchableOpacity
                    style={{ flex: 1, minWidth: 0 }}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedLocation(loc.id)
                      navigation.getParent()?.navigate('Map' as never)
                    }}
                  >
                    <View style={styles.cardNameRow}>
                      <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
                        {loc.name}
                      </Text>
                      {viewMode === 'all' ? (
                        <View
                          style={[
                            styles.typeBadge,
                            {
                              borderColor: colors.border,
                              backgroundColor: colors.bg,
                            },
                          ]}
                        >
                          <Text style={[styles.typeBadgeText, { color: colors.sub }]}>{typeLabel}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.cardLine, { color: colors.sub }]}>Grid size: {gr} × {gc}</Text>
                    <Text style={[styles.cardLine, { color: colors.sub }]}>Số sản phẩm: {sku}</Text>
                  </TouchableOpacity>
                  {canWrite ? (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                        onPress={() => openEdit(loc)}
                        hitSlop={8}
                      >
                        <Text style={{ fontSize: 16 }}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                        onPress={() => confirmDelete(loc)}
                        hitSlop={8}
                      >
                        <Text style={{ fontSize: 16 }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </View>
            )
          })}
          {sortedLocations.length === 0 && (
            <Text style={[styles.empty, { color: colors.sub }]}>Chưa có kho nào.</Text>
          )}
        </ScrollView>
      )}

      {canWrite ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          activeOpacity={0.85}
          onPress={() => {
            setNewName('')
            setNewRows('6')
            setNewCols('6')
            setCreateOpen(true)
          }}
        >
          <Text style={[styles.fabText, { color: colors.card }]}>+</Text>
        </TouchableOpacity>
      ) : null}

      {/* Modal tạo kho */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCreateOpen(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              ref={createScrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tạo kho mới</Text>
              <Text style={[styles.label, { color: colors.sub }]}>Tên kho *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="VD: Kho chính"
                placeholderTextColor={colors.sub}
                maxLength={100}
              />
              <Text style={[styles.label, { color: colors.sub }]}>Số hàng (rows)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                value={newRows}
                onChangeText={setNewRows}
                keyboardType="number-pad"
                onFocus={() => scrollModalToEnd(createScrollRef)}
                maxLength={2}
              />
              <Text style={[styles.label, { color: colors.sub }]}>Số cột (cols)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                value={newCols}
                onChangeText={setNewCols}
                keyboardType="number-pad"
                onFocus={() => scrollModalToEnd(createScrollRef)}
                maxLength={2}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.btnGhost, { borderColor: colors.border }]} onPress={() => setCreateOpen(false)}>
                  <Text style={{ color: colors.text }}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnPrimary, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
                  disabled={saving}
                  onPress={() => void handleCreateSave()}
                >
                  <Text style={{ color: colors.card, fontWeight: '700' }}>Tạo</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal sửa kho */}
      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditing(null)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              ref={editScrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sửa kho</Text>
              <Text style={[styles.label, { color: colors.sub }]}>Tên kho *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholderTextColor={colors.sub}
                maxLength={100}
              />
              <Text style={[styles.label, { color: colors.sub }]}>Số hàng (rows)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                value={editRows}
                onChangeText={setEditRows}
                keyboardType="number-pad"
                onFocus={() => scrollModalToEnd(editScrollRef)}
                maxLength={2}
              />
              <Text style={[styles.label, { color: colors.sub }]}>Số cột (cols)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                value={editCols}
                onChangeText={setEditCols}
                keyboardType="number-pad"
                onFocus={() => scrollModalToEnd(editScrollRef)}
                maxLength={2}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.btnGhost, { borderColor: colors.border }]} onPress={() => setEditing(null)}>
                  <Text style={{ color: colors.text }}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnPrimary, { backgroundColor: colors.accent, opacity: editSaving ? 0.6 : 1 }]}
                  disabled={editSaving}
                  onPress={() => void handleEditSave()}
                >
                  <Text style={{ color: colors.card, fontWeight: '700' }}>Lưu</Text>
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 17, fontWeight: 'bold', flex: 1 },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  cardLine: { fontSize: 13, marginTop: 6 },
  cardActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { textAlign: 'center', marginTop: 24 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 28 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  label: { fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnGhost: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
})
