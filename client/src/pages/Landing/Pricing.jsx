import { CheckOutlined } from '@ant-design/icons';
import { planBullets, usePlans } from '../../utils/usePlans.js';
import { SectionHead } from './Features.jsx';
import LandingLink from './LandingLink.jsx';
import Reveal from './Reveal.jsx';
import { LINKS } from './landingConfig.js';

const rupees = (amount) => `₹${amount.toLocaleString('en-IN')}`;
// Beech wale paid plan par "Most Popular" (plans chhote se bade aate hain).
const POPULAR = 'PROFESSIONAL';

// Ek plan ka card. Naam, daam, staff ki hadd aur features server se aate hain (Super Admin badalta hai);
// yahan koi rakam likhi hui nahi hai.
export function PricingCard({ plan, billing, featureLabels }) {
  const free = plan.code === 'FREE';
  const custom = !free && !plan.monthlyPrice;
  const popular = plan.code === POPULAR;

  return (
    <article className={`plan${popular ? ' plan--popular' : ''}`} aria-label={`${plan.name} plan`}>
      {popular && <span className="plan__badge">Most Popular</span>}
      <h3 className="plan__name">{plan.name}</h3>
      <p className="plan__subtitle">{plan.subtitle}</p>

      <p className="plan__price">
        {custom ? (
          <span className="plan__amount">Custom</span>
        ) : (
          <>
            <span className="plan__amount">{rupees(free ? 0 : plan.monthlyPrice)}</span>
            <span className="plan__period"> / month</span>
          </>
        )}
      </p>
      <p className="plan__billing">
        {custom && 'Tailored to your team'}
        {free && `Free for ${billing.trialDays} days`}
        {!custom && !free && `${billing.trialDays}-day free trial, then billed for ${billing.months} months + ${billing.gstPercent}% GST`}
      </p>

      <LandingLink
        // Chuna hua plan register page tak saath jata hai (trial usi plan par shuru hota hai).
        href={custom ? LINKS.contact : free ? LINKS.signup : `${LINKS.signup}?plan=${plan.code}`}
        className={`landing-btn landing-btn--block ${popular ? 'landing-btn--primary' : 'landing-btn--outline'}`}
      >
        {custom ? 'Contact Sales' : free ? 'Start Free' : `Start ${plan.name}`}
      </LandingLink>

      <ul className="plan__features">
        {planBullets(plan, featureLabels).map((feature) => (
          <li key={feature}>
            <CheckOutlined className="plan__check" /> {feature}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PricingSection() {
  const { data, error } = usePlans();

  return (
    <section className="landing-section landing-section--tint" id="pricing" aria-labelledby="pricing-title">
      <div className="landing-container">
        <SectionHead
          id="pricing-title"
          eyebrow="Pricing"
          title="Simple Pricing That Scales With Your Team"
          text="Start small, upgrade when you grow. No unnecessary complexity."
        />

        {data && (
          <div className="pricing__grid">
            {data.plans.map((plan, index) => (
              <Reveal key={plan.code} delay={index * 60} className="pricing__cell">
                <PricingCard plan={plan} billing={data.billing} featureLabels={data.featureLabels} />
              </Reveal>
            ))}
          </div>
        )}
        {/* Server tak pahunch na ho to khali jagah ki jagah seedha raasta */}
        {error && (
          <p className="pricing__notes">
            Prices could not be loaded right now. <LandingLink href={LINKS.contact}>Contact us</LandingLink> for pricing.
          </p>
        )}

        <p className="pricing__notes">No credit card required to start • Secure payments</p>
      </div>
    </section>
  );
}
