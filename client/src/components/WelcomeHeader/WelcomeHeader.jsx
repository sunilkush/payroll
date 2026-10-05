import { formatDate, greeting, WEEKDAYS } from '../../utils/format.js';
import { roleLine } from '../../utils/roles.js';
import './WelcomeHeader.css';

// Dashboard ke upar: "Good morning, Ravi", neeche aaj ki date + ek line, daayein mukhya buttons (children).
export default function WelcomeHeader({ user, subtitle, children }) {
  const now = new Date();
  // Naam hi role jaisa ho (jaise "Super Admin") to sirf "Good morning"
  const name = roleLine(user) ? user.name.split(' ')[0] : '';

  return (
    <header className="welcome-header">
      <div className="welcome-header__text">
        <h1 className="welcome-header__title">
          {greeting(now)}
          {name && `, ${name}`}
        </h1>
        <p className="welcome-header__subtitle">
          {WEEKDAYS[now.getDay()]}, {formatDate(now)}
          {subtitle && ` · ${subtitle}`}
        </p>
      </div>
      {children && <div className="welcome-header__actions">{children}</div>}
    </header>
  );
}
