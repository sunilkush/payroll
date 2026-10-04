import './Button.css';

// variant: primary | secondary | danger     size: md | sm
export default function Button({ variant = 'primary', size = 'md', type = 'button', className = '', ...props }) {
  return <button type={type} className={`btn btn--${variant} btn--${size} ${className}`.trim()} {...props} />;
}
