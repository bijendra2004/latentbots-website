const express = require('express');
const logs = require('../models/log');
const { requireAdmin } = require('./admin');

const router = express.Router();

router.get('/', requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  res.json({ logs: logs.listLogs(limit), stats: logs.getLogStats() });
});

router.post('/', (req, res) => {
  const { userId, sender, subject, phoneNumber, status, errorMessage } = req.body;
  if (!sender || !subject || !phoneNumber) {
    return res.status(400).json({ error: 'sender, subject, and phoneNumber are required.' });
  }
  const created = logs.createLog({ userId, sender, subject, phoneNumber, status, errorMessage });
  res.status(201).json({ log: created });
});

module.exports = router;
