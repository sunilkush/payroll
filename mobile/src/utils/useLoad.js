import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

// Screen ka data: tab par aate hi (focus) aur neeche kheenchne par (refresh) taaza aata hai.
// fetcher badle (jaise mahina badla) to bhi dobara chalta hai, isliye use useCallback mein rakho.
export function useLoad(fetcher) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Purani request ka jawab nayi ke baad aaye to use chhod do.
  const latest = useRef(0);

  const run = useCallback(async () => {
    const id = ++latest.current;
    try {
      const result = await fetcher();
      if (id !== latest.current) return;
      setData(result);
      setError('');
      setOffline(false);
    } catch (err) {
      if (id === latest.current) {
        setError(err.message);
        setOffline(!err.status); // status nahi = server tak pahunch hi nahi (network)
      }
    } finally {
      if (id === latest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetcher]);

  useFocusEffect(
    useCallback(() => {
      run();
    }, [run])
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    run();
  }, [run]);

  return { data, error, offline, loading, refreshing, refresh, reload: run };
}
