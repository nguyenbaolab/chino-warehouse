import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import type { AuditLog } from '../types'

type RouteParams = { filterProductId?: string }

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

export default function AuditLogScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const params = (route.params as RouteParams) ?? {}
  const { colors } = useThemeStore()
  const { fetchAuditLogs, products, locations } = useWarehouseStore()

  const [pages, setPages] = useState<Record<number, AuditLog[]>>({})
  const [currentPage, setCurrentPage] = useState(0)
  const [filterLocationId, setFilterLocationId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>(null)
  const [filterChangedBy, setFilterChangedBy] = useState<string | null>(null)
  const [filterProductId, setFilterProductId] = useState<string | null>(params.filterProductId ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [uniqueUserNames, setUniqueUserNames] = useState<string[]>([])

  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

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

  function toggleDropdown(name: string) {
    setOpenDropdown((prev) => (prev === name ? null : name))
  }

  function applyFilterLocation(id: string | null) {
    setFilterLocationId(id)
    setOpenDropdown(null)
    setPages({})
    setCurrentPage(0)
  }

  function applyFilterType(type: FilterType) {
    if (type === 'products') setFilterLocationId(null)
    setFilterType(type)
    setOpenDropdown(null)
    setPages({})
    setCurrentPage(0)
  }

  function applyFilterUser(name: string | null) {
    setFilterChangedBy(name)
    setOpenDropdown(null)
    setPages({})
    setCurrentPage(0)
  }

  function applyFilterProduct(id: string | null) {
    setFilterProductId(id)
    setOpenDropdown(null)
    setPages({})
    setCurrentPage(0)
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.topSpacer} />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Lịch sử thay đổi</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.sub }}>Đóng</Text>
        </TouchableOpacity>
      </View>

      {/* 4 Filters */}
      <View style={styles.filtersWrap}>
        <View style={styles.filtersRow}>
          {/* [1] Kho */}
          <View style={[styles.filterCol, { opacity: locationDisabled ? 0.4 : 1 }]}>
            <Text style={[styles.filterLabel, { color: colors.sub }]}>Kho</Text>
            <Pressable
              style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { if (!locationDisabled) toggleDropdown('location') }}
            >
              <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>
                {filterLocationId ? locations.find((l) => l.id === filterLocationId)?.name ?? 'Tất cả kho' : 'Tất cả kho'}
              </Text>
            </Pressable>
            {openDropdown === 'location' && !locationDisabled && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ScrollView style={{ maxHeight: 200 }}>
                  <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => applyFilterLocation(null)}>
                    <Text style={{ color: colors.text }}>Tất cả kho</Text>
                  </TouchableOpacity>
                  {locations.map((loc) => (
                    <TouchableOpacity key={loc.id} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => applyFilterLocation(loc.id)}>
                      <Text style={{ color: colors.text }}>{loc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* [2] Loại thay đổi */}
          <View style={styles.filterCol}>
            <Text style={[styles.filterLabel, { color: colors.sub }]}>Loại</Text>
            <Pressable
              style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => toggleDropdown('type')}
            >
              <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>
                {filterType ? TABLE_LABEL[filterType] : 'Tất cả'}
              </Text>
            </Pressable>
            {openDropdown === 'type' && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => applyFilterType(null)}>
                  <Text style={{ color: colors.text }}>Tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => applyFilterType('inventory_entries')}>
                  <Text style={{ color: colors.text }}>Lô hàng</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => applyFilterType('products')}>
                  <Text style={{ color: colors.text }}>Sản phẩm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.filtersRow}>
          {/* [3] Người thay đổi */}
          <View style={styles.filterCol}>
            <Text style={[styles.filterLabel, { color: colors.sub }]}>Người</Text>
            <Pressable
              style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => toggleDropdown('user')}
            >
              <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>
                {filterChangedBy ?? 'Tất cả'}
              </Text>
            </Pressable>
            {openDropdown === 'user' && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ScrollView style={{ maxHeight: 200 }}>
                  <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => applyFilterUser(null)}>
                    <Text style={{ color: colors.text }}>Tất cả</Text>
                  </TouchableOpacity>
                  {uniqueUserNames.map((name) => (
                    <TouchableOpacity key={name} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => applyFilterUser(name)}>
                      <Text style={{ color: colors.text }}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* [4] Sản phẩm */}
          <View style={styles.filterCol}>
            <Text style={[styles.filterLabel, { color: colors.sub }]}>Sản phẩm</Text>
            <Pressable
              style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => toggleDropdown('product')}
            >
              <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>
                {filterProductId
                  ? productOptions.find((p) => p.id === filterProductId)?.name ?? 'Tất cả'
                  : 'Tất cả'}
              </Text>
            </Pressable>
            {openDropdown === 'product' && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ScrollView style={{ maxHeight: 200 }}>
                  <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => applyFilterProduct(null)}>
                    <Text style={{ color: colors.text }}>Tất cả</Text>
                  </TouchableOpacity>
                  {productOptions.map((p) => (
                    <TouchableOpacity key={p.id} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => applyFilterProduct(p.id)}>
                      <Text style={{ color: colors.text }}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
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
  filtersWrap: { paddingHorizontal: 16, marginBottom: 8, zIndex: 10 },
  filtersRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  filterCol: { flex: 1 },
  filterLabel: { fontSize: 12, marginBottom: 4 },
  filterBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  dropdown: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 10,
    zIndex: 20,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
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
