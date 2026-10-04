import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createCompanyApi, listCompaniesApi, setCompanyStatusApi } from '../../../api/companyApi.js';
import AdminForm, { EMPTY_ADMIN, toAdminPayload } from '../../../components/AdminForm/AdminForm.jsx';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import SearchBar from '../../../components/SearchBar/SearchBar.jsx';
import StatusBadge from '../../../components/StatusBadge/StatusBadge.jsx';
import Table from '../../../components/Table/Table.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { formatDate } from '../../../utils/format.js';
import './Companies.css';

const COLUMNS = ['Company', 'Admins', 'Staff', 'Status', 'Created', 'Actions'];
const EMPTY_FORM = { name: '', address: '', ...EMPTY_ADMIN };
const STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
];

export default function Companies() {
  const [query, setQuery] = useState({ search: '', status: 'all', page: 1 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
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

  const handleToggleStatus = async (company) => {
    const action = company.isActive ? 'block' : 'unblock';
    const warning = company.isActive ? '\nIs company ke saare users login nahi kar payenge.' : '';
    if (!window.confirm(`"${company.name}" ko ${action} karna hai?${warning}`)) return;

    setBusyId(company._id);
    try {
      await setCompanyStatusApi(company._id, !company.isActive);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err.message);
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
      closeCreate();
      setQuery((prev) => ({ ...prev, page: 1 }));
      setReloadKey((key) => key + 1);
    } catch (err) {
      setFormError(err.message);
      setFieldErrors(toFieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="companies">
      <PageHeader title="Companies" subtitle={`${result.total} total`}>
        <Button onClick={() => setShowCreate(true)}>+ New Company</Button>
      </PageHeader>

      <SearchBar
        placeholder="Company name se search karein"
        status={query.status}
        statusOptions={STATUS_OPTIONS}
        onSearch={(search) => setQuery((prev) => ({ ...prev, search, page: 1 }))}
        onStatusChange={(status) => setQuery((prev) => ({ ...prev, status, page: 1 }))}
      />

      <Alert>{error}</Alert>

      <Table columns={COLUMNS} empty={loading ? 'Loading...' : 'Koi company nahi mili.'}>
        {result.items.map((company) => (
          <tr key={company._id}>
            <td>
              <Link to={`/superadmin/companies/${company._id}`} className="companies__name">
                {company.name}
              </Link>
              {company.address && <p className="companies__address">{company.address}</p>}
            </td>
            <td>{company.adminCount}</td>
            <td>{company.staffCount}</td>
            <td>
              <StatusBadge active={company.isActive} />
            </td>
            <td>{formatDate(company.createdAt)}</td>
            <td>
              <Button
                size="sm"
                variant={company.isActive ? 'danger' : 'secondary'}
                disabled={busyId === company._id}
                onClick={() => handleToggleStatus(company)}
              >
                {company.isActive ? 'Block' : 'Unblock'}
              </Button>
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
            <AdminForm values={form} errors={fieldErrors} onChange={handleFormChange} errorPrefix="admin." />
            <div className="companies__form-actions">
              <Button variant="secondary" onClick={closeCreate}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Create Company'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
