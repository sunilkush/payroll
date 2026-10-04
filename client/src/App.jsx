import { useMemo } from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import AppRoutes from './routes/AppRoutes.jsx';
import { buildTheme } from './styles/theme.js';

export default function App() {
  const theme = useMemo(buildTheme, []);

  return (
    <ConfigProvider theme={theme}>
      {/* AntApp: pages mein App.useApp() se toast (message) aur confirm (modal) milte hain */}
      <AntApp>
        <AppRoutes />
      </AntApp>
    </ConfigProvider>
  );
}
