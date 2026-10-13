import { env } from '../config/env.js';
import { Company } from '../models/Company.js';
import { Counter, Invoice } from '../models/Invoice.js';
import { PAYMENT_STATUS, Payment } from '../models/Payment.js';
import { ApiError } from '../utils/ApiError.js';
import { PLAN_REQUEST_STATUS } from '../utils/constants.js';
import { toDateStr } from '../utils/dateUtil.js';
import { getTenantId } from '../utils/tenantContext.js';
import { assertCanChoose, planChange } from './billingService.js';
import { planLabel } from './planService.js';
import { createOrder, isValidPaymentSignature, isValidWebhookSignature, razorpayKeyId } from './razorpayService.js';
import { paidPeriodChange, quoteFor } from './subscriptionService.js';

// Online payment (Razorpay) aur GST invoice.
//   1. checkout: admin plan chunta hai -> Razorpay order + Payment (CREATED)
//   2. payment pakki: browser se (confirmPayment) ya Razorpay ke webhook se, jo pehle aaye. Dono activate() tak jate hain,
//      jo ek hi baar chalta hai: plan chalu, expiry payment ke din se ek saal, invoice ban jata hai.
// Payment aur Invoice mein companyId khud dete hain: webhook tenant context ke bahar chalta hai.

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const sameState = (a, b) => Boolean(a && b) && a.trim().toLowerCase() === b.trim().toLowerCase();

// ---------- Checkout ----------

export async function startCheckout(admin, { plan, gstin, state }) {
  const company = await Company.findById(getTenantId());
  if (!company) throw new ApiError(404, 'Company not found.');
  assertCanChoose(company, plan);
  const amount = quoteFor(plan);
  if (!amount) {
    throw new ApiError(400, `The ${planLabel(plan)} plan cannot be bought online. Please send a request and we will contact you.`);
  }

  const order = await createOrder({
    rupees: amount.total,
    receipt: `co_${company._id}_${Date.now()}`.slice(0, 40), // Razorpay: 40 akshar tak
    notes: { companyId: String(company._id), plan },
  });
  const buyer = { gstin: gstin || undefined, state };
  await Payment.create({ companyId: company._id, plan, amount, buyer, orderId: order.id, createdBy: admin._id });
  // Agli baar form mein yahi bhara mile.
  await Company.updateOne({ _id: company._id }, { $set: { billing: buyer } });

  // Itna hi browser ke Razorpay Checkout ko chahiye. Key id public hoti hai; secret kabhi bahar nahi jata.
  return {
    keyId: razorpayKeyId(),
    orderId: order.id,
    amount: order.amount, // paise
    currency: order.currency,
    name: env.gst.sellerName,
    description: `${planLabel(plan)} plan, ${amount.months} months`,
    prefill: { name: admin.name, email: admin.email, contact: admin.phone || '' },
  };
}

// ---------- Invoice ----------

