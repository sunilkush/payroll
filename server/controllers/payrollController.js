import { writePayrollExcel } from '../services/payrollExportService.js';
import { sendPush } from '../services/pushService.js';
import * as salaryService from '../services/salaryService.js';
import { writeSlipPdf } from '../services/slipService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { monthLabel } from '../utils/dateUtil.js';

const safeName = (value) => String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '');

export const generate = asyncHandler(async (req, res) => {
  const data = await salaryService.generatePayroll(req.body.month, req.user);
  res.json({ success: true, data });
});

export const list = asyncHandler(async (req, res) => {
  const data = await salaryService.listPayroll(req.query.month);
  res.json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const payroll = await salaryService.updatePayroll(req.params.id, req.body);
  res.json({ success: true, data: { payroll } });
});

export const finalize = asyncHandler(async (req, res) => {
  // Jinki draft abhi final ho rahi hai unhi ko "slip aa gayi" (pehle se final walon ko dobara nahi)
  const userIds = await salaryService.draftUserIds(req.body.month);
  const data = await salaryService.finalizePayroll(req.body.month);
  // Push ka intezaar nahi karte (await nahi): jawab turant jata hai.
  sendPush(userIds, {
    title: 'Salary slip ready',
    body: `Your salary slip for ${monthLabel(req.body.month)} is ready. Open the app to view or download it.`,
    data: { screen: 'salary' },
  });
  res.json({ success: true, data });
});

export const my = asyncHandler(async (req, res) => {
  const rows = await salaryService.listMyPayrolls(req.user);
  res.json({ success: true, data: { rows } });
});

export const slip = asyncHandler(async (req, res) => {
  const data = await salaryService.getSlipData(req.params.id, req.user);
  const filename = `salary-slip-${safeName(data.payroll.staff.employeeCode)}-${data.payroll.period}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  writeSlipPdf(data, res);
});

export const exportExcel = asyncHandler(async (req, res) => {
  const data = await salaryService.getExportData(req.query.month);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="payroll-${data.month}.xlsx"`);
  await writePayrollExcel(data, res);
  res.end();
});
