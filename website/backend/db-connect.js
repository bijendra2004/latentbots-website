const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { config } = require('../shared/config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
const db = new Database(config.dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT NOT NULL,
    signup_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    is_blocked INTEGER NOT NULL DEFAULT 0 CHECK (is_blocked IN (0, 1)),
    last_seen_version INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_number INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
    notified_count INTEGER NOT NULL DEFAULT 0,
    published_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_by TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS login_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    success INTEGER NOT NULL CHECK (success IN (0, 1)),
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS system_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    user_email TEXT,
    error_type TEXT NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
    status TEXT NOT NULL DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'resolved')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS message_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    sender TEXT NOT NULL,
    subject TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'failed', 'queued')),
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT 'v1.0.0',
    version_code INTEGER NOT NULL DEFAULT 1,
    description TEXT NOT NULL,
    kicker TEXT,
    heading TEXT,
    lede TEXT,
    microcopy TEXT,
    wa_text TEXT NOT NULL,
    steps_json TEXT,
    file_name TEXT,
    file_path TEXT,
    file_size INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    badge_status TEXT NOT NULL DEFAULT 'LIVE',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS email_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Ensure bot files directory exists
const botFilesDir = path.resolve(path.dirname(config.dbPath), 'bot-files');
fs.mkdirSync(botFilesDir, { recursive: true });

// Migration for badge_status if column missing
try {
  const botCols = db.prepare("PRAGMA table_info(bots)").all().map(c => c.name);
  if (!botCols.includes('badge_status')) {
    db.exec("ALTER TABLE bots ADD COLUMN badge_status TEXT NOT NULL DEFAULT 'LIVE';");
  }
} catch (e) { console.error('Migration bots badge_status error:', e); }

