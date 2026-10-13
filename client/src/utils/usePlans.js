import { useEffect, useState } from 'react';
import api from '../api/axiosInstance.js';

// Packages (naam, daam, staff ki hadd, features) aur billing ke niyam server se: Super Admin inhe badalta hai,
// isliye app mein kahin likhe hue nahi hain. Bina login ke milta hai (landing page bhi yahi use karta hai).
// data: { plans: [{ code, name, subtitle, monthlyPrice, staffLimit, features }], billing: { months, gstPercent, trialDays }, featureLabels }
export const getPlansApi = () => api.get('/plans');

// Har plan mein jo cheezein hamesha hoti hain (features ki list se pehle dikhti hain).
const ALWAYS_INCLUDED = ['Staff management', 'Geofenced attendance', 'Dashboard'];

// Plan card ki list: staff ki hadd + hamesha wali cheezein + is plan ke features.
export const planBullets = (plan, featureLabels) => [
  plan.staffLimit ? `Up to ${plan.staffLimit} staff` : 'Unlimited staff',
  ...ALWAYS_INCLUDED,
  ...plan.features.map((feature) => featureLabels[feature] ?? feature),
];

// Dropdown ke liye: "Starter (up to 50 staff)"
export const planOptions = (plans) =>
  plans.map((plan) => ({ value: plan.code, label: `${plan.name} (${plan.staffLimit ? `up to ${plan.staffLimit}` : 'unlimited'} staff)` }));

// Return: { data, error, reload }. data aane tak null.
export function usePlans() {
  const [state, setState] = useState({ data: null, error: '' });

  const reload = () =>
    getPlansApi()
      .then((res) => setState({ data: res.data, error: '' }))
      .catch((err) => setState({ data: null, error: err.message }));

  useEffect(() => {
    reload();
  }, []);

  return { ...state, reload };
}
