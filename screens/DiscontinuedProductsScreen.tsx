import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { supabase } from '../lib/supabase'
import { Product } from '../types'

export default function DiscontinuedProductsScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const {
    products,
    inventoryEntries,
    zones,
    fetchLocations,
    fetchZones,
    selectedLocationId,
    refreshDiscontinuedContext,
    setProductDiscontinued,
  } = useWarehouseStore()

  const [savingId, setSavingId] = useState<string | null>(null)
  const [initialBusy, setInitialBusy] = useState(true)

  useEffect(() => {
    void fetchLocations()
  }, [fetchLocations])

  useEffect(() => {
    if (selectedLocationId) void fetchZones(selectedLocationId)
  }, [selectedLocationId, fetchZones])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      setInitialBusy(true)
      void (async () => {
        await refreshDiscontinuedContext()
        if (!cancelled) setInitialBusy(false)
      })()
      return () => {
        cancelled = true
      }
    }, [refreshDiscontinuedContext])
  )

  useEffect(() => {
    const channel = supabase
      .channel(`discontinued-screen-${Date.now()}`, {
        config: { private: true }, // SEC-08: yêu cầu authenticated token
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          void refreshDiscontinuedContext()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_entries' },
        () => {
          void refreshDiscontinuedContext()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refreshDiscontinuedContext])

  const productIdToTotalBoxes = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of inventoryEntries) {
      map.set(entry.product_id, (map.get(entry.product_id) ?? 0) + entry.quantity_boxes)
    }
    return map
  }, [inventoryEntries])

  const discontinuedRows = useMemo(() => {
    const list: Product[] = []
    for (const p of products) {
      if (p.is_archived) continue
      if (p.is_discontinued !== true) continue
      list.push(p)
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  async function handleResume(productId: string) {
    setSavingId(productId)
    try {
      await setProductDiscontinued(productId, false)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Sản phẩm không nhập nữa</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.sub }}>Đóng</Text>
        </TouchableOpacity>
      </View>

      {initialBusy && discontinuedRows.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : discontinuedRows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.sub }}>Chưa có sản phẩm đánh dấu không nhập nữa.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {zones.length === 0 && (
            <Text style={[styles.hint, { color: colors.sub }]}>
              Chưa có zone cho kho này — tổng thùng có thể chưa đồng bộ đầy đủ.
            </Text>
          )}
          {discontinuedRows.map((product) => {
            const total = productIdToTotalBoxes.get(product.id) ?? 0
            const stockLabel = total <= 0 ? 'Hết hàng' : `${total} thùng`
            const busy = savingId === product.id
            return (
              <View
                key={product.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={[styles.line, { color: colors.text }]}>Tồn kho: {stockLabel}</Text>
                {!!product.notes?.trim() && (
                  <Text style={[styles.reason, { color: colors.sub }]} numberOfLines={4}>
                    Lý do: {product.notes.trim()}
                  </Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.resumeBtn,
                    { backgroundColor: colors.accent, opacity: busy ? 0.6 : 1 },
                  ]}
                  disabled={busy}
                  onPress={() => void handleResume(product.id)}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.card} />
                  ) : (
                    <Text style={[styles.resumeBtnText, { color: colors.card }]}>Nhập lại</Text>
                  )}
                </TouchableOpacity>
              </View>
            )
          })}
        </ScrollView>
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
  },
  title: { fontSize: 17, fontWeight: 'bold', flex: 1, marginRight: 12 },
  backBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  hint: { fontSize: 12, marginBottom: 10, paddingHorizontal: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  name: { fontSize: 15, fontWeight: '700' },
  line: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  reason: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  resumeBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  resumeBtnText: { fontSize: 14, fontWeight: '700' },
})
