const https = require('https');
const nodemailer = require('nodemailer');
const { config } = require('../../shared/config');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const { smtp } = config;
    transporter = nodemailer.createTransport({
      host: smtp.host || 'smtp-relay.brevo.com',
      port: smtp.port || 587,
      secure: smtp.secure || false,
      auth: {
        user: smtp.user,
        pass: smtp.pass
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }
  return transporter;
}

function resetTransporter() {
  transporter = null;
}

/**
 * Send email via Brevo v3 HTTPS REST API (Recommended for xkeysib API keys)
 */
function sendViaBrevoApi({ to, subject, html, text, fromName, fromEmail }) {
  return new Promise((resolve, reject) => {
    const apiKey = config.smtp.brevoApiKey || config.smtp.pass;
    if (!apiKey) {
      return reject(new Error('Brevo API key is not configured.'));
    }

    const recipients = (Array.isArray(to) ? to : [to]).map(email => ({
      email: typeof email === 'string' ? email.trim() : email.email,
      name: typeof email === 'object' && email.name ? email.name : undefined
    }));

    const postData = JSON.stringify({
      sender: {
        name: fromName || config.smtp.fromName || 'LatentBots',
        email: fromEmail || config.smtp.fromEmail || 'latentbots@gmail.com'
      },
      to: recipients,
      subject: subject,
      htmlContent: html || `<p>${text || ''}</p>`,
      textContent: text || (html ? html.replace(/<[^>]*>?/gm, '') : '')
    });

    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              provider: 'Brevo REST API v3',
              messageId: parsed.messageId || 'brevo-api-delivered',
              raw: parsed
            });
          } else {
            reject(new Error(parsed.message || parsed.error || `Brevo API HTTP ${res.statusCode}: ${responseBody}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, provider: 'Brevo REST API v3', response: responseBody });
          } else {
            reject(new Error(`Brevo API Error (${res.statusCode}): ${responseBody}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

/**
 * Verify Brevo Connection (Checks API key and/or SMTP credentials)
 */
async function verifySMTPConnection() {
  const { smtp } = config;
  const apiKey = smtp.brevoApiKey || smtp.pass;

  if (!apiKey && !smtp.user) {
    return {
      success: false,
      message: 'Brevo credentials missing in .env (SMTP_PASS or BREVO_API_KEY is empty)'
    };
  }

  // If using an xkeysib API key, verify account via Brevo Account API
  if (apiKey && apiKey.startsWith('xkeysib-')) {
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/account',
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'api-key': apiKey
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => { body += d; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (res.statusCode === 200) {
              resolve({
                success: true,
                provider: 'Brevo API v3',
                accountEmail: data.email,
                plan: data.plan ? data.plan[0]?.type : 'Active',
                message: `Brevo API Connected! Account: ${data.email || smtp.fromEmail} (Sender: ${smtp.fromEmail})`
              });
            } else {
              resolve({
                success: false,
                message: data.message || `Brevo authentication failed (HTTP ${res.statusCode})`
              });
            }
          } catch (err) {
            resolve({ success: false, message: 'Invalid response from Brevo API.' });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, message: 'Network connection to Brevo API failed: ' + err.message });
      });

      req.end();
    });
  }

  // Fallback to standard SMTP verify
  try {
    const mailTransporter = getTransporter();
    await mailTransporter.verify();
    return {
      success: true,
      provider: 'SMTP Relay',
      message: `SMTP Connected successfully to ${smtp.host}:${smtp.port} (Sender: ${smtp.fromEmail})`
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to connect to SMTP server.'
    };
  }
}

/**
 * Send an email using Brevo (tries Brevo HTTPS API first, falls back to SMTP)
 */
async function sendEmail({ to, subject, text, html, from }) {
  const { smtp } = config;
  const apiKey = smtp.brevoApiKey || smtp.pass;

  // 1. Try Brevo HTTPS API (fastest & most reliable with xkeysib keys)
  if (apiKey && apiKey.startsWith('xkeysib-')) {
    try {
      const result = await sendViaBrevoApi({
        to,
        subject,
        html,
        text,
        fromName: smtp.fromName,
        fromEmail: smtp.fromEmail
      });
      console.log(`✉️ Email sent to ${to} via Brevo API [MessageId: ${result.messageId}]`);
      return result;
    } catch (apiErr) {
      console.warn(`Brevo API send failed (${apiErr.message}), trying SMTP fallback...`);
    }
  }

  // 2. SMTP / Nodemailer fallback
  if (!smtp.user || !smtp.pass) {
    throw new Error('SMTP credentials not configured in .env');
  }

  const mailTransporter = getTransporter();
  const fromAddress = from || `"${smtp.fromName}" <${smtp.fromEmail}>`;

  const mailOptions = {
    from: fromAddress,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    text: text || (html ? html.replace(/<[^>]*>?/gm, '') : ''),
    html: html || `<p>${text}</p>`
  };

  const info = await mailTransporter.sendMail(mailOptions);
  console.log(`✉️ Email sent to ${mailOptions.to} via SMTP [MessageId: ${info.messageId}]`);
  return {
    success: true,
    provider: 'SMTP Relay',
    messageId: info.messageId,
    response: info.response
  };
}

module.exports = {
  getTransporter,
  resetTransporter,
  verifySMTPConnection,
  sendEmail,
  sendViaBrevoApi
};
