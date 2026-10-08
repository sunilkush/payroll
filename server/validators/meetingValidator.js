import Joi from 'joi';
import {
  DEFAULT_MEETING_RADIUS,
  FOLLOW_UP_STATUS,
  LOCATION_STATUS,
  MEETING_OUTCOMES,
  MEETING_STATUS,
} from '../utils/constants.js';
import { dateStr, objectId, pagination, phone, timeStr } from './common.js';

// QR ke andar ka token (base64url). Lambai / akshar yahin jaanch lete hain, taaki kachra DB tak na jaye.
const token = Joi.string().trim().pattern(/^[A-Za-z0-9_-]{20,100}$/).required().label('QR code').messages({
  'string.pattern.base': 'This is not a meeting QR code.',
});
const lat = Joi.number().min(-90).max(90).label('Latitude');
const lng = Joi.number().min(-180).max(180).label('Longitude');
const accuracy = Joi.number().min(0).label('GPS accuracy');

// lat/lng na dein to client ki saved location lagti hai (service mein).
const location = Joi.object({
  name: Joi.string().trim().max(150).allow('').label('Meeting location'),
  address: Joi.string().trim().max(300).allow('').label('Address'),
  lat: Joi.number().min(-90).max(90).label('Latitude'),
  lng: Joi.number().min(-180).max(180).label('Longitude'),
  radius: Joi.number().integer().min(10).max(5000).default(DEFAULT_MEETING_RADIUS).label('Geofence radius'),
}).and('lat', 'lng');

export const createMeetingSchema = Joi.object({
  clientId: objectId.required().label('Client'),
  salesManagerId: objectId.required().label('Sales manager'),
  contactPerson: Joi.string().trim().max(100).allow('').label('Contact person'),
  contactPhone: phone.label('Client phone'),
  title: Joi.string().trim().min(2).max(150).required().label('Meeting title'),
  purpose: Joi.string().trim().max(500).allow('').label('Meeting purpose'),
  notes: Joi.string().trim().max(1000).allow('').label('Notes'),
  date: dateStr.required().label('Meeting date'),
  startTime: timeStr.required().label('Start time'),
  endTime: timeStr.required().label('End time'),
  location: location.default({ radius: DEFAULT_MEETING_RADIUS }),
});

// Update mein sab optional hai, lekin date aur dono time saath aate hain, aur location poori badalti hai.
export const updateMeetingSchema = createMeetingSchema
  .fork(['clientId', 'salesManagerId', 'title', 'date', 'startTime', 'endTime'], (schema) => schema.optional())
  .fork(['location'], () => location)
  .and('date', 'startTime', 'endTime')
  .min(1);

export const listMeetingsSchema = Joi.object({
  search: Joi.string().trim().max(100).allow(''),
  status: Joi.string().valid('all', ...Object.values(MEETING_STATUS)).default('all'),
  from: dateStr.label('From date'),
  to: dateStr.label('To date'),
  salesManagerId: objectId,
  clientId: objectId,
  outcome: Joi.string().valid(...MEETING_OUTCOMES),
  locationStatus: Joi.string().valid(...Object.values(LOCATION_STATUS)),
  ...pagination,
});

export const cancelMeetingSchema = Joi.object({
  reason: Joi.string().trim().max(300).allow('').label('Reason'),
});

// QR sales manager tak kaise pahunchaya (audit ke liye)
export const qrSentSchema = Joi.object({
  channel: Joi.string().valid('share', 'download', 'other').default('other'),
});

export const scanSchema = Joi.object({ token });

// Check-in: QR ka token + phone ki location. Doori aur time server khud nikalta hai.
export const checkInSchema = Joi.object({
  token,
  lat: lat.required(),
  lng: lng.required(),
  accuracy: accuracy.required(),
});

// Check-out + meeting ka nateeja ek saath. Location na mile to bina location ke bhi (server note kar leta hai).
export const checkOutSchema = Joi.object({
  lat,
  lng,
  accuracy,
  result: Joi.object({
    outcome: Joi.string().valid(...MEETING_OUTCOMES).required().label('Meeting outcome'),
    clientInterested: Joi.boolean().allow(null).label('Client interested'),
    requirement: Joi.string().trim().max(1000).allow('').label('Requirement'),
    estimatedDealValue: Joi.number().min(0).max(1e10).precision(2).allow(null).label('Estimated deal value'),
    remarks: Joi.string().trim().max(1000).allow('').label('Remarks'),
    clientFeedback: Joi.string().trim().max(1000).allow('').label('Client feedback'),
  }).required(),
  followUp: Joi.object({
    date: dateStr.empty('').label('Follow-up date'),
    time: timeStr.label('Follow-up time'),
    notes: Joi.string().trim().max(500).allow('').label('Follow-up notes'),
  }).default({}),
}).and('lat', 'lng');

// Visit photo ke saath aane wale fields (multipart mein sab string aate hain; Joi number bana deta hai).
export const visitPhotoSchema = Joi.object({
  lat: lat.empty(''),
  lng: lng.empty(''),
  source: Joi.string().valid('camera', 'upload').default('upload'),
}).and('lat', 'lng');

export const fileParamSchema = Joi.object({ id: objectId.required(), fileId: objectId.required() });

export const listFollowUpsSchema = Joi.object({
  status: Joi.string().valid('all', ...Object.values(FOLLOW_UP_STATUS)).default(FOLLOW_UP_STATUS.PENDING),
  ...pagination,
});

export const closeFollowUpSchema = Joi.object({
  status: Joi.string().valid(FOLLOW_UP_STATUS.DONE, FOLLOW_UP_STATUS.CANCELLED).required(),
});
