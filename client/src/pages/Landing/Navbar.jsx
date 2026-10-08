import { useState } from 'react';
import { CloseOutlined, MenuOutlined } from '@ant-design/icons';
import { Button, Drawer } from 'antd';
import { APP_NAME } from '../../utils/appInfo.js';
import LandingLink from './LandingLink.jsx';
import { LINKS, NAV } from './landingConfig.js';
import { useScrolled } from './landingHooks.js';

// Upar chipka rehne wala navbar. Scroll karte hi halka dhundhla (sheeshe jaisa) ho jata hai.
// 992px se chhoti screen par links ek drawer mein.
export default function Navbar() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className={`landing-nav${scrolled ? ' landing-nav--scrolled' : ''}`}>
      <div className="landing-container landing-nav__inner">
        <LandingLink href="#top" className="landing-brand" aria-label={`${APP_NAME} home`}>
          <span className="landing-brand__mark" aria-hidden="true">
            P
          </span>
          {APP_NAME}
        </LandingLink>

        <nav className="landing-nav__links" aria-label="Main">
          {NAV.map((item) => (
            <LandingLink key={item.href} href={item.href} className="landing-nav__link">
              {item.label}
            </LandingLink>
          ))}
        </nav>

        <div className="landing-nav__actions">
          <LandingLink href={LINKS.login} className="landing-btn landing-btn--ghost landing-nav__login">
            Login
          </LandingLink>
          <LandingLink href={LINKS.signup} className="landing-btn landing-btn--primary">
            Get Started
          </LandingLink>
          <Button
            type="text"
            className="landing-nav__toggle"
            aria-label="Open menu"
            aria-expanded={open}
            icon={<MenuOutlined />}
            onClick={() => setOpen(true)}
          />
        </div>
      </div>

      <Drawer rootClassName="landing-drawer" open={open} onClose={close} placement="right" size={300} title={null} closable={false} aria-label="Menu">
        <div className="landing-drawer__head">
          <span className="landing-brand">
            <span className="landing-brand__mark" aria-hidden="true">
              P
            </span>
            {APP_NAME}
          </span>
          <Button type="text" aria-label="Close menu" icon={<CloseOutlined />} onClick={close} />
        </div>
        <nav className="landing-drawer__links" aria-label="Menu">
          {NAV.map((item) => (
            <LandingLink key={item.href} href={item.href} className="landing-drawer__link" onNavigate={close}>
              {item.label}
            </LandingLink>
          ))}
        </nav>
        <div className="landing-drawer__actions">
          <LandingLink href={LINKS.login} className="landing-btn landing-btn--outline landing-btn--block" onNavigate={close}>
            Login
          </LandingLink>
          <LandingLink href={LINKS.signup} className="landing-btn landing-btn--primary landing-btn--block" onNavigate={close}>
            Get Started
          </LandingLink>
        </div>
      </Drawer>
    </header>
  );
}
