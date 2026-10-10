import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, serverRoot } from './config/env.js';
import homeRoutes from './routes/homeRoutes.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { httpsRedirect } from './middlewares/httpsRedirect.js';

const app = express();
const NO_CACHE_FILES = new Set(['sw.js', 'registerSW.js', 'manifest.webmanifest']);

// React build (client/dist) isi server se jata hai ya nahi. SERVE_CLIENT on ho par build bana hi na ho
// (hosting par build command mein client ka build chhoot gaya) to har page 500 dene ki jagah server
// ka Pug wala page dikhate hain, jo batata hai ki web app abhi bana nahi.
const clientDist = path.resolve(serverRoot, '../client/dist');
const clientBuilt = env.serveClient && fs.existsSync(path.join(clientDist, 'index.html'));
const clientMissing = env.serveClient && !clientBuilt;
if (clientMissing) {
  console.warn(
    'Client build not found (client/dist/index.html). Serving the server status page at / instead. ' +
      'Build the web app first: set the build command to "npm run render-build" (Render) or run "npm run build".'
  );
}
app.locals.clientMissing = clientMissing;

app.set('trust proxy', env.trustProxy);
app.set('views', path.join(serverRoot, 'views'));
app.set('view engine', 'pug');
if (env.forceHttps) app.use(httpsRedirect);

// Security headers; HTTPS par HSTS bhi bhejta hai. Content-Security-Policy mein sirf wahi bahar ki
// jagahein khuli hain jo Settings ke office-location map ko chahiye: OpenStreetMap ki map tiles
// (images) aur uski place search. Baaki do cheezein (blob:) meeting ke QR scanner ke liye hain.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // blob: sales manager ki upload ki hui QR photo (scanner use browser mein hi padhta hai)
        'img-src': ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
        'connect-src': ["'self'", 'https://nominatim.openstreetmap.org'],
        // QR scanner camera ki tasveer ek worker mein padhta hai, jo blob: se banta hai
        'worker-src': ["'self'", 'blob:'],
      },
    },
  })
);
app.use(cors({ origin: env.clientUrls }));
// Gzip/deflate: JS, CSS, JSON ~60-80% chhote ho jaate hain, page tez khulta hai.
app.use(compression());
app.use(express.json({ limit: '1mb' }));
if (env.nodeEnv === 'development') app.use(morgan('dev'));

app.use('/api/v1', routes);

// Server ka index page (Pug): API ka haal ek nazar mein. Hamesha /api par milta hai. Jab React build
// isi server se nahi jata (dev, ya API alag server par) tab / par bhi; warna / React app ka hai.
app.use('/server-assets', express.static(path.join(serverRoot, 'public'), { maxAge: '1h' }));
app.use('/api', homeRoutes);
if (!clientBuilt) app.use('/', homeRoutes);

// Production: React build (client/dist) isi server se. /api ke alawa har URL par index.html
// jata hai taaki page refresh par React Router ke routes chalein.
if (clientBuilt) {
  app.use(
    express.static(clientDist, {
      index: false,
      // Vite build mein har file ka naam content-hash se banta hai (jaise index-a1b2c3.js),
      // isliye 1 saal cache safe hai — content badle to naam badal jata hai.
      maxAge: '365d',
      immutable: true,
      // PWA: service worker aur manifest hamesha taaze jayein, warna naya build phone tak der se pahunchta hai.
      // index.html bhi fresh chahiye taaki naye hashed filenames mil sakein.
      setHeaders(res, filePath) {
        const base = path.basename(filePath);
        if (NO_CACHE_FILES.has(base) || base === 'index.html') {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

export default app;
