import { useEffect, useState } from 'react';
import { WifiOutlined } from '@ant-design/icons';
import './OfflineBanner.css';

// Internet band hone par upar ek patti. App (PWA) offline khul to jata hai, par data aur punch
// ke liye network chahiye; ye patti wahi batati hai.
export default function OfflineBanner() {
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;
  return (
    <p className="offline-banner" role="status">
      <WifiOutlined aria-hidden="true" />
      You are offline. Data and punch need an internet connection.
    </p>
  );
}
