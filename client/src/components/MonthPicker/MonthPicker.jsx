import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import './MonthPicker.css';

const FORMAT = 'YYYY-MM';

// value / onChange: 'YYYY-MM' string. Aane wale mahine nahi chune ja sakte.
export default function MonthPicker({ value, onChange }) {
  return (
    <label className="month-picker">
      <span className="month-picker__label">Month</span>
      <DatePicker
        picker="month"
        format="MMM YYYY"
        allowClear={false}
        inputReadOnly // phone par keyboard na khule, sirf picker
        value={dayjs(value, FORMAT)}
        disabledDate={(date) => date.isAfter(dayjs(), 'month')}
        onChange={(date) => date && onChange(date.format(FORMAT))}
      />
    </label>
  );
}
