import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as meetingController from '../controllers/meetingController.js';
import { authorize } from '../middlewares/authorize.js';
import { requireFeature } from '../middlewares/requireFeature.js';
import { validate } from '../middlewares/validate.js';
import { singleFile } from '../services/uploadService.js';
import { ROLES } from '../utils/constants.js';
import { idParamSchema } from '../validators/common.js';
import {
  cancelMeetingSchema,
  checkInSchema,
  checkOutSchema,
  closeFollowUpSchema,
  createMeetingSchema,
  fileParamSchema,
  listFollowUpsSchema,
  listMeetingsSchema,
  qrSentSchema,
  scanSchema,
  updateMeetingSchema,
  visitPhotoSchema,
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
// Dashboard ke cards + aaj ki list. Staff: apni meetings. Admin: company ki.
router.get('/dashboard', adminOrStaff, meetingController.dashboard);
// Excel: list wale hi filters (date, sales manager, client, status, outcome, location). Isi se saari reports banti hain.
router.get('/export', adminOnly, requireFeature('exports'), validate(listMeetingsSchema, 'query'), meetingController.exportExcel);
// Meeting ke baad ke follow-ups. Staff: apne. Admin: company ke saare.
router.get('/follow-ups', adminOrStaff, validate(listFollowUpsSchema, 'query'), meetingController.listFollowUps);
router.get('/:id', adminOrStaff, meetingId, meetingController.getOne);
router.put('/:id', adminOnly, meetingId, validate(updateMeetingSchema), meetingController.update);
router.patch('/:id/cancel', adminOnly, meetingId, validate(cancelMeetingSchema), meetingController.cancel);
router.post('/:id/check-out', staffOnly, meetingId, validate(checkOutSchema), meetingController.checkOut);
router.patch('/:id/follow-up', adminOrStaff, meetingId, validate(closeFollowUpSchema), meetingController.closeFollowUp);

// Visit ka saboot: sales manager visit ke dauran jodta hai; admin aur wahi sales manager dekh sakte hain.
const fileParams = validate(fileParamSchema, 'params');
router.post('/:id/photo', staffOnly, meetingId, singleFile('photo'), validate(visitPhotoSchema), meetingController.uploadPhoto);
router.get('/:id/photo', adminOrStaff, meetingId, meetingController.sendFile);
router.post('/:id/attachments', staffOnly, meetingId, singleFile('file'), meetingController.uploadAttachment);
router.get('/:id/attachments/:fileId', adminOrStaff, fileParams, meetingController.sendFile);
router.delete('/:id/attachments/:fileId', staffOnly, fileParams, meetingController.removeAttachment);

// QR sirf admin ko dikhta hai; sales manager use scan karta hai.
router.get('/:id/qr', adminOnly, meetingId, meetingController.getQr);
router.post('/:id/qr/regenerate', adminOnly, meetingId, meetingController.regenerateQr);
router.post('/:id/qr/sent', adminOnly, meetingId, validate(qrSentSchema), meetingController.markQrSent);

export default router;
