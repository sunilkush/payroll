import { useEffect } from 'react';
import { useScrollLock } from '../../utils/scrollLock.js';
import './Modal.css';

export default function Modal({ title, onClose, children }) {
  useScrollLock();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal" onMouseDown={onClose}>
      <div
        className="modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
