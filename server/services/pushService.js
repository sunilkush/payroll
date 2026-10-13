import { env } from '../config/env.js';
import { DeviceSession } from '../models/DeviceSession.js';
import { User } from '../models/User.js';
import { ROLES } from '../utils/constants.js';

// Mobile app ko push notification. Expo ki push service se jati hai (wo aage FCM / APNs ko deti hai),
// isliye server par Firebase ka koi key nahi chahiye. Tests mein kahin nahi jati, `pushOutbox` mein jama hoti hai.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100; // Expo ek request mein itne hi message leta hai

export const pushOutbox = []; // sirf tests ke liye: [{ to, title, body, data }]

async function deliver(messages) {
  if (env.nodeEnv === 'test') {
    pushOutbox.push(...messages);
    return;
  }
  for (let start = 0; start < messages.length; start += BATCH) {
    const batch = messages.slice(start, start + BATCH);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    if (!response.ok) throw new Error(`Expo push service answered ${response.status}`);
    const { data: tickets = [] } = await response.json();
    // App uninstall ho chuka ho to token bekaar hai: use hata do taaki dobara na bhejein.
    const dead = batch.filter((_, index) => tickets[index]?.details?.error === 'DeviceNotRegistered').map((message) => message.to);
    if (dead.length) await DeviceSession.updateMany({ pushToken: { $in: dead } }, { $unset: { pushToken: 1 } });
  }
}

// In users ke saare logged-in phones par notification. Request ko kabhi fail nahi karta, na rokta hai:
// notification na jaye to bhi leave / correction ka kaam ho chuka hota hai.
// data: app ke liye extra (jaise { screen: 'leaves' }).
export async function sendPush(userIds, { title, body, data = {} }) {
  try {
    const sessions = await DeviceSession.find({ userId: { $in: userIds }, pushToken: { $exists: true } }).select('pushToken');
    if (!sessions.length) return;
    await deliver(sessions.map(({ pushToken }) => ({ to: pushToken, title, body, data, sound: 'default', channelId: 'default' })));
  } catch (err) {
    console.error('[push] failed:', err.message);
  }
}

// Company ke saare active admins ko. Tenant context ke andar chalta hai, isliye sirf isi company ke admin milte hain.
export async function pushToAdmins(message) {
  try {
    const admins = await User.find({ role: ROLES.ADMIN, isActive: true }).select('_id');
    await sendPush(admins.map((admin) => admin._id), message);
  } catch (err) {
    console.error('[push] failed:', err.message);
  }
}
