import { useCallback, useEffect, useState } from 'react';
import { Grid, Layout } from 'antd';
import { Outlet, useLocation } from 'react-router-dom';
import Drawer from '../Drawer/Drawer.jsx';
import Navbar from '../Navbar/Navbar.jsx';
import NavMenu from '../NavMenu/NavMenu.jsx';
import './AppLayout.css';

// Login ke baad ka dhancha (Ant Design Layout).
// Desktop (Ant Design ka "lg", 992px+): baayein sidebar. Us se chhoti screen: hamburger + drawer menu.
export default function AppLayout() {
  const desktop = Boolean(Grid.useBreakpoint().lg);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Menu ka koi link dabate hi drawer band ho jaye.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <Layout className="app-layout">
      <Navbar showMenuButton={!desktop} onMenuClick={() => setMenuOpen(true)} />
      <Layout>
        {desktop && (
          <Layout.Sider theme="light" width={232} className="app-layout__sidebar">
            <NavMenu />
          </Layout.Sider>
        )}
        <Layout.Content className="app-layout__content">
          <div className="app-layout__inner">
            <Outlet />
          </div>
        </Layout.Content>
      </Layout>
      <Drawer open={menuOpen && !desktop} title="Payroll" onClose={closeMenu}>
        <NavMenu />
      </Drawer>
    </Layout>
  );
}
