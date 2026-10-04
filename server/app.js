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

// Security headers; HTTPS par HSTS bhi bhejta hai. Content-Security-Policy mein sirf wahi bahar ki
// jagahein khuli hain jo Settings ke office-location map ko chahiye: OpenStreetMap ki map tiles
// (images) aur uski place search.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'https://*.tile.openstreetmap.org'],
        'connect-src': ["'self'", 'https://nominatim.openstreetmap.org'],
      },
    },
  })
);
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
