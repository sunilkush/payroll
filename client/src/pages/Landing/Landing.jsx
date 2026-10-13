import { useEffect } from 'react';
import { APP_NAME } from '../../utils/appInfo.js';
import { Faq, FinalCta, Footer } from './Closing.jsx';
import { FeatureGrid, ProductShowcase, WhyChooseUs } from './Features.jsx';
import Hero, { TrustSection } from './Hero.jsx';
import LandingLink from './LandingLink.jsx';
import { MobileAppSection } from './MobileApp.jsx';
import Navbar from './Navbar.jsx';
import { PricingSection } from './Pricing.jsx';
import { HowItWorks, Stats, Testimonials } from './Proof.jsx';
import { LINKS } from './landingConfig.js';
import { useScrolled } from './landingHooks.js';
import './landing.css';

// Public landing page ("/"): bina login wale ko yahi dikhta hai. Login hua user apne dashboard par chala jata hai
// (AppRoutes mein). Saara content landingConfig.js mein hai; yahan sirf sections ka order hai.
export default function Landing() {
  // Phone par: hero ke baad neeche chipka CTA
  const pastHero = useScrolled(560);

  useEffect(() => {
    const previous = document.title;
    document.title = `${APP_NAME} · Attendance, leave and payroll`;
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="landing">
      <a href="#main" className="landing-skip">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <TrustSection />
        <FeatureGrid />
        <ProductShowcase />
        <MobileAppSection />
        <WhyChooseUs />
        <PricingSection />
        <HowItWorks />
        <Stats />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <Footer />

      <div className={`landing-sticky${pastHero ? ' landing-sticky--on' : ''}`}>
        <LandingLink href={LINKS.signup} className="landing-btn landing-btn--primary landing-btn--block" tabIndex={pastHero ? 0 : -1}>
          Get Started Free
        </LandingLink>
      </div>
    </div>
  );
}
