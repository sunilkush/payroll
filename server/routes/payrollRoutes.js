import { Router } from 'express';
import * as payrollController from '../controllers/payrollController.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { idParamSchema } from '../validators/common.js';
import { payrollMonthSchema, payrollQuerySchema, updatePayrollSchema } from '../validators/payrollValidator.js';

const router = Router();
const adminOnly = authorize(ROLES.ADMIN);
const payrollId = validate(idParamSchema, 'params');

router.post('/generate', adminOnly, validate(payrollMonthSchema), payrollController.generate);
router.post('/finalize', adminOnly, validate(payrollMonthSchema), payrollController.finalize);
router.get('/', adminOnly, validate(payrollQuerySchema, 'query'), payrollController.list);
router.get('/export', adminOnly, validate(payrollQuerySchema, 'query'), payrollController.exportExcel);
router.get('/my', authorize(ROLES.STAFF), payrollController.my);

router.patch('/:id', adminOnly, payrollId, validate(updatePayrollSchema), payrollController.update);
// Admin: company ki koi bhi slip. Staff: sirf apni final slip.
router.get('/:id/slip', authorize(ROLES.ADMIN, ROLES.STAFF), payrollId, payrollController.slip);

export default router;
