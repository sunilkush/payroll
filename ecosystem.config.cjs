// PM2 config: pm2 start ecosystem.config.cjs
// Baaki settings (MONGO_URI, JWT_SECRET, CLIENT_URL, TRUST_PROXY ...) server/.env se aati hain.
module.exports = {
  apps: [
    {
      name: 'payroll',
      cwd: './server',
      script: 'server.js',
      // Ek hi instance rakho: cron jobs (auto punch-out, monthly leave credit) server ke andar
      // chalte hain. Zyada instances hue to har ek mein chalenge.
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      kill_timeout: 10000,
    },
  ],
};
