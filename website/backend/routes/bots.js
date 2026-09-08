const fs = require('fs');
const path = require('path');
const express = require('express');
const botModel = require('../models/bot');
const versionModel = require('../models/version');
const { requireAdmin } = require('./admin');
const { config } = require('../../shared/config');

const router = express.Router();
const botFilesDir = path.resolve(path.dirname(config.dbPath), 'bot-files');

// Public: Get all active bots (or all for admin if query ?all=true)
router.get('/', (req, res) => {
  try {
    const includeInactive = req.query.all === 'true';
    const bots = botModel.getAllBots(includeInactive);

    // Parse steps_json into steps array for frontend ease
    const formattedBots = bots.map((bot) => {
      let steps = [];
      try {
        steps = typeof bot.steps_json === 'string' ? JSON.parse(bot.steps_json) : (bot.steps_json || []);
      } catch {
        steps = [];
      }
      return {
        ...bot,
        steps,
        has_file: !!bot.file_name
      };
    });

    res.json({ bots: formattedBots });
  } catch (error) {
    console.error('Error fetching bots:', error);
    res.status(500).json({ error: 'Failed to retrieve bots.' });
  }
});

// Public: Get single bot by ID
router.get('/:id', (req, res) => {
  try {
    const bot = botModel.getBotById(req.params.id);
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found.' });
    }
    let steps = [];
    try {
      steps = typeof bot.steps_json === 'string' ? JSON.parse(bot.steps_json) : (bot.steps_json || []);
    } catch {}
    res.json({ bot: { ...bot, steps, has_file: !!bot.file_name } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve bot.' });
  }
});

// Admin: Deploy New Bot OR Publish Version Update
router.post('/', requireAdmin, (req, res) => {
  try {
    const {
      id,
      name,
      category,
      version,
      description,
      kicker,
      heading,
      lede,
      microcopy,
      wa_text,
      steps,
      badge_status,
      publish_release,
      release_title,
      release_description,
      file
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Bot name is required.' });
    }

    // Auto-generate bot ID / slug if not provided
    const safeId = (id || name.toLowerCase().replace(/[^a-z0-9]/g, '')).trim();
    if (!safeId) {
      return res.status(400).json({ error: 'A valid bot identifier or name is required.' });
    }

    // Check if existing bot
    const existing = botModel.getBotById(safeId);
    const isUpdate = !!existing;

    let savedFileName = null;
    let savedFilePath = null;
    let savedFileSize = 0;

    // Handle file upload if provided via Base64
    if (file && file.fileBase64 && file.fileName) {
      const cleanFileName = path.basename(file.fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const diskFileName = `${safeId}-${Date.now()}-${cleanFileName}`;
      const fullPath = path.join(botFilesDir, diskFileName);

      // Clean base64 prefix if present (e.g. data:application/javascript;base64,...)
      const base64Data = file.fileBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(fullPath, buffer);

      savedFileName = file.fileName;
      savedFilePath = diskFileName;
      savedFileSize = buffer.length;
    }

    const versionStr = version ? (version.startsWith('v') ? version : `v${version}`) : (existing ? existing.version : 'v1.0.0');

    // Prepare bot data
    const botData = {
      id: safeId,
      name: name.trim(),
      category: category ? category.trim() : (existing ? existing.category : 'Automation'),
      version: versionStr,
      version_code: isUpdate ? (existing.version_code + 1) : 1,
      description: description ? description.trim() : (existing ? existing.description : ''),
      kicker: kicker ? kicker.trim() : (existing ? existing.kicker : 'Intelligent WhatsApp Automation'),
      heading: heading ? heading.trim() : (existing ? existing.heading : `${name.trim()},<br><em>right where you are.</em>`),
      lede: lede ? lede.trim() : (description ? description.trim() : (existing ? existing.lede : '')),
      microcopy: microcopy ? microcopy.trim() : (existing ? existing.microcopy : 'No new app. No noisy feed. Just WhatsApp.'),
      wa_text: wa_text ? wa_text.trim() : (existing ? existing.wa_text : `Hi, I want to activate ${name.trim()}!`),
      steps_json: JSON.stringify(steps || (existing ? JSON.parse(existing.steps_json || '[]') : [
        { title: 'Configure Notification Webhook', desc: 'Add webhook URL or forward trigger to your bot address.' },
        { title: 'Set Filter Rules', desc: 'Choose AI summaries or full instant message notifications.' },
        { title: 'Confirm WhatsApp Link', desc: 'Click connect to verify your chat and start receiving notifications.' }
      ])),
      file_name: savedFileName,
      file_path: savedFilePath,
      file_size: savedFileSize,
      status: 'active',
      badge_status: badge_status ? badge_status.trim().toUpperCase() : (existing ? existing.badge_status : 'LIVE'),
      updated_at: 'Today, Real-time'
    };

    const savedBot = botModel.upsertBot(botData);

    // If marked as publish_release, also record in Changelog / versions table
    if (publish_release || isUpdate) {
      try {
        const nextVerNum = versionModel.getNextVersionNumber();
        const vTitle = release_title || `${savedBot.name} Update ${savedBot.version}`;
        const vDesc = release_description || `${savedBot.name} version ${savedBot.version} published with enhanced WhatsApp integration & automation rules.`;
        versionModel.createVersion({
          title: vTitle,
          description: vDesc,
          versionNumber: nextVerNum,
          publishedBy: req.admin ? req.admin.email : 'Owner Console'
        });
      } catch (verErr) {
        console.warn('Could not auto-create version release note:', verErr);
      }
    }

    res.json({
      success: true,
      message: isUpdate ? `Bot ${savedBot.name} successfully updated to ${savedBot.version}!` : `New Bot ${savedBot.name} deployed successfully!`,
      bot: savedBot,
      isUpdate
    });
  } catch (error) {
    console.error('Bot deploy error:', error);
    res.status(500).json({ error: 'Failed to deploy bot: ' + error.message });
  }
});

// Admin: Update Bot Badge Status (LIVE, COMING SOON, BETA, MAINTENANCE)
router.patch('/:id/badge', requireAdmin, (req, res) => {
  try {
    const { badge_status } = req.body;
    if (!badge_status) {
      return res.status(400).json({ error: 'Badge status is required.' });
    }
    const cleanBadge = badge_status.trim().toUpperCase();
    const updated = botModel.updateBotBadge(req.params.id, cleanBadge);
    if (!updated) {
      return res.status(404).json({ error: 'Bot not found.' });
    }
    res.json({ success: true, message: `Badge updated to ${cleanBadge}`, bot: updated });
  } catch (error) {
    console.error('Update bot badge error:', error);
    res.status(500).json({ error: 'Failed to update bot badge.' });
  }
});

// Admin: Delete / Archive Bot
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const existing = botModel.getBotById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Bot not found.' });
    }
    botModel.deleteBot(req.params.id);
    res.json({ success: true, message: `Bot ${existing.name} removed successfully.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bot.' });
  }
});

// Download Bot File
router.get('/download/:id', (req, res) => {
  try {
    const bot = botModel.getBotById(req.params.id);
    if (!bot || !bot.file_path) {
      return res.status(404).json({ error: 'No bot script file attached to this bot.' });
    }
    const fullPath = path.join(botFilesDir, bot.file_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Attached bot file was not found on server storage.' });
    }
    res.download(fullPath, bot.file_name || 'bot-file.js');
  } catch (error) {
    res.status(500).json({ error: 'Could not download bot file.' });
  }
});

module.exports = router;
