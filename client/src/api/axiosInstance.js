import axios from 'axios';

const TOKEN_KEY = 'payroll_token';
export const UNAUTHORIZED_EVENT = 'payroll:unauthorized';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Backend alag domain par ho (frontend Vercel par, API Render par) tab VITE_API_URL mein uska URL.
// Khali ho to isi domain ka /api (dev ka Vite proxy, ya ek hi server se dono).
// Aakhir ka "/" ya "/api/v1" galti se likh diya ho to hata dete hain.
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '').replace(/\/api(\/v1)?$/, '');

const api = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status;
    let data = error.response?.data;
    // File download (blob) fail ho to error JSON bhi blob mein aata hai.
    if (data instanceof Blob) {
      data = await data
        .text()
        .then(JSON.parse)
        .catch(() => null);
    }
    // Session expire ya invalid: AuthContext ko batao taaki user logout ho jaye.
    if (status === 401 && tokenStore.get()) {
      tokenStore.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject({
      status,
      message: data?.message || 'Could not connect to the server. Please try again.',
      errors: data?.errors || [],
    });
  }
);

export default api;
