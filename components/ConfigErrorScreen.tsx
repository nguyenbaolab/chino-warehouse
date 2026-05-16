import { StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'

type Props = {
  title?: string
  message: string
  hint?: string
}

/** Màn hình khi thiếu EXPO_PUBLIC_* (thường gặp trên APK EAS chưa set env). */
export default function ConfigErrorScreen({
  title = 'Chưa cấu hình kết nối',
  message,
  hint,
}: Props) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
    paddingHorizontal: 28,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: '#cccccc',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  hint: {
    color: '#888888',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 20,
  },
})
