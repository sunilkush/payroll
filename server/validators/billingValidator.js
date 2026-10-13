import Joi from 'joi';
import { COMPANY_PLANS } from '../utils/constants.js';

const plan = Joi.string().valid(...Object.values(COMPANY_PLANS)).required().label('Plan');

export const upgradeRequestSchema = Joi.object({
  plan,
  note: Joi.string().trim().max(300).allow('').label('Note'),
});

// GSTIN: 2 ank state code + 10 akshar PAN + 1 entity + 'Z' + 1 check. Khali chhod sakte hain (bina GST wali company).
export const checkoutSchema = Joi.object({
  plan,
  gstin: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/)
    .empty('')
    .label('GSTIN')
    .messages({ 'string.pattern.base': 'GSTIN is not valid' }),
  // Isi se tay hota hai CGST + SGST lagega ya IGST.
  state: Joi.string().trim().min(2).max(60).required().label('State'),
});

// Razorpay Checkout ke baad browser ko jo milta hai, wahi naam.
export const verifyPaymentSchema = Joi.object({
  orderId: Joi.string().trim().max(100).required(),
  paymentId: Joi.string().trim().max(100).required(),
  signature: Joi.string().trim().max(200).required(),
});
