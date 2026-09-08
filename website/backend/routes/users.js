const express = require('express');
const { isValidEmail, isValidPhone, normalizeEmail, toPublicUser } = require('../../shared/utils');
const users = require('../models/user');
const { requireAdmin } = require('./admin');

const router = express.Router();

router.post('/', (request, response) => {
  const email = normalizeEmail(request.body.email);
  const phoneNumber = String(request.body.phoneNumber || '').replace(/[\s()-]/g, '');
  if (!isValidEmail(email) || !isValidPhone(phoneNumber)) return response.status(400).json({ error: 'Valid email and international phone number are required.' });
  const user = users.createUser({ email, phoneNumber });
  response.status(200).json({ user: toPublicUser(user) });
});

router.post('/connect-bot', (request, response) => {
  const email = normalizeEmail(request.body.email);
  const phoneNumber = String(request.body.phoneNumber || '').replace(/[\s()-]/g, '');
  const botName = String(request.body.botName || 'LatentMail WhatsApp Bot');
  if (!isValidEmail(email) || !isValidPhone(phoneNumber)) return response.status(400).json({ error: 'Valid email and international phone number are required.' });

  const user = users.createUser({ email, phoneNumber });
  // Also log message activity for admin panel
  try {
    const logs = require('../models/log');
    logs.createLog({
      userId: user.id,
      sender: 'System Bot Gateway',
      subject: `Bot Activation: ${botName}`,
      phoneNumber: user.phone_number,
      status: 'delivered'
    });
  } catch (e) { console.error('Could not log bot connection:', e); }

  response.status(200).json({ success: true, user: toPublicUser(user) });
});

router.patch('/:id/toggle-block', requireAdmin, (request, response) => {
  const user = users.toggleBlock(request.params.id, request.body.isBlocked);
  if (!user) return response.status(404).json({ error: 'User not found.' });
  response.json({ user: toPublicUser(user) });
});

router.patch('/:id', requireAdmin, (request, response) => {
  const email = normalizeEmail(request.body.email);
  const phoneNumber = String(request.body.phoneNumber || '').replace(/[\s()-]/g, '');
  if (!isValidEmail(email) || !isValidPhone(phoneNumber)) return response.status(400).json({ error: 'Valid email and international phone number are required.' });
  const user = users.updateUser(request.params.id, { 
    email, 
    phoneNumber, 
    active: Boolean(request.body.active),
    isBlocked: request.body.isBlocked !== undefined ? Boolean(request.body.isBlocked) : undefined
  });
  if (!user) return response.status(404).json({ error: 'User not found.' });
  response.json({ user: toPublicUser(user) });
});

module.exports = router;