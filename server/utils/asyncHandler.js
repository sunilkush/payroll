// Async controller/middleware ke errors ko central errorHandler tak pahunchata hai.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
