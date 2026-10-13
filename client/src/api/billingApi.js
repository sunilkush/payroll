import api from './axiosInstance.js';
import { downloadFile } from './download.js';

// Admin: { plan, staffLimit, activeStaff, features, request, subscription, quotes, onlinePayment, billing }
export const getBillingApi = () => api.get('/billing');
// plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
export const requestUpgradeApi = (plan, note) => api.post('/billing/upgrade-request', { plan, note });
export const cancelUpgradeRequestApi = () => api.delete('/billing/upgrade-request');

// Online payment (Razorpay). payload: { plan, state, gstin? } -> { keyId, orderId, amount (paise), currency, name, description, prefill }
export const checkoutApi = (payload) => api.post('/billing/checkout', payload);
// Razorpay Checkout ke baad: { orderId, paymentId, signature } -> payment pakki, plan chalu
export const verifyPaymentApi = (payload) => api.post('/billing/verify', payload);

export const listInvoicesApi = () => api.get('/billing/invoices');
export const downloadInvoice = (invoice) =>
  downloadFile(`/billing/invoices/${invoice._id}/pdf`, { filename: `invoice-${invoice.number.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf` });
