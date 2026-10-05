import { useEffect, useState } from 'react';
import { BellOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Badge, Button, Popover } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { getNotificationsApi } from '../../api/dashboardApi.js';
import './NotificationPanel.css';

// Top bar ki ghanti: role ke hisaab se "dhyan dene layak" cheezein (pending leaves, payroll baaki,
// punch nahi kiya...). Ye list server har baar abhi ki haalat se banata hai, isliye kaam ho jane
// par cheez apne aap hat jati hai. Dabane par us page par le jata hai.
export default function NotificationPanel() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  // Page badalne par dobara lao (koi kaam nipta ho to ginti ghat jaye). Fail ho to chup-chaap khali.
  useEffect(() => {
    let ignore = false;
    getNotificationsApi()
      .then((res) => !ignore && setItems(res.data.items))
      .catch(() => !ignore && setItems([]));
    return () => {
      ignore = true;
    };
  }, [pathname]);

  const handleOpen = (item) => {
    setOpen(false);
    navigate(item.to);
  };

  const content = (
    <div className="notification-panel">
      <p className="notification-panel__title">Notifications</p>
      {items.length === 0 ? (
        <p className="notification-panel__empty">
          <CheckCircleOutlined /> You are all caught up.
        </p>
      ) : (
        <ul className="notification-panel__list">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="notification-panel__item" onClick={() => handleOpen(item)}>
                <span className={`notification-panel__dot notification-panel__dot--${item.tone}`} aria-hidden="true" />
                <span className="notification-panel__text">
                  <span className="notification-panel__item-title">{item.title}</span>
                  {item.description && <span className="notification-panel__item-desc">{item.description}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen} arrow={false}>
      <Badge count={items.length} size="small" offset={[-6, 6]}>
        <Button
          type="text"
          className="notification-panel__trigger"
          aria-label={items.length ? `Notifications (${items.length})` : 'Notifications'}
          icon={<BellOutlined />}
        />
      </Badge>
    </Popover>
  );
}
