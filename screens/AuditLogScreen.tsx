import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import type { AuditLog } from '../types'

type RouteParams = { filterProductId?: string; scannedBarcode?: string; scannedBarcodeAt?: number }

const ACTION_ICON: Record<string, string> = { INSERT: '➕', UPDATE: '✏️', DELETE: '🗑️' }
const TABLE_LABEL: Record<string, string> = { inventory_entries: 'Lô hàng', products: 'Sản phẩm' }
const IGNORED_FIELDS = new Set(['updated_at', 'created_at'])

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function changedFields(old_data: Record<string, unknown> | null, new_data: Record<string, unknown> | null): string[] {
  if (!old_data || !new_data) return []
  const keys = new Set([...Object.keys(old_data), ...Object.keys(new_data)])
  const changed: string[] = []
  for (const k of keys) {
    if (IGNORED_FIELDS.has(k)) continue
    if (JSON.stringify(old_data[k]) !== JSON.stringify(new_data[k])) changed.push(k)
  }
  return changed
}

type FilterType = 'inventory_entries' | 'products' | null
type DropdownOption = { id: string; label: string }

function SearchableDropdownModal({
  visible,
  options,
  onSelect,
  onClose,
  title,
  colors,
}: {
  visible: boolean
  options: DropdownOption[]
  onSelect: (id: string) => void
  onClose: () => void
  title: string
  colors: Record<string, string>
}) {
  const [search, setSearch] = useState('')
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (visible) {
      setSearch('')
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [visible])

  const filtered = useMemo(() => {
    if (!search.trim()) return options
    const q = search.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[modalStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[modalStyles.title, { color: colors.text }]}>{title}</Text>
          <TextInput
            ref={inputRef}
            style={[modalStyles.searchInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm kiếm..."
            placeholderTextColor={colors.sub}
            autoCorrect={false}
          />
          {filtered.length === 0 ? (
            <Text style={[modalStyles.emptyText, { color: colors.sub }]}>Không tìm thấy kết quả</Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 300 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[modalStyles.optionRow, { borderBottomColor: colors.border }]}
                  onPress={() => { onSelect(item.id); onClose() }}
                >
                  <Text style={{ color: colors.text, fontSize: 15 }}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}

export default function AuditLogScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const params = (route.params as RouteParams) ?? {}
  const { colors } = useThemeStore()
  const { fetchAuditLogs, products, locations, searchByBarcode } = useWarehouseStore()

  const [pages, setPages] = useState<Record<number, AuditLog[]>>({})
  const [currentPage, setCurrentPage] = useState(0)
  const [filterLocationId, setFilterLocationId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>(null)
  const [filterChangedBy, setFilterChangedBy] = useState<string | null>(null)
  const [filterProductId, setFilterProductId] = useState<string | null>(params.filterProductId ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [uniqueUserNames, setUniqueUserNames] = useState<string[]>([])
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const locationDisabled = filterType === 'products'

  const productOptions = useMemo(
    () => products.filter((p) => !p.is_archived).map((p) => ({ id: p.id, name: p.name })),
    [products],
  )

  const currentEntries = pages[currentPage] ?? []
  const canGoOlder = currentEntries.length >= 10
  const canGoNewer = currentPage > 0

  const loadPage = useCallback(
    async (pageNum: number, cursor?: string, direction?: 'older' | 'newer') => {
      setIsLoading(true)
      const data = await fetchAuditLogs({
        cursor,
        direction,
        filterLocationId: filterLocationId ?? undefined,
        filterType: filterType ?? undefined,
        filterChangedBy: filterChangedBy ?? undefined,
        filterProductId: filterProductId ?? undefined,
        limit: 10,
      })
      setPages((prev) => ({ ...prev, [pageNum]: data }))
      setCurrentPage(pageNum)
      setIsLoading(false)
    },
    [fetchAuditLogs, filterLocationId, filterType, filterChangedBy, filterProductId],
  )

  const loadUserNames = useCallback(async () => {
    const data = await fetchAuditLogs({ limit: 50 })
    const names = [...new Set(data.map((e) => e.changed_by_name).filter(Boolean))] as string[]
    setUniqueUserNames(names)
  }, [fetchAuditLogs])

  useEffect(() => {
    setPages({})
    setCurrentPage(0)
    void loadPage(0)
  }, [loadPage])

  useEffect(() => {
    void loadUserNames()
  }, [loadUserNames])

  // Xử lý barcode scan trả về qua route params
  useEffect(() => {
    if (!params.scannedBarcode) return
    const barcode = params.scannedBarcode
    navigation.setParams({ scannedBarcode: undefined, scannedBarcodeAt: undefined })
    void (async () => {
      const entry = await searchByBarcode(barcode)
      if (entry?.product_id) {
        setFilterProductId(entry.product_id)
        setPages({})
        setCurrentPage(0)
      } else {
        Alert.alert('Không tìm thấy', 'Không tìm thấy sản phẩm với mã này')
      }
    })()
  }, [params.scannedBarcode, params.scannedBarcodeAt, searchByBarcode, navigation])

  function resetAndReload() {
    setPages({})
    setCurrentPage(0)
  }

  function applyFilterLocation(id: string | null) {
    setFilterLocationId(id)
    resetAndReload()
  }

  function applyFilterType(type: FilterType) {
    if (type === 'products') setFilterLocationId(null)
    setFilterType(type)
    resetAndReload()
  }

  function applyFilterUser(name: string | null) {
    setFilterChangedBy(name)
    resetAndReload()
  }

  function applyFilterProduct(id: string | null) {
    setFilterProductId(id)
    resetAndReload()
  }

  function handleGoOlder() {
    const nextPage = currentPage + 1
    if (pages[nextPage]) { setCurrentPage(nextPage); return }
    const lastEntry = currentEntries[currentEntries.length - 1]
    if (!lastEntry) return
    void loadPage(nextPage, lastEntry.changed_at, 'older')
  }

  function handleGoNewer() {
    if (currentPage > 0) setCurrentPage(currentPage - 1)
  }

  function handleScanBarcode() {
    navigation.navigate('BarcodeScanner', {
      mode: 'search',
      onScanFillBarcode: (barcode: string) => {
        navigation.setParams({ scannedBarcode: barcode.trim(), scannedBarcodeAt: Date.now() })
      },
    })
  }

  // Dropdown options
  const locationOptions: DropdownOption[] = [
    { id: '__all__', label: 'Tất cả kho' },
    ...locations.map((l) => ({ id: l.id, label: l.name })),
  ]
  const typeOptions: DropdownOption[] = [
    { id: '__all__', label: 'Tất cả' },
    { id: 'inventory_entries', label: 'Lô hàng' },
    { id: 'products', label: 'Sản phẩm' },
  ]
  const userOptions: DropdownOption[] = [
    { id: '__all__', label: uniqueUserNames.length === 0 ? 'Tất cả (chưa có lịch sử)' : 'Tất cả' },
    ...uniqueUserNames.map((n) => ({ id: n, label: n })),
  ]
  const productDropdownOptions: DropdownOption[] = [
    { id: '__all__', label: 'Tất cả' },
    ...productOptions.map((p) => ({ id: p.id, label: p.name })),
  ]

  // Display labels
  const locationLabel = filterLocationId ? locations.find((l) => l.id === filterLocationId)?.name ?? 'Tất cả kho' : 'Tất cả kho'
  const typeLabel = filterType ? TABLE_LABEL[filterType] : 'Tất cả'
  const userLabel = filterChangedBy ?? (uniqueUserNames.length === 0 ? 'Tất cả (chưa có lịch sử)' : 'Tất cả')
  const productLabel = filterProductId ? productOptions.find((p) => p.id === filterProductId)?.name ?? 'Tất cả' : 'Tất cả'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.topSpacer} />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Lịch sử thay đổi</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.sub }}>Đóng</Text>
        </TouchableOpacity>
      </View>

      {/* 4 Filters — trigger buttons */}
      <View style={styles.filtersWrap}>
        <View style={styles.filtersRow}>
          {/* [1] Kho */}
          <View style={[styles.filterCol, { opacity: locationDisabled ? 0.4 : 1 }]}>
            <Text style={[styles.filterLabel, { color: colors.sub }]}>Kho</Text>
            <Pressable
              style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { if (!locationDisabled) setActiveModal('location') }}
            >
              <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>{locationLabel}</Text>
            </Pressable>
          </View>

          {/* [2] Loại */}
          <View style={styles.filterCol}>
            <Text style={[styles.filterLabel, { color: colors.sub }]}>Loại</Text>
            <Pressable
              style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setActiveModal('type')}
            >
              <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>{typeLabel}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.filtersRow}>
          {/* [3] Người */}
          <View style={styles.filterCol}>
            <Text style={[styles.filterLabel, { color: colors.sub }]}>Người</Text>
            <Pressable
              style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setActiveModal('user')}
            >
              <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>{userLabel}</Text>
            </Pressable>
          </View>

          {/* [4] Sản phẩm + camera */}
          <View style={styles.filterCol}>
            <View style={styles.filterLabelRow}>
              <Text style={[styles.filterLabel, { color: colors.sub }]}>Sản phẩm</Text>
              <TouchableOpacity onPress={handleScanBarcode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.cameraIcon}>📷</Text>
              </TouchableOpacity>
            </View>
            <Pressable
              style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setActiveModal('product')}
            >
              <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>{productLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Danh sách entries */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : currentEntries.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.sub }]}>Chưa có lịch sử thay đổi</Text>
        ) : (
          currentEntries.map((entry) => {
            const fields = changedFields(entry.old_data, entry.new_data)
            return (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryIcon}>{ACTION_ICON[entry.action] ?? '❓'}</Text>
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryUser, { color: colors.text }]}>
                      {entry.changed_by_name ?? 'Không rõ'}
                    </Text>
                    <Text style={[styles.entryMeta, { color: colors.sub }]}>
                      {TABLE_LABEL[entry.table_name] ?? entry.table_name}
                      {' · '}
                      {formatTime(entry.changed_at)}
                    </Text>
                    {fields.length > 0 && (
                      <Text style={[styles.entryFields, { color: colors.sub }]}>
                        Đổi: {fields.join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Pagination footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.pageBtn, { opacity: canGoNewer ? 1 : 0.3 }]}
          disabled={!canGoNewer}
          onPress={handleGoNewer}
        >
          <Text style={[styles.pageBtnText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.pageLabel, { color: colors.sub }]}>Trang {currentPage + 1}</Text>
        <TouchableOpacity
          style={[styles.pageBtn, { opacity: canGoOlder ? 1 : 0.3 }]}
          disabled={!canGoOlder}
          onPress={handleGoOlder}
        >
          <Text style={[styles.pageBtnText, { color: colors.text }]}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Modal dropdowns */}
      <SearchableDropdownModal
        visible={activeModal === 'location'}
        title="Chọn kho"
        options={locationOptions}
        colors={colors}
        onSelect={(id) => applyFilterLocation(id === '__all__' ? null : id)}
        onClose={() => setActiveModal(null)}
      />
      <SearchableDropdownModal
        visible={activeModal === 'type'}
        title="Loại thay đổi"
        options={typeOptions}
        colors={colors}
        onSelect={(id) => applyFilterType(id === '__all__' ? null : id as FilterType)}
        onClose={() => setActiveModal(null)}
      />
      <SearchableDropdownModal
        visible={activeModal === 'user'}
        title="Người thay đổi"
        options={userOptions}
        colors={colors}
        onSelect={(id) => applyFilterUser(id === '__all__' ? null : id)}
        onClose={() => setActiveModal(null)}
      />
      <SearchableDropdownModal
        visible={activeModal === 'product'}
        title="Sản phẩm"
        options={productDropdownOptions}
        colors={colors}
        onSelect={(id) => applyFilterProduct(id === '__all__' ? null : id)}
        onClose={() => setActiveModal(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSpacer: { height: Platform.OS === 'android' ? 16 : 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 17, fontWeight: 'bold' },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  filtersWrap: { paddingHorizontal: 16, marginBottom: 8 },
  filtersRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  filterCol: { flex: 1 },
  filterLabel: { fontSize: 12, marginBottom: 4 },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  filterBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  cameraIcon: { fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  entryCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  entryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  entryIcon: { fontSize: 16, marginRight: 10, marginTop: 2 },
  entryInfo: { flex: 1 },
  entryUser: { fontSize: 14, fontWeight: '600' },
  entryMeta: { fontSize: 12, marginTop: 2 },
  entryFields: { fontSize: 12, marginTop: 2, fontStyle: 'italic' },
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
})

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  emptyText: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
  optionRow: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
})
