import { useCallback, useEffect, useState } from 'react';
import { PlusOutlined, SearchOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { App, Avatar, Input, Popconfirm, Segmented, Tag } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { createCompanyApi, listCompaniesApi, setCompanyStatusApi } from '../../../api/companyApi.js';
import AdminForm, { EMPTY_ADMIN, toAdminPayload } from '../../../components/AdminForm/AdminForm.jsx';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import StatusBadge from '../../../components/StatusBadge/StatusBadge.jsx';
import Table from '../../../components/Table/Table.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { formatDate } from '../../../utils/format.js';
import './Companies.css';

const COLUMNS = ['Company', 'Admins', 'Staff', 'Status', 'Created', 'Actions'];
const EMPTY_FORM = { name: '', address: '', ...EMPTY_ADMIN };
const SEARCH_DELAY_MS = 350;

// "Shree Balaji Engineering" -> "SB"
const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

export default function Companies() {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [query, setQuery] = useState({ search: '', status: 'all', page: 1 });
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, counts: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    listCompaniesApi(query)
      .then((res) => {
        if (ignore) return;
        setResult(res.data);
        setError('');
      })
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [query, reloadKey]);

  // Type karte hi search: aakhri akshar ke thodi der baad hi server ko bhejte hain.
  useEffect(() => {
    const timer = setTimeout(() => {
      const search = searchText.trim();
      setQuery((prev) => (prev.search === search ? prev : { ...prev, search, page: 1 }));
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const handleToggleStatus = async (company) => {
    setBusyId(company._id);
    try {
      await setCompanyStatusApi(company._id, !company.isActive);
      message.success(`${company.name} ${company.isActive ? 'blocked' : 'unblocked'}.`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      message.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const closeCreate = useCallback(() => {
    setShowCreate(false);
    setForm(EMPTY_FORM);
    setFormError('');
    setFieldErrors({});
  }, []);

  const handleFormChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      await createCompanyApi({ name: form.name, address: form.address, admin: toAdminPayload(form) });
      message.success(`${form.name} created. The admin can now log in.`);
      closeCreate();
      // Nayi company list mein sabse upar dikhe
      setSearchText('');
      setQuery({ search: '', status: 'all', page: 1 });
      setReloadKey((key) => key + 1);
    } catch (err) {
      setFormError(err.message);
      setFieldErrors(toFieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  // counts na mile (jaise backend purana chal raha ho) to tabs bina ginti ke dikhte hain, page nahi girta.
  const { counts } = result;
  const withCount = (label, key) => (counts ? `${label} (${counts[key]})` : label);
  const filtering = Boolean(query.search) || query.status !== 'all';
  const statusTabs = [
    { value: 'all', label: withCount('All', 'all') },
    { value: 'active', label: withCount('Active', 'active') },
    { value: 'blocked', label: withCount('Blocked', 'blocked') },
  ];

  const newCompanyButton = (
    <Button icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
      New Company
    </Button>
  );

  // Khali state: filter laga ho to "kuch nahi mila", warna pehli company banane ka button
  const empty = filtering ? (
    'No companies match this search / filter.'
  ) : (
    <div className="companies__empty">
      <p>No companies yet. Create your first company to get started.</p>
      {newCompanyButton}
    </div>
  );

  return (
    <section className="companies">
      <PageHeader title="Companies" subtitle="Create and block companies, and manage their admins">
        {newCompanyButton}
      </PageHeader>

      <div className="companies__toolbar">
        <Input
          className="companies__search"
          placeholder="Search by company name"
          aria-label="Search by company name"
          prefix={<SearchOutlined className="companies__search-icon" />}
          allowClear
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <Segmented
          className="companies__tabs"
          options={statusTabs}
          value={query.status}
          onChange={(status) => setQuery((prev) => ({ ...prev, status, page: 1 }))}
        />
      </div>

      <Alert>{error}</Alert>

      <Table columns={COLUMNS} primary={0} loading={loading} empty={empty}>
        {result.items.map((company) => (
          <tr key={company._id}>
            <td>
              <Link to={`/superadmin/companies/${company._id}`} className="companies__company">
                <Avatar shape="square" size={44} className="companies__avatar">
                  {initials(company.name)}
                </Avatar>
                <span className="companies__text">
                  <span className="companies__name">{company.name}</span>
                  {company.address && <span className="companies__address">{company.address}</span>}
                </span>
              </Link>
            </td>
            <td>
              <Tag icon={<UserOutlined />} color={company.adminCount ? 'blue' : 'warning'}>
                {company.adminCount || 'No admin'}
              </Tag>
            </td>
            <td>
              <Tag icon={<TeamOutlined />}>{company.staffCount}</Tag>
            </td>
            <td>
              <StatusBadge active={company.isActive} />
            </td>
            <td>{formatDate(company.createdAt)}</td>
            <td>
              <div className="companies__actions">
                <Button size="sm" variant="secondary" onClick={() => navigate(`/superadmin/companies/${company._id}`)}>
                  Open
                </Button>
                <Popconfirm
                  title={company.isActive ? 'Block this company?' : 'Unblock this company?'}
                  description={
                    company.isActive
                      ? 'All users of this company will be logged out immediately and will not be able to log in.'
                      : 'Users of this company will be able to log in again.'
                  }
                  okText={company.isActive ? 'Block' : 'Unblock'}
                  cancelText="Cancel"
                  okButtonProps={{ danger: company.isActive }}
                  onConfirm={() => handleToggleStatus(company)}
                >
                  <Button size="sm" variant={company.isActive ? 'danger' : 'secondary'} loading={busyId === company._id}>
                    {company.isActive ? 'Block' : 'Unblock'}
                  </Button>
                </Popconfirm>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Pagination
        page={query.page}
        totalPages={result.totalPages}
        onChange={(page) => setQuery((prev) => ({ ...prev, page }))}
      />

      {showCreate && (
        <Modal title="New Company" onClose={closeCreate}>
          <form onSubmit={handleCreate} noValidate>
            <Alert>{formError}</Alert>
            <FormField
              label="Company name"
              name="name"
              value={form.name}
              onChange={handleFormChange}
              error={fieldErrors.name}
              required
              autoFocus
            />
            <FormField
              label="Address"
              name="address"
              multiline
              value={form.address}
              onChange={handleFormChange}
              error={fieldErrors.address}
            />
            <h3 className="companies__form-section">Company Admin</h3>
            <p className="companies__form-hint">This person will manage staff, attendance and payroll for the company.</p>
            <AdminForm values={form} errors={fieldErrors} onChange={handleFormChange} errorPrefix="admin." />
            <div className="companies__form-actions">
              <Button variant="secondary" onClick={closeCreate}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Create Company
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
