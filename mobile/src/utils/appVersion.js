import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getAppConfigApi } from '../api/endpoints.js';

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

// '1.2.0' < '1.10.0' (string compare yahan galat hota, isliye hisse number bana kar)
export function isOlder(version, than) {
  const a = version.split('.').map(Number);
  const b = than.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff) return diff < 0;
  }
  return false;
}

// Server se poochta hai ki ye version chalega ya nahi. Return: update zaroori ho to { storeUrl }, warna null.
// Server tak pahunch na ho to null: network ki wajah se app band nahi hona chahiye.
export async function checkForcedUpdate() {
  try {
    const { data } = await getAppConfigApi();
    if (!data.minVersion || !isOlder(APP_VERSION, data.minVersion)) return null;
    return { storeUrl: Platform.OS === 'ios' ? data.iosUrl : data.androidUrl };
  } catch {
    return null;
  }
}
