import { useState } from 'react';
import { ArrowRightOutlined, CheckCircleFilled } from '@ant-design/icons';
import { Tabs } from 'antd';
import LandingLink from './LandingLink.jsx';
import MockScreen from './MockScreen.jsx';
import Reveal from './Reveal.jsx';
import { BENEFITS, FEATURES, SHOWCASE_TABS } from './landingConfig.js';

// Section ka heading: chhota label, bada title, ek line
export function SectionHead({ eyebrow, title, text, id }) {
  return (
    <Reveal className="section-head">
      {eyebrow && <p className="section-head__eyebrow">{eyebrow}</p>}
      <h2 id={id} className="section-head__title">
        {title}
      </h2>
      {text && <p className="section-head__text">{text}</p>}
    </Reveal>
  );
}

export function FeatureGrid() {
  return (
    <section className="landing-section" id="features" aria-labelledby="features-title">
      <div className="landing-container">
        <SectionHead
          id="features-title"
          eyebrow="Features"
          title="Everything You Need to Run Your Workforce"
          text="From the first punch of the day to the salary slip at month end."
        />
        <ul className="feature-grid">
          {FEATURES.map((feature, index) => (
            <Reveal as="li" key={feature.title} className="feature-card" delay={(index % 5) * 60}>
              <span className="feature-card__icon" aria-hidden="true">
                <feature.icon />
              </span>
              <h3 className="feature-card__title">{feature.title}</h3>
              <p className="feature-card__text">{feature.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Tabs (Ant Design) badalne par screen badalti hai; chhoti screen par tabs khud scroll ho jate hain.
export function ProductShowcase() {
  const [active, setActive] = useState(SHOWCASE_TABS[0].key);

  return (
    <section className="landing-section landing-section--tint" id="product" aria-labelledby="product-title">
      <div className="landing-container">
        <SectionHead
          id="product-title"
          eyebrow="Product"
          title="Everything at Your Fingertips"
          text="One clean workspace for the admin, and a simple phone screen for staff."
        />
        <Reveal>
          <Tabs
            centered
            className="showcase__tabs"
            activeKey={active}
            onChange={setActive}
            items={SHOWCASE_TABS.map((tab) => ({ key: tab.key, label: tab.label }))}
          />
          {/* key: tab badalne par halka sa fade dobara chale */}
          <div className="showcase__panel" key={active}>
            <MockScreen variant={active} />
          </div>
          <p className="showcase__note">Real screens from the app, shown with sample data.</p>
        </Reveal>
      </div>
    </section>
  );
}

export function WhyChooseUs() {
  return (
    <section className="landing-section" id="why" aria-labelledby="why-title">
      <div className="landing-container why">
        <Reveal className="why__visual">
          <MockScreen variant="attendance" />
        </Reveal>
        <Reveal className="why__copy" delay={80}>
          <p className="section-head__eyebrow">Why PayRoster</p>
          <h2 id="why-title" className="section-head__title">
            Built for Modern Companies
          </h2>
          <ul className="why__list">
            {BENEFITS.map((benefit) => (
              <li key={benefit}>
                <CheckCircleFilled className="why__check" /> {benefit}
              </li>
            ))}
          </ul>
          <LandingLink href="#features" className="landing-btn landing-btn--link">
            Explore the Platform <ArrowRightOutlined />
          </LandingLink>
        </Reveal>
      </div>
    </section>
  );
}
