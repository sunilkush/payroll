import { authenticate } from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const auth = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Please log in to continue.');

  const { user, company } = await authenticate(token);
  req.user = user;
  req.company = company; // { _id, name, leaveEnabled } ya Super Admin ke liye null
  next();
});
