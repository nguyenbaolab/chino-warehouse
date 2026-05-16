import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useThemeStore } from '../stores/themeStore'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const { colors } = useThemeStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Đăng nhập bằng email + password qua Supabase Auth
  const handleLogin = async () => {
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.')
      return
    }

    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })
    setLoading(false)

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('Email hoặc mật khẩu không đúng.')
      } else {
        setError(authError.message)
      }
    }
    // Login thành công → App.tsx useEffect(session) tự reset inactivity timer
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / tên app */}
          <View style={styles.logoSection}>
            <Text style={styles.logoEmoji}>📦</Text>
            <Text style={[styles.appName, { color: colors.text }]}>
              Chino's Warehouse
            </Text>
            <Text style={[styles.appSub, { color: colors.sub }]}>
              Quản lý kho hàng nội bộ
            </Text>
          </View>

          {/* Form đăng nhập */}
          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Email"
              placeholderTextColor={colors.sub}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!loading}
            />

            <View style={styles.passwordRow}>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Mật khẩu"
                placeholderTextColor={colors.sub}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="password"
                autoComplete="password"
                editable={!loading}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={[styles.eyeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                disabled={loading}
              >
                <Text style={styles.eyeBtnText}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {/* Hiển thị lỗi */}
            {error && (
              <Text style={[styles.errorText, { color: colors.statusExpired }]}>
                {error}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.loginBtn,
                { backgroundColor: colors.accent, opacity: loading ? 0.6 : 1 },
              ]}
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoEmoji: { fontSize: 56 },
  appName: { fontSize: 24, fontWeight: 'bold', marginTop: 12 },
  appSub: { fontSize: 14, marginTop: 4 },
  form: { gap: 14 },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  eyeBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeBtnText: { fontSize: 20 },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  loginBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
