import { useEffect } from 'react';
import { useScrollLock } from '../../utils/scrollLock.js';
import './Drawer.css';

// Mobile/tablet ka side menu: baayein se khulta hai. Bahar click ya Escape se band hota hai.
export default function Drawer({ open, title, onClose, children }) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer" onClick={onClose}>
      <div
        className="drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer__header">
          <span className="drawer__title">{title}</span>
          <button type="button" className="drawer__close" aria-label="Menu band karein" onClick={onClose}>
            &times;
          </button>
        </header>
        <div className="drawer__body">{children}</div>
      </div>
    </div>
  );
}
