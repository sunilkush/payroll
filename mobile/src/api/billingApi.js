import api from './axiosInstance.js';

export const getBillingApi = () => api.get('/billing');
export const requestUpgradeApi = (plan, note) => api.post('/billing/upgrade-request', { plan, note });
export const cancelUpgradeRequestApi = () => api.delete('/billing/upgrade-request');
