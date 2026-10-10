import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Checks if the device has biometric hardware and enrolled biometrics
 */
export async function checkBiometrics() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { available: false, enrolled: false, types: [] };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    const types = supportedTypes.map((type) => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'Face ID';
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'Fingerprint';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'Iris';
        default:
          return 'Biometrics';
      }
    });

    return {
      available: hasHardware,
      enrolled: isEnrolled,
      types,
      primaryType: types[0] || 'Biometric',
    };
  } catch (err) {
    console.warn('Biometric check failed:', err.message);
    return { available: false, enrolled: false, types: [] };
  }
}

/**
 * Triggers biometric authentication prompt
 * @param {string} promptMessage
 * @returns {Promise<boolean>}
 */
export async function authenticateWithBiometrics(
  promptMessage = 'Verify your identity to proceed'
) {
  try {
    const { available, enrolled } = await checkBiometrics();
    if (!available || !enrolled) {
      return { success: false, error: 'Biometrics not enrolled on this device' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Password',
      disableDeviceFallback: false,
    });

    return {
      success: result.success,
      error: result.error || null,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
