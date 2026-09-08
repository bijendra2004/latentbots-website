/**
 * Professional HTML Email Templates for LatentBots
 */

function getEmailHeader(title) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #fbfbfa; border: 1px solid #e2ded7; border-radius: 12px; overflow: hidden; color: #19312b;">
      <div style="background: #19312b; padding: 24px 32px; border-bottom: 3px solid #ef744c;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.04em; color: #ffffff;">
          latent<span style="color: #ef744c;">bots</span>
        </h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #d5ddd2; font-family: monospace;">Intelligent WhatsApp Automations</p>
      </div>
      <div style="padding: 32px 32px 24px;">
        <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #19312b; letter-spacing: -0.02em;">${title}</h2>
  `;
}

function getEmailFooter() {
  return `
      </div>
      <div style="background: #f3efe8; padding: 18px 32px; border-top: 1px solid #e2ded7; font-size: 12px; color: #5f6f67;">
        <p style="margin: 0 0 6px;">Sent securely by <strong>LatentBots System</strong> via Brevo SMTP.</p>
        <p style="margin: 0; font-family: monospace;">Sender: latentbots@gmail.com &bull; &copy; 2026 LatentBots</p>
      </div>
    </div>
  `;
}

function renderWelcomeEmail({ userEmail, botName }) {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hello,</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
      Welcome to <strong>LatentBots</strong>! Your account (<code>${userEmail}</code>) is ready to connect with <strong>${botName || 'LatentMail'}</strong>.
    </p>
    <div style="background: #ffffff; border: 1px solid #e2ded7; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #19312b;">Quick 3-Step WhatsApp Activation:</h3>
      <ol style="margin: 0; padding-left: 20px; font-size: 13.5px; line-height: 1.7; color: #3f514a;">
        <li>Open your dedicated bot trigger link.</li>
        <li>Send the pre-filled activation message.</li>
        <li>Receive instant automated alerts right inside WhatsApp!</li>
      </ol>
    </div>
    <p style="font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
      If you have questions, simply reply to this email at <a href="mailto:latentbots@gmail.com" style="color: #ef744c; text-decoration: none; font-weight: 600;">latentbots@gmail.com</a>.
    </p>
  `;
  return `${getEmailHeader('Welcome to LatentBots')}${content}${getEmailFooter()}`;
}

function renderTestEmail({ timestamp, senderEmail }) {
  const content = `
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
      Congratulations! Your Brevo SMTP email delivery integration is working perfectly.
    </p>
    <div style="background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="font-size: 13.5px; font-family: monospace; color: #1b5e20;">
        <p style="margin: 0 0 4px;"><strong>&bull; Status:</strong> Connected & Verified</p>
        <p style="margin: 0 0 4px;"><strong>&bull; Sender Email:</strong> ${senderEmail || 'latentbots@gmail.com'}</p>
        <p style="margin: 0 0 4px;"><strong>&bull; Provider:</strong> Brevo SMTP (smtp-relay.brevo.com:587)</p>
        <p style="margin: 0;"><strong>&bull; Test Time:</strong> ${timestamp || new Date().toLocaleString()}</p>
      </div>
    </div>
    <p style="font-size: 13.5px; line-height: 1.5; color: #5f6f67; margin: 0;">
      You can now send system alerts, user welcome emails, and verification codes from your LatentBots platform.
    </p>
  `;
  return `${getEmailHeader('Brevo SMTP Verification Successful')}${content}${getEmailFooter()}`;
}

module.exports = {
  renderWelcomeEmail,
  renderTestEmail
};
