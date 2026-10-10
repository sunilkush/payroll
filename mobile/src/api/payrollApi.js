import api from './axiosInstance.js';

export const listPayrollApi = (month) => api.get('/payroll', { params: { month } });
export const generatePayrollApi = (month) => api.post('/payroll/generate', { month });
export const finalizePayrollApi = (month) => api.post('/payroll/finalize', { month });
export const updatePayrollApi = (id, payload) => api.patch(`/payroll/${id}`, payload);
export const listMyPayrollsApi = () => api.get('/payroll/my');
