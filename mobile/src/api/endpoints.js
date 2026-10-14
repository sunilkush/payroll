import api, { API_BASE } from './client.js';

// Sirf server ka REST API; har screen ke calls yahin jude jate hain (phase ke saath badhega).
// Punch / check-in mein kabhi phone ka time nahi jata: server ka time hi maana jata hai.

// App ka version chalega ya update zaroori hai (bina login)
export const getAppConfigApi = () => api.get('/app/config');
// Packages ke naam, daam aur hadd (bina login; Super Admin badalta hai)
export const getPlansApi = () => api.get('/plans');

// ---------- Auth ----------
// Login mein deviceId jata hai, isliye jawab mein refresh token bhi aata hai: { user, company, token, refreshToken }
export const loginApi = (credentials) => api.post('/auth/login', credentials);
// { companyName, name, email, phone?, password, plan? } -> { user, company, token }
export const registerApi = (payload) => api.post('/auth/register', payload);
// { user, company }: company mein plan, features, subscription
export const getMeApi = () => api.get('/auth/me');
// Server par is phone ka session (refresh token + push token) khatam karta hai.
export const logoutApi = (refreshToken) => api.post('/auth/logout', { refreshToken });
export const savePushTokenApi = (payload) => api.put('/auth/push-token', payload);
// Email par aaya 6 ank ka code (login ke baad)
export const verifyEmailApi = (code) => api.post('/auth/verify-email', { code });
export const resendVerificationApi = () => api.post('/auth/resend-verification');
export const forgotPasswordApi = (email) => api.post('/auth/forgot-password', { email });
// token: email ke reset link wala
export const resetPasswordApi = (token, password) => api.post('/auth/reset-password', { token, password });

// ---------- Attendance (staff) ----------
// { date, attendance (punches), metrics, workingHoursConfig, locations, isWeekOff, holidayName, workHoursMessage, ... }
export const getTodayApi = () => api.get('/attendance/today');
// position: sirf { lat, lng, accuracy }. Time kabhi nahi bhejte: punch ka time server likhta hai.
const punchBody = ({ lat, lng, accuracy }) => ({ lat, lng, accuracy });
export const punchInApi = (position) => api.post('/attendance/punch-in', punchBody(position));
export const punchOutApi = (position) => api.post('/attendance/punch-out', punchBody(position));
// month: 'YYYY-MM' -> { month, days: [{ date, weekday, status, punchIn, punchOut, workedMinutes, note, ... }], summary }
export const getMonthlyAttendanceApi = (month) => api.get('/attendance', { params: { month } });

// Saal ki holidays. Staff: apni branch wali; admin: saari.
// { year, holidays: [{ date, name, type: NATIONAL|FESTIVAL|COMPANY, branchIds (khali = saari branches) }], weekOffDays, branches: [{ _id, name }] }
export const getHolidaysApi = (year) => api.get('/holidays', { params: { year } });

// ---------- Leave (staff) ----------
// { balance: { year, CL: { available, pending, used }, EL: {...}, lastCreditedMonth } }
export const getLeaveBalanceApi = () => api.get('/leaves/balance');
// { type: 'CL' | 'EL', fromDate, toDate, halfDay?: 'FIRST' | 'SECOND', reason } -> { leave, balance }
export const applyLeaveApi = (payload) => api.post('/leaves', payload);
// Apni leaves: { items, total, page, limit, totalPages, counts }
export const listLeavesApi = (params) => api.get('/leaves', { params });
export const cancelLeaveApi = (id) => api.patch(`/leaves/${id}/cancel`);

// ---------- Salary (staff) ----------
// Sirf finalized mahine, naya pehle: { rows: [payroll] }
export const getMyPayrollsApi = () => api.get('/payroll/my');
// PDF ka path (api/download.js ke downloadAndShare ke liye)
export const payrollSlipPath = (id) => `/payroll/${id}/slip`;

