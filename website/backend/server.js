const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { config, validateConfig } = require('../shared/config');

validateConfig();
require('./db-connect');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin').router;
const versionsRouter = require('./routes/versions');
const issuesRouter = require('./routes/issues');
const logsRouter = require('./routes/logs');
const botsRouter = require('./routes/bots');
const emailRouter = require('./routes/email');

const app = express();
app.set('trust proxy', 1);

// Enable CORS for Vercel frontend & localhost
const allowedOrigins = [
  'https://latentbots.vercel.app',
  process.env.FRONTEND_URL,
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());
app.use('/api/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true }));
app.use('/api/admin', adminRouter);
app.use('/api/users', usersRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/logs', logsRouter);
app.use('/api/bots', botsRouter);
app.use('/api/email', emailRouter);
app.use('/api', versionsRouter);
app.use(express.static(path.resolve(__dirname, '../user-website')));
app.use('/admin', express.static(path.resolve(__dirname, '../admin-website')));

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: 'An unexpected server error occurred.' });
});

app.listen(config.port, () => console.log(`LatentMail website running at http://localhost:${config.port}`));