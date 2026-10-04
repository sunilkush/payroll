import './Alert.css';

// type: error | success
export default function Alert({ type = 'error', children }) {
  if (!children) return null;
  return (
    <p className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
