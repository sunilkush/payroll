import './Checkbox.css';

export default function Checkbox({ label, name, hint, ...inputProps }) {
  return (
    <label className="checkbox" htmlFor={name}>
      <input id={name} name={name} type="checkbox" className="checkbox__input" {...inputProps} />
      <span>
        {label}
        {hint && <span className="checkbox__hint">{hint}</span>}
      </span>
    </label>
  );
}
