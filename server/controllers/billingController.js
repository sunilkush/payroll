import * as billingService from '../services/billingService.js';
import { writeInvoicePdf } from '../services/invoicePdfService.js';
import * as paymentService from '../services/paymentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const get = asyncHandler(async (req, res) => {
  const data = await billingService.getBilling();
  res.json({ success: true, data });
});

export const requestUpgrade = asyncHandler(async (req, res) => {
  const request = await billingService.requestUpgrade(req.user, req.body);
  res.status(201).json({ success: true, data: { request } });
});

export const cancelRequest = asyncHandler(async (req, res) => {
  await billingService.cancelUpgradeRequest();
  res.json({ success: true });
});

// ---------- Online payment (Razorpay) + invoices ----------

export const checkout = asyncHandler(async (req, res) => {
  const data = await paymentService.startCheckout(req.user, req.body);
  res.status(201).json({ success: true, data });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.confirmPayment(req.body);
  res.json({ success: true, data: { payment } });
});

export const invoices = asyncHandler(async (req, res) => {
  const items = await paymentService.listInvoices();
  res.json({ success: true, data: { items } });
});

export const invoicePdf = asyncHandler(async (req, res) => {
  const invoice = await paymentService.getInvoice(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.number.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf"`);
  writeInvoicePdf(invoice, res);
});

// Razorpay ka webhook: bina login, bharosa sirf signature par. Jaldi 200 dena zaroori hai, warna Razorpay dobara bhejta hai.
export const razorpayWebhook = asyncHandler(async (req, res) => {
  await paymentService.handleWebhook(req.rawBody?.toString('utf8'), req.get('x-razorpay-signature'));
  res.json({ success: true });
});
