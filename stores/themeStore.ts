import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ThemeColors = {
  bg: string
  card: string
  text: string
  sub: string
  border: string
  accent: string
  cellEmpty: string
  cellBorder: string
}

const darkColors: ThemeColors = {
  bg: '#111111',
  card: '#1a1a1a',
  text: '#ffffff',
  sub: '#888888',
  border: '#222222',
  accent: '#22C55E',
  cellEmpty: '#1a1a1a',
  cellBorder: '#2a2a2a',
}

const lightColors: ThemeColors = {
  bg: '#f2f2f7',
  card: '#ffffff',
  text: '#111111',
  sub: '#666666',
  border: '#e0e0e0',
  accent: '#16a34a',
  cellEmpty: '#e8e8e8',
  cellBorder: '#d0d0d0',
}

type ThemeStore = {
  isDark: boolean
  colors: ThemeColors
  loadTheme: () => Promise<void>
  toggleTheme: () => Promise<void>
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  isDark: true,
  colors: darkColors,

  loadTheme: async () => {
    const saved = await AsyncStorage.getItem('theme')
    const isDark = saved !== 'light'
    set({ isDark, colors: isDark ? darkColors : lightColors })
  },

  toggleTheme: async () => {
    const isDark = !get().isDark
    await AsyncStorage.setItem('theme', isDark ? 'dark' : 'light')
    set({ isDark, colors: isDark ? darkColors : lightColors })
  },
}))