import Joi from 'joi';
import { FEATURE_LABEL } from '../utils/constants.js';

const percent = (label) => Joi.number().min(0).max(100).label(label);
const amount = (label) => Joi.number().min(0).max(10000000).label(label);

// Ek package. Code fix hai, baaki sab Super Admin badal sakta hai.
//   monthlyPrice: null = "Custom" (online nahi bikta)   staffLimit: null = koi hadd nahi
const plan = Joi.object({
  name: Joi.string().trim().min(2).max(40).label('Plan name'),
  subtitle: Joi.string().trim().max(120).allow('').label('Subtitle'),
  monthlyPrice: amount('Monthly price').allow(null),
  staffLimit: Joi.number().integer().min(1).max(1000000).allow(null).label('Staff limit'),
  features: Joi.array().items(Joi.string().valid(...Object.keys(FEATURE_LABEL))).unique().label('Features'),
}).min(1);

export const updateGlobalSettingsSchema = Joi.object({
  payrollDaysBasis: Joi.number().integer().min(1).max(31).label('Payroll days basis'),
  pf: Joi.object({
    employeeRate: percent('PF employee rate'),
    employerRate: percent('PF employer rate'),
    epsRate: percent('EPS rate'),
    wageCeiling: amount('PF wage ceiling'),
    edliRate: percent('EDLI rate'),
    adminRate: percent('PF admin rate'),
    wageFloorPercent: percent('PF wage floor'),
  }).min(1),
  esi: Joi.object({
    employeeRate: percent('ESI employee rate'),
    employerRate: percent('ESI employer rate'),
    wageLimit: amount('ESI wage limit'),
  }).min(1),
  billing: Joi.object({
    months: Joi.number().integer().min(1).max(60).label('Billing months'),
    gstPercent: percent('GST'),
    trialDays: Joi.number().integer().min(0).max(365).label('Free trial days'),
  }).min(1),
  plans: Joi.object({
    // Free ka daam hamesha 0 hai, isliye use badalne nahi dete.
    FREE: plan.keys({ monthlyPrice: Joi.forbidden() }),
    STARTER: plan,
    PROFESSIONAL: plan,
    ENTERPRISE: plan,
  }).min(1),
}).min(1);
