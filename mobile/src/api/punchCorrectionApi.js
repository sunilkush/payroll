import api from './axiosInstance.js';

export const requestCorrectionApi = (payload) => api.post('/punch-corrections', payload);
export const listCorrectionsApi = (params) => api.get('/punch-corrections', { params });
export const cancelCorrectionApi = (id) => api.patch(`/punch-corrections/${id}/cancel`);
export const approveCorrectionApi = (id, note) => api.patch(`/punch-corrections/${id}/approve`, { note });
export const rejectCorrectionApi = (id, note) => api.patch(`/punch-corrections/${id}/reject`, { note });
