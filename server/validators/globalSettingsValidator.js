import Joi from 'joi';

const percent = (label) => Joi.number().min(0).max(100).label(label);
const amount = (label) => Joi.number().min(0).max(10000000).label(label);

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
}).min(1);
