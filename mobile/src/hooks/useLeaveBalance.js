import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getLeaveBalanceApi } from '../api/endpoints';

// GET /leaves/balance, screen par aate hi taaza. balance: { year, CL: { available, pending, used }, EL, lastCreditedMonth }
export function useLeaveBalance() {
  const [state, setState] = useState({ balance: null, error: '', loading: true });

  const load = useCallback(async () => {
    try {
      const res = await getLeaveBalanceApi();
      setState({ balance: res.data.balance, error: '', loading: false });
    } catch (err) {
      setState((previous) => ({ ...previous, error: err.message, loading: false }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { ...state, reload: load };
}
