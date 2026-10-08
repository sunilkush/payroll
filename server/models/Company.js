import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  radius: { type: Number, required: true, min: 1 }, // meters
});

const holidaySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
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
