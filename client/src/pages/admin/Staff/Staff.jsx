import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listStaffApi, setStaffStatusApi } from '../../../api/staffApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import SearchBar from '../../../components/SearchBar/SearchBar.jsx';
import StatusBadge from '../../../components/StatusBadge/StatusBadge.jsx';
import Table from '../../../components/Table/Table.jsx';
import { formatCurrency, formatDate, grossSalary } from '../../../utils/format.js';
import './Staff.css';

const COLUMNS = ['Code', 'Name', 'Joining', 'Monthly Gross', 'PF / ESI', 'Status', 'Actions'];
const STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function Staff() {
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState({ search: '', status: 'all', page: 1 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    listStaffApi(query)
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

  const handleToggleStatus = async (staff) => {
    const action = staff.isActive ? 'deactivate' : 'activate';
    const warning = staff.isActive ? '\nThis staff member will not be able to log in.' : '';
    if (!window.confirm(`${action === 'deactivate' ? 'Deactivate' : 'Activate'} ${staff.name}?${warning}`)) return;

    setBusyId(staff._id);
    try {
      await setStaffStatusApi(staff._id, !staff.isActive);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="staff">
      <PageHeader title="Staff" subtitle={`${result.total} total`}>
        <Button onClick={() => navigate('/admin/staff/new')}>+ Add Staff</Button>
      </PageHeader>

      {/* StaffForm save ke baad yahan message bhejta hai */}
      <Alert type="success">{location.state?.message}</Alert>

      <SearchBar
        placeholder="Search by name, email or employee code"
        status={query.status}
        statusOptions={STATUS_OPTIONS}
        onSearch={(search) => setQuery((prev) => ({ ...prev, search, page: 1 }))}
        onStatusChange={(status) => setQuery((prev) => ({ ...prev, status, page: 1 }))}
      />

      <Alert>{error}</Alert>

      <Table columns={COLUMNS} empty={loading ? 'Loading...' : 'No staff found.'}>
        {result.items.map((staff) => (
          <tr key={staff._id}>
            <td>{staff.employeeCode}</td>
            <td>
              <Link to={`/admin/staff/${staff._id}`} className="staff__name">
                {staff.name}
              </Link>
              <p className="staff__contact">{staff.email}</p>
            </td>
            <td>{formatDate(staff.joiningDate)}</td>
            <td>{formatCurrency(grossSalary(staff.salaryStructure))}</td>
            <td>
              {staff.pfApplicable ? 'Yes' : 'No'} / {staff.esiApplicable ? 'Yes' : 'No'}
            </td>
            <td>
              <StatusBadge active={staff.isActive} inactiveLabel="Inactive" />
            </td>
            <td>
              <div className="staff__row-actions">
                <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/staff/${staff._id}`)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant={staff.isActive ? 'danger' : 'secondary'}
                  disabled={busyId === staff._id}
                  onClick={() => handleToggleStatus(staff)}
                >
                  {staff.isActive ? 'Deactivate' : 'Activate'}
                </Button>
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
    </section>
  );
}
