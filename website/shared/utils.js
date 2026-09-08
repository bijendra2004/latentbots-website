function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^\+?[1-9]\d{7,14}$/.test(String(phone || '').replace(/[\s()-]/g, ''));
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    phoneNumber: user.phone_number,
    signupDate: user.signup_date,
    active: Boolean(user.active),
    isBlocked: Boolean(user.is_blocked),
    lastSeenVersion: user.last_seen_version,
    openIssuesCount: Number(user.open_issues_count || 0)
  };
}

module.exports = { normalizeEmail, isValidEmail, isValidPhone, toPublicUser };