import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { getDeviceId, setAuthHandlers, tokenStore } from '../api/client.js';
import { getMeApi, loginApi, logoutApi } from '../api/endpoints.js';
import { setLockEnabled } from '../utils/biometric.js';
import { registerForPush } from '../utils/notifications.js';
import { clearQueue } from '../utils/offlinePunch.js';

const AuthContext = createContext(null);

// Login ke baad har role apne home par jaata hai.
export const ROLE_HOME = { SUPER_ADMIN: '/superadmin', ADMIN: '/admin', STAFF: '/staff' };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { user, company }
  const [loading, setLoading] = useState(true);
  // Server ne session kyun khatam kiya (jaise "subscription ended, contact your admin"): login screen par dikhta hai.
  const [notice, setNotice] = useState('');

  // Sirf phone se session hatata hai (server ne hi mana kar diya ho tab).
  const dropSession = useCallback(async (message = '') => {
    await tokenStore.clear();
    setNotice(message);
    setSession(null);
  }, []);

  // User ka "Log out": server par bhi session khatam, taaki is phone par notifications band hon.
  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefresh();
    await dropSession();
    // App lock aur jama offline punch us user ke the; agle user tak na pahunchein.
    await Promise.all([setLockEnabled(false), clearQueue()]);
    if (refreshToken) logoutApi(refreshToken).catch(() => {}); // network na ho to bhi phone par logout ho chuka
  }, [dropSession]);

  // Server se user + company dobara (jaise subscription abhi chalu / khatam hua ho).
  const reload = useCallback(async () => {
    const { data } = await getMeApi();
    setSession(data);
  }, []);

  // App khulte hi: saved login ho to user wapas laao.
  useEffect(() => {
    setAuthHandlers({ onUnauthorized: dropSession, onSubscriptionExpired: () => reload().catch(() => {}) });
    (async () => {
      try {
        // Access token purana ho chuka ho to interceptor khud refresh kar leta hai.
        if (await tokenStore.load()) await reload();
      } catch (error) {
        // 401 par (aur staff ke subscription wale 403 par) interceptor khud session hata deta hai.
        // Account / company block (403) par bhi hata do, wajah ke saath.
        // Network error (status nahi) par login rakhte hain: agli baar khulne par phir koshish hogi.
        if (error.status === 403 && tokenStore.get()) await dropSession(error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [dropSession, reload]);

  const login = useCallback(async (credentials) => {
    const platform = ['android', 'ios'].includes(Platform.OS) ? Platform.OS : undefined;
    const { data } = await loginApi({ ...credentials, deviceId: await getDeviceId(), platform });
    await tokenStore.set(data);
    setNotice('');
    setSession({ user: data.user, company: data.company });
  }, []);

  // Login hote hi (ya saved login milte hi) is phone ko notifications ke liye register karo.
  const userId = session?.user._id;
  useEffect(() => {
    if (userId) registerForPush();
  }, [userId]);

  const value = useMemo(
    () => ({ user: session?.user ?? null, company: session?.company ?? null, loading, notice, login, logout, reload }),
    [session, loading, notice, login, logout, reload]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
