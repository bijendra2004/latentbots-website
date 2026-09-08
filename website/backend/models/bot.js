const db = require('../db-connect');

function getAllBots(includeInactive = false) {
  if (includeInactive) {
    return db.prepare('SELECT * FROM bots ORDER BY created_at ASC').all();
  }
  return db.prepare("SELECT * FROM bots WHERE status = 'active' ORDER BY created_at ASC").all();
}

function getBotById(id) {
  return db.prepare('SELECT * FROM bots WHERE id = ?').get(id);
}

function upsertBot(data) {
  const existing = getBotById(data.id);
  const now = new Date().toISOString();

  if (existing) {
    // Update existing bot
    const stmt = db.prepare(`
      UPDATE bots SET
        name = @name,
        category = @category,
        version = @version,
        version_code = @version_code,
        description = @description,
        kicker = @kicker,
        heading = @heading,
        lede = @lede,
        microcopy = @microcopy,
        wa_text = @wa_text,
        steps_json = @steps_json,
        file_name = COALESCE(@file_name, file_name),
        file_path = COALESCE(@file_path, file_path),
        file_size = COALESCE(@file_size, file_size),
        status = @status,
        badge_status = @badge_status,
        updated_at = @updated_at
      WHERE id = @id
    `);

    stmt.run({
      id: data.id,
      name: data.name || existing.name,
      category: data.category || existing.category,
      version: data.version || existing.version,
      version_code: data.version_code || (existing.version_code + 1),
      description: data.description || existing.description,
      kicker: data.kicker || existing.kicker,
      heading: data.heading || existing.heading,
      lede: data.lede || existing.lede,
      microcopy: data.microcopy || existing.microcopy,
      wa_text: data.wa_text || existing.wa_text,
      steps_json: typeof data.steps_json === 'string' ? data.steps_json : JSON.stringify(data.steps_json || []),
      file_name: data.file_name || null,
      file_path: data.file_path || null,
      file_size: data.file_size || null,
      status: data.status || existing.status || 'active',
      badge_status: data.badge_status || existing.badge_status || 'LIVE',
      updated_at: data.updated_at || 'Just now'
    });

    return getBotById(data.id);
  }

  // Create new bot
  const stmt = db.prepare(`
    INSERT INTO bots (
      id, name, category, version, version_code, description,
      kicker, heading, lede, microcopy, wa_text, steps_json,
      file_name, file_path, file_size, status, badge_status, updated_at
    ) VALUES (
      @id, @name, @category, @version, @version_code, @description,
      @kicker, @heading, @lede, @microcopy, @wa_text, @steps_json,
      @file_name, @file_path, @file_size, @status, @badge_status, @updated_at
    )
  `);

  stmt.run({
    id: data.id,
    name: data.name,
    category: data.category || 'Automation',
    version: data.version || 'v1.0.0',
    version_code: data.version_code || 1,
    description: data.description || '',
    kicker: data.kicker || 'Intelligent WhatsApp Automation',
    heading: data.heading || `${data.name},<br><em>ready for WhatsApp.</em>`,
    lede: data.lede || data.description || '',
    microcopy: data.microcopy || 'Zero hassle. Instant WhatsApp connection.',
    wa_text: data.wa_text || `Hi, I want to activate ${data.name}!`,
    steps_json: typeof data.steps_json === 'string' ? data.steps_json : JSON.stringify(data.steps_json || []),
    file_name: data.file_name || null,
    file_path: data.file_path || null,
    file_size: data.file_size || 0,
    status: data.status || 'active',
    badge_status: data.badge_status || 'LIVE',
    updated_at: data.updated_at || 'Just now'
  });

  return getBotById(data.id);
}

function deleteBot(id) {
  return db.prepare('DELETE FROM bots WHERE id = ?').run(id);
}

function toggleBotStatus(id, newStatus) {
  db.prepare('UPDATE bots SET status = ? WHERE id = ?').run(newStatus, id);
  return getBotById(id);
}

function updateBotBadge(id, badgeStatus) {
  db.prepare('UPDATE bots SET badge_status = ? WHERE id = ?').run(badgeStatus, id);
  return getBotById(id);
}

module.exports = {
  getAllBots,
  getBotById,
  upsertBot,
  deleteBot,
  toggleBotStatus,
  updateBotBadge
};
