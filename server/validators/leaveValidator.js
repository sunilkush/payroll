import Joi from 'joi';
import { HALF_DAY_SESSIONS, LEAVE_STATUS, LEAVE_TYPES } from '../utils/constants.js';
import { dateStr, pagination } from './common.js';

export const applyLeaveSchema = Joi.object({
  type: Joi.string().valid(...LEAVE_TYPES).required().label('Leave type'),
  fromDate: dateStr.required().label('From date'),
  toDate: dateStr.required().label('To date'),
  // Khali / na ho to poore din ki leave
  halfDay: Joi.string().valid(...HALF_DAY_SESSIONS).empty('').label('Half day'),
  reason: Joi.string().trim().min(3).max(500).required().label('Reason'),
});

export const listLeavesSchema = Joi.object({
  status: Joi.string().valid('all', ...Object.values(LEAVE_STATUS)).default('all'),
  ...pagination,
});

export const leaveActionSchema = Joi.object({
  note: Joi.string().trim().max(300).allow('').label('Note'),
});
