import { createRequire } from 'node:module';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

const { version } = createRequire(import.meta.url)('../package.json');

export const APP_NAME = 'PayRoster';

// mongoose.connection.readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
const DB_STATES = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];

// Server ke index page (views/index.pug) ka data. Yahan koi secret ya andar ki detail nahi jati
// (connection string, paths...), kyunki ye page bina login ke khulta hai.
export function getStatus() {
  const dbState = mongoose.connection.readyState;
  return {
    appName: APP_NAME,
    version,
    environment: env.nodeEnv,
    database: { connected: dbState === 1, label: DB_STATES[dbState] ?? 'Unknown' },
    serverTime: new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: env.timezone,
    }).format(new Date()),
    timezone: env.timezone,
    apiBase: '/api/v1',
    clientUrl: env.clientUrl,
  };
}
