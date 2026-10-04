import api from './axiosInstance.js';

export const listStaffApi = (params) => api.get('/staff', { params });
export const createStaffApi = (payload) => api.post('/staff', payload);
export const getStaffApi = (id) => api.get(`/staff/${id}`);
export const updateStaffApi = (id, payload) => api.put(`/staff/${id}`, payload);
export const setStaffStatusApi = (id, isActive) => api.patch(`/staff/${id}/status`, { isActive });
