import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, serverRoot } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { httpsRedirect } from './middlewares/httpsRedirect.js';

const app = express();

app.set('trust proxy', env.trustProxy);
if (env.forceHttps) app.use(httpsRedirect);

app.use(helmet()); // security headers; HTTPS par HSTS bhi bhejta hai
app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '1mb' }));
if (env.nodeEnv === 'development') app.use(morgan('dev'));

app.use('/api/v1', routes);

// Production: React build (client/dist) isi server se. /api ke alawa har URL par index.html
// jata hai taaki page refresh par React Router ke routes chalein.
if (env.serveClient) {
  const clientDist = path.resolve(serverRoot, '../client/dist');
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

export default app;
