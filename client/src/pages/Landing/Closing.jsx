import { ArrowRightOutlined } from '@ant-design/icons';
import { Collapse } from 'antd';
import { APP_NAME } from '../../utils/appInfo.js';
import { SectionHead } from './Features.jsx';
import LandingLink from './LandingLink.jsx';
import Reveal from './Reveal.jsx';
import { CONTACT_EMAIL, FAQS, FOOTER, LINKS } from './landingConfig.js';

export function Faq() {
  return (
    <section className="landing-section landing-section--tint" id="faq" aria-labelledby="faq-title">
      <div className="landing-container landing-container--narrow">
        <SectionHead id="faq-title" eyebrow="FAQ" title="Questions, Answered" />
        <Reveal>
          {/* accordion: ek waqt mein ek hi sawaal khula */}
          <Collapse
            accordion
            bordered={false}
            expandIconPosition="end"
            className="faq"
            items={FAQS.map((item, index) => ({ key: String(index), label: item.q, children: <p>{item.a}</p> }))}
          />
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="final-cta" aria-labelledby="cta-title">
      <Reveal className="landing-container final-cta__inner">
        <h2 id="cta-title" className="final-cta__title">
          Ready to Simplify Your Workforce?
        </h2>
        <p className="final-cta__text">Start managing attendance, leave and payroll smarter, faster and with less effort.</p>
        <div className="final-cta__actions">
          <LandingLink href={LINKS.signup} className="landing-btn landing-btn--light landing-btn--lg">
            Start Free <ArrowRightOutlined />
          </LandingLink>
          <LandingLink href={LINKS.contact} className="landing-btn landing-btn--glass landing-btn--lg">
            Book a Demo
          </LandingLink>
        </div>
        <p className="final-cta__note">No credit card required.</p>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="landing-footer" id="contact">
      <div className="landing-container">
        <div className="landing-footer__top">
          <div className="landing-footer__about">
            <span className="landing-brand landing-brand--light">
              <span className="landing-brand__mark" aria-hidden="true">
                P
              </span>
              {APP_NAME}
            </span>
            <p>Attendance, leave and payroll for your company, in one simple platform.</p>
            {CONTACT_EMAIL && (
              <p>
                Sales and support: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
            )}
          </div>
          {FOOTER.map((column) => (
            <nav key={column.title} className="landing-footer__column" aria-label={column.title}>
              <p className="landing-footer__heading">{column.title}</p>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <LandingLink href={link.href}>{link.label}</LandingLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="landing-footer__bottom">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
