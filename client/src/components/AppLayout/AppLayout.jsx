import { useCallback, useEffect, useState } from 'react';
import { Grid, Layout } from 'antd';
import { Outlet, useLocation } from 'react-router-dom';
import Drawer from '../Drawer/Drawer.jsx';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary.jsx';
import Navbar from '../Navbar/Navbar.jsx';
import NavMenu from '../NavMenu/NavMenu.jsx';
import './AppLayout.css';

const COLLAPSED_KEY = 'payroll_sidebar_collapsed';
const SIDEBAR_WIDTH = 248;
const SIDEBAR_COLLAPSED_WIDTH = 72;

// Login ke baad ka dhancha (Ant Design Layout).
//   Desktop (Ant Design ka "lg", 992px+): baayein poori oonchai ka sidebar, jise chhota (sirf icons)
//   kiya ja sakta hai; pasand browser mein yaad rehti hai.
//   Us se chhoti screen: hamburger + drawer menu.
export default function AppLayout() {
  const desktop = Boolean(Grid.useBreakpoint().lg);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');
  const { pathname } = useLocation();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Menu ka koi link dabate hi drawer band ho jaye.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const toggleCollapse = () => {
    setCollapsed((previous) => {
      localStorage.setItem(COLLAPSED_KEY, String(!previous));
      return !previous;
    });
  };

  return (
    <Layout hasSider className="app-layout">
      {desktop && (
        <Layout.Sider
          theme="dark"
          width={SIDEBAR_WIDTH}
          collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
          collapsed={collapsed}
          trigger={null}
          className="app-layout__sidebar"
        >
          <NavMenu collapsed={collapsed} />
        </Layout.Sider>
      )}

      <Layout className="app-layout__main">
        <Navbar
          desktop={desktop}
          collapsed={collapsed}
          onMenuClick={() => setMenuOpen(true)}
          onToggleCollapse={toggleCollapse}
        />
        <Layout.Content className="app-layout__content">
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </Layout.Content>
      </Layout>

      <Drawer open={menuOpen && !desktop} title="Menu" onClose={closeMenu}>
        <NavMenu onClose={closeMenu} />
      </Drawer>
    </Layout>
  );
}
