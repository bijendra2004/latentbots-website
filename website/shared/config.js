const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const config = {
  port: Number(process.env.PORT || 3000),
  dbPath: path.resolve(__dirname, '..', process.env.DB_PATH || './data/latentmail.db'),
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminTotpSecret: process.env.ADMIN_TOTP_SECRET || '',
  jwtSecret: process.env.JWT_SECRET || '',
  whatsappNumber: (process.env.WHATSAPP_NUMBER || '').replace(/\D/g, ''),
  isProduction: process.env.NODE_ENV === 'production',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'latentbots@gmail.com',
    fromName: process.env.SMTP_FROM_NAME || 'LatentBots',
    brevoApiKey: process.env.BREVO_API_KEY || process.env.SMTP_PASS || ''
  }
};

function validateConfig() {
  const required = ['adminEmail', 'adminPassword', 'adminTotpSecret', 'jwtSecret'];
  const missing = required.filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (config.adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long.');
  }
  if (config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }
}

module.exports = { config, validateConfig };