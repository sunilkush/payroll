import { useEffect, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { listClientsApi, setClientStatusApi } from '../../../api/clientApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import ListToolbar from '../../../components/ListToolbar/ListToolbar.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import StatusBadge from '../../../components/StatusBadge/StatusBadge.jsx';
import Table from '../../../components/Table/Table.jsx';
import UserCell from '../../../components/UserCell/UserCell.jsx';
import { useFeedback } from '../../../utils/useFeedback.js';
import './Clients.css';

const COLUMNS = ['Client', 'Contact Person', 'Phone', 'Address', 'Location', 'Status', 'Actions'];
const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function Clients() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, confirm } = useFeedback();

  const [query, setQuery] = useState({ search: '', status: 'all', page: 1 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState(null);

  // ClientForm save ke baad yahan message bhejta hai: ek baar toast dikha kar hata do.
  useEffect(() => {
    if (!location.state?.message) return;
    toast.success(location.state.message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate, toast]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    listClientsApi(query)
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

  const handleToggleStatus = async (client) => {
    const ok = await confirm(
      client.isActive
        ? {
            title: `Deactivate ${client.name}?`,
            content: 'New meetings cannot be created for this client. Past meetings are kept.',
            okText: 'Deactivate',
            danger: true,
          }
        : { title: `Activate ${client.name}?`, content: 'Meetings can be created for this client again.', okText: 'Activate' }
    );
    if (!ok) return;

    setBusyId(client._id);
    try {
      await setClientStatusApi(client._id, !client.isActive);
      toast.success(`${client.name} ${client.isActive ? 'deactivated' : 'activated'}.`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const filtering = Boolean(query.search) || query.status !== 'all';
  const addButton = (
    <Button icon={<PlusOutlined />} onClick={() => navigate('/admin/clients/new')}>
      Add Client
    </Button>
  );
  const empty = filtering ? (
    'No clients match this search / filter.'
  ) : (
    <div className="clients__empty">
      <p>No clients yet. Add a client to start scheduling sales meetings.</p>
      {addButton}
    </div>
  );

  return (
    <section className="clients">
      <PageHeader title="Clients" subtitle="Companies your sales team meets">
        {addButton}
      </PageHeader>

      <ListToolbar
        searchPlaceholder="Search by client, contact person or phone"
        onSearch={(search) => setQuery((prev) => (prev.search === search ? prev : { ...prev, search, page: 1 }))}
        tabs={STATUS_TABS}
        counts={result.counts}
        value={query.status}
        onChange={(status) => setQuery((prev) => ({ ...prev, status, page: 1 }))}
      />

      <Alert>{error}</Alert>

      <Table columns={COLUMNS} primary={0} loading={loading} empty={empty}>
        {result.items.map((client) => (
          <tr key={client._id}>
            <td>
              <UserCell square name={client.name} sub={client.email} to={`/admin/clients/${client._id}`} />
            </td>
            <td>{client.contactPerson}</td>
            <td>{client.phone}</td>
            <td>{client.address}</td>
            <td>{client.lat == null ? <span className="clients__muted">Not set</span> : 'Pinned on map'}</td>
            <td>
              <StatusBadge active={client.isActive} inactiveLabel="Inactive" />
            </td>
            <td>
              <div className="clients__row-actions">
                <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/clients/${client._id}`)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant={client.isActive ? 'danger' : 'secondary'}
                  loading={busyId === client._id}
                  onClick={() => handleToggleStatus(client)}
                >
                  {client.isActive ? 'Deactivate' : 'Activate'}
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
