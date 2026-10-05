import { useEffect } from 'react';
import { LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, PlusOutlined } from '@ant-design/icons';
import { Avatar, Breadcrumb, Button, Dropdown, Layout } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCurrentPageDetail } from '../../context/PageDetailContext.jsx';
import { useLogout } from '../../context/useLogout.js';
import { APP_NAME } from '../../utils/appInfo.js';
import {
  activeLink,
  filterByFeatures,
  initials,
  ROLE_ACTIONS,
  ROLE_HOME,
  ROLE_LABEL,
  ROLE_NAV,
} from '../../utils/roles.js';
import GlobalSearch from '../GlobalSearch/GlobalSearch.jsx';
import NotificationPanel from '../NotificationPanel/NotificationPanel.jsx';
import './Navbar.css';

// Top bar: [menu button] [breadcrumb / page ka naam] ......... [search] [+ quick actions] [ghanti] [user]
//   Mobile/tablet: hamburger (drawer kholta hai), sirf page ka naam, search ek icon
//   Desktop:       sidebar chhota/bada karne ka button, poora breadcrumb, search box
export default function Navbar({ desktop, collapsed, onMenuClick, onToggleCollapse }) {
  const { user, company } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();

  const section = activeLink(filterByFeatures(ROLE_NAV[user.role], company), pathname);
  const title = section?.label ?? APP_NAME;
  // Detail page ka khaas naam (company / staff ka naam, "Add staff"); page khud deta hai
  const detail = useCurrentPageDetail();
  const actions = filterByFeatures(ROLE_ACTIONS[user.role], company);

  // Browser tab ka title: "Staff · PayRoster"
  useEffect(() => {
    document.title = section ? `${section.label} · ${APP_NAME}` : APP_NAME;
  }, [section]);

  const actionMenu = {
    items: actions.map((action) => ({
      key: action.to,
      icon: <action.icon />,
      label: action.label,
      onClick: () => navigate(action.to),
    })),
  };

  const userMenu = {
    items: [
      {
        key: 'user',
        disabled: true,
        label: (
          <span className="navbar__menu-user">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <span>{ROLE_LABEL[user.role]}</span>
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

      {desktop ? (
        <Breadcrumb
          className="navbar__breadcrumb"
          items={[
            { title: <Link to={ROLE_HOME[user.role]}>{company?.name ?? APP_NAME}</Link> },
            detail && section
              ? { title: <Link to={section.to}>{title}</Link> }
              : { title: <span className="navbar__current">{title}</span> },
            detail && { title: <span className="navbar__current">{detail}</span> },
          ].filter(Boolean)}
        />
      ) : (
        <span className="navbar__title">{detail || title}</span>
      )}

      <div className="navbar__tools">
        <GlobalSearch compact={!desktop} />

        <Dropdown menu={actionMenu} trigger={['click']} placement="bottomRight">
          <Button type="primary" className="navbar__new" aria-label="Quick actions" icon={<PlusOutlined />}>
            <span className="navbar__new-label">New</span>
          </Button>
        </Dropdown>

        <NotificationPanel />

        <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
          <Button type="text" shape="circle" className="navbar__user" aria-label="User menu">
            <Avatar size={32} className="navbar__avatar">
              {initials(user.name)}
            </Avatar>
          </Button>
        </Dropdown>
      </div>
    </Layout.Header>
  );
}
