import { useState } from 'react';
import { Input, Select } from 'antd';
import Button from '../Button/Button.jsx';
import './SearchBar.css';

// List pages ka search + status filter. onSearch(text) submit par, onStatusChange(value) turant chalta hai.
export default function SearchBar({ placeholder, status, statusOptions, onSearch, onStatusChange }) {
  const [text, setText] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(text.trim());
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <Input
        type="search"
        className="search-bar__input"
        placeholder={placeholder}
        aria-label={placeholder}
        allowClear
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <Select
        className="search-bar__status"
        aria-label="Status filter"
        options={statusOptions}
        value={status}
        onChange={onStatusChange}
      />
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}
