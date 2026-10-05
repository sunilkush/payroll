import { useEffect, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input, Segmented } from 'antd';
import './ListToolbar.css';

const SEARCH_DELAY_MS = 350;

// List pages ke upar ki patti: type karte hi search + ginti wale status tabs.
//   searchPlaceholder  ho to search box dikhta hai; onSearch(text) aakhri akshar ke thodi der baad chalta hai
//   tabs               [{ value, label }]; counts ({ [value]: number }) mile to label ke saath ginti: "Active (3)"
//   value / onChange   chuna hua tab
export default function ListToolbar({ searchPlaceholder, onSearch, tabs, counts, value, onChange }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!onSearch) return undefined;
    const timer = setTimeout(() => onSearch(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
    // onSearch ko deps mein nahi rakha: parent har render par naya function deta hai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="list-toolbar">
      {searchPlaceholder && (
        <Input
          className="list-toolbar__search"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          prefix={<SearchOutlined className="list-toolbar__search-icon" />}
          allowClear
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      )}
      {tabs && (
        <Segmented
          className="list-toolbar__tabs"
          options={tabs.map((tab) => ({
            value: tab.value,
            label: counts?.[tab.value] === undefined ? tab.label : `${tab.label} (${counts[tab.value]})`,
          }))}
          value={value}
          onChange={onChange}
        />
      )}
    </div>
  );
}
