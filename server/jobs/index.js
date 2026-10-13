import { scheduleAutoPunchOut } from './autoPunchOut.js';
import { scheduleMarkMissedMeetings } from './markMissedMeetings.js';
import { scheduleMonthlyLeaveCredit } from './monthlyLeaveCredit.js';
import { scheduleSubscriptionReminders } from './subscriptionReminders.js';

// Saare cron jobs yahan se shuru hote hain (server.js DB connect ke baad call karta hai).
export function startJobs() {
  scheduleAutoPunchOut();
  scheduleMonthlyLeaveCredit();
  scheduleMarkMissedMeetings();
  scheduleSubscriptionReminders();
}
