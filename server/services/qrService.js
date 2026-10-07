import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Sales meeting ka QR. QR ke andar sirf ek token hota hai (koi naam / ID / location nahi).
//
//   token = HMAC(server secret, meeting id + version)
//
// - Secret ke bina token ka andaza nahi lag sakta, aur database mein sirf uska hash rehta hai,
//   isliye DB leak hone par bhi QR nahi ban sakta.
// - Admin ko QR dobara dikhana ho to server token phir se nikal leta hai (kahin save nahi karna padta).
// - version badhate hi (regenerate) naya token banta hai aur purana QR bekaar ho jata hai.

export const meetingToken = (meetingId, version) =>
  crypto.createHmac('sha256', env.qrSecret).update(`${meetingId}:${version}`).digest('base64url');

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// QR tab tak chalta hai jab tak check-in ho sakta hai: meeting ke end + company ka grace.
export const qrExpiry = (endAt, graceMinutes) => new Date(endAt.getTime() + graceMinutes * 60 * 1000);

// Meeting ke `qr` field ke liye values.
export const buildQr = (meetingId, version, endAt, graceMinutes) => ({
  tokenHash: hashToken(meetingToken(meetingId, version)),
  version,
  expiresAt: qrExpiry(endAt, graceMinutes),
});
