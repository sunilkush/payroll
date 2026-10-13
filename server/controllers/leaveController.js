import * as leaveService from '../services/leaveService.js';
import { pushToAdmins, sendPush } from '../services/pushService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Push notification ka intezaar nahi karte (await nahi): jawab turant jata hai.
const dates = (leave) => (leave.fromDate === leave.toDate ? leave.fromDate : `${leave.fromDate} to ${leave.toDate}`);

const notifyStaff = (leave, verb) =>
  sendPush([leave.userId], {
    title: `Leave ${verb}`,
    body: `Your ${leave.type} leave for ${dates(leave)} was ${verb}.`,
    data: { screen: 'leaves' },
  });

export const apply = asyncHandler(async (req, res) => {
  const data = await leaveService.applyLeave(req.user, req.body);
  pushToAdmins({
    title: 'New leave request',
    body: `${req.user.name} asked for ${data.leave.type} leave: ${dates(data.leave)}.`,
    data: { screen: 'leaves' },
  });
  res.status(201).json({ success: true, data });
});

export const list = asyncHandler(async (req, res) => {
  const data = await leaveService.listLeaves({ requester: req.user, ...req.query });
  res.json({ success: true, data });
});

export const balance = asyncHandler(async (req, res) => {
  const data = await leaveService.getBalance(req.user);
  res.json({ success: true, data: { balance: data } });
});

export const approve = asyncHandler(async (req, res) => {
  const leave = await leaveService.approveLeave(req.params.id, req.user, req.body.note);
  notifyStaff(leave, 'approved');
  res.json({ success: true, data: { leave } });
});

export const reject = asyncHandler(async (req, res) => {
  const leave = await leaveService.rejectLeave(req.params.id, req.user, req.body.note);
  notifyStaff(leave, 'rejected');
  res.json({ success: true, data: { leave } });
});

export const cancel = asyncHandler(async (req, res) => {
  const leave = await leaveService.cancelLeave(req.params.id, req.user);
  res.json({ success: true, data: { leave } });
});
