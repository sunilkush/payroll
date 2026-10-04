import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { filterByFeatures, ROLE_LABEL, ROLE_NAV } from '../../utils/roles.js';
import './NavMenu.css';

// Role ke hisaab se menu links (upar se neeche). Desktop ke sidebar aur mobile ke drawer dono mein yahi lagta hai.
export default function NavMenu() {
  const { user, company } = useAuth();

  return (
    <nav className="nav-menu" aria-label="Main">
      <div className="nav-menu__user">
        <span className="nav-menu__name">{user.name}</span>
        <span className="nav-menu__role">
          {ROLE_LABEL[user.role]}
          {company && ` · ${company.name}`}
        </span>
      </div>
      {filterByFeatures(ROLE_NAV[user.role], company).map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => `nav-menu__link${isActive ? ' nav-menu__link--active' : ''}`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
