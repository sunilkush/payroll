import api from './axiosInstance.js';

export const getLeaveBalanceApi = () => api.get('/leaves/balance');
export const applyLeaveApi = (payload) => api.post('/leaves', payload);
// Staff: apni leaves. Admin: company ki saari.
export const listLeavesApi = (params) => api.get('/leaves', { params });
export const cancelLeaveApi = (id) => api.patch(`/leaves/${id}/cancel`);
export const approveLeaveApi = (id, note) => api.patch(`/leaves/${id}/approve`, { note });
export const rejectLeaveApi = (id, note) => api.patch(`/leaves/${id}/reject`, { note });
