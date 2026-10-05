import { useEffect, useMemo, useRef, useState } from 'react';
import { BankOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Input, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { listCompaniesApi } from '../../api/companyApi.js';
import { listStaffApi } from '../../api/staffApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { filterByFeatures, ROLE_ACTIONS, ROLE_NAV, ROLES } from '../../utils/roles.js';
import './GlobalSearch.css';

const SEARCH_DELAY_MS = 300;

// Top bar ka search: pages aur kaam (sabke liye), saath mein admin ke liye staff aur Super Admin ke
// liye companies. Chunne par us page par le jata hai. Ctrl+K (ya /) se khulta hai.
//   compact  phone/tablet: sirf icon, dabane par search ek modal mein khulta hai
export default function GlobalSearch({ compact = false }) {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [text, setText] = useState('');
  const [records, setRecords] = useState([]); // server se mile staff / companies
  const [modalOpen, setModalOpen] = useState(false);

  // Pages + quick actions: turant, bina server ke
  const pages = useMemo(() => {
    const seen = new Set();
    return [...filterByFeatures(ROLE_NAV[user.role], company), ...filterByFeatures(ROLE_ACTIONS[user.role], company)].filter(
      (item) => !seen.has(item.to) && seen.add(item.to)
    );
  }, [user.role, company]);

  // Staff / companies: likhna rukne ke thodi der baad
  useEffect(() => {
    const query = text.trim();
    if (query.length < 2 || user.role === ROLES.STAFF) {
      setRecords([]);
      return undefined;
    }
    let ignore = false;
    const timer = setTimeout(async () => {
      try {
        const res =
          user.role === ROLES.ADMIN
            ? await listStaffApi({ search: query, limit: 5 })
            : await listCompaniesApi({ search: query, limit: 5 });
        if (ignore) return;
        setRecords(
          res.data.items.map((item) =>
            user.role === ROLES.ADMIN
              ? { to: `/admin/staff/${item._id}`, label: item.name, sub: item.employeeCode, icon: <UserOutlined /> }
              : { to: `/superadmin/companies/${item._id}`, label: item.name, sub: item.address, icon: <BankOutlined /> }
          )
        );
      } catch {
        if (!ignore) setRecords([]);
      }
    }, SEARCH_DELAY_MS);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [text, user.role]);

  // Ctrl+K / Cmd+K kahin se bhi; "/" tab jab kisi input mein na likh rahe hon
  useEffect(() => {
    const onKeyDown = (event) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable;
      const shortcut = ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !typing);
      if (!shortcut) return;
      event.preventDefault();
      if (compact) setModalOpen(true);
      else inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [compact]);

  const query = text.trim().toLowerCase();
  const matchingPages = pages.filter((page) => page.label.toLowerCase().includes(query));
  const toOption = (item, icon) => ({
    value: item.to,
    label: (
      <span className="global-search__option">
        <span className="global-search__option-icon">{icon}</span>
        <span className="global-search__option-text">
          {item.label}
          {item.sub && <span className="global-search__option-sub">{item.sub}</span>}
        </span>
      </span>
    ),
  });
  const options = [
    matchingPages.length && { label: 'Go to', options: matchingPages.map((page) => toOption(page, <page.icon />)) },
    records.length && {
      label: user.role === ROLES.ADMIN ? 'Staff' : 'Companies',
      options: records.map((record) => toOption(record, record.icon)),
    },
  ].filter(Boolean);

  const handleSelect = (path) => {
    setText('');
    setModalOpen(false);
    inputRef.current?.blur();
    navigate(path);
  };

  const field = (
    <AutoComplete
      className="global-search__field"
      popupMatchSelectWidth={compact ? true : 320}
      options={options}
      value={text}
      onSearch={setText}
      onSelect={handleSelect}
      notFoundContent={query ? <span className="global-search__empty">No results for “{text.trim()}”</span> : null}
      defaultActiveFirstOption
      autoFocus={compact}
      defaultOpen={compact}
    >
      <Input
        ref={inputRef}
        placeholder={user.role === ROLES.ADMIN ? 'Search pages or staff' : user.role === ROLES.STAFF ? 'Search pages' : 'Search pages or companies'}
        aria-label="Search"
        prefix={<SearchOutlined className="global-search__icon" />}
        suffix={!compact && <kbd className="global-search__kbd">Ctrl K</kbd>}
        allowClear
      />
    </AutoComplete>
  );

  if (!compact) return <div className="global-search">{field}</div>;

  return (
    <>
      <Button type="text" className="global-search__trigger" aria-label="Search" icon={<SearchOutlined />} onClick={() => setModalOpen(true)} />
      <Modal open={modalOpen} title="Search" footer={null} onCancel={() => setModalOpen(false)} destroyOnHidden>
        {field}
      </Modal>
    </>
  );
}
