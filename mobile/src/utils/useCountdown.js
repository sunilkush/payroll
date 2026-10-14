import { useCallback, useEffect, useState } from 'react';

// "Resend in 0:42" jaisi ulti ginti. Return: { seconds, label ('0:42'), done, restart(seconds) }.
// Khatam hone ka waqt yaad rakhte hain (ginti nahi), taaki app background mein jaye to bhi sahi rahe.
export function useCountdown(initialSeconds = 0) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + initialSeconds * 1000);
  const [now, setNow] = useState(() => Date.now());
  const seconds = Math.max(0, Math.ceil((endsAt - now) / 1000));

  useEffect(() => {
    if (seconds === 0) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [seconds === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const restart = useCallback((nextSeconds) => {
    setNow(Date.now());
    setEndsAt(Date.now() + nextSeconds * 1000);
  }, []);

  return { seconds, label: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, done: seconds === 0, restart };
}
