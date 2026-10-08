import Joi from 'joi';
import { COMPANY_PLANS } from '../utils/constants.js';
import { email, idParamSchema, objectId, pagination, password, personName, phone } from './common.js';

const adminFields = {
  name: personName.required(),
  email: email.required(),
  phone,
  password: password.required(),
};

const companyFields = {
  name: Joi.string().trim().min(2).max(150).label('Company name'),
  address: Joi.string().trim().max(500).allow('').label('Address'),
};

export const companyIdParamSchema = idParamSchema;
export const adminIdParamSchema = Joi.object({ id: objectId.required(), adminId: objectId.required() });

export const listCompaniesSchema = Joi.object({
  search: Joi.string().trim().max(100).allow(''),
  status: Joi.string().valid('all', 'active', 'blocked', 'upgrade').default('all'),
  ...pagination,
});

export const createCompanySchema = Joi.object({
  name: companyFields.name.required(),
  address: companyFields.address,
  admin: Joi.object(adminFields), // optional: company ke saath pehla admin bhi ban jata hai
});

export const updateCompanySchema = Joi.object({
  ...companyFields,
  plan: Joi.string().valid(...Object.values(COMPANY_PLANS)).label('Plan'),
}).min(1);

export const companyStatusSchema = Joi.object({ isActive: Joi.boolean().required() });

export const createAdminSchema = Joi.object(adminFields);

export const updateAdminSchema = Joi.object({
  name: personName,
  phone,
  isActive: Joi.boolean(),
  password, // reset password
}).min(1);

export const planRequestDecisionSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  note: Joi.string().trim().max(300).allow('').label('Note'),
});
