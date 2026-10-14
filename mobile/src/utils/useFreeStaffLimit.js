import { useEffect, useState } from 'react';
import { getPlansApi } from '../api/endpoints';

// Free plan mein kitne active staff: Super Admin badal sakta hai, isliye server (/plans) se.
// Jawab aane tak (ya network na ho to) server ka default 10.
export function useFreeStaffLimit() {
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    let ignore = false;
    getPlansApi()
      .then(({ data }) => {
        const free = data.plans.find((plan) => plan.code === 'FREE');
        if (!ignore && free?.staffLimit) setLimit(free.staffLimit);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  return limit;
}
