import { useState } from 'react';
import { CheckOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import { SectionHead } from './Features.jsx';
import LandingLink from './LandingLink.jsx';
import Reveal from './Reveal.jsx';
import { PLANS, YEARLY_DISCOUNT_PERCENT } from './landingConfig.js';

const rupees = (amount) => `₹${amount.toLocaleString('en-IN')}`;

// Ek plan ka card. Daam aur bachat PLANS (landingConfig.js) se hi nikalte hain, yahan kuch likha hua nahi hai.
export function PricingCard({ plan, yearly }) {
  const custom = plan.monthlyPrice === null;
  // Saal wale mein bhi "per month" dikhate hain (saal ka kul / 12), neeche saal ka kul aur bachat.
  const perMonth = custom ? null : yearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
  const saving = custom ? 0 : plan.monthlyPrice * 12 - plan.yearlyPrice;

  return (
    <article className={`plan${plan.popular ? ' plan--popular' : ''}`} aria-label={`${plan.name} plan`}>
      {plan.popular && <span className="plan__badge">Most Popular</span>}
      <h3 className="plan__name">{plan.name}</h3>
      <p className="plan__subtitle">{plan.subtitle}</p>

      <p className="plan__price">
        {custom ? (
          <span className="plan__amount">Custom</span>
        ) : (
          <>
            {/* key: toggle par daam halke se badle */}
            <span className="plan__amount" key={perMonth}>
              {rupees(perMonth)}
            </span>
            <span className="plan__period"> / month</span>
          </>
        )}
      </p>
      <p className="plan__billing">
        {custom && 'Tailored to your team'}
        {!custom && plan.monthlyPrice === 0 && 'Free forever'}
        {!custom && plan.monthlyPrice > 0 && (yearly ? `${rupees(plan.yearlyPrice)} billed yearly · save ${rupees(saving)}` : 'Billed monthly')}
      </p>

      <LandingLink href={plan.cta.href} className={`landing-btn landing-btn--block ${plan.popular ? 'landing-btn--primary' : 'landing-btn--outline'}`}>
        {plan.cta.label}
      </LandingLink>

      <ul className="plan__features">
        {plan.features.map((feature) => (
          <li key={feature}>
            <CheckOutlined className="plan__check" /> {feature}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PricingSection() {
  const [billing, setBilling] = useState('monthly');
  const yearly = billing === 'yearly';

  return (
    <section className="landing-section landing-section--tint" id="pricing" aria-labelledby="pricing-title">
      <div className="landing-container">
        <SectionHead
          id="pricing-title"
          eyebrow="Pricing"
          title="Simple Pricing That Scales With Your Team"
          text="Start small, upgrade when you grow. No unnecessary complexity."
        />

        <Reveal className="pricing__toggle">
          <Segmented
            size="large"
            aria-label="Billing period"
            value={billing}
            onChange={setBilling}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
          />
          <span className={`pricing__save${yearly ? ' pricing__save--on' : ''}`}>Save up to {YEARLY_DISCOUNT_PERCENT}%</span>
        </Reveal>

        <div className="pricing__grid">
          {PLANS.map((plan, index) => (
            <Reveal key={plan.id} delay={index * 60} className="pricing__cell">
              <PricingCard plan={plan} yearly={yearly} />
            </Reveal>
          ))}
        </div>

        <p className="pricing__notes">No credit card required • Cancel anytime • Secure payments</p>
      </div>
    </section>
  );
}
