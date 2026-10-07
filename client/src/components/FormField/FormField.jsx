import { DatePicker, Input, Select, TimePicker } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import './FormField.css';

// 'HH:mm' jaise string ko dayjs mein padhne ke liye
dayjs.extend(customParseFormat);

// Picker screen par kuch bhi dikhaye, page ko value isi format ki string milti hai.
const VALUE_FORMAT = { date: 'YYYY-MM-DD', time: 'HH:mm' };

// Label + Ant Design control + error/hint. Baaki props seedhe control par jaate hain.
// multiline -> TextArea, options ([{ value, label }]) -> Select, type="password" -> Input.Password,
// type="date" -> DatePicker (calendar; value 'YYYY-MM-DD', min / max bhi isi format mein),
// type="time" -> TimePicker (value 'HH:mm'), warna Input (type number/email... chalte hain).
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
  ...allProps
}) {
  // searchable sirf Select ke liye hai; baaki controls (DOM input) tak na pahunche.
  const { searchable, ...controlProps } = allProps;
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
        // '' ka apna option na ho (jaise "All") to khali maano, taaki placeholder dikhe
        value={controlProps.value === '' && !options.some((option) => option.value === '') ? undefined : controlProps.value}
        status={common.status}
        placeholder={controlProps.placeholder}
        disabled={controlProps.disabled}
        // searchable: lambi list (clients, staff) mein type karke dhoondhne ke liye
        showSearch={Boolean(searchable)}
        optionFilterProp="label"
        onChange={(value) => onChange({ target: { name, value } })}
      />
    );
  } else if (type === 'date' || type === 'time') {
    const { value, min, max, ...pickerProps } = controlProps;
    const Picker = type === 'date' ? DatePicker : TimePicker;
    const valueFormat = VALUE_FORMAT[type];
    control = (
      <Picker
        id={name}
        name={name}
        className="form-field__picker"
        format={type === 'date' ? 'DD MMM YYYY' : 'hh:mm A'}
        status={common.status}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        allowClear={!required}
        inputReadOnly // phone par keyboard na khule, sirf picker
        value={value ? dayjs(value, valueFormat) : null}
        onChange={(picked) => onChange({ target: { name, value: picked ? picked.format(valueFormat) : '' } })}
        {...(type === 'date'
          ? { minDate: min ? dayjs(min, valueFormat) : undefined, maxDate: max ? dayjs(max, valueFormat) : undefined }
          : { use12Hours: true, needConfirm: false })}
        {...pickerProps}
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
