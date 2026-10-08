// Har test file ki PEHLI import yahi honi chahiye: ye app ke config load hone se pehle env set karta hai,
// taaki tests kabhi asli database ya asli .env ke secrets par na chalein.
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/payroll_test';
process.env.JWT_SECRET = 'test-secret-sirf-tests-ke-liye-0123456789';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4'; // tests tez chalein
process.env.LOGIN_RATE_LIMIT_MAX = '100000';
process.env.APP_TIMEZONE = 'Asia/Kolkata';
process.env.FORCE_HTTPS = 'false';
// Responsive (browser) check isse 'true' karke chalata hai taaki server client/dist bhi serve kare.
process.env.SERVE_CLIENT ??= 'false';
process.env.TRUST_PROXY = '0';
// Tests ki uploads asli folder mein na jayein
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'payroll_test_uploads');
