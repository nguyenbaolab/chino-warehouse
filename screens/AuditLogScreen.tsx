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

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** So sánh old_data vs new_data, trả về danh sách key thay đổi (bỏ updated_at) */
function changedFields(old_data: Record<string, unknown> | null, new_data: Record<string, unknown> | null): string[] {
  if (!old_data || !new_data) return []
  const keys = new Set([...Object.keys(old_data), ...Object.keys(new_data)])
  const changed: string[] = []
  for (const k of keys) {
    if (k === 'updated_at') continue
    if (JSON.stringify(old_data[k]) !== JSON.stringify(new_data[k])) {
      changed.push(k)
    }
  }
  return changed
}

export default function AuditLogScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const params = (route.params as RouteParams) ?? {}
  const { colors } = useThemeStore()
  const { fetchAuditLogs, products } = useWarehouseStore()

  const [pages, setPages] = useState<Record<number, AuditLog[]>>({})
  const [currentPage, setCurrentPage] = useState(0)
  const [filterProductId, setFilterProductId] = useState<string | null>(params.filterProductId ?? null)
  const [filterChangedBy, setFilterChangedBy] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uniqueUserNames, setUniqueUserNames] = useState<string[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)

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
        filterProductId: filterProductId ?? undefined,
        filterChangedBy: filterChangedBy ?? undefined,
        limit: 10,
      })
      setPages((prev) => ({ ...prev, [pageNum]: data }))
      setCurrentPage(pageNum)
      setIsLoading(false)
      return data
    },
    [fetchAuditLogs, filterProductId, filterChangedBy],
  )

  // Lấy danh sách user distinct từ 50 entries gần nhất (cho dropdown filter người)
  const loadUserNames = useCallback(async () => {
    const data = await fetchAuditLogs({ limit: 50 })
    const names = [...new Set(data.map((e) => e.changed_by_name).filter(Boolean))] as string[]
    setUniqueUserNames(names)
  }, [fetchAuditLogs])

  // Load ban đầu
  useEffect(() => {
    setPages({})
    setCurrentPage(0)
    void loadPage(0)
  }, [loadPage])

  useEffect(() => {
    void loadUserNames()
  }, [loadUserNames])

  function handleGoOlder() {
    const nextPage = currentPage + 1
    if (pages[nextPage]) {
      setCurrentPage(nextPage)
      return
    }
    const lastEntry = currentEntries[currentEntries.length - 1]
    if (!lastEntry) return
    void loadPage(nextPage, lastEntry.changed_at, 'older')
  }

  function handleGoNewer() {
    if (currentPage > 0) setCurrentPage(currentPage - 1)
  }

  function handleFilterUserChange(name: string | null) {
    setFilterChangedBy(name)
    setShowUserDropdown(false)
    setPages({})
    setCurrentPage(0)
  }

  function handleFilterProductChange(id: string | null) {
    setFilterProductId(id)
    setShowProductDropdown(false)
    setPages({})
    setCurrentPage(0)
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

      {/* Filters */}
      <View style={styles.filtersRow}>
        {/* Filter người thay đổi */}
        <View style={styles.filterCol}>
          <Text style={[styles.filterLabel, { color: colors.sub }]}>Người</Text>
          <Pressable
            style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { setShowUserDropdown((v) => !v); setShowProductDropdown(false) }}
          >
            <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>
              {filterChangedBy ?? 'Tất cả'}
            </Text>
          </Pressable>
          {showUserDropdown && (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView style={{ maxHeight: 200 }}>
                <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => handleFilterUserChange(null)}>
                  <Text style={{ color: colors.text }}>Tất cả</Text>
                </TouchableOpacity>
                {uniqueUserNames.map((name) => (
                  <TouchableOpacity key={name} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => handleFilterUserChange(name)}>
                    <Text style={{ color: colors.text }}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Filter sản phẩm */}
        <View style={styles.filterCol}>
          <Text style={[styles.filterLabel, { color: colors.sub }]}>Sản phẩm</Text>
          <Pressable
            style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { setShowProductDropdown((v) => !v); setShowUserDropdown(false) }}
          >
            <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>
              {filterProductId
                ? productOptions.find((p) => p.id === filterProductId)?.name ?? 'Tất cả'
                : 'Tất cả'}
            </Text>
          </Pressable>
          {showProductDropdown && (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView style={{ maxHeight: 200 }}>
                <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => handleFilterProductChange(null)}>
                  <Text style={{ color: colors.text }}>Tất cả</Text>
                </TouchableOpacity>
                {productOptions.map((p) => (
                  <TouchableOpacity key={p.id} style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => handleFilterProductChange(p.id)}>
                    <Text style={{ color: colors.text }}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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
            const productName = entry.table_name === 'products'
              ? (entry.new_data?.name as string) ?? (entry.old_data?.name as string) ?? ''
              : ''
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
                      {productName ? ` · ${productName}` : ''}
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
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8, zIndex: 10 },
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
