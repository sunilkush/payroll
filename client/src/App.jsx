import { useMemo } from 'react';
import { ConfigProvider } from 'antd';
import AppRoutes from './routes/AppRoutes.jsx';
import { buildTheme } from './styles/theme.js';

export default function App() {
  const theme = useMemo(buildTheme, []);

  return (
    <ConfigProvider theme={theme}>
      <AppRoutes />
    </ConfigProvider>
  );
}
