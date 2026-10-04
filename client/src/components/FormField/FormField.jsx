import './FormField.css';

// Label + control + error message. Baaki props seedhe control par jaate hain.
// multiline -> textarea, options ([{ value, label }]) -> select, warna input.
export default function FormField({ label, name, error, hint, multiline = false, options, ...controlProps }) {
  let Control = 'input';
  if (multiline) Control = 'textarea';
  if (options) Control = 'select';
  const errorId = `${name}-error`;

  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={name}>
        {label}
        {controlProps.required && <span className="form-field__required"> *</span>}
      </label>
      <Control
        id={name}
        name={name}
        className={`form-field__control${error ? ' form-field__control--invalid' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...controlProps}
      >
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Control>
      {error ? (
        <p id={errorId} className="form-field__error">
          {error}
        </p>
      ) : (
        hint && <p className="form-field__hint">{hint}</p>
      )}
    </div>
  );
}
