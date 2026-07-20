import { useCallback, useRef, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { useCanWrite, useIsReadOnly } from '../stores/authStore'
import { OrderListStatus, PickingListStatus } from '../types'

type ListTab = 'orders' | 'picking'

function orderStatusLabel(status: OrderListStatus): string {
  if (status === 'confirmed') return 'Đã confirm'
  if (status === 'placed') return 'Đã đặt hàng'
  return 'Đang soạn'
}

function pickingStatusLabel(status: PickingListStatus): string {
  if (status === 'in_progress') return 'Đang lấy'
  if (status === 'completed') return 'Hoàn thành'
  return 'Đang soạn'
}

export default function OrderListScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const canWrite = useCanWrite()
  const isReadOnly = useIsReadOnly()
  const {
    orderLists,
    orderItems,
    fetchOrderLists,
    createOrderList,
    pickingLists,
    pickingListItems,
    fetchPickingLists,
    createPickingList,
  } = useWarehouseStore()

  const [activeTab, setActiveTab] = useState<ListTab>('picking')

  // KI-039: TTL 30s — riêng từng tab
  const FOCUS_FETCH_TTL_MS = 30_000
  const lastOrderFetchRef = useRef(0)
  const lastPickingFetchRef = useRef(0)

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      if (activeTab === 'orders') {
        if (now - lastOrderFetchRef.current < FOCUS_FETCH_TTL_MS) return
        lastOrderFetchRef.current = now
        void fetchOrderLists()
      } else {
        if (now - lastPickingFetchRef.current < FOCUS_FETCH_TTL_MS) return
        lastPickingFetchRef.current = now
        void fetchPickingLists()
      }
    }, [activeTab, fetchOrderLists, fetchPickingLists]),
  )

  // Prefetch khi đổi tab (nếu TTL đã hết)
  function switchTab(tab: ListTab) {
    setActiveTab(tab)
    const now = Date.now()
    if (tab === 'orders') {
      if (now - lastOrderFetchRef.current >= FOCUS_FETCH_TTL_MS) {
        lastOrderFetchRef.current = now
        void fetchOrderLists()
      }
    } else if (now - lastPickingFetchRef.current >= FOCUS_FETCH_TTL_MS) {
      lastPickingFetchRef.current = now
      void fetchPickingLists()
    }
  }

  async function handleCreateList() {
    if (isReadOnly) return
    const created = await createOrderList(`List ${new Date().toLocaleDateString('vi-VN')}`)
    if (!created) {
      Alert.alert('Lỗi', 'Không tạo được list mới.')
      return
    }
    navigation.navigate('OrderDetail', { orderListId: created.id })
  }

  async function handleCreatePicking() {
    if (isReadOnly) return
    const title = `Đơn lấy hàng ${new Date().toLocaleDateString('vi-VN')}`
    const created = await createPickingList(title)
    if (!created) {
      Alert.alert('Lỗi', 'Không tạo được đơn lấy hàng.')
      return
    }
    navigation.navigate('PickingDetail', { pickingListId: created.id })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>🧾 Đặt hàng / Lấy hàng</Text>

      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'picking' && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
          ]}
          onPress={() => switchTab('picking')}
        >
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'picking' ? colors.accent : colors.sub,
                fontWeight: activeTab === 'picking' ? '700' : '500',
              },
            ]}
          >
            Lấy hàng
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'orders' && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
          ]}
          onPress={() => switchTab('orders')}
        >
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'orders' ? colors.accent : colors.sub,
                fontWeight: activeTab === 'orders' ? '700' : '500',
              },
            ]}
          >
            Đặt hàng
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'orders' ? (
        <>
          {canWrite ? (
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.accent }]}
              onPress={handleCreateList}
            >
              <Text style={[styles.createBtnText, { color: colors.card }]}>+ Tạo list mới</Text>
            </TouchableOpacity>
          ) : null}

          {orderLists.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={{ color: colors.sub }}>Chưa có list đặt hàng.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {orderLists.map((list) => {
                const itemsCount = orderItems.filter((item) => item.order_list_id === list.id).length
                return (
                  <TouchableOpacity
                    key={list.id}
                    activeOpacity={0.8}
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => navigation.navigate('OrderDetail', { orderListId: list.id })}
                  >
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {list.title}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors.sub }]}>
                      Ngày tạo: {new Date(list.created_at).toLocaleDateString('vi-VN')}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors.sub }]}>
                      Số sản phẩm: {itemsCount}
                    </Text>
                    <Text style={[styles.status, { color: colors.text }]}>
                      Trạng thái: {orderStatusLabel(list.status)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}
        </>
      ) : (
        <>
          {canWrite ? (
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.accent }]}
              onPress={() => void handleCreatePicking()}
            >
              <Text style={[styles.createBtnText, { color: colors.card }]}>
                + Tạo đơn lấy hàng
              </Text>
            </TouchableOpacity>
          ) : null}

          {pickingLists.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={{ color: colors.sub }}>Chưa có đơn lấy hàng.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {pickingLists.map((list) => {
                const itemsCount = pickingListItems.filter(
                  (item) => item.picking_list_id === list.id,
                ).length
                return (
                  <TouchableOpacity
                    key={list.id}
                    activeOpacity={0.8}
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() =>
                      navigation.navigate('PickingDetail', { pickingListId: list.id })
                    }
                  >
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {list.title}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors.sub }]}>
                      Ngày tạo: {new Date(list.created_at).toLocaleDateString('vi-VN')}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors.sub }]}>
                      Số lô: {itemsCount}
                    </Text>
                    <Text style={[styles.status, { color: colors.text }]}>
                      Trạng thái: {pickingStatusLabel(list.status)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabLabel: { fontSize: 14 },
  createBtn: {
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  createBtnText: { fontSize: 14, fontWeight: '700' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 4 },
  status: { fontSize: 13, marginTop: 6, fontWeight: '600' },
})
