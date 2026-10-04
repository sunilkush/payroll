import api from './axiosInstance.js';

export const getSettingsApi = () => api.get('/settings');
export const updateSettingsApi = (payload) => api.put('/settings', payload);
