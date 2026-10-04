import api from './axiosInstance.js';

export const listCompaniesApi = (params) => api.get('/companies', { params });
export const createCompanyApi = (payload) => api.post('/companies', payload);
export const getCompanyApi = (id) => api.get(`/companies/${id}`);
export const updateCompanyApi = (id, payload) => api.put(`/companies/${id}`, payload);
export const setCompanyStatusApi = (id, isActive) => api.patch(`/companies/${id}/status`, { isActive });

export const createAdminApi = (companyId, payload) => api.post(`/companies/${companyId}/admins`, payload);
export const updateAdminApi = (companyId, adminId, payload) =>
  api.patch(`/companies/${companyId}/admins/${adminId}`, payload);
