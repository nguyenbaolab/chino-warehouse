import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useThemeStore } from '../stores/themeStore'
import { useCanWrite } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { isoExpiryToDisplay } from '../utils/dateUtils'
import type { InventoryEntry, Location } from '../types'

/** C4 — Checklist kiểm hàng: lô market is_special, tick is_checked */
export default function StockCheckScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const canWrite = useCanWrite()
  const {
    inventoryEntries,
    products,
    fetchAllInventoryEntries,
    updateInventoryEntry,
    resetMarketChecklist,
  } = useWarehouseStore()

  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [marketLocations, setMarketLocations] = useState<Location[]>([])
  const [marketZoneIds, setMarketZoneIds] = useState<Set<string>>(() => new Set())

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      void (async () => {
        setLoading(true)
        const { data: locs, error: locErr } = await supabase
          .from('locations')
          .select('*')
          .eq('type', 'market')
        if (locErr) {
          console.error('[StockCheck] fetch market locations:', locErr)
        }
        const marketLocs = (locs ?? []) as Location[]
        const locIds = marketLocs.map((l) => l.id)

        let zoneIdSet = new Set<string>()
        if (locIds.length > 0) {
          const { data: zones, error: zoneErr } = await supabase
            .from('zones')
            .select('id')
            .in('location_id', locIds)
          if (zoneErr) {
            console.error('[StockCheck] fetch market zones:', zoneErr)
          } else {
            zoneIdSet = new Set((zones ?? []).map((z) => z.id as string))
          }
        }

        await fetchAllInventoryEntries()
        if (!cancelled) {
          setMarketLocations(marketLocs)
          setMarketZoneIds(zoneIdSet)
          setLoading(false)
        }
      })()
      return () => {
        cancelled = true
      }
    }, [fetchAllInventoryEntries]),
  )

  const specialEntries = useMemo(() => {
    const list = inventoryEntries.filter(
      (e) => e.is_special === true && marketZoneIds.has(e.zone_id),
    )
    return list.sort((a, b) => {
      // Chưa checked trước; cùng nhóm thì sort tên SP a–z
      if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
      const nameA = a.product?.name ?? products.find((p) => p.id === a.product_id)?.name ?? ''
      const nameB = b.product?.name ?? products.find((p) => p.id === b.product_id)?.name ?? ''
      return nameA.localeCompare(nameB, 'vi')
    })
  }, [inventoryEntries, marketZoneIds, products])

  function productName(entry: InventoryEntry): string {
    return (
      entry.product?.name ??
      products.find((p) => p.id === entry.product_id)?.name ??
      'Sản phẩm không xác định'
    )
  }

  async function handleToggle(entry: InventoryEntry) {
    if (!canWrite) return
    try {
      await updateInventoryEntry(entry.id, { is_checked: !entry.is_checked })
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái kiểm hàng.')
      console.error('[StockCheck] toggle is_checked:', e)
    }
  }

  function confirmReset() {
    if (!canWrite || resetting) return
    Alert.alert('Reset checklist?', 'Tất cả hàng đặc biệt sẽ được bỏ tick.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'OK',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setResetting(true)
            try {
              await resetMarketChecklist()
            } catch (e) {
              Alert.alert('Lỗi', 'Không thể reset checklist.')
              console.error('[StockCheck] resetMarketChecklist:', e)
            } finally {
              setResetting(false)
            }
          })()
        },
      },
    ])
  }

  function renderItem({ item }: { item: InventoryEntry }) {
    const checked = item.is_checked === true
    const expiry = isoExpiryToDisplay(item.expiry_date)
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.checkHit, { opacity: canWrite ? 1 : 0.4 }]}
          onPress={() => void handleToggle(item)}
          disabled={!canWrite}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <View
            style={[
              styles.tickBox,
              {
                borderColor: colors.border,
                backgroundColor: checked ? colors.accent : colors.bg,
              },
            ]}
          >
            {checked ? <Text style={[styles.tickText, { color: colors.card }]}>✓</Text> : null}
          </View>
        </TouchableOpacity>
        <View style={styles.cardBody}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {productName(item)}
          </Text>
          <Text style={[styles.meta, { color: colors.sub }]}>
            {item.quantity_boxes} sản phẩm
            {expiry ? ` · HSD ${expiry}` : ''}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.card }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.sub }}>← Đóng</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          Kiểm hàng
        </Text>
        {canWrite ? (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.card }]}
            onPress={confirmReset}
            disabled={resetting || specialEntries.length === 0}
          >
            <Text
              style={{
                color: specialEntries.length === 0 ? colors.sub : colors.accent,
                fontWeight: '600',
              }}
            >
              {resetting ? '…' : 'Reset'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtnSpacer} />
        )}
      </View>

      {loading && specialEntries.length === 0 ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : specialEntries.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.sub }}>
            {marketLocations.length === 0
              ? 'Chưa có hàng đặc biệt nào'
              : 'Chưa có hàng đặc biệt nào'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={specialEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}
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
    gap: 8,
  },
  title: { flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  headerBtnSpacer: { width: 72 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  checkHit: { padding: 2 },
  tickBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: { fontSize: 16, fontWeight: '700' },
  cardBody: { flex: 1, minWidth: 0 },
  productName: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, marginTop: 4 },
})
