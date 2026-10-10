import { Router } from 'express';
import * as attendanceController from '../controllers/attendanceController.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { monthlyQuerySchema, punchSchema, reportQuerySchema } from '../validators/attendanceValidator.js';

const router = Router();
const staffOnly = authorize(ROLES.STAFF);
const adminOnly = authorize(ROLES.ADMIN);

router.post('/punch-in', staffOnly, validate(punchSchema), attendanceController.punchIn);
router.post('/punch-out', staffOnly, validate(punchSchema), attendanceController.punchOut);
router.get('/today', staffOnly, attendanceController.today);

router.get('/today-summary', adminOnly, attendanceController.todaySummary);
router.get('/report', adminOnly, validate(reportQuerySchema, 'query'), attendanceController.report);
router.get('/export', adminOnly, validate(reportQuerySchema, 'query'), attendanceController.exportExcel);
// Staff: apna mahina. Admin: ?userId= se kisi staff ka mahina.
router.get(
  '/',
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(monthlyQuerySchema, 'query'),
  attendanceController.monthly
);

export default router;
