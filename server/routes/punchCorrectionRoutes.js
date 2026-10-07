import { Router } from 'express';
import * as punchCorrectionController from '../controllers/punchCorrectionController.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { idParamSchema } from '../validators/common.js';
import {
  correctionActionSchema,
  listCorrectionsSchema,
  requestCorrectionSchema,
} from '../validators/punchCorrectionValidator.js';

const router = Router();
const staffOnly = authorize(ROLES.STAFF);
const adminOnly = authorize(ROLES.ADMIN);
const correctionId = validate(idParamSchema, 'params');
const action = validate(correctionActionSchema);

router.post('/', staffOnly, validate(requestCorrectionSchema), punchCorrectionController.request);
// Staff: apni requests. Admin: company ki saari.
router.get(
  '/',
  authorize(ROLES.ADMIN, ROLES.STAFF),
  validate(listCorrectionsSchema, 'query'),
  punchCorrectionController.list
);

router.patch('/:id/approve', adminOnly, correctionId, action, punchCorrectionController.approve);
router.patch('/:id/reject', adminOnly, correctionId, action, punchCorrectionController.reject);
router.patch('/:id/cancel', staffOnly, correctionId, punchCorrectionController.cancel);

export default router;
