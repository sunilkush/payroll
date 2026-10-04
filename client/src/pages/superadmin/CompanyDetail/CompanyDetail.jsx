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
import { toFieldErrors } from '../../../utils/formErrors.js';
import { formatDate } from '../../../utils/format.js';
import './CompanyDetail.css';

const BACK = { to: '/superadmin/companies', label: 'Companies' };
const ADMIN_COLUMNS = ['Name', 'Email', 'Phone', 'Status', 'Added', 'Actions'];

export default function CompanyDetail() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState({ type: 'success', text: '' });
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
    setMessage({ type: 'success', text: '' });
    try {
      await action();
      await load();
      setMessage({ type: 'success', text: successText });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
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
    setMessage({ type: 'success', text: '' });
    try {
      await updateCompanyApi(id, details);
      await load();
      setMessage({ type: 'success', text: 'Company details save ho gayi.' });
    } catch (err) {
      setDetailErrors(toFieldErrors(err));
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleCompany = () => {
    const action = company.isActive ? 'block' : 'unblock';
    const warning = company.isActive ? '\nIs company ke saare users login nahi kar payenge.' : '';
    if (!window.confirm(`"${company.name}" ko ${action} karna hai?${warning}`)) return;
    run(() => setCompanyStatusApi(id, !company.isActive), `Company ${action} ho gayi.`);
  };

  const handleToggleAdmin = (admin) => {
    const action = admin.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`${admin.name} ko ${action} karna hai?`)) return;
    run(() => updateAdminApi(id, admin._id, { isActive: !admin.isActive }), `Admin ${action} ho gaya.`);
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
      const successText = modal.type === 'add' ? 'Admin add ho gaya.' : 'Password reset ho gaya.';
      closeModal();
      await load();
      setMessage({ type: 'success', text: successText });
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
      <PageHeader title={company.name} back={BACK}>
        <StatusBadge active={company.isActive} />
        <Button variant={company.isActive ? 'danger' : 'secondary'} disabled={busy} onClick={handleToggleCompany}>
          {company.isActive ? 'Block Company' : 'Unblock Company'}
        </Button>
      </PageHeader>

      <Alert type={message.type}>{message.text}</Alert>

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

      <Table columns={ADMIN_COLUMNS} empty="Is company ka abhi koi admin nahi hai.">
        {admins.map((admin) => (
          <tr key={admin._id}>
            <td>{admin.name}</td>
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
                hint="Kam se kam 8 characters"
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
