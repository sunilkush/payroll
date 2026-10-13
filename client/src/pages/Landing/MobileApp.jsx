import { useEffect, useState } from 'react';
import { AndroidFilled, AppleFilled, CheckCircleFilled } from '@ant-design/icons';
import api from '../../api/axiosInstance.js';
import PhoneMock from './PhoneMock.jsx';
import Reveal from './Reveal.jsx';
import { APP_POINTS } from './landingConfig.js';

// Mobile app ka section: phone ke screens + app kya karta hai + store ke links.
// Store ke links server se aate hain (server/.env: MOBILE_ANDROID_URL / MOBILE_IOS_URL). Jo link set nahi hai
// uska button nahi dikhta; dono na hon to "coming soon" likha aata hai (jhootha "download" nahi).
export function MobileAppSection() {
  const [stores, setStores] = useState({ androidUrl: '', iosUrl: '' });

  useEffect(() => {
    api
      .get('/app/config')
      .then((res) => setStores(res.data))
      .catch(() => {}); // server tak pahunch na ho to bas links nahi dikhte
  }, []);

  const hasStore = Boolean(stores.androidUrl || stores.iosUrl);

  return (
    <section className="landing-section" id="app" aria-labelledby="app-title">
      <div className="landing-container app">
        <Reveal className="app__copy">
          <p className="section-head__eyebrow">Mobile App</p>
          <h2 id="app-title" className="section-head__title">
            Your Office in Every Pocket
          </h2>
          <p className="section-head__text">
            PayRoster also comes as a mobile app for Android and iPhone. Staff punch in from the office gate; admins
            approve requests from anywhere.
          </p>
          <ul className="why__list">
            {APP_POINTS.map((point) => (
              <li key={point}>
                <CheckCircleFilled className="why__check" /> {point}
              </li>
            ))}
          </ul>
          <div className="app__stores">
            {stores.androidUrl && (
              <a href={stores.androidUrl} className="landing-btn landing-btn--primary" target="_blank" rel="noreferrer">
                <AndroidFilled /> Get it on Google Play
              </a>
            )}
            {stores.iosUrl && (
              <a href={stores.iosUrl} className="landing-btn landing-btn--outline" target="_blank" rel="noreferrer">
                <AppleFilled /> Download on the App Store
              </a>
            )}
            {!hasStore && (
              <p className="app__soon">
                <AndroidFilled /> <AppleFilled /> Coming soon to Google Play and the App Store. Until then the same
                screens work in your phone browser.
              </p>
            )}
          </div>
        </Reveal>

        <Reveal className="app__phones" delay={80}>
          <PhoneMock variant="punch" />
          <PhoneMock variant="leave" />
          <PhoneMock variant="approvals" />
        </Reveal>
      </div>
    </section>
  );
}
