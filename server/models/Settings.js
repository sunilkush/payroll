import mongoose from 'mongoose';

const percent = (value) => ({ type: Number, default: value, min: 0, max: 100 });
const amount = (value) => ({ type: Number, default: value, min: 0 });

// Poore system ki ek hi document (key: 'global'). PF/ESI ke rates aur ceilings yahan rehte hain
// taaki law badle to code na badalna pade (Rule 8). Super Admin inhe badal sakta hai.
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
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);
