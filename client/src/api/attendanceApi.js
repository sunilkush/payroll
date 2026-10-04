import api from './axiosInstance.js';

export const getTodayApi = () => api.get('/attendance/today');
export const punchInApi = (position) => api.post('/attendance/punch-in', position);
export const punchOutApi = (position) => api.post('/attendance/punch-out', position);
// Staff: apna mahina. Admin: userId ke saath kisi staff ka mahina.
export const getMonthlyAttendanceApi = (params) => api.get('/attendance', { params });
export const getAttendanceReportApi = (month) => api.get('/attendance/report', { params: { month } });
