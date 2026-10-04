import { CloseOutlined, LogoutOutlined } from '@ant-design/icons';
import { Avatar, Button, Menu, Tooltip } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLogout } from '../../context/useLogout.js';
import { activeLink, filterByFeatures, initials, ROLE_HOME, ROLE_NAV, roleLine } from '../../utils/roles.js';
import './NavMenu.css';

// Sidebar ka poora content: logo, company, menu (icons ke saath) aur (drawer mein) neeche user ka card.
// Desktop ke sidebar aur mobile ke drawer dono mein yahi lagta hai.
//   collapsed  desktop par sidebar chhota (sirf icons) ho
//   onClose    drawer mein: upar band karne ka button dikhta hai
export default function NavMenu({ collapsed = false, onClose }) {
  const { user, company } = useAuth();
  const { pathname } = useLocation();
  const logout = useLogout();

  const links = filterByFeatures(ROLE_NAV[user.role], company);
  const active = activeLink(links, pathname);
  const inDrawer = Boolean(onClose);
  const role = roleLine(user);

  return (
    <nav className={`nav-menu${collapsed ? ' nav-menu--collapsed' : ''}`} aria-label="Main">
      <div className="nav-menu__top">
        <Link to={ROLE_HOME[user.role]} className="nav-menu__logo">
          <span className="nav-menu__logo-mark" aria-hidden="true">
            P
          </span>
          <span className="nav-menu__logo-text">Payroll</span>
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

      <p className="nav-menu__company">{company?.name ?? 'All companies'}</p>

      <Menu
        theme="dark"
        mode="inline"
        className="nav-menu__list"
        inlineCollapsed={collapsed}
        selectedKeys={active ? [active.to] : []}
        items={links.map((link) => ({
          key: link.to,
          icon: <link.icon />,
          label: <Link to={link.to}>{link.label}</Link>,
        }))}
      />

      {/* User ka card sirf drawer (phone/tablet) mein: desktop par naam aur Logout top bar mein hain,
          wahi cheez do jagah nahi dikhani. */}
      {inDrawer && (
        <div className="nav-menu__user">
          <Avatar className="nav-menu__avatar">{initials(user.name)}</Avatar>
          <div className="nav-menu__identity">
            <span className="nav-menu__name">{user.name}</span>
            {role && <span className="nav-menu__role">{role}</span>}
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
      )}
    </nav>
  );
}
