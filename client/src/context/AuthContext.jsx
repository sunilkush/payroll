import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMeApi, loginApi } from '../api/authApi.js';
import { tokenStore, UNAUTHORIZED_EVENT } from '../api/axiosInstance.js';

const AuthContext = createContext(null);

const LOGGED_OUT = { user: null, company: null };

export function AuthProvider({ children }) {
  // company: { _id, name, leaveEnabled } - Super Admin ke liye null.
  const [session, setSession] = useState(LOGGED_OUT);
  // Page reload par token se user wapas laane tak loading true rehta hai.
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  // Server se user + company dobara laata hai (jaise admin ne settings badli ho).
  const refresh = useCallback(async () => {
    const res = await getMeApi();
    setSession({ user: res.data.user, company: res.data.company });
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    refresh()
      .catch(() => {
        tokenStore.clear();
        setSession(LOGGED_OUT);
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const onUnauthorized = () => setSession(LOGGED_OUT);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await loginApi(credentials);
    tokenStore.set(res.data.token);
    setSession({ user: res.data.user, company: res.data.company });
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setSession(LOGGED_OUT);
  }, []);

  const value = useMemo(
    () => ({ ...session, loading, login, logout, refresh }),
    [session, loading, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
