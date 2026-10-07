import * as meetingService from '../services/meetingService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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
