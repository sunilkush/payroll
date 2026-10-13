import Joi from 'joi';
import { COMPANY_PLANS } from '../utils/constants.js';
import { email, password, personName, phone } from './common.js';

// Mobile app ka banaya hua random id (ek phone = ek id)
const deviceId = Joi.string().trim().min(8).max(100).label('Device id');

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
  // Sirf mobile app bhejta hai: tab login ke saath refresh token bhi milta hai.
  deviceId,
  platform: Joi.string().valid('android', 'ios'),
});

const refreshToken = Joi.string().trim().min(20).max(200).required().label('Refresh token');

export const refreshSchema = Joi.object({ refreshToken });

export const pushTokenSchema = Joi.object({
  deviceId: deviceId.required(),
  pushToken: Joi.string()
    .trim()
    .pattern(/^Expo(nent)?PushToken\[[^\]]+\]$/)
    .required()
    .label('Push token')
    .messages({ 'string.pattern.base': 'Push token is not valid' }),
});

// Free account: ek company aur uska pehla admin.
export const registerSchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(150).required().label('Company name'),
  name: personName.required().label('Your name'),
  email: email.required(),
  phone,
  password: password.required(),
  // Landing page par chuna hua plan: free trial usi plan ke features ke saath chalta hai. Na ho to Free.
  plan: Joi.string().valid(...Object.values(COMPANY_PLANS)).label('Plan'),
});

export const verifyEmailSchema = Joi.object({
  code: Joi.string().trim().pattern(/^\d{6}$/).required().label('Code').messages({ 'string.pattern.base': 'Enter the 6-digit code.' }),
});

export const forgotPasswordSchema = Joi.object({ email: email.required() });

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(20).max(200).required().label('Reset link'),
  password: password.required(),
});
