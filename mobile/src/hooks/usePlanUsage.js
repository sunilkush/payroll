import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getBillingApi, getPlansApi } from '../api/endpoints';

// Admin: plan ka naam (Super Admin badal sakta hai, isliye /plans se), staff ki hadd aur kitne active.
// Return: { usage: { plan, planName, staffLimit (null = koi hadd nahi), activeStaff, full } | null, reload }
export function usePlanUsage() {
  const [usage, setUsage] = useState(null);

  const load = useCallback(async () => {
    try {
      const [billing, plans] = await Promise.all([getBillingApi(), getPlansApi().catch(() => null)]);
      const { plan, staffLimit, activeStaff } = billing.data;
      const planName = plans?.data.plans.find((item) => item.code === plan)?.name ?? plan.charAt(0) + plan.slice(1).toLowerCase();
      setUsage({ plan, planName, staffLimit, activeStaff, full: staffLimit != null && activeStaff >= staffLimit });
    } catch {
      // Chip / card na dikhe to bhi screen chale
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { usage, reload: load };
}
