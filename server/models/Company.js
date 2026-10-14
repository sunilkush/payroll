import mongoose from 'mongoose';
import { COMPANY_PLANS, PLAN_REQUEST_STATUS } from '../utils/constants.js';
import { HOLIDAY_TYPES } from '../utils/holidays.js';

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  radius: { type: Number, required: true, min: 1 }, // meters
});

// Paid holiday. branchIds: company.locations ke _id; khali = saari branches (dekho utils/holidays.js).
// type sirf dikhane / agle saal copy karne ke liye (NATIONAL = har saal usi tarikh).
const holidaySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: HOLIDAY_TYPES, default: 'COMPANY' },
    branchIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
    // Kitne staff rakh sakte hain, ye plan tay karta hai (PLAN_STAFF_LIMIT). Default mein koi hadd nahi.
    plan: { type: String, enum: Object.values(COMPANY_PLANS), default: COMPANY_PLANS.ENTERPRISE },
    // Admin ki upgrade request (ek waqt mein ek). Super Admin manzoor kare to plan badalta hai.
    planRequest: {
      plan: { type: String, enum: Object.values(COMPANY_PLANS) },
      note: { type: String, trim: true },
      // Request ke waqt ka hisaab (dekho subscriptionService.quoteFor): Super Admin ko itna payment lena hai.
      amount: { monthlyPrice: Number, months: Number, subtotal: Number, gstPercent: Number, gst: Number, total: Number },
      status: { type: String, enum: Object.values(PLAN_REQUEST_STATUS) },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      requestedAt: { type: Date },
      decidedAt: { type: Date },
      decisionNote: { type: String, trim: true },
    },
    // Company ne website se khud account banaya (Super Admin ne nahi).
    selfRegistered: { type: Boolean, default: false },
    // GST invoice ke liye kharidne wale ki jaankari (admin payment ke waqt bharta hai)
    billing: { gstin: { type: String, trim: true, uppercase: true }, state: { type: String, trim: true } },
    // Free trial aur paid period (dekho services/subscriptionService.js). Dono khali = koi rok nahi.
    subscription: {
      trialEndsAt: { type: Date },
      paidUntil: { type: Date },
      // Khatam hone se kitne din pehle wale reminders ja chuke: [15, 7, 1]
      remindersSent: { type: [Number], default: undefined },
    },
    locations: { type: [locationSchema], default: [] },
    holidays: { type: [holidaySchema], default: [] },
    settings: {
      pfEnabled: { type: Boolean, default: false },
      esiEnabled: { type: Boolean, default: false },
      clPerMonth: { type: Number, default: 1, min: 0 },
      elPerMonth: { type: Number, default: 1.25, min: 0 },
      pfCapAtCeiling: { type: Boolean, default: true },
      // Leave management ON/OFF. OFF par staff leave use nahi kar sakta aur monthly credit nahi lagta.
      leaveEnabled: { type: Boolean, default: false },
      // Beeti hui dates ki leave apply ho sakti hai ya nahi.
      allowPastLeave: { type: Boolean, default: false },
      // Saal ke end mein CL lapse hoti hai; EL is limit tak agle saal jaati hai.
      elCarryForwardMax: { type: Number, default: 30, min: 0 },
      // Is se kharab (zyada meter) GPS accuracy par punch reject hota hai.
      maxGpsAccuracy: { type: Number, default: 100, min: 1 },
      // Office ka working time. ON ho to attendance mein late aana / jaldi jaana aur kaam ke ghante dikhte hain
      // (sirf jaankari; salary par asar nahi). Time 'HH:mm', app timezone mein.
      workTimeEnabled: { type: Boolean, default: false },
      workStartTime: { type: String, default: '09:30', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
      workEndTime: { type: String, default: '18:30', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
      // Net required working minutes for full-day (default 8h 30m = 510 minutes)
      requiredWorkMinutes: { type: Number, default: 510, min: 60 },
      // Half-day cutoff time (default 16:30 = 4:30 PM)
      halfDayCutoffTime: { type: String, default: '16:30', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
      // Minimum worked minutes required for half-day eligibility (default 255 = 4h 15m)
      halfDayMinMinutes: { type: Number, default: 255, min: 0 },
      // Lunch break duration in minutes (default 30, excluded from working hours)
      lunchBreakMinutes: { type: Number, default: 30, min: 0 },
      // Start ke itne minute baad tak punch in "late" nahi ginta.
      lateGraceMin: { type: Number, default: 10, min: 0 },
      // Sales meetings module ON/OFF (client visit, QR + geofence check-in).
      salesEnabled: { type: Boolean, default: false },
      // Meeting poori karne ke liye visit ki photo zaroori hai ya nahi.
      requireVisitPhoto: { type: Boolean, default: false },
      // Meeting ke start se itne minute pehle se (aur end ke itne minute baad tak) check-in ho sakta hai.
      meetingCheckInGraceMin: { type: Number, default: 30, min: 0 },
      // 0 = Sunday ... 6 = Saturday
      weekOffDays: { type: [Number], default: [0] },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Company name unique hai, case ka fark nahi padta ("Acme" aur "acme" same).
companySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Company = mongoose.model('Company', companySchema);
