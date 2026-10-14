import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTodayApi } from '../api/endpoints';

const RESYNC_MS = 60 * 1000;

// GET /attendance/today, screen dikhte waqt har 60 second aur app wapas khulne par dobara.
// serverNow(): server ki ghadi ka abhi (phone ki ghadi aage-peeche ho to bhi), Date header se nikala hua.
// Return: { data, error, loading, refreshing, reload, serverNow }
export function useToday({ resync = true } = {}) {
  const [state, setState] = useState({ data: null, error: '', loading: true, refreshing: false });
  const offset = useRef(0); // server - phone, ms
  const focused = useRef(false);

  const load = useCallback(async ({ pull = false } = {}) => {
    if (pull) setState((previous) => ({ ...previous, refreshing: true }));
    const sentAt = Date.now();
    try {
      const res = await getTodayApi();
      if (res.serverTime) offset.current = Date.parse(res.serverTime) - (sentAt + Date.now()) / 2;
      setState({ data: res.data, error: '', loading: false, refreshing: false });
    } catch (err) {
      // Pehle ka data ho to wahi dikhta rahe; error sirf tab jab kuch hai hi nahi.
      setState((previous) => ({ ...previous, error: err.message, loading: false, refreshing: false }));
    }
  }, []);

  // Screen par aate hi taaza, aur dikhte waqt har minute.
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      load();
      const timer = resync ? setInterval(load, RESYNC_MS) : null;
      return () => {
        focused.current = false;
        if (timer) clearInterval(timer);
      };
    }, [load, resync])
  );

  // App background se wapas aaye (screen pehle se khuli ho) to bhi taaza.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && focused.current) load();
    });
    return () => subscription.remove();
  }, [load]);

  const serverNow = useCallback(() => Date.now() + offset.current, []);
  const reload = useCallback(() => load({ pull: true }), [load]);

  return { ...state, reload, serverNow };
}
