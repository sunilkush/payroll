import { useCallback, useEffect, useState } from 'react';
import { getDashboardApi } from '../api/dashboardApi.js';

// Dashboard ka data laata hai. params badalne par (jaise chart ke din) dobara laata hai, aur tab tak
// purana data dikhta rehta hai (poora dashboard skeleton mein nahi jata).
//   data     null jab tak pehli baar na aaye
//   loading  koi request chal rahi hai
//   error    aakhri request fail hui to message
//   reload   dobara try
export function useDashboard(params) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify(params ?? {});

  useEffect(() => {
    let ignore = false;
    setState((previous) => ({ ...previous, loading: true }));
    getDashboardApi(JSON.parse(key))
      .then((res) => !ignore && setState({ data: res.data, loading: false, error: '' }))
      .catch((err) => !ignore && setState((previous) => ({ ...previous, loading: false, error: err.message })));
    return () => {
      ignore = true;
    };
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { ...state, reload };
}
