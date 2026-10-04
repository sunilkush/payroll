import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign({ role: user.role, companyId: user.companyId ?? null }, env.jwtSecret, {
    subject: String(user._id),
    expiresIn: env.jwtExpiresIn,
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);
