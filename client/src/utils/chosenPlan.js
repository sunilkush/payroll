import { ROLES, ROLE_HOME } from './roles.js';

// Landing page par chuna hua plan (jaise 'PROFESSIONAL'): register -> email verify -> Plan & Billing tak saath
// chalta hai. Sirf isi tab ke liye (sessionStorage); Billing page use dikha kar hata deta hai.
const KEY = 'payroll_chosen_plan';

export const saveChosenPlan = (plan) => {
  try {
    sessionStorage.setItem(KEY, plan);
  } catch {
    // Storage band ho (private mode) to bhi register chalta rahe; bas seedha Billing nahi khulega.
  }
};

export const getChosenPlan = () => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const clearChosenPlan = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // kuch nahi
  }
};

// Naya account banne / email verify hone ke baad kahan jana hai: plan chuna tha to seedha Plan & Billing
// (wahi plan khula hua), warna role ka home.
export const homeAfterSignup = (user) => {
  const plan = getChosenPlan();
  return plan && user.role === ROLES.ADMIN ? `/admin/billing?plan=${plan}` : ROLE_HOME[user.role];
};
