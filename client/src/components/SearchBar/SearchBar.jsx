import { useState } from 'react';
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
      <input
        type="search"
        className="search-bar__input"
        placeholder={placeholder}
        aria-label={placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <select
        className="search-bar__status"
        aria-label="Status filter"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}
