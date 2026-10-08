import cron from 'node-cron';
import { env } from '../config/env.js';
import { markMissedMeetings } from '../services/meetingService.js';

async function run() {
  try {
    const count = await markMissedMeetings();
    if (count) console.log(`[markMissedMeetings] marked ${count} meeting(s) as missed`);
  } catch (err) {
    console.error('[markMissedMeetings] failed:', err.message);
  }
}

// Har 10 minute: jin sales meetings ka check-in ka waqt nikal gaya aur check-in nahi hua, wo MISSED.
// (Scan / check-in waqt khud bhi dekhte hain, isliye in 10 minute ke beech koi der se check-in nahi kar sakta;
// ye job sirf status ko sach karta hai taaki list, filter aur Excel mein "Missed" dikhe.)
export function scheduleMarkMissedMeetings() {
  cron.schedule('*/10 * * * *', run, { timezone: env.timezone });

  // Server band tha to us dauran chhooti meetings abhi pakad lo.
  run();
}
