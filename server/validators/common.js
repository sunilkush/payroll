import Joi from 'joi';
import { isValidDateStr } from '../utils/dateUtil.js';

// Kai validators mein use hone wale fields.
export const objectId = Joi.string().hex().length(24);

export const personName = Joi.string().trim().min(2).max(100).label('Name');

export const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).label('Email');

export const phone = Joi.string().trim().pattern(/^[0-9+\-\s]{7,15}$/).allow('').label('Phone').messages({
  'string.pattern.base': 'Phone number is not valid',
});

export const password = Joi.string().min(8).max(72).label('Password');

// 'YYYY-MM-DD' aur asli date (2026-02-30 jaisi nahi).
export const dateStr = Joi.string()
  .custom((value, helpers) => (isValidDateStr(value) ? value : helpers.error('date.invalid')))
  .messages({ 'date.invalid': '{{#label}} is not a valid date' });

// 'HH:mm' (24 ghante), app timezone mein. Khali string ko "diya hi nahi" maante hain.
export const timeStr = Joi.string()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .empty('')
  .messages({ 'string.pattern.base': '{{#label}} must be in HH:mm format' });

export const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
};

export const idParamSchema = Joi.object({ id: objectId.required() });
