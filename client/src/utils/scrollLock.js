import { useEffect } from 'react';

let locks = 0;

// Jab tak active true hai, peeche ka page scroll nahi hota (drawer / modal ke liye).
// Ginti isliye rakhi hai ki ek ke upar doosra khula ho to pehla band hone par lock na hate.
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    locks += 1;
    document.body.classList.add('scroll-locked');
    return () => {
      locks -= 1;
      if (locks === 0) document.body.classList.remove('scroll-locked');
    };
  }, [active]);
}
