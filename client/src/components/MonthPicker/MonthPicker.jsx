import { currentMonth } from '../../utils/format.js';
import './MonthPicker.css';

export default function MonthPicker({ value, onChange }) {
  return (
    <label className="month-picker">
      <span className="month-picker__label">Month</span>
      <input
        type="month"
        className="month-picker__input"
        value={value}
        max={currentMonth()}
        onChange={(event) => event.target.value && onChange(event.target.value)}
      />
    </label>
  );
}