// Seed initial bots if table is empty
try {
  const count = db.prepare("SELECT COUNT(*) as count FROM bots").get().count;
  if (count === 0) {
    const seedBot = db.prepare(`
      INSERT INTO bots (id, name, category, version, version_code, description, kicker, heading, lede, microcopy, wa_text, steps_json, status, updated_at)
      VALUES (@id, @name, @category, @version, @version_code, @description, @kicker, @heading, @lede, @microcopy, @wa_text, @steps_json, @status, @updated_at)
    `);

    const initialBots = [
      {
        id: 'latentmail',
        name: 'LatentMail WhatsApp Bot',
        category: 'Email Forwarding',
        version: 'v1.0.0',
        version_code: 1,
        description: 'LatentMail delivers your most important emails and AI-condensed smart summaries straight to your WhatsApp chat, so you never miss critical updates without opening noisy inboxes.',
        kicker: 'A softer way to stay in the loop',
        heading: 'Important messages,<br><em>right where you are.</em>',
        lede: 'LatentMail brings the updates that matter to WhatsApp, so you can keep moving without another inbox to manage.',
        microcopy: 'No new app. No noisy feed. Just the messages you asked for.',
        wa_text: 'Hi, I want to activate LatentMail WhatsApp Bot for my account!',
        steps_json: JSON.stringify([
          { title: 'Set Forwarding Rule', desc: 'Auto-forward priority emails or alerts to your dedicated bot address.' },
          { title: 'Choose Notification Level', desc: 'Select full messages or AI-condensed smart summaries for quick reading.' },
          { title: 'Confirm WhatsApp Link', desc: 'Click the button below to verify your WhatsApp chat and receive instant notifications.' }
        ]),
        status: 'active',
        updated_at: 'Today, Real-time'
      },
      {
        id: 'latentalert',
        name: 'LatentAlert System Bot',
        category: 'DevOps & Health',
        version: 'v1.1.0',
        version_code: 2,
        description: 'Instant critical server downtime, error alerts, and uptime status alerts delivered straight to WhatsApp within seconds of incident occurrence.',
        kicker: 'Real-time server & incident monitoring',
        heading: 'Critical system alerts,<br><em>instantly on WhatsApp.</em>',
        lede: 'LatentAlert routes server downtime, error spikes, and deployment status alerts directly to your phone within seconds.',
        microcopy: 'Instant delivery. Webhook verified. Zero false alarms.',
        wa_text: 'Hi, I want to activate LatentAlert Monitoring Bot for server alerts!',
        steps_json: JSON.stringify([
          { title: 'Configure Webhook URL', desc: 'Add our webhook URL to your monitoring service (Sentry, GitHub, Datadog).' },
          { title: 'Filter Severity Level', desc: 'Select alert thresholds for Critical, Warning, or Info notifications.' },
          { title: 'Verify Alert Channel', desc: 'Click connect to start receiving automated server incident pings on WhatsApp.' }
        ]),
        status: 'active',
        updated_at: 'Sep 5, 2026'
      },
      {
        id: 'latentdigest',
        name: 'LatentDigest Briefing Bot',
        category: 'Daily Productivity',
        version: 'v1.0.0',
        version_code: 1,
        description: 'A calm, curated morning briefing of your upcoming calendar schedule, newsletter highlights, and priority unread threads delivered at 8:00 AM daily.',
        kicker: 'Daily morning briefing on schedule',
        heading: 'Your day at a glance,<br><em>delivered at 8:00 AM.</em>',
        lede: 'LatentDigest delivers a calm morning overview of your schedule, key newsletter highlights, and unread priority threads.',
        microcopy: 'Calm mornings. 8:00 AM daily. Smart curated summaries.',
        wa_text: 'Hi, I want to subscribe to LatentDigest Daily Morning Briefing on WhatsApp!',
        steps_json: JSON.stringify([
          { title: 'Connect Calendar & Feeds', desc: 'Link your Google/Outlook calendar and newsletter subscriptions.' },
          { title: 'Select Morning Time Slot', desc: 'Choose your preferred briefing time (e.g. 8:00 AM or 9:00 AM daily).' },
          { title: 'Activate Daily Digest', desc: 'Click connect to confirm delivery directly to your WhatsApp each morning.' }
        ]),
        status: 'active',
        updated_at: 'Sep 4, 2026'
      },
      {
        id: 'latentlead',
        name: 'LatentLead Inbound Bot',
        category: 'Sales & Inbound',
        version: 'v1.0.0',
        version_code: 1,
        description: 'Never miss an inbound customer inquiry. Gets instant WhatsApp lead alerts within 5 seconds of customer web form submissions.',
        kicker: 'Instant inbound CRM alerts',
        heading: 'Never lose a lead,<br><em>catch prospects in 5s.</em>',
        lede: 'LatentLead notifies your sales team on WhatsApp immediately whenever a customer submits an inquiry form.',
        microcopy: '5-Second response time. Form capture webhook. High conversion.',
        wa_text: 'Hi, I want to activate LatentLead CRM Bot for instant WhatsApp sales alerts!',
        steps_json: JSON.stringify([
          { title: 'Embed Capture Webhook', desc: 'Paste our capture webhook into your landing page or contact form.' },
          { title: 'Map Lead Fields', desc: 'Configure lead name, phone, budget, and inquiry fields for WhatsApp preview.' },
          { title: 'Connect Sales Channel', desc: 'Click connect to route high-intent leads to your sales WhatsApp instantly.' }
        ]),
        status: 'active',
        updated_at: 'Sep 3, 2026'
      }
    ];

    for (const bot of initialBots) {
      seedBot.run(bot);
    }
  }
} catch (e) {
  console.error('Seeding bots error:', e);
}

// Safe migrations for existing SQLite databases
try {
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('is_blocked')) {
    db.exec("ALTER TABLE users ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0 CHECK (is_blocked IN (0, 1));");
  }
} catch (e) { console.error('Migration user is_blocked error:', e); }

try {
  const versionCols = db.prepare("PRAGMA table_info(versions)").all().map(c => c.name);
  if (!versionCols.includes('status')) {
    db.exec("ALTER TABLE versions ADD COLUMN status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'));");
  }
  if (!versionCols.includes('notified_count')) {
    db.exec("ALTER TABLE versions ADD COLUMN notified_count INTEGER NOT NULL DEFAULT 0;");
  }
} catch (e) { console.error('Migration versions status error:', e); }

module.exports = db;