import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  createAdminApi,
  decidePlanRequestApi,
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
import { planOptions, usePlans } from '../../../utils/usePlans.js';
import './CompanyDetail.css';

const BACK = { to: '/superadmin/companies', label: 'Companies' };
// Subscription ki aakhri tarikh <-> date field ('YYYY-MM-DD', India ke din ke hisaab se)
const toDateInput = (date) => (date ? new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '');
// Us din ke aakhir tak chalta hai.
const endOfDay = (dateInput) => `${dateInput}T23:59:59+05:30`;

const SUBSCRIPTION_LABEL = { TRIAL: 'Trial till', ACTIVE: 'Paid till', EXPIRED: 'Expired' };
const ADMIN_COLUMNS = ['Name', 'Email', 'Phone', 'Status', 'Added', 'Actions'];

export default function CompanyDetail() {
  const { id } = useParams();
  const plans = usePlans();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const { toast, confirm } = useFeedback();
  // notify({ type: 'success' | 'error', text }): upar toast dikhata hai
  const notify = ({ type, text }) => text && toast[type](text);
  const [busy, setBusy] = useState(false);

  const [details, setDetails] = useState({ name: '', address: '', plan: 'ENTERPRISE', validTill: '' });
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
      setDetails({
        name: res.data.company.name,
        address: res.data.company.address,
        plan: res.data.company.plan,
        validTill: toDateInput(res.data.subscription.endsAt),
      });
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

  const { company, admins, staffCount, subscription, payments } = data;
  // Plans ke naam aur staff ki hadd server se (Super Admin unhe Global Settings mein badalta hai)
  const PLAN_OPTIONS = planOptions(plans.data?.plans ?? []);

  // Admin ki upgrade request: manzoor karte hi plan badal jata hai.
  const handlePlanRequest = async (action) => {
    const approve = action === 'approve';
    const ok = await confirm({
      title: approve ? 'Approve this upgrade?' : 'Reject this upgrade request?',
      content: approve ? 'The company moves to the requested plan right away. Approve only after payment is settled.' : 'The plan stays as it is and the admin is told the request was not approved.',
      okText: approve ? 'Approve' : 'Reject',
      danger: !approve,
    });
    if (ok) run(() => decidePlanRequestApi(id, action), approve ? 'Plan upgraded.' : 'Request rejected.');
  };

  const handleDetailsChange = (event) => {
    setDetails((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleDetailsSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setDetailErrors({});
    try {
      // Tarikh badli ho tabhi bhejte hain: bhejte hi company par us din tak ka paid period lag jata hai.
      const { validTill, ...rest } = details;
      const dateChanged = validTill && validTill !== toDateInput(subscription.endsAt);
      await updateCompanyApi(id, { ...rest, ...(dateChanged && { paidUntil: endOfDay(validTill) }) });
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

  const unchanged =
    details.name === company.name &&
    details.address === company.address &&
    details.plan === company.plan &&
    (!details.validTill || details.validTill === toDateInput(subscription.endsAt));

  return (
    <section className="company-detail">
      <PageHeader detail title={company.name} back={BACK}>
        <StatusBadge active={company.isActive} />
        <Button variant={company.isActive ? 'danger' : 'secondary'} disabled={busy} onClick={handleToggleCompany}>
          {company.isActive ? 'Block Company' : 'Unblock Company'}
        </Button>
      </PageHeader>

      {company.planRequest?.status === 'PENDING' && (
        <Alert type="warning">
          <strong>Upgrade requested:</strong> {PLAN_OPTIONS.find((option) => option.value === company.planRequest.plan)?.label} ·{' '}
          {formatDate(company.planRequest.requestedAt)}
          {company.planRequest.amount?.total &&
            ` · collect ₹${company.planRequest.amount.total.toLocaleString('en-IN')} (1 year, incl. ${company.planRequest.amount.gstPercent}% GST)`}
          {company.planRequest.note && ` · "${company.planRequest.note}"`}{' '}
          <Button size="sm" disabled={busy} onClick={() => handlePlanRequest('approve')}>
            Approve
          </Button>{' '}
          <Button size="sm" variant="danger" disabled={busy} onClick={() => handlePlanRequest('reject')}>
            Reject
          </Button>
        </Alert>
      )}

      <SummaryTiles
        items={[
          { label: 'Plan', value: PLAN_OPTIONS.find((option) => option.value === company.plan)?.label.split(' (')[0] },
          { label: 'Admins', value: admins.length },
          { label: 'Staff', value: staffCount },
          { label: 'Office locations', value: company.locations.length },
          {
            label: 'PF / ESI',
            value: `${company.settings.pfEnabled ? 'ON' : 'OFF'} / ${company.settings.esiEnabled ? 'ON' : 'OFF'}`,
          },
          { label: 'Created', value: formatDate(company.createdAt) },
          // NONE: is company par trial / expiry ki koi rok nahi (Super Admin ki banayi ya purani company)
          {
            label: 'Subscription',
            value: subscription.status === 'NONE' ? 'No expiry' : `${SUBSCRIPTION_LABEL[subscription.status]} · ${formatDate(subscription.endsAt)}`,
          },
        ]}
      />

      {payments.length > 0 && (
        <div className="company-detail__card">
          <h2 className="company-detail__section-title">Online Payments</h2>
          <ul className="company-detail__payments">
            {payments.map((payment) => (
              <li key={payment._id}>
                <span>
                  {formatDate(payment.paidAt ?? payment.createdAt)} · {PLAN_OPTIONS.find((option) => option.value === payment.plan)?.label.split(' (')[0]}
                </span>
                <span>₹{payment.amount.total.toLocaleString('en-IN')}</span>
                <span>
                  {payment.status}
                  {payment.failureReason && ` (${payment.failureReason})`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
        <FormField
          label="Plan"
          name="plan"
          options={PLAN_OPTIONS}
          value={details.plan}
          onChange={handleDetailsChange}
          error={detailErrors.plan}
          hint={company.selfRegistered ? 'This company signed up on its own (free registration).' : 'Sets how many active staff the company can have.'}
        />
        <FormField
          label="Subscription valid till"
          name="validTill"
          type="date"
          value={details.validTill}
          onChange={handleDetailsChange}
          error={detailErrors.paidUntil}
          hint={
            subscription.status === 'NONE'
              ? 'No expiry right now. Set a date to put this company on a paid period: after that day staff cannot log in until it is renewed.'
              : 'The company and its staff can use the app till the end of this day. Move it forward to extend, or back to end it early.'
          }
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
