import Joi from 'joi';
import { objectId, timeStr } from './common.js';

const location = Joi.object({
  _id: objectId, // purani location edit karte waqt
  name: Joi.string().trim().min(2).max(100).required().label('Location name'),
  lat: Joi.number().min(-90).max(90).required().label('Latitude'),
  lng: Joi.number().min(-180).max(180).required().label('Longitude'),
  radius: Joi.number().integer().min(10).max(5000).required().label('Radius'),
});

const holiday = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().label('Date'),
  name: Joi.string().trim().min(2).max(100).required().label('Holiday name'),
});

// Arrays poore replace hote hain. settings ke sirf bheje gaye keys badalte hain.
export const updateSettingsSchema = Joi.object({
  locations: Joi.array().items(location).max(20).unique('name', { ignoreUndefined: true }).messages({
    'array.unique': 'Two locations cannot have the same name',
  }),
  holidays: Joi.array().items(holiday).max(100).unique('date').messages({
    'array.unique': 'Only one holiday is allowed per date',
  }),
  settings: Joi.object({
    pfEnabled: Joi.boolean(),
    esiEnabled: Joi.boolean(),
    pfCapAtCeiling: Joi.boolean(),
    clPerMonth: Joi.number().min(0).max(10).label('CL per month'),
    elPerMonth: Joi.number().min(0).max(10).label('EL per month'),
    leaveEnabled: Joi.boolean(),
    allowPastLeave: Joi.boolean(),
    elCarryForwardMax: Joi.number().min(0).max(365).label('EL carry forward limit'),
    maxGpsAccuracy: Joi.number().integer().min(10).max(1000).label('GPS accuracy limit'),
    workTimeEnabled: Joi.boolean(),
    workStartTime: timeStr.label('Work start time'),
    workEndTime: timeStr.label('Work end time'),
    lateGraceMin: Joi.number().integer().min(0).max(180).label('Late grace'),
    salesEnabled: Joi.boolean(),
    requireVisitPhoto: Joi.boolean(),
    meetingCheckInGraceMin: Joi.number().integer().min(0).max(240).label('Meeting check-in grace'),
    weekOffDays: Joi.array().items(Joi.number().integer().min(0).max(6)).unique().max(6).label('Week off days'),
  }).min(1),
}).min(1);
