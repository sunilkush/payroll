import { Checkbox as AntCheckbox } from 'antd';
import './Checkbox.css';

// onChange event jaisa milta hai: event.target = { name, type: 'checkbox', checked }
export default function Checkbox({ label, name, hint, checked, onChange, disabled = false }) {
  return (
    <AntCheckbox
      id={name}
      name={name}
      className="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange({ target: { name, type: 'checkbox', checked: event.target.checked } })}
    >
      {label}
      {hint && <span className="checkbox__hint">{hint}</span>}
    </AntCheckbox>
  );
}
