import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { filterByFeatures, ROLE_LABEL, ROLE_NAV } from '../../utils/roles.js';
import './NavMenu.css';

// Role ke hisaab se menu links (upar se neeche). Desktop ke sidebar aur mobile ke drawer dono mein yahi lagta hai.
export default function NavMenu() {
  const { user, company } = useAuth();
  const { pathname } = useLocation();
  const links = filterByFeatures(ROLE_NAV[user.role], company);

  // Chalu page ka link: "end" wale links poora match, baaki shuruaat se (/admin/staff/123 -> Staff)
  const active = links
    .filter((link) => (link.end ? pathname === link.to : pathname.startsWith(link.to)))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <nav className="nav-menu" aria-label="Main">
      <div className="nav-menu__user">
        <span className="nav-menu__name">{user.name}</span>
        <span className="nav-menu__role">
          {ROLE_LABEL[user.role]}
          {company && ` · ${company.name}`}
        </span>
      </div>
      <Menu
        mode="inline"
        className="nav-menu__list"
        selectedKeys={active ? [active.to] : []}
        items={links.map((link) => ({ key: link.to, label: <Link to={link.to}>{link.label}</Link> }))}
      />
    </nav>
  );
}
