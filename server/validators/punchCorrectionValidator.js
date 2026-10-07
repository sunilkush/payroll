import Joi from 'joi';
import { CORRECTION_STATUS } from '../utils/constants.js';
import { dateStr, pagination, timeStr as time } from './common.js';

export const requestCorrectionSchema = Joi.object({
  date: dateStr.required().label('Date'),
  punchIn: time.label('Punch in time'),
  punchOut: time.label('Punch out time'),
  reason: Joi.string().trim().min(3).max(500).required().label('Reason'),
})
  .or('punchIn', 'punchOut')
  .messages({ 'object.missing': 'Enter the punch in time, the punch out time, or both.' });

export const listCorrectionsSchema = Joi.object({
  status: Joi.string().valid('all', ...Object.values(CORRECTION_STATUS)).default('all'),
  ...pagination,
});

export const correctionActionSchema = Joi.object({
  note: Joi.string().trim().max(300).allow('').label('Note'),
});
