import api from './axiosInstance.js';

export const loginApi = (credentials) => api.post('/auth/login', credentials);
export const getMeApi = () => api.get('/auth/me');
// Free account: { companyName, name, email, phone, password } -> login jaisa hi jawab ({ user, company, token })
export const registerApi = (payload) => api.post('/auth/register', payload);

// Email verification (login ke baad): 6 ank ka code
export const verifyEmailApi = (code) => api.post('/auth/verify-email', { code });
export const resendVerificationApi = () => api.post('/auth/resend-verification');
// Password bhool gaye: email par link, phir link ke token se naya password
export const forgotPasswordApi = (email) => api.post('/auth/forgot-password', { email });
export const resetPasswordApi = (token, password) => api.post('/auth/reset-password', { token, password });