// Financial year April se: 2026-10-13 -> '2026-27'
function financialYear(date) {
  const [year, month] = toDateStr(date).split('-').map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

async function nextInvoiceNumber(date) {
  const year = financialYear(date);
  const counter = await Counter.findOneAndUpdate({ key: `invoice-${year}` }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `${env.gst.invoicePrefix}/${year}/${String(counter.seq).padStart(4, '0')}`;
}

async function createInvoice(payment, company, period) {
  const { amount } = payment;
  // Kharidne wala bechne wale ke hi state ka: CGST + SGST (aadha-aadha). Warna IGST.
  const intraState = sameState(payment.buyer?.state, env.gst.state);
  const cgst = intraState ? round2(amount.gst / 2) : 0;
  const tax = intraState ? { cgst, sgst: round2(amount.gst - cgst), igst: 0 } : { cgst: 0, sgst: 0, igst: amount.gst };

  const date = payment.paidAt;
  return Invoice.create({
    companyId: company._id,
    paymentId: payment._id,
    number: await nextInvoiceNumber(date),
    date,
    seller: { name: env.gst.sellerName, address: env.gst.sellerAddress, gstin: env.gst.gstin, state: env.gst.state },
    buyer: { name: company.name, address: company.address, gstin: payment.buyer?.gstin, state: payment.buyer?.state },
    description: `PayRoster ${planLabel(payment.plan)} plan subscription (${amount.months} months @ Rs. ${amount.monthlyPrice} / month)`,
    sac: env.gst.sac,
    periodFrom: period.from,
    periodTo: period.to,
    taxable: amount.subtotal,
    gstPercent: amount.gstPercent,
    ...tax,
    total: amount.total,
    razorpayPaymentId: payment.paymentId,
  });
}

// ---------- Payment pakki ----------

// Order ko PAID karta hai aur plan chalu karta hai. Browser aur webhook dono yahan aate hain; pehla hi kaam karta hai
// (status ek hi update mein badalta hai), doosre ko wahi payment wapas milti hai.
async function activate(orderId, razorpayPaymentId) {
  const payment = await Payment.findOneAndUpdate(
    { orderId, status: { $ne: PAYMENT_STATUS.PAID } },
    { $set: { status: PAYMENT_STATUS.PAID, paymentId: razorpayPaymentId, paidAt: new Date() }, $unset: { failureReason: 1 } },
    { new: true }
  );
  if (!payment) {
    const existing = await Payment.findOne({ orderId });
    if (!existing) throw new ApiError(404, 'Payment not found.');
    return existing;
  }

  const company = await Company.findById(payment.companyId);
  const periodChange = paidPeriodChange(company, payment.paidAt, { start: true });
  const to = periodChange['subscription.paidUntil'];
  const changes = { ...planChange(payment.plan), ...periodChange };
  // Isi plan ki request pending thi to wo ab poori ho gayi.
  if (company.planRequest?.status === PLAN_REQUEST_STATUS.PENDING) {
    Object.assign(changes, {
      'planRequest.status': PLAN_REQUEST_STATUS.APPROVED,
      'planRequest.decidedAt': payment.paidAt,
      'planRequest.decisionNote': 'Paid online',
    });
  }
  await Company.updateOne({ _id: company._id }, { $set: changes });

  // Service ka period: payment ke din se expiry tak.
  const invoice = await createInvoice(payment, company, { from: payment.paidAt, to });
  payment.invoiceId = invoice._id;
  await payment.save();
  return payment;
}

// Checkout ke baad browser ka jawab. Signature sahi ho tabhi maante hain, aur order isi company ka ho.
export async function confirmPayment({ orderId, paymentId, signature }) {
  if (!isValidPaymentSignature({ orderId, paymentId, signature })) {
    throw new ApiError(400, 'We could not verify this payment. If money was deducted, it will be confirmed automatically in a few minutes.');
  }
  // Tenant scope ke andar: doosri company ka order yahan milta hi nahi.
  if (!(await Payment.exists({ orderId }))) throw new ApiError(404, 'Payment not found.');
  return activate(orderId, paymentId);
}

// Razorpay ka webhook (bina login; bharosa sirf signature par). Browser band ho jaye tab bhi payment pakki hoti hai.
export async function handleWebhook(rawBody, signature) {
  if (!isValidWebhookSignature(rawBody, signature)) throw new ApiError(400, 'Invalid webhook signature.');
  const event = JSON.parse(rawBody);
  const entity = event.payload?.payment?.entity;
  if (!entity?.order_id) return;

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    // Anjaan order (kisi aur app ka) par chup: Razorpay ko 200 hi milna chahiye, warna wo baar-baar bhejta hai.
    if (await Payment.exists({ orderId: entity.order_id })) await activate(entity.order_id, entity.id);
  } else if (event.event === 'payment.failed') {
    await Payment.updateOne(
      { orderId: entity.order_id, status: PAYMENT_STATUS.CREATED },
      { $set: { status: PAYMENT_STATUS.FAILED, failureReason: entity.error_description || 'Payment failed' } }
    );
  }
}

// ---------- Read ----------

// Admin: apni company ke invoices. Super Admin (companyId dekar): kisi bhi company ke.
export const listInvoices = (companyId) =>
  Invoice.find(companyId ? { companyId } : {})
    .sort({ date: -1 })
    .limit(100);

export const listPayments = (companyId) =>
  Payment.find({ companyId })
    .sort({ createdAt: -1 })
    .limit(50);

export async function getInvoice(id) {
  const invoice = await Invoice.findById(id);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');
  return invoice;
}
