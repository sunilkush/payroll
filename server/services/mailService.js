import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Email bhejna (verification code, password reset). Teen haalat:
//   smtp    server/.env mein SMTP_HOST diya hai: asli email jati hai
//   memory  tests: email kahin nahi jati, `outbox` mein jama hoti hai
//   none    SMTP nahi diya: email nahi ja sakti. Development mein text console par chhap jata hai taaki kaam chale;
//           production mein kuch nahi chhapta (log mein code / link na jaye).
const mode = env.smtp.host ? 'smtp' : env.nodeEnv === 'test' ? 'memory' : 'none';

export const outbox = []; // sirf tests ke liye: [{ to, subject, text }]

// Email sach mein pahunch sakti hai ya nahi. Na pahunch sake to email verification maanga hi nahi jata.
export const mailEnabled = () => mode !== 'none';

let transporter;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transporter;
}

export async function sendMail({ to, subject, text }) {
  if (mode === 'smtp') {
    await getTransporter().sendMail({ from: env.smtp.from, to, subject, text });
  } else if (mode === 'memory') {
    outbox.push({ to, subject, text });
  } else if (!env.isProduction) {
    console.log(`[mail] SMTP is not configured, so this email was not sent.\n  To: ${to}\n  Subject: ${subject}\n  ${text.replace(/\n/g, '\n  ')}`);
  } else {
    console.warn(`[mail] SMTP is not configured: could not send "${subject}".`);
  }
}
