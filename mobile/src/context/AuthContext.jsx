import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMeApi, loginApi, registerApi } from '../api/authApi.js';
import { subscribeUnauthorized } from '../api/axiosInstance.js';
import { tokenStore, userStore } from '../api/storage.js';
import { initApiUrl } from '../config/env.js';

const AuthContext = createContext(null);

const LOGGED_OUT = { user: null, company: null };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(LOGGED_OUT);
  const [loading, setLoading] = useState(true);

  // Restore session from AsyncStorage on app launch
  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        await initApiUrl();
        const token = await tokenStore.init();

        if (token) {
          // Pre-populate with cached user for immediate screen render
          const cachedUser = await userStore.get();
          if (cachedUser && mounted) {
            setSession((prev) => ({ ...prev, user: cachedUser }));
          }

          // Verify & fetch fresh user + company from server
          const res = await getMeApi();
          if (mounted && res?.data) {
            setSession({ user: res.data.user, company: res.data.company });
            await userStore.set(res.data.user);
          }
        }
      } catch (err) {
        console.warn('Bootstrap auth error:', err.message);
        await tokenStore.clear();
        await userStore.clear();
        if (mounted) setSession(LOGGED_OUT);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  // Listen to 401 unauthorized broadcasts
  useEffect(() => {
    const unsubscribe = subscribeUnauthorized(() => {
      setSession(LOGGED_OUT);
      userStore.clear();
    });
    return unsubscribe;
  }, []);

  const refresh = useCallback(async () => {
    const res = await getMeApi();
    if (res?.data) {
      setSession({ user: res.data.user, company: res.data.company });
      await userStore.set(res.data.user);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await loginApi(credentials);
    const { token, user, company } = res.data;
    await tokenStore.set(token);
    await userStore.set(user);
    setSession({ user, company });
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await registerApi(payload);
    const { token, user, company } = res.data;
    await tokenStore.set(token);
    await userStore.set(user);
    setSession({ user, company });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await tokenStore.clear();
    await userStore.clear();
    setSession(LOGGED_OUT);
  }, []);

  const value = useMemo(
    () => ({
      user: session.user,
      company: session.company,
      loading,
      login,
      register,
      logout,
      refresh,
    }),
    [session, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
