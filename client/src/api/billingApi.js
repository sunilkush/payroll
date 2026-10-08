import api from './axiosInstance.js';

// Admin: { plan, staffLimit, activeStaff, features, request }
export const getBillingApi = () => api.get('/billing');
// plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
export const requestUpgradeApi = (plan, note) => api.post('/billing/upgrade-request', { plan, note });
export const cancelUpgradeRequestApi = () => api.delete('/billing/upgrade-request');
