import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY_EXPIRY = 'warning_expiry'
const KEY_LOW_STOCK = 'warning_low_stock'

type WarningStore = {
  expiryWarningEnabled: boolean
  lowStockWarningEnabled: boolean
  loadWarningSettings: () => Promise<void>
  toggleExpiryWarning: () => Promise<void>
  toggleLowStockWarning: () => Promise<void>
}

export const useWarningStore = create<WarningStore>((set, get) => ({
  expiryWarningEnabled: true,
  lowStockWarningEnabled: true,

  loadWarningSettings: async () => {
    const [expiry, lowStock] = await Promise.all([
      AsyncStorage.getItem(KEY_EXPIRY),
      AsyncStorage.getItem(KEY_LOW_STOCK),
    ])
    set({
      expiryWarningEnabled: expiry === null ? true : expiry === 'true',
      lowStockWarningEnabled: lowStock === null ? true : lowStock === 'true',
    })
  },

  toggleExpiryWarning: async () => {
    const expiryWarningEnabled = !get().expiryWarningEnabled
    await AsyncStorage.setItem(KEY_EXPIRY, expiryWarningEnabled ? 'true' : 'false')
    set({ expiryWarningEnabled })
  },

  toggleLowStockWarning: async () => {
    const lowStockWarningEnabled = !get().lowStockWarningEnabled
    await AsyncStorage.setItem(KEY_LOW_STOCK, lowStockWarningEnabled ? 'true' : 'false')
    set({ lowStockWarningEnabled })
  },
}))
