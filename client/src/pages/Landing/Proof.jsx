import { StarFilled } from '@ant-design/icons';
import { initials } from '../../utils/roles.js';
import { SectionHead } from './Features.jsx';
import Reveal from './Reveal.jsx';
import { STATS, STEPS, TESTIMONIALS } from './landingConfig.js';
import { useCountUp, useInView } from './landingHooks.js';

export function HowItWorks() {
  return (
    <section className="landing-section" id="how" aria-labelledby="how-title">
      <div className="landing-container">
        <SectionHead id="how-title" eyebrow="How it works" title="Up and Running in Three Steps" />
        <ol className="steps">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} className="step" delay={index * 100}>
              <span className="step__number">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__text">{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Stat({ stat, start }) {
  const value = useCountUp(stat.value, start);
  return (
    <li className="stat">
      <span className="stat__value">
        {value}
        {stat.suffix}
      </span>
      <span className="stat__label">{stat.label}</span>
    </li>
  );
}

// Ank tab ginna shuru karte hain jab section screen mein aata hai.
export function Stats() {
  const [ref, inView] = useInView(0.3);
  return (
    <section className="stats" aria-labelledby="stats-title">
      <div className="landing-container">
        <h2 id="stats-title" className="stats__title">
          Built to simplify workforce management
        </h2>
        <ul ref={ref} className="stats__list">
          {STATS.map((stat) => (
            <Stat key={stat.label} stat={stat} start={inView} />
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Testimonials() {
  return (
    <section className="landing-section" id="testimonials" aria-labelledby="testimonials-title">
      <div className="landing-container">
        <SectionHead
          id="testimonials-title"
          eyebrow="Customers"
          title="What Teams Say"
          text="Sample feedback, shown as an example of how teams use PayRoster."
        />
        <ul className="quotes">
          {TESTIMONIALS.map((item, index) => (
            <Reveal as="li" key={item.name} className="quote" delay={index * 80}>
              <span className="quote__stars" role="img" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }, (_, star) => (
                  <StarFilled key={star} />
                ))}
              </span>
              <p className="quote__text">“{item.quote}”</p>
              <div className="quote__person">
                <span className="quote__avatar" aria-hidden="true">
                  {initials(item.name)}
                </span>
                <span>
                  <span className="quote__name">{item.name}</span>
                  <span className="quote__role">{item.role}</span>
                </span>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