// ---------- Sales visits (staff / sales manager) ----------
// Aaj ki meetings, server ka status (MISSED bhi): { date, counts, today: [{ _id, title, startAt, endAt, status, client, checkInAt, ... }] }
export const getMeetingDashboardApi = () => api.get('/meetings/dashboard');
// Poori meeting (client ka pata, location + radius): { items, ... }
export const listMeetingsApi = (params) => api.get('/meetings', { params });
// QR ka token -> { canCheckIn, alreadyCheckedIn, meeting: { _id, client, checkInOpensAt, checkInClosesAt, ... } }
export const scanMeetingApi = (token) => api.post('/meetings/scan', { token });
// Token se hi meeting milti hai; doori, geofence aur time server nikalta hai. Time kabhi nahi bhejte.
export const checkInMeetingApi = (token, { lat, lng, accuracy }) => api.post('/meetings/check-in', { token, lat, lng, accuracy });
// Visit photo (multipart): photo { uri, name, type }, lat / lng, source 'camera'
export function uploadVisitPhotoApi(id, { uri, lat, lng }) {
  const form = new FormData();
  form.append('photo', { uri, name: 'visit.jpg', type: 'image/jpeg' });
  if (lat != null && lng != null) {
    form.append('lat', String(lat));
    form.append('lng', String(lng));
  }
  form.append('source', 'camera');
  return api.post(`/meetings/${id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' }, transformRequest: (data) => data });
}
// Check-out + nateeja: { lat?, lng?, accuracy?, result: { outcome, remarks }, followUp: { date?, time?, notes? } }
export const checkOutMeetingApi = (id, payload) => api.post(`/meetings/${id}/check-out`, payload);

// ---------- Admin ----------
// Aaj ki ginti: { date, dayType, totalStaff, present, punchedOut, onLeave, notMarked, locationsCount }
export const getTodaySummaryApi = () => api.get('/attendance/today-summary');
// Ek staff ka mahina (admin): userId zaroori
export const getStaffMonthApi = (userId, month) => api.get('/attendance', { params: { userId, month } });
// Plan, staff ki hadd aur kitne active: { plan, staffLimit, activeStaff, ... }
export const getBillingApi = () => api.get('/billing');

// Staff: { items, total, counts: { all, active, inactive } }. params: { search, status: all|active|inactive, salesManager, page, limit }
export const listStaffApi = (params) => api.get('/staff', { params });
export const getStaffApi = (id) => api.get(`/staff/${id}`);
export const createStaffApi = (payload) => api.post('/staff', payload);
export const updateStaffApi = (id, payload) => api.put(`/staff/${id}`, payload);
export const setStaffStatusApi = (id, isActive) => api.patch(`/staff/${id}/status`, { isActive });

// Company ki settings (admin): { company: { settings: { meetingCheckInGraceMin, ... }, locations, holidays } }
export const getSettingsApi = () => api.get('/settings');
// Sirf bheje gaye hisse badalte hain: { locations?, holidays?, settings?: { ...keys } } -> { company }
export const updateSettingsApi = (payload) => api.put('/settings', payload);
// Plan upgrade ki request (platform team dekhti hai) aur use wapas lena
export const requestUpgradeApi = (plan, note) => api.post('/billing/upgrade-request', { plan, note });
export const cancelUpgradeApi = () => api.delete('/billing/upgrade-request');

// Clients (admin): { items, total, counts }. params: { search, status, page, limit }
export const listClientsApi = (params) => api.get('/clients', { params });
export const getClientApi = (id) => api.get(`/clients/${id}`);
// { name, contactPerson, phone, email, address, lat, lng, notes }
export const createClientApi = (payload) => api.post('/clients', payload);
export const updateClientApi = (id, payload) => api.put(`/clients/${id}`, payload);
export const setClientStatusApi = (id, isActive) => api.patch(`/clients/${id}/status`, { isActive });

// Meetings (admin). Create: { clientId, salesManagerId, title, date, startTime, endTime, location: { name, address, lat, lng, radius } }
export const createMeetingApi = (payload) => api.post('/meetings', payload);
// Poori meeting + events (proof trail)
export const getMeetingApi = (id) => api.get(`/meetings/${id}`);
// QR ka token (sirf admin): { token, version, expiresAt, expired, sentAt }
export const getMeetingQrApi = (id) => api.get(`/meetings/${id}/qr`);
// Follow-up band: status DONE | CANCELLED
export const closeFollowUpApi = (id, status) => api.patch(`/meetings/${id}/follow-up`, { status });
// Excel (downloadAndShare ke liye path)
export const meetingExportPath = ({ from, to }) => `/meetings/export?from=${from}&to=${to}`;
export const meetingPhotoUrl = (id) => `${API_BASE}/meetings/${id}/photo`;

// Payroll (admin). Ek mahina: { month, rows: [payroll], totals, hasDraft, monthCompleted }
export const listPayrollApi = (month) => api.get('/payroll', { params: { month } });
// Draft banana / dobara banana (admin ke "other" deductions bane rehte hain). Jawab: listPayrollApi jaisa
export const generatePayrollApi = (month) => api.post('/payroll/generate', { month });
// Draft par: { otherDeductions?, remarks? }
export const updatePayrollApi = (id, payload) => api.patch(`/payroll/${id}`, payload);
// Mahina lock (sirf mahina khatam hone ke baad)
export const finalizePayrollApi = (month) => api.post('/payroll/finalize', { month });
export const payrollExportPath = (month) => `/payroll/export?month=${month}`;

// Approvals. note: admin ka comment (optional)
export const approveLeaveApi = (id, note) => api.patch(`/leaves/${id}/approve`, { note });
export const rejectLeaveApi = (id, note) => api.patch(`/leaves/${id}/reject`, { note });
export const approveCorrectionApi = (id, note) => api.patch(`/punch-corrections/${id}/approve`, { note });
export const rejectCorrectionApi = (id, note) => api.patch(`/punch-corrections/${id}/reject`, { note });

// ---------- Punch corrections (staff) ----------
// { date: 'YYYY-MM-DD', punchIn?: 'HH:mm', punchOut?: 'HH:mm', reason }: time company ke timezone mein
export const requestCorrectionApi = (payload) => api.post('/punch-corrections', payload);
// Apni requests: { items, total, page, limit, totalPages, counts }
export const listCorrectionsApi = (params) => api.get('/punch-corrections', { params });
export const cancelCorrectionApi = (id) => api.patch(`/punch-corrections/${id}/cancel`);
