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
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  // Server ke aage kitne reverse proxy hain (Nginx = 1). Isi se asli client IP aur HTTPS ka pata chalta hai.
  trustProxy: toInt(process.env.TRUST_PROXY, 0),
  // HTTP request ko HTTPS par bhej do. Geolocation (punch) bina HTTPS ke chalti hi nahi.
  forceHttps: toBool(process.env.FORCE_HTTPS, isProduction),
  // client/dist ko isi server se serve karo (ek hi domain, ek hi certificate).
  serveClient: toBool(process.env.SERVE_CLIENT, isProduction),
  loginRateLimit: {
    windowMin: toInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MIN, 15),
    max: toInt(process.env.LOGIN_RATE_LIMIT_MAX, 20),
  },
  superAdmin: {
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  },
};
