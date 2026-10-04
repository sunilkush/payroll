import Joi from 'joi';
import { LEAVE_STATUS, LEAVE_TYPES } from '../utils/constants.js';
import { isValidDateStr } from '../utils/dateUtil.js';
import { pagination } from './common.js';

const dateStr = Joi.string()
  .custom((value, helpers) => (isValidDateStr(value) ? value : helpers.error('date.invalid')))
  .messages({ 'date.invalid': '{{#label}} valid date nahi hai' });

export const applyLeaveSchema = Joi.object({
  type: Joi.string().valid(...LEAVE_TYPES).required().label('Leave type'),
  fromDate: dateStr.required().label('From date'),
  toDate: dateStr.required().label('To date'),
  reason: Joi.string().trim().min(3).max(500).required().label('Reason'),
});

export const listLeavesSchema = Joi.object({
  status: Joi.string().valid('all', ...Object.values(LEAVE_STATUS)).default('all'),
  ...pagination,
});

export const leaveActionSchema = Joi.object({
  note: Joi.string().trim().max(300).allow('').label('Note'),
});
