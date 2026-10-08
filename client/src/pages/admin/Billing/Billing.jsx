import { useCallback, useEffect, useState } from 'react';
import { CheckOutlined } from '@ant-design/icons';
import { Card, Progress } from 'antd';
import { cancelUpgradeRequestApi, getBillingApi, requestUpgradeApi } from '../../../api/billingApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Badge from '../../../components/Badge/Badge.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { formatDate } from '../../../utils/format.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import { PLANS } from '../../Landing/landingConfig.js';
import './Billing.css';

// Server ke plan ids (FREE, STARTER...) <-> landing page ke plans (free, starter...). Daam aur features wahin se.
const ORDER = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
const planOf = (id) => PLANS.find((plan) => plan.id === id.toLowerCase());
const rupees = (amount) => `₹${amount.toLocaleString('en-IN')}`;
const priceOf = (plan) => (plan.monthlyPrice === null ? 'Custom' : `${rupees(plan.monthlyPrice)} / month`);

// Admin: apna plan, kitne staff use ho rahe hain, aur upgrade ki request.
// Online payment abhi nahi hai: request Super Admin ke paas jati hai, wo manzoor kare to plan badal jata hai.
export default function Billing() {
  const { refresh } = useAuth();
  const { toast, confirm } = useFeedback();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(null); // jis plan ki request bhejni hai (server id)
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getBillingApi();
      setData(res.data);
      setError('');
      // Plan abhi-abhi manzoor hua ho to menu aur settings bhi naye plan ke hisaab se dikhen.
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }, [refresh]);

  useEffect(() => {
    load();
  }, [load]);

  const closeAsk = () => {
    setAsking(null);
    setNote('');
  };

  const handleRequest = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await requestUpgradeApi(asking, note);
      closeAsk();
      toast.success('Upgrade request sent. We will get in touch to complete it.');
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({ title: 'Cancel your upgrade request?', okText: 'Cancel Request', cancelText: 'Keep it', danger: true });
    if (!ok) return;
    try {
      await cancelUpgradeRequestApi();
      toast.success('Upgrade request cancelled.');
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Loader />;

  const current = planOf(data.plan);
  const { request } = data;
  const pending = request?.status === 'PENDING';
  const usage = data.staffLimit ? Math.round((data.activeStaff / data.staffLimit) * 100) : 0;

  return (
    <section className="billing">
      <PageHeader title="Plan & Billing" subtitle="Your plan, how much of it you use, and upgrades" />

      {pending && (
        <Alert type="info">
          Upgrade to {planOf(request.plan).name} requested on {formatDate(request.requestedAt)}. It is waiting for approval.{' '}
          <Button size="sm" variant="secondary" onClick={handleCancel}>
            Cancel request
          </Button>
        </Alert>
      )}
      {request?.status === 'REJECTED' && (
        <Alert>
          Your request for {planOf(request.plan).name} was not approved.{request.decisionNote && ` Note: ${request.decisionNote}`}
        </Alert>
      )}

      <Card size="small" className="billing__current">
        <p className="billing__label">Current plan</p>
        <p className="billing__plan">
          {current.name} <Badge tone="success">Active</Badge>
        </p>
        <p className="billing__muted">{priceOf(current)}</p>
        <div className="billing__usage">
          <p>
            <strong>{data.activeStaff}</strong> of {data.staffLimit ?? 'unlimited'} active staff
          </p>
          {data.staffLimit && <Progress percent={usage} showInfo={false} status={usage >= 100 ? 'exception' : 'normal'} />}
          {data.staffLimit && usage >= 100 && <p className="billing__muted">You have reached the limit. Upgrade to add more staff.</p>}
        </div>
      </Card>

      <h2 className="billing__heading">All plans</h2>
      <div className="billing__grid">
        {ORDER.map((id, index) => {
          const plan = planOf(id);
          const isCurrent = id === data.plan;
          const higher = index > ORDER.indexOf(data.plan);
          return (
            <Card key={id} size="small" className={`billing__card${isCurrent ? ' billing__card--current' : ''}`}>
              <p className="billing__card-name">{plan.name}</p>
              <p className="billing__card-price">{priceOf(plan)}</p>
              <p className="billing__muted">{plan.subtitle}</p>
              <ul className="billing__features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <CheckOutlined className="billing__check" /> {feature}
                  </li>
                ))}
              </ul>
              {isCurrent && <Badge tone="info">Your plan</Badge>}
              {higher && (
                <Button block disabled={pending} onClick={() => setAsking(id)}>
                  {pending && request.plan === id ? 'Requested' : `Request ${plan.name}`}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
      <p className="billing__muted">
        Online payment is not available yet. Send a request and we will contact you to complete the upgrade; your plan
        changes as soon as it is approved.
      </p>

      {asking && (
        <Modal title={`Request the ${planOf(asking).name} plan`} onClose={closeAsk}>
          <form onSubmit={handleRequest}>
            <p className="billing__muted">
              {priceOf(planOf(asking))}. We will contact you about payment; nothing is charged now.
            </p>
            <FormField
              label="Note (optional)"
              name="note"
              multiline
              maxLength={300}
              placeholder="Best time or number to reach you, or anything we should know"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              autoFocus
            />
            <div className="billing__modal-actions">
              <Button variant="secondary" onClick={closeAsk}>
                Close
              </Button>
              <Button type="submit" loading={busy}>
                Send Request
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
