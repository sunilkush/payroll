import { Empty } from 'antd';
import './EmptyState.css';

// Jab dikhane ko kuch na ho: ek line ka message aur (chaho to) aage kya karna hai uska button.
export default function EmptyState({ text, children }) {
  return (
    <div className="empty-state">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} />
      {children && <div className="empty-state__action">{children}</div>}
    </div>
  );
}
