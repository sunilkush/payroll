import axios from 'axios';
import { getApiUrl } from '../config/env.js';
import { tokenStore } from './storage.js';

export const UNAUTHORIZED_EVENT = 'payroll:unauthorized';

// Simple event listener registry for unauthorized/expired session events
const unauthorizedListeners = new Set();

export const subscribeUnauthorized = (callback) => {
  unauthorizedListeners.add(callback);
  return () => unauthorizedListeners.delete(callback);
};

const notifyUnauthorized = () => {
  unauthorizedListeners.forEach((callback) => {
    try {
      callback();
    } catch (e) {
      console.warn('Error in unauthorized listener', e);
    }
  });
};

const api = axios.create();

// Dynamic baseURL from env config
api.interceptors.request.use(async (config) => {
  if (!config.baseURL) {
    config.baseURL = getApiUrl();
  }

  // Retrieve token (uses fast in-memory token, falls back to AsyncStorage)
  const token = tokenStore.getSync() || (await tokenStore.get());
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // Session expired or invalid: clear token and notify auth listeners
    if (status === 401 && tokenStore.getSync()) {
      await tokenStore.clear();
      notifyUnauthorized();
    }

    return Promise.reject({
      status,
      message: data?.message || (error.message?.includes('Network Error') ? 'Could not connect to the server. Please check your network or server URL.' : 'Something went wrong. Please try again.'),
      errors: data?.errors || [],
    });
  }
);

export { tokenStore };
export default api;
