import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import app from './app.js';
import { startJobs } from './jobs/index.js';
import { refreshPlans } from './services/planService.js';

async function start() {
  await connectDB();
  await refreshPlans({ force: true }); // packages (Super Admin ke tay kiye hue) memory mein
  startJobs();
  const server = app.listen(env.port, () => {
    // Hosting (Render) par asli URL env.clientUrl hai; apne computer par localhost
    const url = env.isProduction ? env.clientUrl : `http://localhost:${env.port}`;
    console.log(`Server running on port ${env.port} (${env.nodeEnv}): ${url}`);
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
