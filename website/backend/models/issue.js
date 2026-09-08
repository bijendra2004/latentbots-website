const db = require('../db-connect');

function listIssues(filter = {}) {
  let query = 'SELECT * FROM system_issues';
  const conditions = [];
  const params = [];

  if (filter.status) {
    conditions.push('status = ?');
    params.push(filter.status);
  }
  if (filter.userId) {
    conditions.push('user_id = ?');
    params.push(filter.userId);
  }
  if (filter.severity) {
    conditions.push('severity = ?');
    params.push(filter.severity);
  }

  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';
  if (filter.limit) {
    query += ' LIMIT ' + Number(filter.limit);
  }

  return db.prepare(query).all(...params);
}

function findIssueById(id) {
  return db.prepare('SELECT * FROM system_issues WHERE id = ?').get(id) || null;
}

function getUserIssues(userId) {
  return db.prepare('SELECT * FROM system_issues WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

function createIssue({ userId, userEmail, errorType, message, stackTrace, severity = 'warning' }) {
  const result = db.prepare(`
    INSERT INTO system_issues (user_id, user_email, error_type, message, stack_trace, severity, status)
    VALUES (?, ?, ?, ?, ?, ?, 'unresolved')
  `).run(userId || null, userEmail || null, errorType, message, stackTrace || null, severity);

  return findIssueById(result.lastInsertRowid);
}

function resolveIssue(id) {
  db.prepare("UPDATE system_issues SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  return findIssueById(id);
}

function resolveAllUserIssues(userId) {
  return db.prepare("UPDATE system_issues SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = 'unresolved'").run(userId);
}

function deleteResolvedIssues() {
  return db.prepare("DELETE FROM system_issues WHERE status = 'resolved'").run();
}

function getIssueStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM system_issues').get().count;
  const unresolved = db.prepare("SELECT COUNT(*) as count FROM system_issues WHERE status = 'unresolved'").get().count;
  const critical = db.prepare("SELECT COUNT(*) as count FROM system_issues WHERE status = 'unresolved' AND severity = 'critical'").get().count;
  return { total, unresolved, critical };
}

module.exports = {
  listIssues,
  findIssueById,
  getUserIssues,
  createIssue,
  resolveIssue,
  resolveAllUserIssues,
  deleteResolvedIssues,
  getIssueStats
};
