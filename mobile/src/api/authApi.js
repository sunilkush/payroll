import api from './axiosInstance.js';

export const loginApi = (credentials) => api.post('/auth/login', credentials);
export const getMeApi = () => api.get('/auth/me');
export const registerApi = (payload) => api.post('/auth/register', payload);

export const verifyEmailApi = (code) => api.post('/auth/verify-email', { code });
export const resendVerificationApi = () => api.post('/auth/resend-verification');
export const forgotPasswordApi = (email) => api.post('/auth/forgot-password', { email });
export const resetPasswordApi = (token, password) => api.post('/auth/reset-password', { token, password });
