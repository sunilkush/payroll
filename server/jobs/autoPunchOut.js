import cron from 'node-cron';
import { env } from '../config/env.js';
import { markMissedPunchOuts } from '../services/attendanceService.js';

async function run(options) {
  try {
    const count = await markMissedPunchOuts(options);
    if (count) console.log(`[autoPunchOut] flagged missedPunchOut on ${count} attendance record(s)`);
  } catch (err) {
    console.error('[autoPunchOut] failed:', err.message);
  }
}

// Roz raat 11:59 baje (APP_TIMEZONE): jinhone punch out nahi kiya unka din PRESENT rehta hai
// aur missedPunchOut: true lag jata hai, taaki admin report mein dekh sake.
export function scheduleAutoPunchOut() {
  cron.schedule('59 23 * * *', () => run({ includeToday: true }), { timezone: env.timezone });

  // Server 11:59 par band tha to pichhle dino ke chhute hue records abhi pakad lo.
  run({ includeToday: false });
}
