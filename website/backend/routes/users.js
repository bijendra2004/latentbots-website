const express = require('express');
const { isValidEmail, isValidPhone, normalizeEmail, toPublicUser } = require('../../shared/utils');
const users = require('../models/user');
const { requireAdmin } = require('./admin');

const mailer = require('../services/mailer');
const { renderOtpEmail } = require('../services/emailTemplates');

const router = express.Router();

// User: Send 6-Digit Email OTP
router.post('/send-otp', async (req, res) => {
  try {
    const rawEmail = req.body.email;
    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    // Generate secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    users.saveOtp({ email, otpCode, expiryMinutes: 10 });

    const html = renderOtpEmail({ otpCode, expiryMinutes: 10 });

    await mailer.sendEmail({
      to: email,
      subject: `🔑 ${otpCode} is your LatentBots verification code`,
      html
    });

    res.json({
      success: true,
      message: `Verification code sent to ${email}. Please check your inbox!`
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send verification code. ' + error.message });
  }
});

// User: Verify OTP and Sign In
router.post('/verify-otp', (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }
    if (!otp || otp.length !== 6) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit OTP code.' });
    }

    const verification = users.verifyOtp({ email, otpCode: otp });
    if (!verification.success) {
      return res.status(400).json({ error: verification.message });
    }

    // Create or retrieve user
    const user = users.createUser({ email, phoneNumber: '' });
    res.json({
      success: true,
      message: 'Successfully signed in!',
      user: toPublicUser(user)
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

router.post('/', (request, response) => {
  const email = normalizeEmail(request.body.email);
  const phoneNumber = String(request.body.phoneNumber || '').replace(/[\s()-]/g, '');
  if (!isValidEmail(email)) return response.status(400).json({ error: 'Valid email is required.' });
  const user = users.createUser({ email, phoneNumber });
  response.status(200).json({ user: toPublicUser(user) });
});

router.post('/connect-bot', (request, response) => {
  const email = normalizeEmail(request.body.email);
  const phoneNumber = String(request.body.phoneNumber || '').replace(/[\s()-]/g, '');
  const botName = String(request.body.botName || 'LatentMail WhatsApp Bot');
  if (!isValidEmail(email)) return response.status(400).json({ error: 'Valid email is required.' });

  const user = users.createUser({ email, phoneNumber });
  // Also log message activity for admin panel
  try {
    const logs = require('../models/log');
    logs.createLog({
      userId: user.id,
      sender: 'System Bot Gateway',
      subject: `Bot Activation: ${botName}`,
      phoneNumber: user.phone_number || 'WhatsApp Connected',
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