// PF aur ESI ka hisaab. Saare rates/ceilings bahar se (Global Settings) aate hain, yahan
// koi number hardcode nahi hai. Ye pure functions hain: DB ko haath nahi lagate.

export const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const percentOf = (amount, rate) => round2((amount * rate) / 100);

const NO_PF = Object.freeze({ wage: 0, employee: 0, employerEpf: 0, employerEps: 0, edli: 0, admin: 0 });
const NO_ESI = Object.freeze({ covered: false, employee: 0, employer: 0 });

// PF (EPF). rates = Global Settings ka pf object.
// - Base: earned Basic (attendance ke hisaab se). Naye Labour Codes ke hisaab se ye earned gross ke
//   wageFloorPercent se kam nahi maana jata.
// - capAtCeiling ON ho to wage ceiling par ruk jata hai, warna actual par.
// - Employer ka hissa: pehle EPS (hamesha ceiling tak ke wage par), baaki EPF mein.
// - EDLI aur admin charges employer ke extra hain (sirf report ke liye).
// Contributions nearest rupee mein round hote hain.
export function calculatePf({ enabled, earnedBasic, earnedGross, capAtCeiling, rates }) {
  if (!enabled) return { ...NO_PF };

  let wage = Math.max(earnedBasic, percentOf(earnedGross, rates.wageFloorPercent));
  if (capAtCeiling) wage = Math.min(wage, rates.wageCeiling);
  wage = Math.round(wage);
  const wageUptoCeiling = Math.min(wage, rates.wageCeiling);

  const employee = Math.round(percentOf(wage, rates.employeeRate));
  const employerTotal = Math.round(percentOf(wage, rates.employerRate));
  const employerEps = Math.min(Math.round(percentOf(wageUptoCeiling, rates.epsRate)), employerTotal);

  return {
    wage,
    employee,
    employerEps,
    employerEpf: employerTotal - employerEps,
    edli: Math.round(percentOf(wageUptoCeiling, rates.edliRate)),
    admin: Math.round(percentOf(wage, rates.adminRate)),
  };
}

// ESI. rates = Global Settings ka esi object.
// - Lagu tab jab poore mahine ka gross wage limit ke andar ho.
// - coveredInPeriod: isi contribution period mein pehle ESI kat chuka ho to period ke end tak
//   chalta rehta hai, salary limit se upar chali jaye to bhi.
// - Contribution earned gross par lagta hai aur agle poore rupee tak round up hota hai.
export function calculateEsi({ enabled, monthlyGross, earnedGross, coveredInPeriod, rates }) {
  const covered = enabled && (monthlyGross <= rates.wageLimit || coveredInPeriod);
  if (!covered) return { ...NO_ESI };

  return {
    covered: true,
    employee: Math.ceil(percentOf(earnedGross, rates.employeeRate)),
    employer: Math.ceil(percentOf(earnedGross, rates.employerRate)),
  };
}

// ESI contribution periods: April-September aur October-March.
// '2027-02' -> '2026-10' (us period ka pehla mahina)
export function contributionPeriodStart(month) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5));
  if (monthNumber >= 4 && monthNumber <= 9) return `${year}-04`;
  return monthNumber >= 10 ? `${year}-10` : `${year - 1}-10`;
}
