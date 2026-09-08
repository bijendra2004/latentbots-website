const db = require('../db-connect');

function listLogs(limit = 50) {
  return db.prepare('SELECT * FROM message_logs ORDER BY created_at DESC LIMIT ?').all(limit);
}

function createLog({ userId, sender, subject, phoneNumber, status = 'delivered', errorMessage = null }) {
  const result = db.prepare(`
    INSERT INTO message_logs (user_id, sender, subject, phone_number, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId || null, sender, subject, phoneNumber, status, errorMessage);
  return db.prepare('SELECT * FROM message_logs WHERE id = ?').get(result.lastInsertRowid);
}

function getLogStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM message_logs').get().count;
  const delivered = db.prepare("SELECT COUNT(*) as count FROM message_logs WHERE status = 'delivered'").get().count;
  const failed = db.prepare("SELECT COUNT(*) as count FROM message_logs WHERE status = 'failed'").get().count;
  return { total, delivered, failed };
}

module.exports = { listLogs, createLog, getLogStats };
