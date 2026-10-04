import './setup.js';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';

// Khali test database ke saath app ko ek free port par chalata hai.
export async function startTestServer() {
  await connectDB();
  const dbName = mongoose.connection.name;
  // Suraksha: galti se bhi asli database drop na ho.
  if (!dbName.endsWith('_test')) throw new Error(`Test DB ka naam "_test" par khatam hona chahiye, mila: ${dbName}`);

  const models = Object.values(mongoose.models);
  await Promise.all(models.map((model) => model.init()));
  await mongoose.connection.dropDatabase();
  await Promise.all(models.map((model) => model.createIndexes()));

  const server = app.listen(0);
  const origin = `http://localhost:${server.address().port}`;
  const baseUrl = `${origin}/api/v1`;

  const raw = (path, { method = 'GET', token, body } = {}) =>
    fetch(baseUrl + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body ? JSON.stringify(body) : undefined,
    });

  // JSON API call -> { status, body }
  const call = async (path, options) => {
    const res = await raw(path, options);
    return { status: res.status, body: await res.json() };
  };

  const login = async (email, password = 'Password@1') => {
    const res = await call('/auth/login', { method: 'POST', body: { email, password } });
    return res.body.data?.token;
  };

  const stop = async () => {
    server.close();
    await mongoose.connection.dropDatabase();
    await disconnectDB();
  };

  return { origin, raw, call, login, stop };
}
