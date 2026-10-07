import { Router } from 'express';
import * as meetingController from '../controllers/meetingController.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { idParamSchema } from '../validators/common.js';
import {
  cancelMeetingSchema,
  createMeetingSchema,
  listMeetingsSchema,
  qrSentSchema,
  updateMeetingSchema,
} from '../validators/meetingValidator.js';

const router = Router();
const adminOnly = authorize(ROLES.ADMIN);
const adminOrStaff = authorize(ROLES.ADMIN, ROLES.STAFF);
const meetingId = validate(idParamSchema, 'params');

router.post('/', adminOnly, validate(createMeetingSchema), meetingController.create);
// Staff (sales manager): apni meetings. Admin: company ki saari.
router.get('/', adminOrStaff, validate(listMeetingsSchema, 'query'), meetingController.list);
router.get('/:id', adminOrStaff, meetingId, meetingController.getOne);
router.put('/:id', adminOnly, meetingId, validate(updateMeetingSchema), meetingController.update);
router.patch('/:id/cancel', adminOnly, meetingId, validate(cancelMeetingSchema), meetingController.cancel);

// QR sirf admin ko dikhta hai; sales manager use scan karta hai.
router.get('/:id/qr', adminOnly, meetingId, meetingController.getQr);
router.post('/:id/qr/regenerate', adminOnly, meetingId, meetingController.regenerateQr);
router.post('/:id/qr/sent', adminOnly, meetingId, validate(qrSentSchema), meetingController.markQrSent);

export default router;
