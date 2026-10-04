import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Drawer from '../Drawer/Drawer.jsx';
import Navbar from '../Navbar/Navbar.jsx';
import NavMenu from '../NavMenu/NavMenu.jsx';
import './AppLayout.css';

// Login ke baad ka dhancha. Desktop (1024px+): baayein sidebar. Us se chhoti screen:
// hamburger + drawer menu.
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Menu ka koi link dabate hi drawer band ho jaye.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="app-layout">
      <Navbar onMenuClick={() => setMenuOpen(true)} />
      <aside className="app-layout__sidebar">
        <NavMenu />
      </aside>
      <Drawer open={menuOpen} title="Payroll" onClose={closeMenu}>
        <NavMenu />
      </Drawer>
      <main className="app-layout__content">
        <div className="app-layout__inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
