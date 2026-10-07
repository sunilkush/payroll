import Joi from 'joi';
import { DEFAULT_MEETING_RADIUS, LOCATION_STATUS, MEETING_OUTCOMES, MEETING_STATUS } from '../utils/constants.js';
import { dateStr, objectId, pagination, phone, timeStr } from './common.js';

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
