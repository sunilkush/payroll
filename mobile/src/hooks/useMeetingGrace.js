import { useEffect, useState } from 'react';
import { getSettingsApi } from '../api/endpoints';

// Admin: check-in kitne minute pehle khulta / baad tak chalta hai (company ki setting, sab meetings par ek). Default 30.
export function useMeetingGrace() {
  const [grace, setGrace] = useState(30);
  useEffect(() => {
    let ignore = false;
    getSettingsApi()
      .then(({ data }) => {
        const value = data.company?.settings?.meetingCheckInGraceMin;
        if (!ignore && typeof value === 'number') setGrace(value);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);
  return grace;
}
