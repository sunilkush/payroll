import api from './axiosInstance.js';

export const listMeetingsApi = (params) => api.get('/meetings', { params });
export const createMeetingApi = (payload) => api.post('/meetings', payload);
export const getMeetingApi = (id) => api.get(`/meetings/${id}`);
export const updateMeetingApi = (id, payload) => api.put(`/meetings/${id}`, payload);
export const cancelMeetingApi = (id, reason) => api.patch(`/meetings/${id}/cancel`, { reason });

export const getMeetingQrApi = (id) => api.get(`/meetings/${id}/qr`);
export const regenerateMeetingQrApi = (id) => api.post(`/meetings/${id}/qr/regenerate`);
export const markMeetingQrSentApi = (id, channel) => api.post(`/meetings/${id}/qr/sent`, { channel });

export const scanMeetingApi = (token) => api.post('/meetings/scan', { token });
export const checkInMeetingApi = (token, position) => api.post('/meetings/check-in', { token, ...position });
export const checkOutMeetingApi = (id, payload) => api.post(`/meetings/${id}/check-out`, payload);

export const uploadVisitPhotoApi = (id, photoUri, { lat, lng, source } = {}) => {
  const form = new FormData();
  form.append('photo', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'visit-photo.jpg',
  });
  if (lat != null && lng != null) {
    form.append('lat', String(lat));
    form.append('lng', String(lng));
  }
  if (source) form.append('source', source);
  return api.post(`/meetings/${id}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const listFollowUpsApi = (params) => api.get('/meetings/follow-ups', { params });
export const closeFollowUpApi = (id, status) => api.patch(`/meetings/${id}/follow-up`, { status });
export const getMeetingDashboardApi = () => api.get('/meetings/dashboard');
