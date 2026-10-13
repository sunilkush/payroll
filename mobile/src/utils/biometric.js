import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY = 'payroll_biometric_lock';

// Phone mein fingerprint / face laga hai aur set bhi hai?
export const biometricAvailable = async () =>
  (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());

// User ne Profile mein "app lock" ON kiya hai ya nahi (is phone par).
export const isLockEnabled = async () => (await SecureStore.getItemAsync(KEY)) === 'true';
export const setLockEnabled = (enabled) => SecureStore.setItemAsync(KEY, String(enabled));

// Fingerprint / face (ya phone ka PIN) maangta hai. Return: unlock hua ya nahi.
export async function unlock() {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock PayRoster', cancelLabel: 'Cancel' });
  return result.success;
}
