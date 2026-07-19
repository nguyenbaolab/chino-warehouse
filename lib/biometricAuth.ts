import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

const KEYS = {
  enabled: 'chino_bio_enabled',
  email: 'chino_bio_email',
  password: 'chino_bio_password',
} as const

/** Thiết bị có hardware + đã enroll vân tay / Face ID */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    if (!hasHardware) return false
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    return enrolled
  } catch (e) {
    if (__DEV__) console.error('[biometricAuth] isBiometricAvailable:', e)
    return false
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(KEYS.enabled)
    return v === 'true'
  } catch (e) {
    if (__DEV__) console.error('[biometricAuth] isBiometricEnabled:', e)
    return false
  }
}

/** Lưu credentials + bật biometric (sau login password thành công) */
export async function saveBiometricCredentials(
  email: string,
  password: string,
): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEYS.email, email)
    await SecureStore.setItemAsync(KEYS.password, password)
    await SecureStore.setItemAsync(KEYS.enabled, 'true')
  } catch (e) {
    if (__DEV__) console.error('[biometricAuth] saveBiometricCredentials:', e)
  }
}

export async function getBiometricCredentials(): Promise<{
  email: string
  password: string
} | null> {
  try {
    const email = await SecureStore.getItemAsync(KEYS.email)
    const password = await SecureStore.getItemAsync(KEYS.password)
    if (!email || !password) return null
    return { email, password }
  } catch (e) {
    if (__DEV__) console.error('[biometricAuth] getBiometricCredentials:', e)
    return null
  }
}

/** Xóa hết credentials + tắt (tắt toggle / password sai) */
export async function clearBiometricCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEYS.enabled)
    await SecureStore.deleteItemAsync(KEYS.email)
    await SecureStore.deleteItemAsync(KEYS.password)
  } catch (e) {
    if (__DEV__) console.error('[biometricAuth] clearBiometricCredentials:', e)
  }
}

/** Prompt OS Face ID / fingerprint */
export async function authenticateBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Đăng nhập Chino's Store",
      fallbackLabel: 'Nhập mật khẩu',
      cancelLabel: 'Huỷ',
      disableDeviceFallback: false,
    })
    return result.success === true
  } catch (e) {
    if (__DEV__) console.error('[biometricAuth] authenticateBiometric:', e)
    return false
  }
}
