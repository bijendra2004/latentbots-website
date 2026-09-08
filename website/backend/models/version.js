const db = require('../db-connect');

function getLatestVersion() {
  return db.prepare("SELECT * FROM versions WHERE status = 'published' ORDER BY version_number DESC LIMIT 1").get() || null;
}

function getLatestAnyVersion() {
  return db.prepare("SELECT * FROM versions ORDER BY version_number DESC LIMIT 1").get() || null;
}

function listVersions() {
  return db.prepare('SELECT * FROM versions ORDER BY version_number DESC').all();
}

function publishVersion({ title, description, publishedBy }) {
  const nextNumber = (getLatestAnyVersion()?.version_number || 0) + 1;
  const activeUserCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE active = 1 AND is_blocked = 0").get().count;
  const result = db.prepare(
    "INSERT INTO versions (version_number, title, description, status, notified_count, published_by) VALUES (?, ?, ?, 'published', ?, ?)"
  ).run(nextNumber, title, description, activeUserCount, publishedBy);
  return db.prepare('SELECT * FROM versions WHERE id = ?').get(result.lastInsertRowid);
}

function publishDraft(id) {
  const version = db.prepare('SELECT * FROM versions WHERE id = ?').get(id);
  if (!version) return null;
  const activeUserCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE active = 1 AND is_blocked = 0").get().count;
  db.prepare("UPDATE versions SET status = 'published', published_date = CURRENT_TIMESTAMP, notified_count = ? WHERE id = ?")
    .run(activeUserCount, id);
  return db.prepare('SELECT * FROM versions WHERE id = ?').get(id);
}

module.exports = { getLatestVersion, getLatestAnyVersion, listVersions, publishVersion, publishDraft };