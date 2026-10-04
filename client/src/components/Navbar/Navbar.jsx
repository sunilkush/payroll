import {
  CalendarOutlined,
  DownOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Dropdown, Layout } from 'antd';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLogout } from '../../context/useLogout.js';
import { formatDate, WEEKDAYS } from '../../utils/format.js';
import { activeLink, filterByFeatures, initials, ROLE_NAV, roleLine } from '../../utils/roles.js';
import './Navbar.css';

// Upar ki patti.
//   Mobile/tablet: hamburger (drawer kholta hai) + chalu section ka naam + avatar menu
//   Desktop:       sidebar chhota/bada karne ka button + section ka naam + avatar menu
export default function Navbar({ desktop, collapsed, onMenuClick, onToggleCollapse }) {
  const { user, company } = useAuth();
  const { pathname } = useLocation();
  const logout = useLogout();

  const today = new Date();
  const role = roleLine(user);
  const section = activeLink(filterByFeatures(ROLE_NAV[user.role], company), pathname);

  const userMenu = {
    items: [
      {
        key: 'user',
        disabled: true,
        label: (
          <span className="navbar__menu-user">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </span>
        ),
      },
      { type: 'divider' },
      { key: 'logout', danger: true, icon: <LogoutOutlined />, label: 'Logout', onClick: logout },
    ],
  };

  return (
    <Layout.Header className="navbar">
      {desktop ? (
        <Button
          type="text"
          className="navbar__collapse"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggleCollapse}
        />
      ) : (
        <Button
          type="text"
          className="navbar__menu"
          aria-label="Open menu"
          icon={<MenuOutlined />}
          onClick={onMenuClick}
        />
      )}

      <div className="navbar__section">
        <span className="navbar__section-name">{section?.label ?? 'Payroll'}</span>
        <span className="navbar__section-company">{company?.name ?? 'All companies'}</span>
      </div>

      <span className="navbar__date">
        <CalendarOutlined /> {WEEKDAYS[today.getDay()].slice(0, 3)}, {formatDate(today)}
      </span>

      <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
        <Button type="text" className="navbar__user" aria-label="User menu">
          <Avatar className="navbar__avatar">{initials(user.name)}</Avatar>
          <span className="navbar__identity">
            <span className="navbar__name">{user.name}</span>
            {role && <span className="navbar__role">{role}</span>}
          </span>
          <DownOutlined className="navbar__caret" />
        </Button>
      </Dropdown>
    </Layout.Header>
  );
}
