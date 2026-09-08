const express = require('express');
const versions = require('../models/version');
const users = require('../models/user');
const { requireAdmin } = require('./admin');

const router = express.Router();

// Bot integration: returns the latest published version without exposing admin credentials.
router.get('/latest-version', (request, response) => response.json({ version: versions.getLatestVersion() }));

// Bot integration: checks whether an active user is behind the latest version.
router.get('/check-update/:userId', (request, response) => {
  const state = users.getNotificationState(request.params.userId, versions.getLatestVersion());
  if (!state) return response.status(404).json({ error: 'User not found.' });
  response.json(state);
});

// Bot integration: call after the bot successfully sends the update notification.
router.post('/mark-notified/:userId', (request, response) => {
  const latest = versions.getLatestVersion();
  if (!latest) return response.status(409).json({ error: 'No published version exists.' });
  const user = users.markVersionSeen(request.params.userId, latest.version_number);
  if (!user) return response.status(404).json({ error: 'Active user not found.' });
  response.json({ userId: user.id, lastSeenVersion: user.last_seen_version, markedVersion: latest.version_number });
});

router.get('/versions', requireAdmin, (request, response) => response.json({ versions: versions.listVersions() }));

router.post('/versions', requireAdmin, (request, response) => {
  const title = String(request.body.title || '').trim();
  const description = String(request.body.description || '').trim();
  if (!title || !description || title.length > 120 || description.length > 5000) return response.status(400).json({ error: 'Title and description are required.' });
  response.status(201).json({ version: versions.publishVersion({ title, description, publishedBy: request.admin.email }) });
});

router.patch('/versions/:id/publish', requireAdmin, (request, response) => {
  const updated = versions.publishDraft(request.params.id);
  if (!updated) return response.status(404).json({ error: 'Draft version not found.' });
  response.json({ version: updated });
});

module.exports = router;