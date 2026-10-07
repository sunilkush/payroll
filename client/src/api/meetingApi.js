import api from './axiosInstance.js';

// Admin: company ki saari meetings (filters ke saath). Sales manager: sirf apni.
export const listMeetingsApi = (params) => api.get('/meetings', { params });
export const createMeetingApi = (payload) => api.post('/meetings', payload);
export const getMeetingApi = (id) => api.get(`/meetings/${id}`);
export const updateMeetingApi = (id, payload) => api.put(`/meetings/${id}`, payload);
export const cancelMeetingApi = (id, reason) => api.patch(`/meetings/${id}/cancel`, { reason });

// QR (sirf admin): { token, version, expiresAt, expired, sentAt }
export const getMeetingQrApi = (id) => api.get(`/meetings/${id}/qr`);
export const regenerateMeetingQrApi = (id) => api.post(`/meetings/${id}/qr/regenerate`);
// channel: 'share' | 'download' | 'other'
export const markMeetingQrSentApi = (id, channel) => api.post(`/meetings/${id}/qr/sent`, { channel });
