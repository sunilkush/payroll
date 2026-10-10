import api from './axiosInstance.js';

export const getTodayApi = () => api.get('/attendance/today');
export const punchInApi = (position) => api.post('/attendance/punch-in', position);
export const punchOutApi = (position) => api.post('/attendance/punch-out', position);
export const getMonthlyAttendanceApi = (params) => api.get('/attendance', { params });
export const getTodaySummaryApi = () => api.get('/attendance/today-summary');
export const getAttendanceReportApi = (month) => api.get('/attendance/report', { params: { month } });
