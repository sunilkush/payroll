import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { DeviceSession } from '../models/DeviceSession.js';
import { ApiError } from '../utils/ApiError.js';

// Mobile app ke lambe login: refresh token (database mein sirf hash) aur phone ka push token.

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const newToken = () => crypto.randomBytes(48).toString('base64url');
const expiry = () => new Date(Date.now() + env.refreshTokenDays * 24 * 60 * 60 * 1000);

// Login par: is phone ka session banata hai (usi phone se dobara login ho to purana badal jata hai).
export async function startSession(user, { deviceId, platform }) {
  const refreshToken = newToken();
  await DeviceSession.findOneAndUpdate(
    { userId: user._id, deviceId },
    { $set: { platform, refreshHash: sha256(refreshToken), expiresAt: expiry(), lastUsedAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  return refreshToken;
}

// Purana refresh token dekar naya leta hai. Ek hi update mein hota hai, isliye ek token do baar nahi chalta.
// Return: { session, refreshToken }
export async function rotateSession(refreshToken) {
  const next = newToken();
  const session = await DeviceSession.findOneAndUpdate(
    { refreshHash: sha256(refreshToken), expiresAt: { $gt: new Date() } },
    { $set: { refreshHash: sha256(next), expiresAt: expiry(), lastUsedAt: new Date() } },
    { new: true }
  );
  if (!session) throw new ApiError(401, 'Your session has expired. Please log in again.');
  return { session, refreshToken: next };
}

// Logout: token pehchana na jaye to bhi chup-chaap theek (phone par logout hamesha ho jana chahiye).
export const endSession = (refreshToken) => DeviceSession.deleteOne({ refreshHash: sha256(refreshToken) });

// Password badalne ya account band hone par us user ke saare phone logout.
export const endAllSessions = (userId) => DeviceSession.deleteMany({ userId });

// Phone ka push token. Ek token ek hi session par rehta hai: usi phone par pehle koi aur user
// login tha to uske session se hata dete hain, warna uski notifications is user ko dikhtin.
export async function savePushToken(user, { deviceId, pushToken }) {
  await DeviceSession.updateMany({ pushToken, userId: { $ne: user._id } }, { $unset: { pushToken: 1 } });
  const result = await DeviceSession.updateOne({ userId: user._id, deviceId }, { $set: { pushToken } });
  if (!result.matchedCount) throw new ApiError(404, 'This device is not logged in.');
}
