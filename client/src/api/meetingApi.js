import api from './axiosInstance.js';
import { downloadFile } from './download.js';

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

// Sales manager: QR ka token -> { canCheckIn, alreadyCheckedIn, meeting }
export const scanMeetingApi = (token) => api.post('/meetings/scan', { token });
// position: { lat, lng, accuracy }. Doori, geofence aur time server nikalta hai.
export const checkInMeetingApi = (token, position) => api.post('/meetings/check-in', { token, ...position });
// payload: { lat?, lng?, accuracy?, result: { outcome, ... }, followUp: { date, time, notes } }
export const checkOutMeetingApi = (id, payload) => api.post(`/meetings/${id}/check-out`, payload);

// ---- Visit photo / attachments (multipart). source: 'camera' (app ke camera se) | 'upload' (file chuni)
export const uploadVisitPhotoApi = (id, blob, { lat, lng, source } = {}) => {
  const form = new FormData();
  form.append('photo', blob, 'visit-photo.jpg');
  if (lat != null && lng != null) {
    form.append('lat', lat);
    form.append('lng', lng);
  }
  if (source) form.append('source', source);
  return api.post(`/meetings/${id}/photo`, form);
};
export const uploadAttachmentApi = (id, file) => {
  const form = new FormData();
  form.append('file', file, file.name);
  return api.post(`/meetings/${id}/attachments`, form);
};
export const removeAttachmentApi = (id, fileId) => api.delete(`/meetings/${id}/attachments/${fileId}`);
// File login token ke saath blob mein aati hai (seedha <img src> / <a href> mein token nahi jata).
// fileId na ho to visit photo.
export const getMeetingFileApi = (id, fileId) =>
  api.get(fileId ? `/meetings/${id}/attachments/${fileId}` : `/meetings/${id}/photo`, { responseType: 'blob' });

// ---- Follow-ups. Staff: apne. Admin: company ke saare.
export const listFollowUpsApi = (params) => api.get('/meetings/follow-ups', { params });
// status: 'DONE' | 'CANCELLED'
export const closeFollowUpApi = (id, status) => api.patch(`/meetings/${id}/follow-up`, { status });

// ---- Dashboard: { date, counts, today: [...], followUps, month }. Staff: apni. Admin: company ki.
export const getMeetingDashboardApi = () => api.get('/meetings/dashboard');
// Admin: list wale hi filters ke saath Excel
export const downloadMeetingsExcel = (params) => downloadFile('/meetings/export', { params, filename: 'meetings.xlsx' });
