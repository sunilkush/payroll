import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  createAdminApi,
  getCompanyApi,
  setCompanyStatusApi,
  updateAdminApi,
  updateCompanyApi,
} from '../../../api/companyApi.js';
import AdminForm, { EMPTY_ADMIN, toAdminPayload } from '../../../components/AdminForm/AdminForm.jsx';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import StatusBadge from '../../../components/StatusBadge/StatusBadge.jsx';
import SummaryTiles from '../../../components/SummaryTiles/SummaryTiles.jsx';
import Table from '../../../components/Table/Table.jsx';
import UserCell from '../../../components/UserCell/UserCell.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { formatDate } from '../../../utils/format.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import './CompanyDetail.css';

const BACK = { to: '/superadmin/companies', label: 'Companies' };
const ADMIN_COLUMNS = ['Name', 'Email', 'Phone', 'Status', 'Added', 'Actions'];

export default function CompanyDetail() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const { toast, confirm } = useFeedback();
  // notify({ type: 'success' | 'error', text }): upar toast dikhata hai
  const notify = ({ type, text }) => text && toast[type](text);
  const [busy, setBusy] = useState(false);

  const [details, setDetails] = useState({ name: '', address: '' });
  const [detailErrors, setDetailErrors] = useState({});

  // modal: null | { type: 'add' } | { type: 'reset', admin }
  const [modal, setModal] = useState(null);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN);
  const [modalError, setModalError] = useState('');
  const [modalFieldErrors, setModalFieldErrors] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await getCompanyApi(id);
      setData(res.data);
      setDetails({ name: res.data.company.name, address: res.data.company.address });
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const closeModal = useCallback(() => {
    setModal(null);
    setAdminForm(EMPTY_ADMIN);
    setModalError('');
    setModalFieldErrors({});
  }, []);

  // Chhote actions (status toggle waghera) ka common wrapper.
  const run = async (action, successText) => {
    setBusy(true);
    try {
      await action();
      await load();
      notify({ type: 'success', text: successText });
    } catch (err) {
      notify({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (loadError && !data) {
    return (
      <section className="company-detail">
        <PageHeader title="Company" back={BACK} />
        <Alert>{loadError}</Alert>
      </section>
    );
  }
  if (!data) return <Loader />;

  const { company, admins, staffCount } = data;

  const handleDetailsChange = (event) => {
    setDetails((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleDetailsSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setDetailErrors({});
    try {
      await updateCompanyApi(id, details);
      await load();
      notify({ type: 'success', text: 'Company details saved.' });
    } catch (err) {
      setDetailErrors(toFieldErrors(err));
      notify({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleCompany = async () => {
    const ok = await confirm(
      company.isActive
        ? {
            title: `Block ${company.name}?`,
            content: 'All users of this company will be logged out immediately and will not be able to log in.',
            okText: 'Block',
            danger: true,
          }
        : { title: `Unblock ${company.name}?`, content: 'Users of this company will be able to log in again.', okText: 'Unblock' }
    );
    if (ok) run(() => setCompanyStatusApi(id, !company.isActive), `Company ${company.isActive ? 'blocked' : 'unblocked'}.`);
  };

  const handleToggleAdmin = async (admin) => {
    const ok = await confirm(
      admin.isActive
        ? {
            title: `Deactivate ${admin.name}?`,
            content: 'This admin will be logged out and will not be able to log in.',
            okText: 'Deactivate',
            danger: true,
          }
        : { title: `Activate ${admin.name}?`, content: 'This admin will be able to log in again.', okText: 'Activate' }
    );
    if (ok) run(() => updateAdminApi(id, admin._id, { isActive: !admin.isActive }), `${admin.name} ${admin.isActive ? 'deactivated' : 'activated'}.`);
  };

  const handleAdminFormChange = (event) => {
    setAdminForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleModalSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setModalError('');
    setModalFieldErrors({});
    try {
      if (modal.type === 'add') {
        await createAdminApi(id, toAdminPayload(adminForm));
      } else {
        await updateAdminApi(id, modal.admin._id, { password: adminForm.adminPassword });
      }
      const successText = modal.type === 'add' ? 'Admin added.' : 'Password reset.';
      closeModal();
      await load();
      notify({ type: 'success', text: successText });
    } catch (err) {
      setModalError(err.message);
      setModalFieldErrors(toFieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  const unchanged = details.name === company.name && details.address === company.address;

  return (
    <section className="company-detail">
      <PageHeader detail title={company.name} back={BACK}>
        <StatusBadge active={company.isActive} />
        <Button variant={company.isActive ? 'danger' : 'secondary'} disabled={busy} onClick={handleToggleCompany}>
          {company.isActive ? 'Block Company' : 'Unblock Company'}
        </Button>
      </PageHeader>

      <SummaryTiles
        items={[
          { label: 'Admins', value: admins.length },
          { label: 'Staff', value: staffCount },
          { label: 'Office locations', value: company.locations.length },
          {
            label: 'PF / ESI',
            value: `${company.settings.pfEnabled ? 'ON' : 'OFF'} / ${company.settings.esiEnabled ? 'ON' : 'OFF'}`,
          },
          { label: 'Created', value: formatDate(company.createdAt) },
        ]}
      />

      <form className="company-detail__card" onSubmit={handleDetailsSubmit} noValidate>
        <h2 className="company-detail__section-title">Company Details</h2>
        <FormField
          label="Company name"
          name="name"
          value={details.name}
          onChange={handleDetailsChange}
          error={detailErrors.name}
          required
        />
        <FormField
          label="Address"
          name="address"
          multiline
          value={details.address}
          onChange={handleDetailsChange}
          error={detailErrors.address}
        />
        <div className="company-detail__actions">
          <Button type="submit" disabled={busy || unchanged}>
            Save Changes
          </Button>
        </div>
      </form>

      <div className="company-detail__section-header">
        <h2 className="company-detail__section-title">Company Admins</h2>
        <Button size="sm" onClick={() => setModal({ type: 'add' })}>
          + Add Admin
        </Button>
      </div>

      <Table columns={ADMIN_COLUMNS} primary={0} empty='This company has no admin yet. Use "Add Admin" so someone can manage it.'>
        {admins.map((admin) => (
          <tr key={admin._id}>
            <td>
              <UserCell name={admin.name} />
            </td>
            <td>{admin.email}</td>
            <td>{admin.phone || '-'}</td>
            <td>
              <StatusBadge active={admin.isActive} inactiveLabel="Inactive" />
            </td>
            <td>{formatDate(admin.createdAt)}</td>
            <td>
              <div className="company-detail__row-actions">
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => setModal({ type: 'reset', admin })}>
                  Reset Password
                </Button>
                <Button
                  size="sm"
                  variant={admin.isActive ? 'danger' : 'secondary'}
                  disabled={busy}
                  onClick={() => handleToggleAdmin(admin)}
                >
                  {admin.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {modal && (
        <Modal title={modal.type === 'add' ? 'Add Admin' : `Reset Password: ${modal.admin.name}`} onClose={closeModal}>
          <form onSubmit={handleModalSubmit} noValidate>
            <Alert>{modalError}</Alert>
            {modal.type === 'add' ? (
              <AdminForm values={adminForm} errors={modalFieldErrors} onChange={handleAdminFormChange} />
            ) : (
              <FormField
                label="New password"
                name="adminPassword"
                type="password"
                autoComplete="new-password"
                value={adminForm.adminPassword}
                onChange={handleAdminFormChange}
                error={modalFieldErrors.password}
                hint="At least 8 characters"
                required
                autoFocus
              />
            )}
            <div className="company-detail__actions">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
