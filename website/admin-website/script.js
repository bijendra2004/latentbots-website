const Dashboard = (() => {
  const usersBody = document.querySelector('#users-body');
  const issuesBody = document.querySelector('#issues-body');
  const versionsTableBody = document.querySelector('#versions-table-body');
  const trafficStreamBody = document.querySelector('#traffic-stream-body');
  const activityList = document.querySelector('#activity-list');
  const stats = document.querySelector('#stats');
  const unresolvedCountEl = document.querySelector('#unresolved-count');

  // Modals
  const userDialog = document.querySelector('#user-dialog');
  const userForm = document.querySelector('#user-form');
  const issueDialog = document.querySelector('#user-issue-dialog');
  const userIssuesList = document.querySelector('#user-issues-list');
  const issueModalUserEmail = document.querySelector('#issue-modal-user-email');
  const issueModalUserPhone = document.querySelector('#issue-modal-user-phone');
  const btnResolveAllUserIssues = document.querySelector('#btn-resolve-all-user-issues');

  // Form & Templates
  const updateForm = document.querySelector('#update-form');
  const updateTitle = document.querySelector('#update-title');
  const updateDescription = document.querySelector('#update-description');
  const updateMessage = document.querySelector('#update-message');
  const btnTemplateAi = document.querySelector('#btn-template-ai');
  const btnTemplateSecurity = document.querySelector('#btn-template-security');

  let currentIssueFilter = 'all';
  let activeInspectUserId = null;

  async function loadAll() {
    await Promise.allSettled([
      loadUsers(),
      loadIssues(),
      loadVersions(),
      loadTraffic(),
      loadActivity()
    ]);
  }

  async function loadUsers() {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) return;
      const { users } = await response.json();

      renderUsersTable(users);
      updateKPIStats(users);
    } catch (e) {
      console.error('Error loading users:', e);
    }
  }

  function renderUsersTable(users) {
    if (!users || !users.length) {
      usersBody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center; padding: 24px;">No registered users yet.</td></tr>';
      return;
    }

    usersBody.innerHTML = users.map((user) => {
      let statusTag = '';
      if (user.isBlocked) {
        statusTag = '<span class="status-badge status-blocked">● Blocked</span>';
      } else if (user.active) {
        statusTag = '<span class="status-badge status-active">● Active</span>';
      } else {
        statusTag = '<span class="status-badge status-inactive">○ Inactive</span>';
      }

      const hasIssues = user.openIssuesCount > 0;
      const errorDotHtml = hasIssues 
        ? `<button type="button" class="error-dot-btn" data-inspect-user="${user.id}" data-email="${escapeHtml(user.email)}" data-phone="${escapeHtml(user.phoneNumber)}" title="${user.openIssuesCount} active issue(s). Click to inspect."><span class="pulse-dot"></span></button>` 
        : '';

      const blockBtnText = user.isBlocked ? 'Unblock' : 'Block';
      const blockBtnClass = user.isBlocked ? 'button-success-outline' : 'button-danger-outline';

      return `
        <tr>
          <td>
            <div class="user-email-cell">
              ${errorDotHtml}
              <span>${escapeHtml(user.email)}</span>
            </div>
          </td>
          <td><code>${escapeHtml(user.phoneNumber)}</code></td>
          <td><small>${new Date(user.signupDate + 'Z').toLocaleDateString()}</small></td>
          <td>${statusTag}</td>
          <td><code>v${user.lastSeenVersion}.0</code></td>
          <td>
            <div class="action-group">
              <button class="button ${blockBtnClass}" data-toggle-block="${user.id}" data-blocked="${user.isBlocked ? '1' : '0'}">${blockBtnText}</button>
              <button class="btn-edit-user" data-edit-user="${escapeHtml(JSON.stringify(user))}">Edit</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row events
    usersBody.querySelectorAll('[data-toggle-block]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.toggleBlock;
        const currentBlocked = btn.dataset.blocked === '1';
        btn.disabled = true;
        try {
          const res = await fetch(`/api/users/${userId}/toggle-block`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isBlocked: !currentBlocked })
          });
          if (res.ok) await loadUsers();
        } finally {
          btn.disabled = false;
        }
      });
    });

    usersBody.querySelectorAll('[data-edit-user]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openUserEditor(JSON.parse(btn.dataset.editUser));
      });
    });

    usersBody.querySelectorAll('[data-inspect-user]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openUserIssueInspection(btn.dataset.inspectUser, btn.dataset.email, btn.dataset.phone);
      });
    });
  }

  async function updateKPIStats(users) {
    try {
      const [issuesStatsRes, versionsRes, logsRes] = await Promise.allSettled([
        fetch('/api/issues/stats').then(r => r.json()),
        fetch('/api/versions').then(r => r.json()),
        fetch('/api/logs').then(r => r.json())
      ]);

      const issueStats = issuesStatsRes.status === 'fulfilled' ? issuesStatsRes.value?.stats || { unresolved: 0 } : { unresolved: 0 };
      const versions = versionsRes.status === 'fulfilled' ? versionsRes.value?.versions || [] : [];
      const logStats = logsRes.status === 'fulfilled' ? logsRes.value?.stats || { delivered: 0 } : { delivered: 0 };

      const latestVer = versions.length ? `v${versions[0].version_number}.0.0` : 'v1.0.0';
      const activeUsers = users.filter(u => u.active && !u.isBlocked).length;
      const unresolvedIssues = issueStats.unresolved || 0;

      if (unresolvedCountEl) unresolvedCountEl.textContent = unresolvedIssues;

      stats.innerHTML = `
        <div class="stat-card">
          <span class="stat-val">${users.length}</span>
          <span class="stat-label">Total Accounts</span>
        </div>
        <div class="stat-card">
          <span class="stat-val">${activeUsers}</span>
          <span class="stat-label">Active & Unblocked</span>
        </div>
        <div class="stat-card">
          <span class="stat-val">${logStats.delivered || 0}</span>
          <span class="stat-label">Messages Forwarded</span>
        </div>
        <div class="stat-card ${unresolvedIssues > 0 ? 'alert-card' : ''}">
          <span class="stat-val">${unresolvedIssues}</span>
          <span class="stat-label">Active System Issues</span>
        </div>
        <div class="stat-card">
          <span class="stat-val">${latestVer}</span>
          <span class="stat-label">Live Released Version</span>
        </div>
      `;
    } catch (e) {
      console.error('Error updating KPI stats:', e);
    }
  }

  async function loadIssues() {
    try {
      let url = '/api/issues';
      if (currentIssueFilter !== 'all') {
        url += `?status=${currentIssueFilter}`;
      }
      const response = await fetch(url);
      if (!response.ok) return;
      const { issues } = await response.json();

      renderIssuesTable(issues);
    } catch (e) {
      console.error('Error loading issues:', e);
    }
  }

  function renderIssuesTable(issues) {
    if (!issues || !issues.length) {
      issuesBody.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center; padding: 24px;">No system issues recorded. Everything is running smoothly! 🎉</td></tr>';
      return;
    }

    issuesBody.innerHTML = issues.map((iss) => {
      const sevClass = iss.severity === 'critical' ? 'sev-critical' : iss.severity === 'warning' ? 'sev-warning' : 'sev-info';
      const isResolved = iss.status === 'resolved';

      return `
        <tr style="${isResolved ? 'opacity: 0.65;' : ''}">
          <td><span class="severity-badge ${sevClass}">${iss.severity}</span></td>
          <td><strong>${escapeHtml(iss.error_type)}</strong></td>
          <td><code>${iss.user_email ? escapeHtml(iss.user_email) : 'System / Gateway'}</code></td>
          <td><div class="code-trace" title="${escapeHtml(iss.message)}">${escapeHtml(iss.message)}</div></td>
          <td><small>${new Date(iss.created_at + 'Z').toLocaleTimeString()}</small></td>
          <td>
            <span class="status-badge ${isResolved ? 'status-active' : 'status-blocked'}">
              ${isResolved ? 'Resolved' : 'Active'}
            </span>
          </td>
          <td style="text-align: right;">
            ${!isResolved ? `<button class="button button-light btn-sm" data-resolve-issue="${iss.id}">Resolve</button>` : '<small class="muted">Fixed</small>'}
          </td>
        </tr>
      `;
    }).join('');

    issuesBody.querySelectorAll('[data-resolve-issue]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const res = await fetch(`/api/issues/${btn.dataset.resolveIssue}/resolve`, { method: 'PATCH' });
          if (res.ok) {
            await Promise.all([loadIssues(), loadUsers()]);
          }
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  async function openUserIssueInspection(userId, email, phone) {
    activeInspectUserId = userId;
    issueModalUserEmail.textContent = `Errors for ${email}`;
    issueModalUserPhone.textContent = `WhatsApp: ${phone}`;
    userIssuesList.innerHTML = '<p class="muted">Loading issue history...</p>';
    issueDialog.showModal();

    try {
      const res = await fetch(`/api/issues/user/${userId}`);
      if (!res.ok) throw new Error('Failed to load issues');
      const { issues } = await res.json();

      if (!issues.length) {
        userIssuesList.innerHTML = '<p class="muted">No logged issues for this user.</p>';
        return;
      }

      userIssuesList.innerHTML = issues.map((iss) => `
        <div class="modal-issue-item ${iss.status === 'resolved' ? 'resolved' : ''}">
          <div class="modal-issue-top">
            <span class="modal-issue-type">⚠️ ${escapeHtml(iss.error_type)}</span>
            <span class="status-badge ${iss.status === 'resolved' ? 'status-active' : 'status-blocked'}">${iss.status}</span>
          </div>
          <p class="modal-issue-msg">${escapeHtml(iss.message)}</p>
          <div class="modal-issue-time">${new Date(iss.created_at + 'Z').toLocaleString()}</div>
        </div>
      `).join('');
    } catch (e) {
      userIssuesList.innerHTML = '<p class="error">Could not load issue history.</p>';
    }
  }

  btnResolveAllUserIssues.addEventListener('click', async () => {
    if (!activeInspectUserId) return;
    btnResolveAllUserIssues.disabled = true;
    try {
      const res = await fetch(`/api/issues/user/${activeInspectUserId}/resolve-all`, { method: 'PATCH' });
      if (res.ok) {
        issueDialog.close();
        await Promise.all([loadUsers(), loadIssues()]);
      }
    } finally {
      btnResolveAllUserIssues.disabled = false;
    }
  });

  document.querySelector('#close-issue-dialog').addEventListener('click', () => issueDialog.close());
  document.querySelector('#btn-dismiss-issue-dialog').addEventListener('click', () => issueDialog.close());

  async function loadVersions() {
    try {
      const response = await fetch('/api/versions');
      if (!response.ok) return;
      const { versions } = await response.json();

      if (!versions || !versions.length) {
        versionsTableBody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center; padding: 24px;">No releases published yet.</td></tr>';
        return;
      }

      versionsTableBody.innerHTML = versions.map((v) => `
        <tr>
          <td><strong style="font-family: 'DM Mono', monospace;">v${v.version_number}.0.0</strong></td>
          <td>
            <strong>${escapeHtml(v.title)}</strong><br>
            <small class="muted">${escapeHtml(v.description)}</small>
          </td>
          <td><small>${new Date(v.published_date + 'Z').toLocaleDateString()}</small></td>
          <td><span class="status-badge status-live">● Live</span></td>
          <td><code>${v.notified_count || 0} users</code></td>
          <td><small class="muted">${escapeHtml(v.published_by || 'Admin')}</small></td>
        </tr>
      `).join('');
    } catch (e) {
      console.error('Error loading versions:', e);
    }
  }

  async function loadTraffic() {
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) return;
      const { logs } = await response.json();

      if (!logs || !logs.length) {
        trafficStreamBody.innerHTML = '<p class="muted" style="padding: 18px 0;">No message traffic forwarded yet.</p>';
        return;
      }

      trafficStreamBody.innerHTML = logs.map((log) => `
        <div class="stream-card">
          <div class="stream-meta">
            <span>From: ${escapeHtml(log.sender)}</span>
            <span>${new Date(log.created_at + 'Z').toLocaleTimeString()}</span>
          </div>
          <div class="stream-title">📧 ${escapeHtml(log.subject)}</div>
          <div class="stream-target">To WhatsApp: <code>${escapeHtml(log.phone_number)}</code></div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Error loading traffic:', e);
    }
  }

  async function loadActivity() {
    try {
      const response = await fetch('/api/admin/login-activity');
      if (!response.ok) return;
      const { activity } = await response.json();

      activityList.innerHTML = activity.length ? activity.map((item) => `
        <div class="activity">
          <span class="${item.success ? 'success' : 'failure'}">
            ${item.success ? '✓ Successful Login' : '✗ Failed Login'} (${escapeHtml(item.email)})
          </span>
          <small>${new Date(item.created_at + 'Z').toLocaleString()}</small>
        </div>
      `).join('') : '<p class="muted">No recent admin activity.</p>';
    } catch (e) {
      console.error('Error loading activity:', e);
    }
  }

  function openUserEditor(user) {
    Object.entries({ id: user.id, email: user.email, phoneNumber: user.phoneNumber }).forEach(([key, value]) => {
      if (userForm.elements[key]) userForm.elements[key].value = value;
    });
    userForm.elements.active.checked = user.active;
    userForm.elements.isBlocked.checked = Boolean(user.isBlocked);
    userDialog.showModal();
  }

  userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(userForm));
    body.active = userForm.elements.active.checked;
    body.isBlocked = userForm.elements.isBlocked.checked;

    const response = await fetch(`/api/users/${body.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      userDialog.close();
      await loadUsers();
    } else {
      document.querySelector('#user-error').textContent = 'Could not save user changes.';
    }
  });

  // Staged Update Release Form Handler (Legacy form guard)
  if (updateForm) {
    updateForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (updateMessage) {
        updateMessage.textContent = 'Publishing version and notifying users...';
        updateMessage.className = 'form-message';
      }

      const body = Object.fromEntries(new FormData(updateForm));
      try {
        const response = await fetch('/api/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        if (updateMessage) {
          updateMessage.textContent = `🎉 Version v${result.version.version_number}.0.0 published live to all users!`;
          updateMessage.className = 'form-message success';
        }
        updateForm.reset();
        await Promise.all([loadVersions(), loadUsers()]);
      } catch (error) {
        if (updateMessage) {
          updateMessage.textContent = error.message || 'Could not publish update.';
          updateMessage.className = 'form-message error';
        }
      }
    });
  }

  // Template Quick-fill Buttons
  if (btnTemplateAi && updateTitle && updateDescription) {
    btnTemplateAi.addEventListener('click', () => {
      updateTitle.value = 'Fast WhatsApp Delivery & Noise Filtering v1.1.0';
      updateDescription.value = '- Real-time WhatsApp message delivery under 500ms\n- Advanced spam and newsletter filtering algorithm\n- Automatic summary preview generation for long emails';
    });
  }

  if (btnTemplateSecurity && updateTitle && updateDescription) {
    btnTemplateSecurity.addEventListener('click', () => {
      updateTitle.value = 'End-to-End Encryption & Account Security Patch';
      updateDescription.value = '- Zero-retention message forwarding pipeline\n- Enhanced rate-limiting & spoofing protection\n- Instant WhatsApp opt-out toggle commands';
    });
  }

  // Filter tabs for issues
  document.querySelectorAll('.filter-tabs .tab-btn').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tabs .tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentIssueFilter = tab.dataset.filter;
      loadIssues();
    });
  });

  document.querySelector('#clear-resolved-btn').addEventListener('click', async () => {
    await fetch('/api/issues/resolved', { method: 'DELETE' });
    await loadIssues();
  });

  const refreshAllBtn = document.querySelector('#refresh-all');
  if (refreshAllBtn) {
    refreshAllBtn.addEventListener('click', async () => {
      refreshAllBtn.classList.add('spinning');
      try {
        await loadAll();
      } finally {
        setTimeout(() => refreshAllBtn.classList.remove('spinning'), 500);
      }
    });
  }

  const refreshUsersBtn = document.querySelector('#refresh-users');
  if (refreshUsersBtn) {
    refreshUsersBtn.addEventListener('click', async () => {
      refreshUsersBtn.classList.add('spinning');
      try {
        await loadUsers();
      } finally {
        setTimeout(() => refreshUsersBtn.classList.remove('spinning'), 500);
      }
    });
  }

  // Load everything immediately on startup
  loadAll();
  window.addEventListener('admin-ready', loadAll);
  document.addEventListener('DOMContentLoaded', loadAll);

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]);
  }
})();