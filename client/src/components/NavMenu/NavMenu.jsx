import { CloseOutlined, LogoutOutlined } from '@ant-design/icons';
import { Avatar, Button, Menu, Tooltip } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLogout } from '../../context/useLogout.js';
import { activeLink, filterByFeatures, initials, ROLE_HOME, ROLE_NAV, roleLine } from '../../utils/roles.js';
import './NavMenu.css';

// Sidebar ka poora content: logo, group-wise menu (icons ke saath) aur neeche user ki profile.
// Desktop ke sidebar aur mobile ke drawer dono mein yahi lagta hai.
//   collapsed  desktop par sidebar chhota (sirf icons) ho
//   onClose    drawer mein: upar band karne ka button dikhta hai
export default function NavMenu({ collapsed = false, onClose }) {
  const { user, company } = useAuth();
  const { pathname } = useLocation();
  const logout = useLogout();

  const links = filterByFeatures(ROLE_NAV[user.role], company);
  const active = activeLink(links, pathname);
  const role = roleLine(user);

  // [{ group, links }] - links ke order mein, group ke naam ke saath
  const groups = [];
  for (const link of links) {
    const last = groups.at(-1);
    if (last?.group === link.group) last.links.push(link);
    else groups.push({ group: link.group, links: [link] });
  }
  const toItem = (link) => ({ key: link.to, icon: <link.icon />, label: <Link to={link.to}>{link.label}</Link> });

  return (
    <nav className={`nav-menu${collapsed ? ' nav-menu--collapsed' : ''}`} aria-label="Main">
      <div className="nav-menu__top">
        <Link to={ROLE_HOME[user.role]} className="nav-menu__logo">
          <span className="nav-menu__logo-mark" aria-hidden="true">
            P
          </span>
          <span className="nav-menu__brand">
            <span className="nav-menu__logo-text">Payroll</span>
            <span className="nav-menu__company">{company?.name ?? 'All companies'}</span>
          </span>
        </Link>
        {onClose && (
          <Button
            type="text"
            className="nav-menu__close"
            aria-label="Close menu"
            icon={<CloseOutlined />}
            onClick={onClose}
          />
        )}
      </div>

      <Menu
        mode="inline"
        className="nav-menu__list"
        inlineCollapsed={collapsed}
        selectedKeys={active ? [active.to] : []}
        // Chhote sidebar mein group ke naam nahi samate, isliye wahan seedhi list
        items={
          collapsed
            ? links.map(toItem)
            : groups.map(({ group, links: groupLinks }) => ({ type: 'group', key: group, label: group, children: groupLinks.map(toItem) }))
        }
      />

      <div className="nav-menu__user">
        <Avatar className="nav-menu__avatar">{initials(user.name)}</Avatar>
        <div className="nav-menu__identity">
          <span className="nav-menu__name">{user.name}</span>
          <span className="nav-menu__role">{role ?? user.email}</span>
        </div>
        <Tooltip title="Logout" placement="right">
          <Button
            type="text"
            className="nav-menu__logout"
            aria-label="Logout"
            icon={<LogoutOutlined />}
            onClick={logout}
          />
        </Tooltip>
      </div>
    </nav>
  );
}
