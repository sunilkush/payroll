import api from './axiosInstance.js';

// Role ke hisaab se dashboard ka data. params: { days } (admin ke attendance chart ke liye)
export const getDashboardApi = (params) => api.get('/dashboard', { params });
// Top bar ki ghanti
export const getNotificationsApi = () => api.get('/dashboard/notifications');
