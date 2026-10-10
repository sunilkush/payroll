import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'payroll_token';
const USER_KEY = 'payroll_cached_user';

// In-memory cache for synchronous token access in axios interceptors
let inMemoryToken = null;

export const tokenStore = {
  async init() {
    try {
      inMemoryToken = await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      inMemoryToken = null;
    }
    return inMemoryToken;
  },

  getSync() {
    return inMemoryToken;
  },

  async get() {
    if (inMemoryToken !== null) return inMemoryToken;
    inMemoryToken = await AsyncStorage.getItem(TOKEN_KEY);
    return inMemoryToken;
  },

  async set(token) {
    inMemoryToken = token;
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  },

  async clear() {
    inMemoryToken = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};

export const userStore = {
  async get() {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async set(user) {
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
  },

  async clear() {
    await AsyncStorage.removeItem(USER_KEY);
  },
};
