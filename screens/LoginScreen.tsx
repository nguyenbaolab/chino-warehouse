import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeStore } from '../stores/themeStore'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../utils/errorMessages'
import {
  authenticateBiometric,
  clearBiometricCredentials,
  getBiometricCredentials,
  isBiometricAvailable,
  isBiometricEnabled,
  saveBiometricCredentials,
} from '../lib/biometricAuth'

export default function LoginScreen() {
  const { colors } = useThemeStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricReady, setBiometricReady] = useState(false)
  const [attemptingBiometric, setAttemptingBiometric] = useState(false)

  const attemptBiometricLogin = useCallback(
    async (creds: { email: string; password: string }) => {
      setError(null)
      setAttemptingBiometric(true)
      const authOk = await authenticateBiometric()
      if (!authOk) {
        setAttemptingBiometric(false)
        return
      }

      setLoading(true)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      })
      setLoading(false)
      setAttemptingBiometric(false)

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          Alert.alert(
            'Mật khẩu đã thay đổi',
            'Vui lòng đăng nhập lại bằng mật khẩu.',
          )
          await clearBiometricCredentials()
          setBiometricReady(false)
        } else {
          setError(getErrorMessage(authError, 'auth'))
        }
      }
      // Thành công → App.tsx onAuthStateChange
    },
    [],
  )

  // Cold start: auto biometric nếu đã bật + có credentials
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const available = await isBiometricAvailable()
      if (cancelled) return
      setBiometricAvailable(available)
      if (!available) return

      const enabled = await isBiometricEnabled()
      if (cancelled || !enabled) return

      const creds = await getBiometricCredentials()
      if (cancelled || !creds) return

      setBiometricReady(true)
      await attemptBiometricLogin(creds)
    })()
    return () => {
      cancelled = true
    }
  }, [attemptBiometricLogin])

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
        setError(getErrorMessage(authError, 'auth'))
      }
      return
    }

    // Login OK → tự bật biometric nếu thiết bị hỗ trợ
    const available = await isBiometricAvailable()
    if (available) {
      await saveBiometricCredentials(trimmedEmail, password)
      setBiometricReady(true)
      setBiometricAvailable(true)
    }
  }

  async function handleBiometricButton() {
    const creds = await getBiometricCredentials()
    if (!creds) {
      setBiometricReady(false)
      return
    }
    await attemptBiometricLogin(creds)
  }

  const busy = loading || attemptingBiometric

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
          <View style={styles.logoSection}>
            <Image
              source={require('../assets/adaptive-icon.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <Text style={[styles.appName, { color: colors.text }]}>
              Chino's Store
            </Text>
            <Text style={[styles.appSub, { color: colors.sub }]}>
              Quản lý kho hàng nội bộ
            </Text>
          </View>

          {attemptingBiometric ? (
            <View style={styles.bioBusy}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.bioBusyText, { color: colors.sub }]}>
                Đang xác thực...
              </Text>
            </View>
          ) : null}

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
              editable={!busy}
              maxLength={100}
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
                editable={!busy}
                maxLength={100}
                onSubmitEditing={() => void handleLogin()}
              />
              <TouchableOpacity
                style={[
                  styles.eyeBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                disabled={busy}
              >
                <Text style={styles.eyeBtnText}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.statusExpired }]}>
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.loginBtn,
                { backgroundColor: colors.accent, opacity: busy ? 0.6 : 1 },
              ]}
              activeOpacity={0.8}
              onPress={() => void handleLogin()}
              disabled={busy}
            >
              {loading && !attemptingBiometric ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {biometricReady && !attemptingBiometric ? (
              <TouchableOpacity
                style={[
                  styles.bioBtn,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
                activeOpacity={0.8}
                onPress={() => void handleBiometricButton()}
                disabled={busy}
              >
                <Text style={styles.bioBtnEmoji}>🔐</Text>
                <Text style={[styles.bioBtnText, { color: colors.text }]}>
                  Đăng nhập bằng vân tay
                </Text>
              </TouchableOpacity>
            ) : null}

            {biometricAvailable && !biometricReady && !attemptingBiometric ? (
              <Text style={[styles.bioHint, { color: colors.sub }]}>
                Đăng nhập bằng mật khẩu một lần để bật vân tay / Face ID.
              </Text>
            ) : null}
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
  logoIcon: {
    width: 140,
    height: 140,
    marginBottom: -18,
    zIndex: 1,
  },
  appName: { fontSize: 24, fontWeight: 'bold', marginTop: 0 },
  appSub: { fontSize: 14, marginTop: 4 },
  bioBusy: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  bioBusyText: { fontSize: 14 },
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
  bioBtn: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bioBtnEmoji: { fontSize: 18 },
  bioBtnText: { fontSize: 15, fontWeight: '600' },
  bioHint: { fontSize: 12, textAlign: 'center', marginTop: 4 },
})
