import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

function normalize(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new ApiError(400, 'Validation failed', details);
  }
  if (err instanceof mongoose.Error.CastError) {
    return new ApiError(400, `Invalid ${err.path}`);
  }
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {}).filter((f) => f !== 'companyId');
    const details = fields.map((field) => ({ field, message: 'This is already in use' }));
    return new ApiError(409, `${fields.join(', ') || 'Record'} already exists.`, details);
  }
  if (err.type === 'entity.parse.failed') {
    return new ApiError(400, 'Request body is not valid JSON.');
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const known = normalize(err);
  if (!known) console.error(err);

  const statusCode = known?.statusCode ?? 500;
  res.status(statusCode).json({
    success: false,
    message: known?.message ?? 'Server error. Please try again later.',
    ...(known?.details && { errors: known.details }),
    ...(!known && !env.isProduction && { stack: err.stack }),
  });
};
