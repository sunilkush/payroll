import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { getDeviceId, setAuthHandlers, tokenStore } from '../api/client.js';
import { getMeApi, loginApi, logoutApi, registerApi } from '../api/endpoints.js';

const AuthContext = createContext(null);

export const ROLES = { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', STAFF: 'STAFF' };

export function AuthProvider({ children }) {
  // { user, company }. company: { _id, name, plan, subscription, staffLimit, features, payrollEnabled,
  // correctionsEnabled, leaveEnabled, salesEnabled, requireVisitPhoto } - Super Admin ke liye null.
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // Server ne session kyun khatam kiya (jaise "subscription ended, contact your admin"): login screen par dikhta hai.
  const [notice, setNotice] = useState('');
  // Is app se abhi-abhi register hua ho to verification code kab gaya (Verify screen ki "Resend in" ginti ke liye); warna 0.
  const [codeSentAt, setCodeSentAt] = useState(0);

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
    if (refreshToken) logoutApi(refreshToken).catch(() => {}); // network na ho to bhi phone par logout ho chuka
  }, [dropSession]);

  // Server se user + company dobara (jaise email verify hua, ya subscription abhi chalu / khatam hua ho).
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

  // Naya free account: ek company aur uska pehla admin. Banate hi login ho jata hai.
  const register = useCallback(async (payload) => {
    const { data } = await registerApi(payload);
    await tokenStore.set(data);
    setNotice('');
    setCodeSentAt(Date.now()); // server ne abhi verification code bheja hai
    setSession({ user: data.user, company: data.company });
  }, []);

  const value = useMemo(() => {
    const user = session?.user ?? null;
    const company = session?.company ?? null;
    return {
      user,
      company,
      role: user?.role ?? null,
      // Plan mein jo features hain: leave, corrections, payroll, statutory, workTime, sales, exports
      hasFeature: (feature) => Boolean(company?.features?.includes(feature)),
      loading,
      notice,
      codeSentAt,
      login,
      register,
      logout,
      reload,
    };
  }, [session, loading, notice, codeSentAt, login, register, logout, reload]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
