import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { mailEnabled, sendMail } from './mailService.js';

// Account ki do cheezein jo email se chalti hain: email verification (6 ank ka code) aur password reset (link).
// Code / token database mein kabhi seedhe nahi rakhe jate, sirf unka hash.

const CODE_TTL_MIN = 15;
const CODE_MAX_ATTEMPTS = 5;
const RESEND_WAIT_SEC = 60;
const RESET_TTL_MIN = 30;
const APP = 'PayRoster';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
// Code ke saath user ka id bhi, taaki ek user ka hash doosre par na chale.
const hashCode = (user, code) => sha256(`${user._id}:${code}`);

// ---------- Email verification ----------

// Khud register karne wale ko email verify karni hoti hai, lekin tabhi jab email sach mein ja sakti ho.
export const verificationRequired = () => mailEnabled();

// Naya 6 ank ka code banakar email karta hai (purana bekaar ho jata hai).
export async function sendVerificationCode(user) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await User.updateOne(
    { _id: user._id },
    { $set: { emailCode: { hash: hashCode(user, code), expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60000), attempts: 0, sentAt: new Date() } } }
  );
  await sendMail({
    to: user.email,
    subject: `${code} is your ${APP} verification code`,
    text: `Hi ${user.name},\n\nYour ${APP} verification code is: ${code}\n\nIt is valid for ${CODE_TTL_MIN} minutes. If you did not create a ${APP} account, you can ignore this email.`,
  });
}

export async function resendVerificationCode(user) {
  if (user.emailVerified) throw new ApiError(409, 'Your email is already verified.');
  const { emailCode } = await User.findById(user._id).select('+emailCode');
  const waited = emailCode?.sentAt ? (Date.now() - emailCode.sentAt.getTime()) / 1000 : Infinity;
  if (waited < RESEND_WAIT_SEC) {
    throw new ApiError(429, `Please wait ${Math.ceil(RESEND_WAIT_SEC - waited)} seconds before asking for a new code.`);
  }
  await sendVerificationCode(user);
}

// Galat code par ginti badhti hai; 5 galat ke baad naya code maangna padta hai (andaza lagana mushkil rahe).
export async function verifyEmail(user, code) {
  if (user.emailVerified) return user;
  const fresh = await User.findById(user._id).select('+emailCode');
  const saved = fresh.emailCode;
  if (!saved?.hash || saved.expiresAt < new Date()) {
    throw new ApiError(400, 'This code has expired. Ask for a new code.');
  }
  if (saved.attempts >= CODE_MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many wrong attempts. Ask for a new code.');
  }
  if (saved.hash !== hashCode(user, code)) {
    await User.updateOne({ _id: user._id }, { $inc: { 'emailCode.attempts': 1 } });
    throw new ApiError(400, 'That code is not correct.', [{ field: 'code', message: 'That code is not correct.' }]);
  }
  fresh.emailVerified = true;
  fresh.emailCode = undefined;
  await fresh.save();
  return fresh;
}

// ---------- Password reset ----------

// Email par reset link. Jawab hamesha ek jaisa (controller mein), taaki koi ye na jaan sake ki kaun sa email register hai.
export async function requestPasswordReset(email) {
  const user = await User.findOne({ email, isActive: true });
  if (!user) return;
  const token = crypto.randomBytes(32).toString('base64url');
  await User.updateOne(
    { _id: user._id },
    { $set: { passwordReset: { hash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60000) } } }
  );
  await sendMail({
    to: user.email,
    subject: `Reset your ${APP} password`,
    text: `Hi ${user.name},\n\nUse this link to set a new ${APP} password:\n${env.clientUrl}/reset-password?token=${token}\n\nThe link is valid for ${RESET_TTL_MIN} minutes and works once. If you did not ask for this, you can ignore this email; your password stays the same.`,
  });
}

// Link sahi ho to naya password lagta hai. Purane sabhi login (tokens) band ho jate hain,
// aur email bhi verified maan li jati hai (link usi email par gaya tha).
export async function resetPassword(token, password) {
  const user = await User.findOne({ 'passwordReset.hash': sha256(token), 'passwordReset.expiresAt': { $gt: new Date() } });
  if (!user) throw new ApiError(400, 'This reset link is not valid or has expired. Ask for a new one.');
  user.password = password;
  user.passwordChangedAt = new Date();
  user.passwordReset = undefined;
  user.emailVerified = true;
  user.emailCode = undefined;
  await user.save(); // save() se password hash hota hai
}
