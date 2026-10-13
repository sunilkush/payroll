import cron from 'node-cron';
import { env } from '../config/env.js';
import { sendSubscriptionReminders } from '../services/subscriptionService.js';

async function run() {
  try {
    const count = await sendSubscriptionReminders();
    if (count) console.log(`[subscriptionReminders] reminded ${count} company(ies)`);
  } catch (err) {
    console.error('[subscriptionReminders] failed:', err.message);
  }
}

// Roz subah 10 baje (APP_TIMEZONE): jin companies ka free trial / subscription 15, 7 ya 1 din mein
// khatam ho raha hai unke admins ko email + push.
export function scheduleSubscriptionReminders() {
  cron.schedule('0 10 * * *', run, { timezone: env.timezone });

  // Server 10 baje band tha to aaj ka reminder abhi. Har padaav ek hi baar jata hai, isliye har restart par chalana safe hai.
  run();
}
