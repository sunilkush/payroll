import Joi from 'joi';
import { currentMonth } from '../utils/dateUtil.js';
import { objectId } from './common.js';

export const punchSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required().label('Latitude'),
  lng: Joi.number().min(-180).max(180).required().label('Longitude'),
  accuracy: Joi.number().min(0).required().label('GPS accuracy'),
  // Sirf offline punch par (mobile app): punch ka asli waqt, ISO format. Na ho to server ka abhi ka time.
  clientTime: Joi.date().iso().label('Punch time'),
});

const month = Joi.string()
  .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
  .default(() => currentMonth())
  .label('Month')
  .messages({ 'string.pattern.base': 'Month must be in YYYY-MM format' });

export const monthlyQuerySchema = Joi.object({ month, userId: objectId });

export const reportQuerySchema = Joi.object({ month });
