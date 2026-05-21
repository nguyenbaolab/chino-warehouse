import { useCallback } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useThemeStore } from '../stores/themeStore'
import { useWarehouseStore } from '../stores/warehouseStore'
import { OrderListStatus } from '../types'

function statusLabel(status: OrderListStatus): string {
  if (status === 'confirmed') return 'Đã confirm'
  if (status === 'placed') return 'Đã đặt hàng'
  return 'Đang soạn'
}

export default function OrderListScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useThemeStore()
  const { orderLists, orderItems, fetchOrderLists, createOrderList } = useWarehouseStore()

  useFocusEffect(
    useCallback(() => {
      void fetchOrderLists()
    }, [fetchOrderLists])
  )

  async function handleCreateList() {
    const created = await createOrderList(`List ${new Date().toLocaleDateString('vi-VN')}`)
    if (!created) {
      Alert.alert('Lỗi', 'Không tạo được list mới.')
      return
    }
    navigation.navigate('OrderDetail', { orderListId: created.id })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>🧾 Đặt hàng</Text>

      <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.accent }]} onPress={handleCreateList}>
        <Text style={[styles.createBtnText, { color: colors.card }]}>+ Tạo list mới</Text>
      </TouchableOpacity>

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
                <Text style={[styles.cardSub, { color: colors.sub }]}>Số sản phẩm: {itemsCount}</Text>
                <Text style={[styles.status, { color: colors.text }]}>Trạng thái: {statusLabel(list.status)}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 },
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
