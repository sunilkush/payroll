import Joi from 'joi';
import { COMPANY_PLANS } from '../utils/constants.js';

export const upgradeRequestSchema = Joi.object({
  plan: Joi.string().valid(...Object.values(COMPANY_PLANS)).required().label('Plan'),
  note: Joi.string().trim().max(300).allow('').label('Note'),
});
