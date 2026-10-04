import { Router } from 'express';
import * as leaveController from '../controllers/leaveController.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { idParamSchema } from '../validators/common.js';
import { applyLeaveSchema, leaveActionSchema, listLeavesSchema } from '../validators/leaveValidator.js';

const router = Router();
const staffOnly = authorize(ROLES.STAFF);
const adminOnly = authorize(ROLES.ADMIN);
const leaveId = validate(idParamSchema, 'params');
const action = validate(leaveActionSchema);

router.post('/', staffOnly, validate(applyLeaveSchema), leaveController.apply);
router.get('/balance', staffOnly, leaveController.balance);
// Staff: apni leaves. Admin: company ki saari.
router.get('/', authorize(ROLES.ADMIN, ROLES.STAFF), validate(listLeavesSchema, 'query'), leaveController.list);

router.patch('/:id/approve', adminOnly, leaveId, action, leaveController.approve);
router.patch('/:id/reject', adminOnly, leaveId, action, leaveController.reject);
router.patch('/:id/cancel', staffOnly, leaveId, leaveController.cancel);

export default router;
