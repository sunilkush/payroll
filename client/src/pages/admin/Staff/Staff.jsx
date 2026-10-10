import { useEffect, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { listStaffApi, setStaffStatusApi } from '../../../api/staffApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import ListToolbar from '../../../components/ListToolbar/ListToolbar.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import StatusBadge from '../../../components/StatusBadge/StatusBadge.jsx';
import Table from '../../../components/Table/Table.jsx';
import UserCell from '../../../components/UserCell/UserCell.jsx';
import { formatCurrency, formatDate, grossSalary } from '../../../utils/format.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import './Staff.css';

const COLUMNS = ['Staff', 'Code', 'Joining', 'Monthly Gross', 'PF / ESI', 'Status', 'Actions'];
const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function Staff() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, confirm } = useFeedback();

  const [query, setQuery] = useState({ search: '', status: 'all', page: 1 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState(null);

  // StaffForm save ke baad yahan message bhejta hai: ek baar toast dikha kar hata do
  // (warna page refresh par dobara dikhta).
  useEffect(() => {
    if (!location.state?.message) return;
    toast.success(location.state.message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate, toast]);

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
    const ok = await confirm(
      staff.isActive
        ? {
            title: `Deactivate ${staff.name}?`,
            content: 'They will be logged out and will not be able to log in. Their attendance and payroll history is kept.',
            okText: 'Deactivate',
            danger: true,
          }
        : { title: `Activate ${staff.name}?`, content: 'They will be able to log in again.', okText: 'Activate' }
    );
    if (!ok) return;

    setBusyId(staff._id);
    try {
      await setStaffStatusApi(staff._id, !staff.isActive);
      toast.success(`${staff.name} ${staff.isActive ? 'deactivated' : 'activated'}.`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const filtering = Boolean(query.search) || query.status !== 'all';
  const addButton = (
    <Button icon={<PlusOutlined />} onClick={() => navigate('/admin/staff/new')}>
      Add Staff
    </Button>
  );
  const empty = filtering ? (
    'No staff match this search / filter.'
  ) : (
    <div className="staff__empty">
      <p>No staff yet. Add your first staff member to start tracking attendance and payroll.</p>
      {addButton}
    </div>
  );

  return (
    <section className="staff">
      <PageHeader title="Staff" subtitle="Add staff, set salary structure and manage access">
        {addButton}
      </PageHeader>

      <ListToolbar
        searchPlaceholder="Search by name, email or employee code"
        onSearch={(search) => setQuery((prev) => (prev.search === search ? prev : { ...prev, search, page: 1 }))}
        tabs={STATUS_TABS}
        counts={result.counts}
        value={query.status}
        onChange={(status) => setQuery((prev) => ({ ...prev, status, page: 1 }))}
      />

      <Alert>{error}</Alert>

      <Table columns={COLUMNS} primary={0} loading={loading} empty={empty}>
        {result.items.map((staff) => (
          <tr key={staff._id}>
            <td>
              <UserCell
                name={staff.name}
                sub={[staff.designation, staff.department, staff.email].filter(Boolean).join(' • ')}
                to={`/admin/staff/${staff._id}`}
              />
            </td>
            <td>{staff.employeeCode}</td>
            <td>{formatDate(staff.joiningDate)}</td>
            <td className="staff__gross">{formatCurrency(grossSalary(staff.salaryStructure))}</td>
            <td>
              <Tag color={staff.pfApplicable ? 'blue' : 'default'}>PF {staff.pfApplicable ? 'Yes' : 'No'}</Tag>
              <Tag color={staff.esiApplicable ? 'blue' : 'default'}>ESI {staff.esiApplicable ? 'Yes' : 'No'}</Tag>
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
                  loading={busyId === staff._id}
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
