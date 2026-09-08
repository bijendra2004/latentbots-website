const express = require('express');
const issues = require('../models/issue');
const { requireAdmin } = require('./admin');

const router = express.Router();

router.get('/', requireAdmin, (req, res) => {
  const filter = {
    status: req.query.status || undefined,
    severity: req.query.severity || undefined,
    userId: req.query.userId || undefined,
    limit: req.query.limit || 100
  };
  res.json({ issues: issues.listIssues(filter) });
});

router.get('/stats', requireAdmin, (req, res) => {
  res.json({ stats: issues.getIssueStats() });
});

router.get('/user/:userId', requireAdmin, (req, res) => {
  res.json({ issues: issues.getUserIssues(req.params.userId) });
});

// Can be called by internal bot / worker or admin
router.post('/', (req, res) => {
  const { userId, userEmail, errorType, message, stackTrace, severity } = req.body;
  if (!errorType || !message) {
    return res.status(400).json({ error: 'errorType and message are required.' });
  }
  const created = issues.createIssue({ userId, userEmail, errorType, message, stackTrace, severity });
  res.status(201).json({ issue: created });
});

router.patch('/:id/resolve', requireAdmin, (req, res) => {
  const updated = issues.resolveIssue(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Issue not found.' });
  res.json({ issue: updated });
});

router.patch('/user/:userId/resolve-all', requireAdmin, (req, res) => {
  issues.resolveAllUserIssues(req.params.userId);
  res.json({ success: true, message: 'All issues for user marked as resolved.' });
});

router.delete('/resolved', requireAdmin, (req, res) => {
  issues.deleteResolvedIssues();
  res.json({ success: true, message: 'Resolved issues cleared.' });
});

module.exports = router;
