import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Razorpay se baat. Teen haalat (mailService jaisa):
//   live    keys di hain: asli order Razorpay par banta hai
//   memory  tests: Razorpay tak kuch nahi jata, order yahin ban jata hai. Signature ki jaanch asli hi hoti hai.
//   off     keys nahi: online payment band
const { keyId, keySecret, webhookSecret } = env.razorpay;
const mode = !keyId || !keySecret ? 'off' : env.nodeEnv === 'test' ? 'memory' : 'live';

export const paymentsEnabled = () => mode !== 'off';

const hmac = (secret, text) => crypto.createHmac('sha256', secret).update(text).digest('hex');
// Barabar lambai par hi timingSafeEqual chalta hai; galat lambai waise bhi galat signature hai.
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// rupees: total rakam. Razorpay paise mein leta hai. Return: { id, amount (paise), currency }
export async function createOrder({ rupees, receipt, notes }) {
  if (mode === 'off') throw new ApiError(503, 'Online payment is not set up. Please send an upgrade request instead.');
  const amount = Math.round(rupees * 100);
  if (mode === 'memory') return { id: `order_test_${crypto.randomBytes(8).toString('hex')}`, amount, currency: 'INR' };

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({ amount, currency: 'INR', receipt, notes }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[razorpay] order failed:', response.status, body.error?.description);
    throw new ApiError(502, 'Could not start the payment. Please try again in a moment.');
  }
  return { id: body.id, amount: body.amount, currency: body.currency };
}

// Checkout ke baad browser jo teen cheezein deta hai unki jaanch: signature = HMAC(order_id|payment_id, key secret).
export const isValidPaymentSignature = ({ orderId, paymentId, signature }) =>
  safeEqual(hmac(keySecret, `${orderId}|${paymentId}`), String(signature));

// Webhook: signature = HMAC(request ka kachcha body, webhook secret). Secret na ho to koi webhook nahi maana jata.
export const isValidWebhookSignature = (rawBody, signature) =>
  Boolean(webhookSecret && rawBody && signature) && safeEqual(hmac(webhookSecret, rawBody), String(signature));

export const razorpayKeyId = () => keyId;
