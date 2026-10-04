import api from './axiosInstance.js';
import { downloadFile } from './download.js';

export const listPayrollApi = (month) => api.get('/payroll', { params: { month } });
export const generatePayrollApi = (month) => api.post('/payroll/generate', { month });
export const finalizePayrollApi = (month) => api.post('/payroll/finalize', { month });
export const updatePayrollApi = (id, payload) => api.patch(`/payroll/${id}`, payload);
export const listMyPayrollsApi = () => api.get('/payroll/my');

export const downloadSlip = (payroll) =>
  downloadFile(`/payroll/${payroll._id}/slip`, {
    filename: `salary-slip-${payroll.staff.employeeCode}-${payroll.period}.pdf`,
  });

export const downloadPayrollExcel = (month) =>
  downloadFile('/payroll/export', { params: { month }, filename: `payroll-${month}.xlsx` });
