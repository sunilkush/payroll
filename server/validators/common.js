import Joi from 'joi';

// Kai validators mein use hone wale fields.
export const objectId = Joi.string().hex().length(24);

export const personName = Joi.string().trim().min(2).max(100).label('Name');

export const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).label('Email');

export const phone = Joi.string().trim().pattern(/^[0-9+\-\s]{7,15}$/).allow('').label('Phone').messages({
  'string.pattern.base': 'Phone number valid nahi hai',
});

export const password = Joi.string().min(8).max(72).label('Password');

export const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
};

export const idParamSchema = Joi.object({ id: objectId.required() });
