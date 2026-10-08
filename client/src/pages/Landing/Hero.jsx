import { ArrowRightOutlined, CheckCircleFilled, EnvironmentOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import LandingLink from './LandingLink.jsx';
import MockScreen from './MockScreen.jsx';
import Reveal from './Reveal.jsx';
import { LINKS, TRUST } from './landingConfig.js';

// Dashboard ke aas-paas tairte chhote cards (namoone ke ank)
const FLOATS = [
  { className: 'hero__float--one', icon: <EnvironmentOutlined />, value: '94%', label: 'Present today' },
  { className: 'hero__float--two', icon: <WalletOutlined />, value: '₹8.4L', label: 'Payroll this month' },
  { className: 'hero__float--three', icon: <TeamOutlined />, value: '48', label: 'Active staff' },
];

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="landing-container hero__inner">
        <div className="hero__copy">
          <p className="landing-badge">
            <span className="landing-badge__dot" aria-hidden="true" /> Attendance, Leave &amp; Payroll Platform
          </p>
          <h1 className="hero__title">Run Your Entire Workforce From One Powerful Platform</h1>
          <p className="hero__text">
            Track attendance with location, approve leave, run payroll with PF and ESI, and verify field visits — all
            from one simple system your staff can use on their phones.
          </p>
          <div className="hero__actions">
            <LandingLink href={LINKS.signup} className="landing-btn landing-btn--primary landing-btn--lg">
              Start Free <ArrowRightOutlined />
            </LandingLink>
            <LandingLink href={LINKS.demo} className="landing-btn landing-btn--outline landing-btn--lg">
              View Demo
            </LandingLink>
          </div>
          <p className="hero__note">No credit card required • Easy setup • Secure &amp; scalable</p>
        </div>

        <div className="hero__visual">
          <div className="hero__glow" aria-hidden="true" />
          <div className="hero__screen">
            <MockScreen variant="dashboard" />
          </div>
          {FLOATS.map((item) => (
            <div key={item.label} className={`hero__float ${item.className}`} aria-hidden="true">
              <span className="hero__float-icon">{item.icon}</span>
              <span>
                <strong>{item.value}</strong>
                <span className="hero__float-label">{item.label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Hero ke theek neeche: bharose ki chhoti patti
export function TrustSection() {
  return (
    <section className="trust" aria-labelledby="trust-title">
      <Reveal className="landing-container">
        <p id="trust-title" className="trust__title">
          Everything your company needs, in one place.
        </p>
        <ul className="trust__list">
          {TRUST.map((item) => (
            <li key={item.label} className="trust__item">
              <CheckCircleFilled className="trust__check" /> {item.label}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
