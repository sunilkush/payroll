import { ApiError } from '../utils/ApiError.js';

// Usage: validate(schema) body ke liye, validate(schema, 'query') / 'params' baaki ke liye.
export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      errors: { wrap: { label: false } },
    });
    if (error) {
      const details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
      return next(new ApiError(400, 'Validation failed', details));
    }
    req[source] = value;
    next();
  };
