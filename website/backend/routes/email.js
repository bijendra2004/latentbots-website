const express = require('express');
const { requireAdmin } = require('./admin');
const { config } = require('../../shared/config');
const mailer = require('../services/mailer');
const { renderTestEmail } = require('../services/emailTemplates');

const router = express.Router();

// Admin: Check Brevo SMTP Configuration & Connection Status
router.get('/status', requireAdmin, async (req, res) => {
  const { smtp } = config;
  const isConfigured = Boolean(smtp.user && smtp.pass);

  let connectionStatus = { success: false, message: 'SMTP credentials (SMTP_USER or SMTP_PASS) not configured in .env' };

  if (isConfigured) {
    connectionStatus = await mailer.verifySMTPConnection();
  }

  res.json({
    configured: isConfigured,
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    fromEmail: smtp.fromEmail,
    fromName: smtp.fromName,
    hasUser: Boolean(smtp.user),
    hasPass: Boolean(smtp.pass),
    connection: connectionStatus
  });
});

// Admin: Send a Test Email via Brevo SMTP
router.post('/test', requireAdmin, async (req, res) => {
  try {
    const { to } = req.body;
    const recipient = to || config.adminEmail || config.smtp.fromEmail;

    if (!recipient) {
      return res.status(400).json({ error: 'Recipient email address is required.' });
    }

    if (!config.smtp.user || !config.smtp.pass) {
      return res.status(400).json({
        error: 'SMTP credentials missing. Please add SMTP_USER and SMTP_PASS (Brevo SMTP Key) to your .env file.'
      });
    }

    const html = renderTestEmail({
      timestamp: new Date().toLocaleString(),
      senderEmail: config.smtp.fromEmail
    });

    const result = await mailer.sendEmail({
      to: recipient,
      subject: '✅ LatentBots Brevo SMTP Test Verification',
      html
    });

    res.json({
      success: true,
      message: `Test email sent successfully to ${recipient}! Check your inbox.`,
      result
    });
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ error: 'Failed to send test email: ' + error.message });
  }
});

module.exports = router;
