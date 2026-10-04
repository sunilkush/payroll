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
