import { Input, Select } from 'antd';
import './FormField.css';

// Label + Ant Design control + error/hint. Baaki props seedhe control par jaate hain.
// multiline -> TextArea, options ([{ value, label }]) -> Select, type="password" -> Input.Password,
// warna Input (type number/date/email... chalte hain).
// onChange hamesha event jaisa milta hai: event.target.name / event.target.value.
export default function FormField({
  label,
  name,
  error,
  hint,
  multiline = false,
  options,
  type,
  required,
  onChange,
  ...controlProps
}) {
  const errorId = `${name}-error`;
  const common = {
    id: name,
    name,
    status: error ? 'error' : undefined,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined,
    onChange,
    ...controlProps,
  };

  let control;
  if (options) {
    control = (
      <Select
        id={name}
        className="form-field__select"
        options={options}
        value={controlProps.value}
        status={common.status}
        onChange={(value) => onChange({ target: { name, value } })}
      />
    );
  } else if (multiline) {
    control = <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} {...common} />;
  } else if (type === 'password') {
    control = <Input.Password {...common} />;
  } else {
    control = <Input type={type} {...common} />;
  }

  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={name}>
        {label}
        {required && <span className="form-field__required"> *</span>}
      </label>
      {control}
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
