import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { FEATURE_LABEL } from '../utils/constants.js';

const percent = (value) => ({ type: Number, default: value, min: 0, max: 100 });
const amount = (value) => ({ type: Number, default: value, min: 0 });

// Ek package. Plan ka code (FREE, STARTER...) fix hai; baaki sab Super Admin badal sakta hai.
//   monthlyPrice  rupaye / mahina, GST alag. null = "Custom" (online nahi bikta, sales se baat). Free hamesha 0.
//   staffLimit    kitne active staff. null = koi hadd nahi.
//   features      FEATURE_LABEL ke keys (leave, payroll...). Staff, attendance aur dashboard har plan mein hain.
const STARTER_FEATURES = ['leave', 'corrections', 'payroll'];
const PRO_FEATURES = [...STARTER_FEATURES, 'statutory', 'workTime', 'sales', 'exports'];
const plan = (code, { name, subtitle, features }) => ({
  name: { type: String, trim: true, default: name },
  subtitle: { type: String, trim: true, default: subtitle },
  monthlyPrice: { type: Number, default: env.billing.prices[code], min: 0 },
  staffLimit: { type: Number, default: env.planStaffLimit[code], min: 1 },
  features: { type: [{ type: String, enum: Object.keys(FEATURE_LABEL) }], default: () => [...features] },
});

// Poore system ki ek hi document (key: 'global'). PF/ESI ke rates aur ceilings, aur packages (plans) yahan rehte hain
// taaki law ya daam badle to code na badalna pade (Rule 8). Super Admin inhe badal sakta hai.
// Defaults plan ke "current rates" hain, final numbers CA se confirm karne hain.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true, immutable: true },
    payrollDaysBasis: { type: Number, default: 30, min: 1, max: 31 },
    pf: {
      employeeRate: percent(12),
      employerRate: percent(12), // isme se EPS nikal kar baaki EPF mein jata hai
      epsRate: percent(8.33),
      wageCeiling: amount(15000),
      edliRate: percent(0.5),
      adminRate: percent(0.5),
      // Naye Labour Codes: PF wage, earned gross ke is % se kam nahi maani jaati. 0 = ye rule band.
      wageFloorPercent: percent(50),
    },
    esi: {
      employeeRate: percent(0.75),
      employerRate: percent(3.25),
      wageLimit: amount(21000), // monthly gross is se zyada ho to ESI lagu nahi
    },

    // ---- Packages aur billing: Super Admin badalta hai. Yahan ke defaults sirf pehli baar ke liye (.env se).
    billing: {
      months: { type: Number, default: env.billing.months, min: 1, max: 60 }, // payment ek saath itne mahino ki
      gstPercent: percent(env.billing.gstPercent),
      trialDays: { type: Number, default: env.trialDays, min: 0, max: 365 }, // khud register karne wali company ka free trial
    },
    plans: {
      FREE: plan('FREE', { name: 'Free', subtitle: 'For small teams getting started', features: [] }),
      STARTER: plan('STARTER', { name: 'Starter', subtitle: 'For small offices and shops', features: STARTER_FEATURES }),
      PROFESSIONAL: plan('PROFESSIONAL', { name: 'Professional', subtitle: 'For growing companies', features: PRO_FEATURES }),
      ENTERPRISE: plan('ENTERPRISE', { name: 'Enterprise', subtitle: 'For large teams and multiple companies', features: PRO_FEATURES }),
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);
