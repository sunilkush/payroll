import { formatDate, greeting, WEEKDAYS } from '../../utils/format.js';
import { roleLine } from '../../utils/roles.js';
import './DashboardHero.css';

// Dashboard ke upar ka banner: "Good morning, Ravi", aaj ki date, aur (chaho to) daayein taraf
// ek block (children), jaise staff ka aaj ka punch status.
export default function DashboardHero({ user, subtitle, children }) {
  const now = new Date();
  const greetName = roleLine(user) ? user.name.split(' ')[0] : '';

  return (
    <header className="dashboard-hero">
      <span className="dashboard-hero__glow" aria-hidden="true" />
      <div className="dashboard-hero__text">
        <p className="dashboard-hero__date">
          {WEEKDAYS[now.getDay()]}, {formatDate(now)}
        </p>
        <h1 className="dashboard-hero__title">
          {greeting(now)}
          {/* greetName khali ho (naam hi role jaisa hai, jaise "Super Admin") to sirf "Good morning" */}
          {greetName && `, ${greetName}`}
        </h1>
        {subtitle && <p className="dashboard-hero__subtitle">{subtitle}</p>}
      </div>
      {children && <div className="dashboard-hero__aside">{children}</div>}
    </header>
  );
}
