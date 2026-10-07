import Joi from 'joi';
import { email, pagination, phone } from './common.js';

export const listClientsSchema = Joi.object({
  search: Joi.string().trim().max(100).allow(''),
  status: Joi.string().valid('all', 'active', 'inactive').default('all'),
  ...pagination,
});

export const createClientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required().label('Client name'),
  contactPerson: Joi.string().trim().max(100).allow('').label('Contact person'),
  phone,
  email: email.allow(''),
  address: Joi.string().trim().max(300).allow('').label('Address'),
  // Dono saath: ya to location hai ya nahi hai. null bhej kar hata sakte hain.
  lat: Joi.number().min(-90).max(90).allow(null).label('Latitude'),
  lng: Joi.number().min(-180).max(180).allow(null).label('Longitude'),
  notes: Joi.string().trim().max(1000).allow('').label('Notes'),
}).and('lat', 'lng');

export const updateClientSchema = createClientSchema.fork(['name'], (schema) => schema.optional()).min(1);

export const clientStatusSchema = Joi.object({ isActive: Joi.boolean().required() });
