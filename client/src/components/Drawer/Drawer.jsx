import { Drawer as AntDrawer } from 'antd';
import './Drawer.css';

// Mobile/tablet ka side menu: baayein se khulta hai. Bahar click ya Escape se band hota hai.
// Iska apna header nahi hai: andar ka NavMenu khud logo aur band karne ka button dikhata hai.
// title sirf screen reader ke liye hai.
export default function Drawer({ open, title, onClose, children }) {
  return (
    <AntDrawer
      rootClassName="drawer"
      open={open}
      aria-label={title}
      title={null}
      closable={false}
      placement="left"
      size={280}
      onClose={onClose}
    >
      {children}
    </AntDrawer>
  );
}
