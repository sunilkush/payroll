import * as meetingFileService from '../services/meetingFileService.js';
import * as meetingService from '../services/meetingService.js';
import * as meetingVisitService from '../services/meetingVisitService.js';
import { writeMeetingExcel } from '../services/meetingExportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { todayStr } from '../utils/dateUtil.js';

export const create = asyncHandler(async (req, res) => {
  const meeting = await meetingService.createMeeting(req.user, req.body);
  res.status(201).json({ success: true, data: { meeting } });
});

export const list = asyncHandler(async (req, res) => {
  const data = await meetingService.listMeetings({ requester: req.user, ...req.query });
  res.json({ success: true, data });
});

export const getOne = asyncHandler(async (req, res) => {
  const meeting = await meetingService.getMeeting(req.params.id, req.user);
  res.json({ success: true, data: { meeting } });
});

export const update = asyncHandler(async (req, res) => {
  const meeting = await meetingService.updateMeeting(req.params.id, req.user, req.body);
  res.json({ success: true, data: { meeting } });
});

export const cancel = asyncHandler(async (req, res) => {
  const meeting = await meetingService.cancelMeeting(req.params.id, req.user, req.body.reason);
  res.json({ success: true, data: { meeting } });
});

export const getQr = asyncHandler(async (req, res) => {
  const qr = await meetingService.getMeetingQr(req.params.id, req.user);
  res.json({ success: true, data: { qr } });
});

export const regenerateQr = asyncHandler(async (req, res) => {
  const data = await meetingService.regenerateMeetingQr(req.params.id, req.user);
  res.json({ success: true, data });
});

export const markQrSent = asyncHandler(async (req, res) => {
  const data = await meetingService.markMeetingQrSent(req.params.id, req.user, req.body.channel);
  res.json({ success: true, data });
});

export const scan = asyncHandler(async (req, res) => {
  const data = await meetingVisitService.scanMeetingQr(req.user, req.body.token);
  res.json({ success: true, data });
});

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

export const checkIn = asyncHandler(async (req, res) => {
  const meeting = await meetingVisitService.checkIn(req.user, req.body, requestMeta(req));
  res.json({ success: true, data: { meeting } });
});

export const checkOut = asyncHandler(async (req, res) => {
  const meeting = await meetingVisitService.checkOut(req.params.id, req.user, req.body, requestMeta(req));
  res.json({ success: true, data: { meeting } });
});

// ---------- Visit photo / attachments ----------

export const uploadPhoto = asyncHandler(async (req, res) => {
  const meeting = await meetingFileService.setVisitPhoto(req.params.id, req.user, req.file, req.body);
  res.status(201).json({ success: true, data: { meeting } });
});

export const uploadAttachment = asyncHandler(async (req, res) => {
  const meeting = await meetingFileService.addAttachment(req.params.id, req.user, req.file);
  res.status(201).json({ success: true, data: { meeting } });
});

export const removeAttachment = asyncHandler(async (req, res) => {
  const meeting = await meetingFileService.removeAttachment(req.params.id, req.user, req.params.fileId);
  res.json({ success: true, data: { meeting } });
});

// File login ke peeche se hi jati hai. Type hamara jaancha hua hai (helmet ka nosniff browser ko andaza lagane se rokta hai).
export const sendFile = asyncHandler(async (req, res) => {
  const { file, mimeType, name } = await meetingFileService.getMeetingFile(req.params.id, req.user, req.params.fileId);
  res.set('Cache-Control', 'private, no-store');
  res.type(mimeType);
  res.attachment(name); // client ise blob ki tarah laakar khud dikhata / download karata hai
  res.type(mimeType); // attachment() naam ke extension se type badal deta hai; apna jaancha hua type wapas
  res.sendFile(file);
});

// ---------- Follow-ups ----------

export const listFollowUps = asyncHandler(async (req, res) => {
  const data = await meetingService.listFollowUps({ requester: req.user, ...req.query });
  res.json({ success: true, data });
});

export const closeFollowUp = asyncHandler(async (req, res) => {
  const meeting = await meetingService.closeFollowUp(req.params.id, req.user, req.body.status);
  res.json({ success: true, data: { meeting } });
});

// ---------- Dashboard / Excel ----------

export const dashboard = asyncHandler(async (req, res) => {
  const data = await meetingService.getMeetingDashboard(req.user);
  res.json({ success: true, data });
});

export const exportExcel = asyncHandler(async (req, res) => {
  const data = await meetingService.getMeetingExport({ requester: req.user, ...req.query });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="meetings-${todayStr()}.xlsx"`);
  await writeMeetingExcel(data, res);
});
