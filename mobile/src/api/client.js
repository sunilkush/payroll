import axios from 'axios';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'payroll_token';
const REFRESH_KEY = 'payroll_refresh_token';
const DEVICE_KEY = 'payroll_device_id';

// EXPO_PUBLIC_API_URL: backend ka URL (dekho .env.example). Aakhir ka "/" ya "/api/v1" hata dete hain.
export const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api(\/v1)?$/, '');
export const API_BASE = `${API_ORIGIN}/api/v1`;

// Tokens phone ke secure storage (Keychain / Keystore) mein rehte hain; memory mein ek copy
// taaki har request par storage na padhna pade.
//   access token   chhoti umar ka, har request ke saath jata hai
//   refresh token  lambi umar ka, sirf naya access token lene ke liye
let accessToken = null;
let refreshToken = null;
export const tokenStore = {
  get: () => accessToken,
  getRefresh: () => refreshToken,
  async load() {
    [accessToken, refreshToken] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(REFRESH_KEY)]);
    return accessToken;
  },
  async set({ token, refreshToken: nextRefresh }) {
    accessToken = token;
    refreshToken = nextRefresh;
    await Promise.all([SecureStore.setItemAsync(TOKEN_KEY, token), SecureStore.setItemAsync(REFRESH_KEY, nextRefresh)]);
  },
  async clear() {
    accessToken = null;
    refreshToken = null;
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
  },
};

// Is phone ka id: pehli baar random banta hai, phir wahi rehta hai (logout par bhi).
// Server isi se pehchanta hai ki refresh token aur push token kis phone ke hain.
let deviceId = null;
export async function getDeviceId() {
  deviceId ??= await SecureStore.getItemAsync(DEVICE_KEY);
  if (!deviceId) {
    deviceId = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

// AuthContext yahan apne handlers jodta hai:
//   onUnauthorized(message)   session khatam (refresh bhi na chale, ya staff ka account subscription ki wajah se band)
//   onSubscriptionExpired()   admin ko 402 mila: company ka trial / subscription abhi-abhi khatam hua
let onUnauthorized = () => {};
let onSubscriptionExpired = () => {};
export const setAuthHandlers = (handlers) => {
  ({ onUnauthorized, onSubscriptionExpired } = handlers);
};

const isSubscriptionError = (response) => response?.data?.errors?.some((item) => item.field === 'subscription');

const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

const toError = (error) => ({
  status: error.response?.status,
  message: error.response?.data?.message || 'Could not connect to the server. Please try again.',
  errors: error.response?.data?.errors || [],
});

// Naya access token laata hai. Ek saath kai requests 401 hon to bhi refresh ek hi baar chalta hai
// (refresh token ek hi baar chalta hai, doosri koshish session tod deti).
// Seedha axios se, taaki ye call khud interceptor ke chakkar mein na pade.
let refreshing = null;
export function refreshSession() {
  refreshing ??= axios
    .post(`${API_BASE}/auth/refresh`, { refreshToken }, { timeout: 20000 })
    .then(async ({ data }) => {
      await tokenStore.set(data.data);
      return data.data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const { config, response } = error;
    const isAuthCall = config?.url?.startsWith('/auth/login') || config?.url?.startsWith('/auth/logout');
    if (accessToken && !isAuthCall && isSubscriptionError(response)) {
      // 403: staff ka account hold par (login screen par wajah dikhti hai). 402: admin ko plan lena hai.
      if (response.status === 403) onUnauthorized(response.data.message);
      if (response.status === 402) onSubscriptionExpired();
    }
    if (response?.status !== 401 || isAuthCall || !accessToken) throw toError(error);

    // Access token expire: ek baar refresh karke wahi request dobara.
    if (refreshToken && !config.retried) {
      try {
        await refreshSession();
      } catch (refreshError) {
        // Server tak pahunch hi nahi (network): login bana rehne do, agli baar phir koshish hogi.
        if (!refreshError.response) throw toError(refreshError);
        onUnauthorized();
        throw toError(refreshError);
      }
      return api({ ...config, retried: true });
    }
    onUnauthorized();
    throw toError(error);
  }
);

export default api;
