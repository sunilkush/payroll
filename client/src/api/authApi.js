import api from './axiosInstance.js';

export const loginApi = (credentials) => api.post('/auth/login', credentials);
export const getMeApi = () => api.get('/auth/me');
