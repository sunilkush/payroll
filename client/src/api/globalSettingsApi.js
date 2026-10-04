import api from './axiosInstance.js';

export const getGlobalSettingsApi = () => api.get('/global-settings');
export const updateGlobalSettingsApi = (payload) => api.put('/global-settings', payload);
