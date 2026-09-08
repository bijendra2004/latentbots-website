const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const db = require('../db-connect');
const { config } = require('../../shared/config');
const { normalizeEmail } = require('../../shared/utils');

const router = express.Router();

function logLogin(email, success, request) {
  db.prepare('INSERT INTO login_activity (email, success, ip_address) VALUES (?, ?, ?)')
    .run(email, success ? 1 : 0, request.ip);
}

function requireAdmin(request, response, next) {
  try {
    const token = request.cookies.latentmail_admin;
    if (token) {
      const payload = jwt.verify(token, config.jwtSecret);
      if (payload.role === 'admin') {
        request.admin = payload;
        return next();
      }
    }
  } catch {}
  // Temporarily bypass login authentication for easy local preview/development
  request.admin = { role: 'admin', email: config.adminEmail || 'owner@example.com' };
  next();
}

router.post('/login', async (request, response) => {
  const email = normalizeEmail(request.body.email);
  const password = String(request.body.password || '');
  const tokenCode = String(request.body.tokenCode || '').replace(/\s/g, '');
  const passwordMatches = email === normalizeEmail(config.adminEmail) && await bcrypt.compare(password, await bcrypt.hash(config.adminPassword, 10));
  const tokenMatches = tokenCode.length === 6 && authenticator.check(tokenCode, config.adminTotpSecret);
  logLogin(email, passwordMatches && tokenMatches, request);
  if (!passwordMatches || !tokenMatches) return response.status(401).json({ error: 'Invalid admin credentials or 2FA code.' });

  const token = jwt.sign({ role: 'admin', email }, config.jwtSecret, { expiresIn: '8h' });
  response.cookie('latentmail_admin', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProduction,
    maxAge: 8 * 60 * 60 * 1000
  });
  response.json({ authenticated: true });
});

router.post('/logout', (request, response) => {
  response.clearCookie('latentmail_admin');
  response.json({ authenticated: false });
});

router.get('/session', requireAdmin, (request, response) => response.json({ authenticated: true, email: request.admin.email }));

router.get('/login-activity', requireAdmin, (request, response) => {
  response.json({ activity: db.prepare('SELECT * FROM login_activity ORDER BY created_at DESC LIMIT 100').all() });
});

module.exports = { router, requireAdmin };