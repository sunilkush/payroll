import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import app from './app.js';
import { startJobs } from './jobs/index.js';

async function start() {
  await connectDB();
  startJobs();
  const server = app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  // Deploy/restart par chalu requests poori hone do, phir DB band karo.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Server failed to start:', err.message);
  process.exit(1);
});
