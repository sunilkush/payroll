import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_OVERRIDE_KEY = 'payroster_api_url_override';

// Default production URL or fallback
const PROD_API_URL = 'https://payroll-hjsa.onrender.com/api/v1';

/**
 * Automatically determine the default dev server API URL:
 * - When running in Expo Go or dev client on a physical phone,
 *   Constants.expoConfig?.hostUri contains "<computer-ip>:<expo-port>".
 *   Extracting that IP allows the phone to hit the backend directly on the LAN!
 * - When running on Android emulator, 10.0.2.2 maps to the computer's localhost.
 * - When running on iOS simulator or web, localhost works directly.
 */
export const getDefaultApiUrl = () => {
  if (!__DEV__) {
    return PROD_API_URL;
  }

  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5000/api/v1`;
    }
  }

  if (Platform.OS === 'android') {
    return 'https://payroll-hjsa.onrender.com/api/v1';
  }

  return 'https://payroll-hjsa.onrender.com/api/v1';
};

let currentApiUrl = getDefaultApiUrl();

export const getApiUrl = () => currentApiUrl;

export const setApiUrl = async (url) => {
  if (!url) {
    await AsyncStorage.removeItem(API_OVERRIDE_KEY);
    currentApiUrl = getDefaultApiUrl();
  } else {
    const formatted = url.trim().replace(/\/+$/, '').replace(/\/api(\/v1)?$/, '') + '/api/v1';
    await AsyncStorage.setItem(API_OVERRIDE_KEY, formatted);
    currentApiUrl = formatted;
  }
  return currentApiUrl;
};

export const initApiUrl = async () => {
  try {
    const override = await AsyncStorage.getItem(API_OVERRIDE_KEY);
    if (override) {
      currentApiUrl = override;
    } else {
      currentApiUrl = getDefaultApiUrl();
    }
  } catch {
    currentApiUrl = getDefaultApiUrl();
  }
  return currentApiUrl;
};

export const APP_INFO = {
  name: 'PayRoster',
  version: '1.0.0',
};
