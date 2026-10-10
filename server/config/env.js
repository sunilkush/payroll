import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(serverRoot, '.env') });

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required env variables: ${missing.join(', ')} (check server/.env)`);
}

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

// 'true'/'false' string -> boolean; set na ho to fallback
const toBool = (value, fallback) => (value === undefined || value === '' ? fallback : value === 'true');

const isProduction = process.env.NODE_ENV === 'production';

// Render (render.com) har service ko ye variables apne aap deta hai: RENDER=true, RENDER_EXTERNAL_URL
// (jaise https://payroster.onrender.com). Inse URL / proxy ki settings khud ban jati hain,
// dashboard mein alag se likhni nahi padtin.
const onRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_ID);
const publicUrl = (process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');

// Browser (Chrome, Edge, Firefox) kuch ports par page kholta hi nahi (ERR_UNSAFE_PORT), bhale server
// chal raha ho. Aam galti PORT=6000 hai. Poori list lambi hai; yahan wo hain jo dev mein chun liye jate hain.
// Hosting par ye port browser tak pahunchta hi nahi (aage proxy hota hai), isliye wahan check nahi.
const BROWSER_BLOCKED_PORTS = [2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080];
if (!isProduction && !onRender && BROWSER_BLOCKED_PORTS.includes(Number(process.env.PORT))) {
  throw new Error(
    `PORT=${process.env.PORT} is blocked by browsers (ERR_UNSAFE_PORT). Use another port in server/.env, e.g. 5000 or 5050.`
  );
}

// Frontend ke origins (CORS). CLIENT_URL mein comma se kai de sakte ho (apna domain + onrender.com wala).
// Pehla wala "asli" maana jata hai: email ke links usi par bante hain.
// Render par local .env se copy hua localhost wala CLIENT_URL chhod dete hain, warna email ke links
// localhost par bante.
const isLocalUrl = (url) => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);
const clientUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter((url) => url && !(onRender && isLocalUrl(url)));
if (publicUrl && !clientUrls.includes(publicUrl)) clientUrls.push(publicUrl);
if (!clientUrls.length) clientUrls.push('http://localhost:5173');

const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return 'localhost';
  }
};

// Production mein kamzor secret ke saath server start hi na ho.
if (isProduction && (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'change-me')) {
  throw new Error('In production JWT_SECRET must be a random string of at least 32 characters.');
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  port: toInt(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // Upload hui files (visit photo, attachments) yahan rehti hain. Backup mein ise bhi shamil karo.
  uploadDir: process.env.UPLOAD_DIR ? path.resolve(serverRoot, process.env.UPLOAD_DIR) : path.join(serverRoot, 'uploads'),
  // Sales meeting ke QR token isi se bante hain. Na diya ho to JWT_SECRET se nikalta hai
  // (tab JWT_SECRET badalne par purane QR bekaar ho jate hain).
  qrSecret:
    process.env.QR_SECRET ||
    crypto.createHmac('sha256', process.env.JWT_SECRET).update('meeting-qr-v1').digest('hex'),
  bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 10),
  clientUrl: clientUrls[0],
  clientUrls,
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  // Server ke aage kitne reverse proxy hain (Nginx = 1). Isi se asli client IP aur HTTPS ka pata chalta hai.
  // Render par hamesha proxy hota hai, isliye wahan kam se kam 1 (dashboard mein galti se 0 likha ho
  // tab bhi): warna server ko HTTPS ka pata nahi chalta aur FORCE_HTTPS redirect ka chakkar ban jata hai.
  trustProxy: onRender ? Math.max(1, toInt(process.env.TRUST_PROXY, 1)) : toInt(process.env.TRUST_PROXY, 0),
  // HTTP request ko HTTPS par bhej do. Geolocation (punch) bina HTTPS ke chalti hi nahi.
  forceHttps: toBool(process.env.FORCE_HTTPS, isProduction),
  // client/dist ko isi server se serve karo (ek hi domain, ek hi certificate).
  serveClient: toBool(process.env.SERVE_CLIENT, isProduction),
  loginRateLimit: {
    windowMin: toInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MIN, 15),
    max: toInt(process.env.LOGIN_RATE_LIMIT_MAX, 20),
  },
  // Website se free account banana. Band karna ho (sirf Super Admin companies banaye) to ALLOW_REGISTRATION=false.
  allowRegistration: toBool(process.env.ALLOW_REGISTRATION, true),
  // Ek IP se ek ghante mein kitne naye accounts ban sakte hain (bot / spam se bachav).
  registerRateLimitMax: toInt(process.env.REGISTER_RATE_LIMIT_MAX, 5),
  // Email (verification code, password reset). SMTP_HOST khali ho to email nahi jati; tab verification maanga nahi jata.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: toInt(process.env.SMTP_PORT, 587),
    secure: toBool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || `PayRoster <no-reply@${hostOf(clientUrls[0])}>`,
  },
  superAdmin: {
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  },
};
