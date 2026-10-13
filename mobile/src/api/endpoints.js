import api from './client.js';

// App ka version chalega ya update zaroori hai (bina login)
export const getAppConfigApi = () => api.get('/app/config');

// Auth. Login mein deviceId jata hai, isliye jawab mein refresh token bhi aata hai.
export const loginApi = (credentials) => api.post('/auth/login', credentials);
export const getMeApi = () => api.get('/auth/me');
// Server par is phone ka session (refresh token + push token) khatam karta hai.
export const logoutApi = (refreshToken) => api.post('/auth/logout', { refreshToken });
export const savePushTokenApi = (payload) => api.put('/auth/push-token', payload);

// Attendance
export const getTodayApi = () => api.get('/attendance/today');
export const punchInApi = (position) => api.post('/attendance/punch-in', position);
export const punchOutApi = (position) => api.post('/attendance/punch-out', position);
export const getMonthlyAttendanceApi = (params) => api.get('/attendance', { params });
export const getTodaySummaryApi = () => api.get('/attendance/today-summary');

// Leaves. Staff: apni. Admin: company ki saari.
export const getLeaveBalanceApi = () => api.get('/leaves/balance');
export const applyLeaveApi = (payload) => api.post('/leaves', payload);
export const listLeavesApi = (params) => api.get('/leaves', { params });
export const cancelLeaveApi = (id) => api.patch(`/leaves/${id}/cancel`);
export const approveLeaveApi = (id, note) => api.patch(`/leaves/${id}/approve`, { note });
export const rejectLeaveApi = (id, note) => api.patch(`/leaves/${id}/reject`, { note });

// Punch corrections (admin approval)
export const listCorrectionsApi = (params) => api.get('/punch-corrections', { params });
export const approveCorrectionApi = (id, note) => api.patch(`/punch-corrections/${id}/approve`, { note });
export const rejectCorrectionApi = (id, note) => api.patch(`/punch-corrections/${id}/reject`, { note });

// Payroll (staff: apni final slips)
export const listMyPayrollsApi = () => api.get('/payroll/my');

// Super Admin
export const listCompaniesApi = (params) => api.get('/companies', { params });
// Packages ke naam, daam aur hadd (Super Admin badalta hai)
export const getPlansApi = () => api.get('/plans');
