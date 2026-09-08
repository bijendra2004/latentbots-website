// ==========================================================
// BOT DEPLOYMENT & VERSION RELEASE HUB CONTROLLER
// ==========================================================

let activeBotsList = [];
let pendingUploadedFile = null;

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function bumpVersion(currentVer) {
  if (!currentVer) return 'v1.1.0';
  const clean = currentVer.replace(/^v/i, '').trim();
  const parts = clean.split('.').map(p => parseInt(p, 10) || 0);
  if (parts.length === 1) return `v${parts[0] + 1}.0.0`;
  if (parts.length === 2) return `v${parts[0]}.${parts[1] + 1}.0`;
  // Increment minor version: 1.0.0 -> 1.1.0
  parts[1] = (parts[1] || 0) + 1;
  parts[2] = 0;
  return `v${parts.join('.')}`;
}

async function loadAdminBots() {
  try {
    const res = await fetch('/api/bots?all=true', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load bots');
    const data = await res.json();
    activeBotsList = data.bots || [];

    renderBotSelectorOptions();
    renderDeployedBotsTable();

    const countBadge = document.getElementById('bot-count-indicator');
    if (countBadge) {
      countBadge.textContent = `${activeBotsList.length} Bot${activeBotsList.length === 1 ? '' : 's'} Active`;
    }
  } catch (err) {
    console.error('Error loading bots:', err);
  }
}

function renderBotSelectorOptions() {
  const selector = document.getElementById('bot-selector');
  if (!selector) return;

  const currentVal = selector.value;
  selector.innerHTML = `
    <option value="__new__">✨ Create & Deploy New Bot...</option>
    <optgroup label="Push Update to Existing Bot">
      ${activeBotsList.map(bot => `
        <option value="${bot.id}">🚀 ${bot.name} (${bot.version})</option>
      `).join('')}
    </optgroup>
  `;

  if (currentVal && (currentVal === '__new__' || activeBotsList.some(b => b.id === currentVal))) {
    selector.value = currentVal;
  } else {
    selector.value = '__new__';
  }
}

function renderDeployedBotsTable() {
  const tbody = document.getElementById('deployed-bots-body');
  if (!tbody) return;

  if (activeBotsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No bots deployed yet. Use the form above to deploy your first bot!</td></tr>`;
    return;
  }

  tbody.innerHTML = activeBotsList.map(bot => {
    const fileHtml = bot.has_file
      ? `<a href="/api/bots/download/${bot.id}" class="file-download-link" title="Download ${bot.file_name}">
           <span class="icon">💾</span> ${bot.file_name} <small>(${formatBytes(bot.file_size)})</small>
         </a>`
      : `<span class="muted-text">None attached</span>`;

    const currentBadge = (bot.badge_status || 'LIVE').toUpperCase();

    return `
      <tr>
        <td>
          <div class="bot-cell-name">
            <strong>${escapeAdminHtml(bot.name)}</strong>
            <span class="bot-slug-pill">#${bot.id}</span>
          </div>
        </td>
        <td><span class="cat-pill">${escapeAdminHtml(bot.category)}</span></td>
        <td>
          <div class="ver-cell">
            <span class="version-badge">${escapeAdminHtml(bot.version)}</span>
            <small class="muted-text">${bot.updated_at || 'Recent'}</small>
          </div>
        </td>
        <td>
          <select class="select-badge-inline badge-state-${currentBadge.toLowerCase().replace(/[^a-z]/g, '-')}" data-bot-id="${bot.id}" title="Change badge displayed on User Website Hero Corner">
            <option value="LIVE" ${currentBadge === 'LIVE' ? 'selected' : ''}>🟢 LIVE</option>
            <option value="COMING SOON" ${currentBadge === 'COMING SOON' ? 'selected' : ''}>🟡 COMING SOON</option>
            <option value="BETA" ${currentBadge === 'BETA' ? 'selected' : ''}>🔵 BETA</option>
            <option value="MAINTENANCE" ${currentBadge === 'MAINTENANCE' ? 'selected' : ''}>🟠 MAINTENANCE</option>
          </select>
        </td>
        <td>${fileHtml}</td>
        <td><span class="wa-preview-text" title="${escapeAdminHtml(bot.wa_text)}">"${escapeAdminHtml(bot.wa_text)}"</span></td>
        <td>
          <span class="status-pill ${bot.status === 'active' ? 'pill-online' : 'pill-offline'}">
            <span class="dot"></span> ${bot.status}
          </span>
        </td>
        <td style="text-align: right;">
          <div class="row-action-group">
            <button type="button" class="button button-light btn-sm btn-edit-bot" data-bot-id="${bot.id}" title="Edit / Push Version Update">
              ✏️ Push Update
            </button>
            <button type="button" class="button button-outline btn-sm btn-delete-bot" data-bot-id="${bot.id}" data-bot-name="${escapeAdminHtml(bot.name)}" title="Delete bot">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Wire up badge status instant change
  tbody.querySelectorAll('.select-badge-inline').forEach(select => {
    select.addEventListener('change', async () => {
      const botId = select.dataset.botId;
      const newBadge = select.value;
      const prevClass = select.className;
      select.disabled = true;

      try {
        const res = await fetch(`/api/bots/${botId}/badge`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ badge_status: newBadge })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update badge');

        select.disabled = false;
        select.className = `select-badge-inline badge-state-${newBadge.toLowerCase().replace(/[^a-z]/g, '-')}`;
        
        // Show brief visual feedback
        select.style.boxShadow = '0 0 0 3px rgba(46, 125, 50, 0.4)';
        setTimeout(() => { select.style.boxShadow = ''; }, 1000);

        // Update activeBotsList entry
        const found = activeBotsList.find(b => b.id === botId);
        if (found) found.badge_status = newBadge;
      } catch (err) {
        alert('Failed to update bot badge: ' + err.message);
        select.disabled = false;
      }
    });
  });

  // Wire up action buttons
  tbody.querySelectorAll('.btn-edit-bot').forEach(btn => {
    btn.addEventListener('click', () => {
      const botId = btn.dataset.botId;
      const selector = document.getElementById('bot-selector');
      if (selector) {
        selector.value = botId;
        handleBotSelectionChange(botId);
        document.getElementById('bot-deploy-panel')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  tbody.querySelectorAll('.btn-delete-bot').forEach(btn => {
    btn.addEventListener('click', async () => {
      const botId = btn.dataset.botId;
      const botName = btn.dataset.botName;
      if (confirm(`Are you sure you want to remove "${botName}" (#${botId}) from the system?`)) {
        try {
          const res = await fetch(`/api/bots/${botId}`, { method: 'DELETE' });
          if (res.ok) {
            await loadAdminBots();
            resetBotDeployForm();
          }
        } catch (err) {
          alert('Failed to delete bot: ' + err.message);
        }
      }
    });
  });
}

function handleBotSelectionChange(selectedVal) {
  const modeBadge = document.getElementById('bot-mode-badge');
  const idInput = document.getElementById('bot-id');
  const nameInput = document.getElementById('bot-name');
  const catInput = document.getElementById('bot-category');
  const verInput = document.getElementById('bot-version');
  const badgeSelect = document.getElementById('bot-badge-status');
  const descInput = document.getElementById('bot-description');
  const waInput = document.getElementById('bot-watext');
  const submitBtn = document.getElementById('btn-deploy-bot');

  const s1t = document.getElementById('step1-title-input');
  const s1d = document.getElementById('step1-desc-input');
  const s2t = document.getElementById('step2-title-input');
  const s2d = document.getElementById('step2-desc-input');
  const s3t = document.getElementById('step3-title-input');
  const s3d = document.getElementById('step3-desc-input');

  if (selectedVal === '__new__' || !selectedVal) {
    // New Bot Mode
    if (modeBadge) {
      modeBadge.textContent = '✨ Deploy New Bot';
      modeBadge.className = 'badge-status-pill pill-online';
    }
    if (idInput) { idInput.value = ''; idInput.readOnly = false; }
    if (nameInput) nameInput.value = '';
    if (catInput) catInput.value = 'Automation';
    if (verInput) verInput.value = 'v1.0.0';
    if (badgeSelect) badgeSelect.value = 'LIVE';
    if (descInput) descInput.value = '';
    if (waInput) waInput.value = 'Hi, I want to activate this WhatsApp Bot!';
    if (submitBtn) submitBtn.innerHTML = '🚀 Deploy Bot & Sync Live Website';

    // Default steps
    if (s1t) s1t.value = 'Set Forwarding Rule';
    if (s1d) s1d.value = 'Auto-forward priority emails or alerts to your dedicated bot address.';
    if (s2t) s2t.value = 'Choose Notification Level';
    if (s2d) s2d.value = 'Select full messages or AI-condensed smart summaries for quick reading.';
    if (s3t) s3t.value = 'Confirm WhatsApp Link';
    if (s3d) s3d.value = 'Click the button below to verify your WhatsApp chat and receive instant notifications.';
  } else {
    // Version Update Mode for Existing Bot
    const bot = activeBotsList.find(b => b.id === selectedVal);
    if (!bot) return;

    const nextVer = bumpVersion(bot.version);

    if (modeBadge) {
      modeBadge.textContent = `🚀 Version Update for ${bot.name} (${bot.version} → ${nextVer})`;
      modeBadge.className = 'badge-status-pill pill-update';
    }
    if (idInput) { idInput.value = bot.id; idInput.readOnly = true; }
    if (nameInput) nameInput.value = bot.name;
    if (catInput) catInput.value = bot.category;
    if (verInput) verInput.value = nextVer;
    if (badgeSelect) badgeSelect.value = bot.badge_status || 'LIVE';
    if (descInput) descInput.value = bot.description;
    if (waInput) waInput.value = bot.wa_text;
    if (submitBtn) submitBtn.innerHTML = `🚀 Publish Version Update (${nextVer}) for ${bot.name}`;

    // Fill steps
    const steps = bot.steps || [];
    if (steps.length >= 1) {
      if (s1t) s1t.value = steps[0].title || '';
      if (s1d) s1d.value = steps[0].desc || '';
    }
    if (steps.length >= 2) {
      if (s2t) s2t.value = steps[1].title || '';
      if (s2d) s2d.value = steps[1].desc || '';
    }
    if (steps.length >= 3) {
      if (s3t) s3t.value = steps[2].title || '';
      if (s3d) s3d.value = steps[2].desc || '';
    }
  }
}

function resetBotDeployForm() {
  const form = document.getElementById('bot-deploy-form');
  if (form) form.reset();
  const selector = document.getElementById('bot-selector');
  if (selector) selector.value = '__new__';
  clearBotFile();
  handleBotSelectionChange('__new__');
  const msg = document.getElementById('bot-form-msg');
  if (msg) msg.textContent = '';
}

function clearBotFile() {
  pendingUploadedFile = null;
  const fileInput = document.getElementById('bot-file-input');
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('file-preview');
  const dropContent = document.getElementById('dropzone-content');
  if (preview) preview.hidden = true;
  if (dropContent) dropContent.hidden = false;
}

function handleFileSelection(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    pendingUploadedFile = {
      fileName: file.name,
      fileSize: file.size,
      fileBase64: e.target.result
    };

    // Update file preview UI
    const preview = document.getElementById('file-preview');
    const dropContent = document.getElementById('dropzone-content');
    const nameDisp = document.getElementById('file-name-display');
    const sizeDisp = document.getElementById('file-size-display');

    if (nameDisp) nameDisp.textContent = file.name;
    if (sizeDisp) sizeDisp.textContent = formatBytes(file.size);
    if (preview) preview.hidden = false;
    if (dropContent) dropContent.hidden = true;

    // Smart JSON Auto-Parser if uploaded file is JSON
    if (file.name.endsWith('.json')) {
      try {
        const textContent = atob(e.target.result.split(',')[1]);
        const parsed = JSON.parse(textContent);
        if (parsed.name) document.getElementById('bot-name').value = parsed.name;
        if (parsed.id) document.getElementById('bot-id').value = parsed.id;
        if (parsed.category) document.getElementById('bot-category').value = parsed.category;
        if (parsed.version) document.getElementById('bot-version').value = parsed.version;
        if (parsed.description) document.getElementById('bot-description').value = parsed.description;
        if (parsed.wa_text) document.getElementById('bot-watext').value = parsed.wa_text;
      } catch (jsonErr) {
        console.warn('File was not bot metadata JSON:', jsonErr);
      }
    }
  };
  reader.readAsDataURL(file);
}

// Utility: HTML Escaping for Admin
function escapeAdminHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize Event Listeners
function initBotsPanel() {
  loadAdminBots();

  const selector = document.getElementById('bot-selector');
  if (selector) {
    selector.addEventListener('change', (e) => {
      handleBotSelectionChange(e.target.value);
    });
  }

  const btnReset = document.getElementById('btn-reset-bot-form');
  if (btnReset) {
    btnReset.addEventListener('click', resetBotDeployForm);
  }

  // File dropzone
  const dropzone = document.getElementById('bot-dropzone');
  const fileInput = document.getElementById('bot-file-input');
  const btnRemoveFile = document.getElementById('btn-remove-file');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', (e) => {
      if (e.target.id !== 'btn-remove-file') fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0]);
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });
  }

  if (btnRemoveFile) {
    btnRemoveFile.addEventListener('click', (e) => {
      e.stopPropagation();
      clearBotFile();
    });
  }

  // Deploy / Update Form Submission
  const form = document.getElementById('bot-deploy-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('bot-form-msg');
      const submitBtn = document.getElementById('btn-deploy-bot');

      const id = document.getElementById('bot-id')?.value.trim();
      const name = document.getElementById('bot-name')?.value.trim();
      const category = document.getElementById('bot-category')?.value.trim();
      const version = document.getElementById('bot-version')?.value.trim();
      const badge_status = document.getElementById('bot-badge-status')?.value || 'LIVE';
      const description = document.getElementById('bot-description')?.value.trim();
      const wa_text = document.getElementById('bot-watext')?.value.trim();
      const publish_release = document.getElementById('bot-publish-changelog')?.checked ?? true;

      const steps = [
        {
          title: document.getElementById('step1-title-input')?.value.trim() || 'Step 1',
          desc: document.getElementById('step1-desc-input')?.value.trim() || ''
        },
        {
          title: document.getElementById('step2-title-input')?.value.trim() || 'Step 2',
          desc: document.getElementById('step2-desc-input')?.value.trim() || ''
        },
        {
          title: document.getElementById('step3-title-input')?.value.trim() || 'Step 3',
          desc: document.getElementById('step3-desc-input')?.value.trim() || ''
        }
      ];

      if (!name || !id) {
        if (msg) {
          msg.textContent = 'Please fill all required bot fields.';
          msg.className = 'form-message error';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Deploying & Syncing...';
      }

      try {
        const payload = {
          id,
          name,
          category,
          version,
          badge_status,
          description,
          wa_text,
          steps,
          publish_release,
          release_title: `${name} ${version}`,
          release_description: description,
          file: pendingUploadedFile
        };

        const res = await fetch('/api/bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to deploy bot');

        if (msg) {
          msg.textContent = `✅ ${data.message}`;
          msg.className = 'form-message success';
        }

        // Refresh lists and changelog
        await loadAdminBots();
        clearBotFile();

        if (typeof renderChangelog === 'function') {
          renderChangelog();
        }
      } catch (err) {
        if (msg) {
          msg.textContent = `❌ ${err.message}`;
          msg.className = 'form-message error';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🚀 Deploy Bot & Sync Live Website';
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initBotsPanel);
