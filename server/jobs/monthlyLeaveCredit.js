import cron from 'node-cron';
import { env } from '../config/env.js';
import { creditMonthlyLeaves } from '../services/leaveService.js';

async function run() {
  try {
    const count = await creditMonthlyLeaves();
    if (count) console.log(`[monthlyLeaveCredit] credited this month's CL/EL to ${count} staff`);
  } catch (err) {
    console.error('[monthlyLeaveCredit] failed:', err.message);
  }
}

// Har mahine ki 1 tarikh, raat 12:05 (APP_TIMEZONE): har active staff ke balance mein
// company settings ke hisaab se CL/EL judta hai.
export function scheduleMonthlyLeaveCredit() {
  cron.schedule('5 0 1 * *', run, { timezone: env.timezone });

  // Server 1 tarikh ko band tha to is mahine ka credit abhi laga do. Ek mahine mein ek hi
  // baar lagta hai (lastCreditedMonth), isliye har restart par chalana safe hai.
  run();
}
