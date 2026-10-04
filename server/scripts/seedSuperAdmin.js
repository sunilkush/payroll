import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { ROLES } from '../utils/constants.js';

// Pehla Super Admin banata hai (.env ke SUPER_ADMIN_* se). Dobara chalane par kuch nahi badalta.
async function seed() {
  const { name, email, password } = env.superAdmin;
  if (!email || !password) {
    throw new Error('SUPER_ADMIN_EMAIL aur SUPER_ADMIN_PASSWORD .env mein set karo.');
  }

  await connectDB();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`Super Admin pehle se hai: ${existing.email}`);
    return;
  }

  const user = await User.create({ name, email, password, role: ROLES.SUPER_ADMIN });
  console.log(`Super Admin ban gaya: ${user.email}`);
}

seed()
  .catch((err) => {
    console.error('Seed fail:', err.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
