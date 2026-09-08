const crypto = require('crypto');
const db = require('../db-connect');

function listUsers() {
  return db.prepare(`
    SELECT u.*, 
      (SELECT COUNT(*) FROM system_issues s WHERE s.user_id = u.id AND s.status = 'unresolved') AS open_issues_count
    FROM users u 
    ORDER BY u.signup_date DESC
  `).all();
}

function findUserById(id) {
  return db.prepare(`
    SELECT u.*, 
      (SELECT COUNT(*) FROM system_issues s WHERE s.user_id = u.id AND s.status = 'unresolved') AS open_issues_count
    FROM users u 
    WHERE u.id = ?
  `).get(id) || null;
}

function updateUser(id, changes) {
  const user = findUserById(id);
  if (!user) return null;
  const isBlocked = changes.isBlocked !== undefined ? (changes.isBlocked ? 1 : 0) : user.is_blocked;
  db.prepare('UPDATE users SET email = ?, phone_number = ?, active = ?, is_blocked = ? WHERE id = ?')
    .run(changes.email, changes.phoneNumber, changes.active ? 1 : 0, isBlocked, id);
  return findUserById(id);
}

function toggleBlock(id, blockStatus) {
  const user = findUserById(id);
  if (!user) return null;
  const newBlockedState = blockStatus !== undefined ? (blockStatus ? 1 : 0) : (user.is_blocked ? 0 : 1);
  db.prepare('UPDATE users SET is_blocked = ? WHERE id = ?').run(newBlockedState, id);
  return findUserById(id);
}

function findUserByEmail(email) {
  return db.prepare(`
    SELECT u.*, 
      (SELECT COUNT(*) FROM system_issues s WHERE s.user_id = u.id AND s.status = 'unresolved') AS open_issues_count
    FROM users u 
    WHERE LOWER(u.email) = LOWER(?)
  `).get(email) || null;
}

function createUser({ email, phoneNumber = '' }) {
  const existing = findUserByEmail(email);
  if (existing) {
    if (phoneNumber && phoneNumber !== existing.phone_number) {
      db.prepare('UPDATE users SET phone_number = ?, active = 1 WHERE id = ?').run(phoneNumber, existing.id);
    }
    return findUserById(existing.id);
  }
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, email, phone_number) VALUES (?, ?, ?)').run(id, email, phoneNumber || '');
  return findUserById(id);
}

function saveOtp({ email, otpCode, expiryMinutes = 10 }) {
  const expiresAt = Date.now() + expiryMinutes * 60 * 1000;
  // Invalidate any previous unverified OTPs for this email
  db.prepare('UPDATE email_otps SET verified = 1 WHERE LOWER(email) = LOWER(?) AND verified = 0').run(email);
  const stmt = db.prepare('INSERT INTO email_otps (email, otp_code, expires_at, verified) VALUES (?, ?, ?, 0)');
  stmt.run(email.toLowerCase(), String(otpCode), expiresAt);
  return { email, otpCode, expiresAt };
}

function verifyOtp({ email, otpCode }) {
  const now = Date.now();
  const row = db.prepare(`
    SELECT * FROM email_otps 
    WHERE LOWER(email) = LOWER(?) AND otp_code = ? AND verified = 0 AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(email.toLowerCase(), String(otpCode).trim(), now);

  if (!row) {
    return { success: false, message: 'Invalid or expired OTP code. Please request a new one.' };
  }

  // Mark OTP as verified
  db.prepare('UPDATE email_otps SET verified = 1 WHERE id = ?').run(row.id);
  return { success: true, otpId: row.id };
}

function getNotificationState(id, currentVersion) {
  const user = findUserById(id);
  if (!user || user.is_blocked) return null;
  return {
    userId: id,
    currentVersion: currentVersion || null,
    lastSeenVersion: user.last_seen_version,
    needsNotification: Boolean(currentVersion && user.active && !user.is_blocked && user.last_seen_version < currentVersion.version_number)
  };
}

function markVersionSeen(id, versionNumber) {
  const result = db.prepare('UPDATE users SET last_seen_version = MAX(last_seen_version, ?) WHERE id = ? AND active = 1 AND is_blocked = 0')
    .run(versionNumber, id);
  return result.changes > 0 ? findUserById(id) : null;
}

module.exports = {
  listUsers,
  findUserById,
  findUserByEmail,
  updateUser,
  toggleBlock,
  createUser,
  saveOtp,
  verifyOtp,
  getNotificationState,
  markVersionSeen
};