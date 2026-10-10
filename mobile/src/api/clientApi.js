import api from './axiosInstance.js';

export const listClientsApi = (params) => api.get('/clients', { params });
export const createClientApi = (payload) => api.post('/clients', payload);
export const getClientApi = (id) => api.get(`/clients/${id}`);
export const updateClientApi = (id, payload) => api.put(`/clients/${id}`, payload);
export const setClientStatusApi = (id, isActive) => api.patch(`/clients/${id}/status`, { isActive });
