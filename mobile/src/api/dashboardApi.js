import api from './axiosInstance.js';

export const getDashboardApi = (params) => api.get('/dashboard', { params });
export const getNotificationsApi = () => api.get('/dashboard/notifications');
