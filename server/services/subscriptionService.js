import { env } from '../config/env.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { ROLES } from '../utils/constants.js';
import { sendMail } from './mailService.js';
import { billingTerms, planOf } from './planService.js';
import { sendPush } from './pushService.js';

// Free trial aur paid subscription ki tarikhein. Company par do dates hain:
//   subscription.trialEndsAt  khud register karne par: us din + free trial ke din (Global Settings)
//   subscription.paidUntil    payment (ya Super Admin ke plan manzoor karne) ki tarikh se ek saal; wo haath se bhi badal sakta hai
// Dono mein se jo baad ki ho, company tab tak chalti hai. Uske baad EXPIRED: staff login nahi kar sakta,
// admin sirf Plan & Billing khol sakta hai. Data kabhi delete nahi hota; subscription chalu hote hi sab wapas.
// Jin companies par koi date nahi (Super Admin ki banayi / purani) un par koi rok nahi: status NONE.

const DAY_MS = 24 * 60 * 60 * 1000;
export const SUBSCRIPTION_STATUS = Object.freeze({ NONE: 'NONE', TRIAL: 'TRIAL', ACTIVE: 'ACTIVE', EXPIRED: 'EXPIRED' });

export const trialEnd = (from = new Date()) => new Date(from.getTime() + billingTerms().trialDays * DAY_MS);

// Return: { status, endsAt, daysLeft }. daysLeft: aaj khatam ho raha ho to 1, khatam ho chuka ho to 0.
export function subscriptionOf(company, now = new Date()) {
  const { trialEndsAt, paidUntil } = company.subscription ?? {};
  if (!trialEndsAt && !paidUntil) return { status: SUBSCRIPTION_STATUS.NONE, endsAt: null, daysLeft: null };

  const paid = Boolean(paidUntil && paidUntil > now);
  const endsAt = new Date(Math.max(trialEndsAt ?? 0, paidUntil ?? 0));
  if (endsAt <= now) return { status: SUBSCRIPTION_STATUS.EXPIRED, endsAt, daysLeft: 0 };
  return {
    status: paid ? SUBSCRIPTION_STATUS.ACTIVE : SUBSCRIPTION_STATUS.TRIAL,
    endsAt,
    daysLeft: Math.ceil((endsAt - now) / DAY_MS),
  };
}

// Payment pakki hone (ya Super Admin ke plan manzoor karne) par: usi din se billing ke mahine (Global Settings; aam taur par 12 = ek saal).
// Expiry hamesha payment ki tarikh se ginti hai: trial ya purane period ke bache hue din aage nahi judte.
// Return: $set ke liye changes.
//   start: true (online payment): bina rok wali company (NONE) bhi paid period shuru kar deti hai. Request manzoor
//   hone par aisi company par kuch nahi badalta (us par koi rok hai hi nahi).
export function paidPeriodChange(company, paidAt = new Date(), { start = false } = {}) {
  if (subscriptionOf(company, paidAt).status === SUBSCRIPTION_STATUS.NONE && !start) return {};
  const paidUntil = new Date(paidAt);
  paidUntil.setUTCMonth(paidUntil.getUTCMonth() + billingTerms().months);
  return { 'subscription.paidUntil': paidUntil, 'subscription.remindersSent': [] };
}

// ---------- Payment ka hisaab ----------

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// Plan lene par kitna dena hai. Daam mahine ka dikhta hai, par payment ek saath poore saal ki hoti hai, upar se GST:
//   subtotal = mahine ka daam x mahine        gst = subtotal ka GST %        total = subtotal + gst
// Daam, mahine aur GST % Super Admin tay karta hai (Global Settings; planService).
// Free aur Custom (Enterprise) plan ka koi tay daam nahi: null.
export function quoteFor(plan) {
  const { months, gstPercent } = billingTerms();
  const monthlyPrice = planOf(plan)?.monthlyPrice;
  if (!monthlyPrice) return null;
  const subtotal = round2(monthlyPrice * months);
  const gst = round2((subtotal * gstPercent) / 100);
  return { monthlyPrice, months, subtotal, gstPercent, gst, total: round2(subtotal + gst) };
}

// ---------- Reminders (cron) ----------

const reminderText = (company, daysLeft, trial) =>
  `Your ${trial ? 'free trial' : 'subscription'} for ${company.name} ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. ` +
  'Choose a plan on the Plan & Billing page to keep your team working without a break.';

// Roz ek baar: jin companies ka trial / subscription 15, 7 ya 1 din mein khatam ho raha hai unke admins ko
// email + push. Har padaav ek hi baar jata hai (subscription.remindersSent), cron dobara chale to bhi.
export async function sendSubscriptionReminders(now = new Date()) {
  let sent = 0;
  const filter = { isActive: true, $or: [{ 'subscription.trialEndsAt': { $exists: true } }, { 'subscription.paidUntil': { $exists: true } }] };
  for await (const company of Company.find(filter).cursor()) {
    const { status, daysLeft } = subscriptionOf(company, now);
    if (status === SUBSCRIPTION_STATUS.EXPIRED) continue;
    const done = company.subscription.remindersSent ?? [];
    // Jo padaav aa chuke hain aur abhi nahi bheje: unme se sirf sabse taaza bhejte hain, baaki bheje hue maan lete hain.
    const due = env.reminderDays.filter((days) => daysLeft <= days && !done.includes(days));
    if (!due.length) continue;

    // Pehle nishaan, phir bhejna: do server ek saath chalein to bhi ek hi ko mauka milta hai.
    const claimed = await Company.updateOne(
      { _id: company._id, 'subscription.remindersSent': { $nin: due } },
      { $addToSet: { 'subscription.remindersSent': { $each: due } } }
    );
    if (!claimed.modifiedCount) continue;

    const admins = await User.find({ companyId: company._id, role: ROLES.ADMIN, isActive: true }).select('name email');
    const text = reminderText(company, daysLeft, status === SUBSCRIPTION_STATUS.TRIAL);
    const title = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left on your ${status === SUBSCRIPTION_STATUS.TRIAL ? 'free trial' : 'subscription'}`;
    for (const admin of admins) {
      await sendMail({ to: admin.email, subject: `PayRoster: ${title}`, text: `Hi ${admin.name},\n\n${text}\n\n${env.clientUrl}/admin/billing` }).catch(
        (err) => console.error('[subscription] reminder mail failed:', err.message)
      );
    }
    await sendPush(admins.map((admin) => admin._id), { title, body: text, data: { screen: 'billing' } });
    sent += 1;
  }
  return sent;
}
