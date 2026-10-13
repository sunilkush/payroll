import * as punchCorrectionService from '../services/punchCorrectionService.js';
import { pushToAdmins, sendPush } from '../services/pushService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Push notification ka intezaar nahi karte (await nahi): jawab turant jata hai.
const notifyStaff = (correction, verb) =>
  sendPush([correction.userId], {
    title: `Punch correction ${verb}`,
    body: `Your punch correction for ${correction.date} was ${verb}.`,
    data: { screen: 'attendance' },
  });

export const request = asyncHandler(async (req, res) => {
  const correction = await punchCorrectionService.requestCorrection(req.user, req.body);
  pushToAdmins({
    title: 'New punch correction',
    body: `${req.user.name} asked to correct the punch for ${correction.date}.`,
    data: { screen: 'corrections' },
  });
  res.status(201).json({ success: true, data: { correction } });
});

export const list = asyncHandler(async (req, res) => {
  const data = await punchCorrectionService.listCorrections({ requester: req.user, ...req.query });
  res.json({ success: true, data });
});

export const approve = asyncHandler(async (req, res) => {
  const correction = await punchCorrectionService.approveCorrection(req.params.id, req.user, req.body.note);
  notifyStaff(correction, 'approved');
  res.json({ success: true, data: { correction } });
});

export const reject = asyncHandler(async (req, res) => {
  const correction = await punchCorrectionService.rejectCorrection(req.params.id, req.user, req.body.note);
  notifyStaff(correction, 'rejected');
  res.json({ success: true, data: { correction } });
});

export const cancel = asyncHandler(async (req, res) => {
  const correction = await punchCorrectionService.cancelCorrection(req.params.id, req.user);
  res.json({ success: true, data: { correction } });
});
