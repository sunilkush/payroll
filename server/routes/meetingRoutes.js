import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as meetingController from '../controllers/meetingController.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { idParamSchema } from '../validators/common.js';
import {
  cancelMeetingSchema,
  checkInSchema,
  checkOutSchema,
  createMeetingSchema,
  listMeetingsSchema,
  qrSentSchema,
  scanSchema,
  updateMeetingSchema,
} from '../validators/meetingValidator.js';

const router = Router();
const adminOnly = authorize(ROLES.ADMIN);
const adminOrStaff = authorize(ROLES.ADMIN, ROLES.STAFF);
const staffOnly = authorize(ROLES.STAFF);
const meetingId = validate(idParamSchema, 'params');

// QR token ka andaza lagane ki koshish dheemi pade: ek user 5 minute mein 30 scan (aur 30 check-in).
const tokenLimiter = () =>
  rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 30,
    keyGenerator: (req) => String(req.user._id),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
  });

router.post('/', adminOnly, validate(createMeetingSchema), meetingController.create);
// Staff (sales manager): apni meetings. Admin: company ki saari.
router.get('/', adminOrStaff, validate(listMeetingsSchema, 'query'), meetingController.list);
// Sales manager: QR scan karke meeting kholta hai ('/:id' se pehle, warna "scan" id ban jata).
router.post('/scan', staffOnly, tokenLimiter(), validate(scanSchema), meetingController.scan);
// Check-in: QR ka token + GPS. Doori, geofence aur time server par.
router.post('/check-in', staffOnly, tokenLimiter(), validate(checkInSchema), meetingController.checkIn);
router.get('/:id', adminOrStaff, meetingId, meetingController.getOne);
router.put('/:id', adminOnly, meetingId, validate(updateMeetingSchema), meetingController.update);
router.patch('/:id/cancel', adminOnly, meetingId, validate(cancelMeetingSchema), meetingController.cancel);
router.post('/:id/check-out', staffOnly, meetingId, validate(checkOutSchema), meetingController.checkOut);

// QR sirf admin ko dikhta hai; sales manager use scan karta hai.
router.get('/:id/qr', adminOnly, meetingId, meetingController.getQr);
router.post('/:id/qr/regenerate', adminOnly, meetingId, meetingController.regenerateQr);
router.post('/:id/qr/sent', adminOnly, meetingId, validate(qrSentSchema), meetingController.markQrSent);

export default router;
