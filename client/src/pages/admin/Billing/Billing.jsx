import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckOutlined } from '@ant-design/icons';
import { Card, Progress } from 'antd';
import {
  cancelUpgradeRequestApi,
  checkoutApi,
  downloadInvoice,
  getBillingApi,
  listInvoicesApi,
  requestUpgradeApi,
  verifyPaymentApi,
} from '../../../api/billingApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Badge from '../../../components/Badge/Badge.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { clearChosenPlan } from '../../../utils/chosenPlan.js';
import { formatDate } from '../../../utils/format.js';
import { STATE_OPTIONS } from '../../../utils/indianStates.js';
import { openCheckout } from '../../../utils/razorpay.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import { getPlansApi, planBullets } from '../../../utils/usePlans.js';
import './Billing.css';

// Packages (naam, features, staff ki hadd) aur daam, GST, total sab server se aate hain (Super Admin badalta hai),
// taaki jo dikhe wahi charge ho.
const rupees = (amount) => `₹${amount.toLocaleString('en-IN')}`;

// Admin: apna plan, kitne staff use ho rahe hain, plan lena aur invoices.
// Razorpay laga ho (data.onlinePayment) to seedha payment; warna request Super Admin ke paas jati hai.
export default function Billing() {
  const { refresh } = useAuth();
  const { toast, confirm } = useFeedback();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [catalog, setCatalog] = useState(null); // { plans, billing, featureLabels }
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(null); // jo plan lena hai (server id)
  const [note, setNote] = useState('');
  const [buyer, setBuyer] = useState({ state: '', gstin: '' }); // GST invoice ke liye
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [res, invoiceRes, planRes] = await Promise.all([getBillingApi(), listInvoicesApi(), getPlansApi()]);
      setCatalog(planRes.data);
      setData(res.data);
      setInvoices(invoiceRes.data.items);
      setError('');
      // Plan abhi-abhi chalu hua ho to menu aur settings bhi naye plan ke hisaab se dikhen.
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }, [refresh]);

  useEffect(() => {
    load();
  }, [load]);

  const openAsk = (id) => {
    // Pichhli baar bhara hua state / GSTIN pehle se
    setBuyer({ state: data.billing.state ?? '', gstin: data.billing.gstin ?? '' });
    setFormError('');
    setAsking(id);
  };

  // Landing page par chuna hua plan (?plan=PROFESSIONAL): page khulte hi usi ka "Buy" samne. Ek hi baar.
  const wanted = searchParams.get('plan');
  useEffect(() => {
    if (!wanted || !data) return;
    clearChosenPlan();
    setSearchParams({}, { replace: true });
    if (data.canChoose[wanted]) {
      setBuyer({ state: data.billing.state ?? '', gstin: data.billing.gstin ?? '' });
      setAsking(wanted);
    }
  }, [wanted, data, setSearchParams]);

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

  // Online payment: server par order -> Razorpay ki khidki -> server par jaanch -> plan chalu.
  const handlePay = async (event) => {
    event.preventDefault();
    if (!buyer.state) {
      setFormError('Choose your state. It decides the GST on your invoice.');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      const order = await checkoutApi({ plan: asking, state: buyer.state, gstin: buyer.gstin });
      const payment = await openCheckout(order.data);
      if (!payment) return; // user ne khidki band kar di
      await verifyPaymentApi(payment);
      closeAsk();
      toast.success('Payment received. Your plan is active.');
      await load();
    } catch (err) {
      setFormError(err.errors?.[0]?.message || err.message);
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

  const handleDownload = (invoice) => downloadInvoice(invoice).catch((err) => toast.error(err.message));

  if (error) return <Alert>{error}</Alert>;
  if (!data || !catalog) return <Loader />;

  // Plans chhote se bade aate hain; isi order se "bada plan" tay hota hai.
  const ORDER = catalog.plans.map((plan) => plan.code);
  const planOf = (code) => catalog.plans.find((plan) => plan.code === code);
  const current = planOf(data.plan);
  const { request, quotes } = data;
  const pending = request?.status === 'PENDING';
  const usage = data.staffLimit ? Math.round((data.activeStaff / data.staffLimit) * 100) : 0;
  // Free trial / paid period: { status: NONE | TRIAL | ACTIVE | EXPIRED, endsAt, daysLeft }. NONE = koi rok nahi.
  const { subscription } = data;
  const expired = subscription.status === 'EXPIRED';
  const onTrial = subscription.status === 'TRIAL';
  const daysText = `${subscription.daysLeft} day${subscription.daysLeft === 1 ? '' : 's'}`;
  // quotes[id]: { monthlyPrice, months, subtotal, gstPercent, gst, total } ya null (Free / Custom)
  const priceOf = (id) => (id === 'FREE' ? `${rupees(0)} / month` : quotes[id] ? `${rupees(quotes[id].monthlyPrice)} / month` : 'Custom');
  const quote = asking ? quotes[asking] : null;
  // Jis plan ka tay daam hai wahi online bikta hai; Custom ke liye request hi.
  const payNow = Boolean(data.onlinePayment && quote);
  const billingTerms = Object.values(quotes).find(Boolean);

  return (
    <section className="billing">
      <PageHeader title="Plan & Billing" subtitle="Your plan, how much of it you use, and upgrades" />

      {expired && (
        <Alert>
          Your {data.plan === 'FREE' ? 'free trial' : 'subscription'} ended on {formatDate(subscription.endsAt)}. Your staff
          cannot log in and the rest of the app is locked until you choose a plan below. Your data is safe; everything
          comes back as soon as the plan is active.
        </Alert>
      )}
      {!expired && subscription.daysLeft !== null && subscription.daysLeft <= 15 && (
        <Alert type="warning">
          Your {onTrial ? 'free trial' : 'subscription'} ends in {daysText} ({formatDate(subscription.endsAt)}). Choose a
          plan before then to keep your team working without a break.
        </Alert>
      )}
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
          {current.name}{' '}
          {expired ? <Badge tone="danger">Expired</Badge> : <Badge tone="success">{onTrial ? 'Free trial' : 'Active'}</Badge>}
        </p>
        <p className="billing__muted">{priceOf(data.plan)}</p>
        {!expired && subscription.endsAt && (
          <p className="billing__muted">
            {onTrial ? 'Free trial ends' : 'Paid until'} {formatDate(subscription.endsAt)} ({daysText} left)
          </p>
        )}
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
          // Kaun sa plan liya ja sakta hai ye server batata hai (trial mein koi bhi paid plan; baad mein bada ya renew).
          const allowed = data.canChoose[id];
          const online = Boolean(data.onlinePayment && quotes[id]);
          // Jo plan pehle se paid chal raha hai uska agla period "Renew" hai; trial wala abhi kharida hi nahi gaya.
          const action = isCurrent && subscription.status === 'ACTIVE' ? 'Renew' : online ? 'Buy' : 'Request';
          return (
            <Card key={id} size="small" className={`billing__card${isCurrent ? ' billing__card--current' : ''}`}>
              <p className="billing__card-name">{plan.name}</p>
              <p className="billing__card-price">{priceOf(id)}</p>
              <p className="billing__muted">{plan.subtitle}</p>
              <ul className="billing__features">
                {planBullets(plan, catalog.featureLabels).map((feature) => (
                  <li key={feature}>
                    <CheckOutlined className="billing__check" /> {feature}
                  </li>
                ))}
              </ul>
              {isCurrent && <Badge tone="info">Your plan</Badge>}
              {allowed && (
                // Request pending ho tab bhi online payment khula rehta hai (payment hote hi request poori ho jati hai).
                <Button block disabled={pending && !online} onClick={() => openAsk(id)}>
                  {pending && !online && request.plan === id ? 'Requested' : `${action} ${plan.name}`}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
      {billingTerms && (
        <p className="billing__muted">
          Prices are per month and are billed for {billingTerms.months} months in advance, plus {billingTerms.gstPercent}% GST.{' '}
          {data.onlinePayment
            ? 'Your plan starts as soon as the payment is done, and the GST invoice appears below.'
            : 'Online payment is not available yet. Send a request and we will contact you to complete the payment; your plan starts as soon as it is approved.'}
        </p>
      )}

      {invoices.length > 0 && (
        <>
          <h2 className="billing__heading">Invoices</h2>
          <Card size="small">
            <ul className="billing__invoices">
              {invoices.map((invoice) => (
                <li key={invoice._id}>
                  <span>
                    <strong>{invoice.number}</strong>
                    <span className="billing__muted"> · {formatDate(invoice.date)}</span>
                  </span>
                  <span>{rupees(invoice.total)}</span>
                  <Button size="sm" variant="secondary" onClick={() => handleDownload(invoice)}>
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {asking && (
        <Modal title={`${payNow ? 'Buy' : 'Request'} the ${planOf(asking).name} plan`} onClose={closeAsk}>
          <form onSubmit={payNow ? handlePay : handleRequest}>
            {!payNow && (
              <p className="billing__muted">{priceOf(asking)}. We will contact you about payment; nothing is charged now.</p>
            )}
            {/* Daam mahine ka dikhta hai, par payment ek saath kai mahino ki hoti hai, upar se GST (hisaab server ka). */}
            {quote && (
              <dl className="billing__quote">
                <dt>
                  {rupees(quote.monthlyPrice)} × {quote.months} months
                </dt>
                <dd>{rupees(quote.subtotal)}</dd>
                <dt>GST ({quote.gstPercent}%)</dt>
                <dd>{rupees(quote.gst)}</dd>
                <dt className="billing__quote-total">Total for {quote.months} months</dt>
                <dd className="billing__quote-total">{rupees(quote.total)}</dd>
              </dl>
            )}
            {payNow ? (
              <>
                {formError && <Alert>{formError}</Alert>}
                <FormField
                  label="State (for the GST invoice)"
                  name="state"
                  required
                  searchable
                  options={STATE_OPTIONS}
                  placeholder="Choose your state"
                  value={buyer.state || undefined}
                  onChange={(event) => setBuyer((previous) => ({ ...previous, state: event.target.value }))}
                />
                <FormField
                  label="GSTIN (optional)"
                  name="gstin"
                  maxLength={15}
                  placeholder="15-character GSTIN, if your company has one"
                  value={buyer.gstin}
                  onChange={(event) => setBuyer((previous) => ({ ...previous, gstin: event.target.value.toUpperCase() }))}
                />
              </>
            ) : (
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
            )}
            <div className="billing__modal-actions">
              <Button variant="secondary" onClick={closeAsk}>
                Close
              </Button>
              <Button type="submit" loading={busy}>
                {payNow ? `Pay ${rupees(quote.total)}` : 'Send Request'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
