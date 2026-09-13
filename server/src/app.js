const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/response');

const app = express();

app.set('trust proxy', 1);
// CSP allows our own inline theme script + Quill inline styles + Google Fonts.
// (Quill and the theme snippet require 'unsafe-inline'; all sources stay same-origin except fonts/images.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
// Render injects its own public URL — same-origin fullstack deploy needs it allowed.
const selfUrl = process.env.RENDER_EXTERNAL_URL || null;
const corsMw = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = [clientUrl, 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
    if (selfUrl) allowed.push(selfUrl);
    if (process.env.CLIENT_URLS) allowed.push(...process.env.CLIENT_URLS.split(',').map((s) => s.trim()));
    if (allowed.includes(origin)) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    return cb(new Error('CORS blocked'));
  },
  credentials: true
});
// Same-origin bypass for Render single-service deploy:
// page and API share one host, so answer CORS here and skip the allowlist.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host === req.get('host')) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Vary', 'Origin');
        if (req.method === 'OPTIONS') {
          res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
          res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          return res.sendStatus(204);
        }
        req.sameOrigin = true;
      }
    } catch {}
  }
  next();
});
app.use((req, res, next) => (req.sameOrigin ? next() : corsMw(req, res, next)));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/auth', authLimiter);

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));
app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/answers', require('./routes/answers'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));

// Single-service fullstack deploy: in production Express serves the React
// build (client/dist) and handles SPA fallback. API/Uploads/Health pass through.
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(dist));
  app.get(/^(?!\/api|\/uploads|\/health).*/, (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use('/api', (_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API route not found' } }));

app.use(errorHandler);

module.exports = app;
