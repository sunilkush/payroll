import Joi from 'joi';
import { email, pagination, password, personName, phone } from './common.js';

const money = Joi.number().min(0).max(10000000).precision(2);

const digits = (min, max, label, message) =>
  Joi.string().trim().pattern(new RegExp(`^\\d{${min},${max}}$`)).allow('').label(label).messages({
    'string.pattern.base': message,
  });

export const listStaffSchema = Joi.object({
  search: Joi.string().trim().max(100).allow(''),
  status: Joi.string().valid('all', 'active', 'inactive').default('all'),
  // true: sirf wo staff jinhe sales meetings assign ho sakti hain
  salesManager: Joi.boolean(),
  ...pagination,
});

export const createStaffSchema = Joi.object({
  name: personName.required(),
  email: email.required(),
  phone,
  password: password.required(),
  employeeCode: Joi.string().trim().uppercase().max(20).required().label('Employee code'),
  joiningDate: Joi.date().iso().allow(null).label('Joining date'),
  // ESI aur PF ka base alag hota hai, isliye components alag rakhe hain.
  salaryStructure: Joi.object({
    basic: money.required().label('Basic'),
    hra: money.default(0).label('HRA'),
    special: money.default(0).label('Special allowance'),
    other: money.default(0).label('Other'),
  }).required(),
  pfApplicable: Joi.boolean(),
  esiApplicable: Joi.boolean(),
  isSalesManager: Joi.boolean(),
  uan: digits(12, 12, 'UAN', 'UAN must be 12 digits'),
  esicNo: digits(10, 17, 'ESIC number', 'ESIC number must be 10 to 17 digits'),
  bankDetails: Joi.object({
    accountNo: digits(9, 18, 'Account number', 'Account number must be 9 to 18 digits').default(''),
    ifsc: Joi.string().trim().uppercase().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).allow('').default('').label('IFSC').messages({
      'string.pattern.base': 'IFSC is not valid (e.g. SBIN0001234)',
    }),
    bankName: Joi.string().trim().max(100).allow('').default('').label('Bank name'),
  }),
});

// Update mein sab optional hai. password dene par reset ho jata hai.
export const updateStaffSchema = createStaffSchema
  .fork(['name', 'email', 'password', 'employeeCode', 'salaryStructure'], (schema) => schema.optional())
  .min(1);

export const staffStatusSchema = Joi.object({ isActive: Joi.boolean().required() });
