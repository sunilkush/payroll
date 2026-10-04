import { Drawer as AntDrawer } from 'antd';

// Mobile/tablet ka side menu: baayein se khulta hai. Bahar click ya Escape se band hota hai.
export default function Drawer({ open, title, onClose, children }) {
  return (
    <AntDrawer
      rootClassName="drawer"
      open={open}
      title={title}
      placement="left"
      size={280}
      onClose={onClose}
    >
      {children}
    </AntDrawer>
  );
}
