import Joi from 'joi';
import { email, password, personName, phone } from './common.js';

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
});

// Free account: ek company aur uska pehla admin.
export const registerSchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(150).required().label('Company name'),
  name: personName.required().label('Your name'),
  email: email.required(),
  phone,
  password: password.required(),
});

export const verifyEmailSchema = Joi.object({
  code: Joi.string().trim().pattern(/^\d{6}$/).required().label('Code').messages({ 'string.pattern.base': 'Enter the 6-digit code.' }),
});

export const forgotPasswordSchema = Joi.object({ email: email.required() });

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(20).max(200).required().label('Reset link'),
  password: password.required(),
});
