const whatsappNumber = '15551234567';

// Utility: HTML Escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Fallback / Initial Bots Roster Data (Dynamically updated via /api/bots)
let BOTS_DATABASE = {
  latentmail: {
    id: 'latentmail',
    name: 'LatentMail WhatsApp Bot',
    category: 'Email Forwarding',
    version: 'v1.0.0',
    updated: 'Today, Real-time',
    description: 'LatentMail delivers your most important emails and AI-condensed smart summaries straight to your WhatsApp chat, so you never miss critical updates without opening noisy inboxes.',
    steps: [
      { title: 'Set Forwarding Rule', desc: 'Auto-forward priority emails or alerts to your dedicated bot address.' },
      { title: 'Choose Notification Level', desc: 'Select full messages or AI-condensed smart summaries for quick reading.' },
      { title: 'Confirm WhatsApp Link', desc: 'Click the button below to verify your WhatsApp chat and receive instant notifications.' }
    ],
    waText: 'Hi, I want to activate LatentMail WhatsApp Bot for my account!'
  },
  latentalert: {
    id: 'latentalert',
    name: 'LatentAlert System Bot',
    category: 'DevOps & Health',
    version: 'v1.1.0',
    updated: 'Sep 5, 2026',
    description: 'Instant critical server downtime, error alerts, and uptime status alerts delivered straight to WhatsApp within seconds of incident occurrence.',
    steps: [
      { title: 'Configure Webhook URL', desc: 'Add our webhook URL to your monitoring service (Sentry, GitHub, Datadog).' },
      { title: 'Filter Severity Level', desc: 'Select alert thresholds for Critical, Warning, or Info notifications.' },
      { title: 'Verify Alert Channel', desc: 'Click connect to start receiving automated server incident pings on WhatsApp.' }
    ],
    waText: 'Hi, I want to activate LatentAlert Monitoring Bot for server alerts!'
  },
  latentdigest: {
    id: 'latentdigest',
    name: 'LatentDigest Briefing Bot',
    category: 'Daily Productivity',
    version: 'v1.0.0',
    updated: 'Sep 4, 2026',
    description: 'A calm, curated morning briefing of your upcoming calendar schedule, newsletter highlights, and priority unread threads delivered at 8:00 AM daily.',
    steps: [
      { title: 'Connect Calendar & Feeds', desc: 'Link your Google/Outlook calendar and newsletter subscriptions.' },
      { title: 'Select Morning Time Slot', desc: 'Choose your preferred briefing time (e.g. 8:00 AM or 9:00 AM daily).' },
      { title: 'Activate Daily Digest', desc: 'Click connect to confirm delivery directly to your WhatsApp each morning.' }
    ],
    waText: 'Hi, I want to subscribe to LatentDigest Daily Morning Briefing on WhatsApp!'
  },
  latentlead: {
    id: 'latentlead',
    name: 'LatentLead Inbound Bot',
    category: 'Sales & Inbound',
    version: 'v1.0.0',
    updated: 'Sep 3, 2026',
    description: 'Never miss an inbound customer inquiry. Gets instant WhatsApp lead alerts within 5 seconds of customer web form submissions.',
    steps: [
      { title: 'Embed Capture Webhook', desc: 'Paste our capture webhook into your landing page or contact form.' },
      { title: 'Map Lead Fields', desc: 'Configure lead name, phone, budget, and inquiry fields for WhatsApp preview.' },
      { title: 'Connect Sales Channel', desc: 'Click connect to route high-intent leads to your sales WhatsApp instantly.' }
    ],
    waText: 'Hi, I want to activate LatentLead CRM Bot for instant WhatsApp sales alerts!'
  }
};

let activeSelectedBot = BOTS_DATABASE.latentmail;

// User Session Management
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('latentmail_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('latentmail_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('latentmail_user');
  }
  updateHeaderAuthUI();
}

function updateHeaderAuthUI() {
  const container = document.getElementById('header-auth-container');
  if (!container) return;
  const user = getCurrentUser();
  if (user && user.email) {
    container.innerHTML = `
      <div class="user-auth-pill">
        <span class="dot"></span>
        <span>${escapeHtml(user.email)}</span>
      </div>
      <a class="btn-signin" id="btn-signout" href="#signout" style="padding: 6px 10px; font-size: 12.5px;">Sign Out</a>
    `;
    const signOutBtn = document.getElementById('btn-signout');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setCurrentUser(null);
      });
    }
  } else {
    container.innerHTML = `
      <a class="btn-signin" id="btn-header-signin" href="#signin">Sign In</a>
      <a class="btn-signup" id="btn-header-signup" href="#signup">Sign Up</a>
    `;
    const inBtn = document.getElementById('btn-header-signin');
    const upBtn = document.getElementById('btn-header-signup');
    if (inBtn) inBtn.addEventListener('click', (e) => { e.preventDefault(); openAuthModal(); });
    if (upBtn) upBtn.addEventListener('click', (e) => { e.preventDefault(); openAuthModal(); });
  }
}

// Fetch dynamic bots list and sync website catalog & database
async function loadDynamicBots() {
  try {
    const res = await fetch('/api/bots', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.bots && data.bots.length > 0) {
      data.bots.forEach((bot) => {
        BOTS_DATABASE[bot.id] = {
          id: bot.id,
          name: bot.name,
          category: bot.category,
          version: bot.version,
          badge_status: bot.badge_status || 'LIVE',
          updated: bot.updated_at || 'Recent',
          description: bot.description,
          steps: bot.steps && bot.steps.length ? bot.steps : (BOTS_DATABASE[bot.id]?.steps || []),
          waText: bot.wa_text || (BOTS_DATABASE[bot.id]?.waText || 'Hi, I want to connect on WhatsApp!')
        };
      });

      renderBotsCatalogTable(data.bots);
      syncHeroCardVersions();
    }
  } catch (err) {
    console.warn('Could not fetch dynamic bots:', err);
  }
}

function syncHeroCardVersions() {
  document.querySelectorAll('.hero-card').forEach((card) => {
    const botId = card.dataset.bot;
    if (botId && BOTS_DATABASE[botId]) {
      const bot = BOTS_DATABASE[botId];
      const verEl = card.querySelector('.version-num');
      if (verEl && bot.version) verEl.textContent = bot.version;

      const badgeEl = card.querySelector('.hero-card-badge');
      if (badgeEl && bot.badge_status) {
        const badgeState = bot.badge_status.toUpperCase();
        const badgeText = badgeEl.querySelector('.badge-text');
        if (badgeText) badgeText.textContent = badgeState;

        const stateClass = `badge-${badgeState.toLowerCase().replace(/[^a-z]/g, '-')}`;
        badgeEl.className = `hero-card-badge ${stateClass}`;
      }
    }
  });
}

function renderBotsCatalogTable(bots) {
  const tbody = document.getElementById('bots-table-body');
  if (!tbody) return;

  tbody.innerHTML = bots.map((bot) => {
    return `
      <tr class="bot-row" data-bot="${bot.id}">
        <td>
          <div class="bot-info-cell">
            <div class="bot-icon-box flagship-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div>
              <div class="bot-title-group">
                <strong class="bot-name">${escapeHtml(bot.name)}</strong>
                <span class="badge-flagship">${escapeHtml(bot.category)}</span>
              </div>
              <p class="bot-summary">${escapeHtml(bot.description)}</p>
            </div>
          </div>
        </td>
        <td><span class="cat-pill">${escapeHtml(bot.category)}</span></td>
        <td><span class="date-text">${escapeHtml(bot.updated_at || 'Today')}</span></td>
        <td><span class="version-tag">${escapeHtml(bot.version)}</span></td>
        <td style="text-align: right;">
          <button type="button" class="btn-select-bot" data-bot-id="${bot.id}">Select Bot →</button>
        </td>
      </tr>
    `;
  }).join('');

  // Re-attach listeners to dynamically generated rows
  attachBotRowListeners();
}

function attachBotRowListeners() {
  document.querySelectorAll('.btn-select-bot, .bot-row').forEach((el) => {
    el.addEventListener('click', (e) => {
      let botKey = el.dataset.botId || el.dataset.bot;
      if (!botKey) {
        const parentRow = el.closest('.bot-row');
        if (parentRow) botKey = parentRow.dataset.bot;
      }

      const botObj = BOTS_DATABASE[botKey] || BOTS_DATABASE.latentmail;
      activeSelectedBot = botObj;

      const user = getCurrentUser();
      if (!user) {
        openAuthModal();
      } else {
        openRisingModal(botObj);
      }
    });
  });
}

// Fetch dynamic version
fetch('/api/latest-version', { cache: 'no-store' })
  .then((res) => (res.ok ? res.json() : null))
  .then((data) => {
    if (data && data.version && data.version.version_number) {
      const vStr = `v${data.version.version_number}.0.0`;
      const heroV = document.getElementById('hero-version-number');
      if (heroV) heroV.textContent = vStr;

      const botV = document.getElementById('latentmail-version-badge');
      if (botV) botV.textContent = vStr;
    }
  })
  .catch(() => {});

// Connect button on Home page
const connectLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi, I want to connect on WhatsApp')}`;
document.querySelectorAll('.connect-button:not(.btn-connect-live):not(.hero-connect-btn)').forEach((button) => {
  button.href = connectLink;
});

// Modals
const authModal = document.getElementById('auth-modal');
const botRiseModal = document.getElementById('bot-rise-modal');
const authForm = document.getElementById('auth-form');
const authError = document.getElementById('auth-error');

function openAuthModal() {
  if (!authModal) return;
  if (authError) authError.textContent = '';
  authModal.showModal();
}

function closeAuthModal() {
  if (authModal) authModal.close();
}

function openRisingModal(bot) {
  if (!botRiseModal || !bot) return;
  activeSelectedBot = bot;

  const user = getCurrentUser();

  // Populate bot details
  const nameEl = document.getElementById('modal-bot-name');
  const catEl = document.getElementById('modal-bot-category');
  const verEl = document.getElementById('modal-bot-version');
  const updatedEl = document.getElementById('modal-bot-updated');
  const descEl = document.getElementById('modal-bot-description');
  const userDispEl = document.getElementById('modal-user-display');

  if (nameEl) nameEl.textContent = bot.name;
  if (catEl) catEl.textContent = bot.category;
  if (verEl) verEl.textContent = bot.version;
  if (updatedEl) updatedEl.textContent = `Updated: ${bot.updated || 'Today'}`;
  if (descEl) descEl.textContent = bot.description;
  if (userDispEl) userDispEl.textContent = user ? `${user.email} (${user.phoneNumber})` : 'Connected';

  // Populate setup steps
  if (bot.steps && bot.steps.length >= 3) {
    const s1t = document.getElementById('step1-title');
    const s1d = document.getElementById('step1-desc');
    const s2t = document.getElementById('step2-title');
    const s2d = document.getElementById('step2-desc');
    const s3t = document.getElementById('step3-title');
    const s3d = document.getElementById('step3-desc');

    if (s1t) s1t.textContent = bot.steps[0].title;
    if (s1d) s1d.textContent = bot.steps[0].desc;
    if (s2t) s2t.textContent = bot.steps[1].title;
    if (s2d) s2d.textContent = bot.steps[1].desc;
    if (s3t) s3t.textContent = bot.steps[2].title;
    if (s3d) s3d.textContent = bot.steps[2].desc;
  }

  botRiseModal.showModal();
}

function closeRisingModal() {
  if (botRiseModal) botRiseModal.close();
}

// Modal Close Listeners
const btnCloseAuth = document.getElementById('btn-close-auth');
if (btnCloseAuth) {
  btnCloseAuth.addEventListener('click', closeAuthModal);
}

const btnCloseRise = document.getElementById('btn-close-rise');
if (btnCloseRise) {
  btnCloseRise.addEventListener('click', closeRisingModal);
}

// Auth Form Submit
if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email')?.value.trim();
    const phoneNumber = document.getElementById('auth-phone')?.value.trim();

    if (!email || !phoneNumber) {
      if (authError) authError.textContent = 'Please provide both email and phone number.';
      return;
    }

    const userData = { email, phoneNumber };
    setCurrentUser(userData);

    const botToConnect = activeSelectedBot || BOTS_DATABASE.latentmail;

    try {
      await fetch('/api/users/connect-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          botName: botToConnect.name
        })
      });
    } catch (err) {
      console.error('Error recording connection:', err);
    }

    closeAuthModal();

    if (botRiseModal) {
      openRisingModal(botToConnect);
    } else {
      const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(botToConnect.waText || 'Hi, I want to activate this bot!')}`;
      window.open(waUrl, '_blank');
    }
  });
}

// Attach initial bot selection listeners
attachBotRowListeners();

// Rising Modal "Connect on WhatsApp" Live Trigger
const btnConnectLive = document.getElementById('btn-connect-whatsapp-live');
if (btnConnectLive) {
  btnConnectLive.addEventListener('click', async () => {
    const user = getCurrentUser();
    const bot = activeSelectedBot || BOTS_DATABASE.latentmail;

    if (user) {
      try {
        await fetch('/api/users/connect-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            phoneNumber: user.phoneNumber,
            botName: bot.name
          })
        });
      } catch (err) {
        console.error('Failed to log connection:', err);
      }
    }

    const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(bot.waText || 'Hi, I want to connect on WhatsApp!')}`;
    window.open(waUrl, '_blank');
  });
}

// ==========================================================
// HERO CARD CAROUSEL — Physical cards slide via translateX
// ==========================================================

const heroTrack = document.getElementById('hero-slider-track');
const heroCards = document.querySelectorAll('.hero-card');
const HERO_CARD_COUNT = heroCards.length || 4;
let heroCurrentIndex = 0;
let heroSlideTimer = null;

function slideHeroTo(index) {
  if (!heroTrack) return;
  const cards = heroTrack.querySelectorAll('.hero-card');
  if (!cards.length) return;

  heroCurrentIndex = (index + cards.length) % cards.length;
  const targetCard = cards[heroCurrentIndex];
  if (targetCard) {
    const offset = targetCard.offsetLeft;
    heroTrack.style.transform = `translateX(-${offset}px)`;
  }

  // Update dots
  document.querySelectorAll('#hero-slider-dots .hero-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === heroCurrentIndex);
  });
}

function nextHeroSlide() {
  slideHeroTo(heroCurrentIndex + 1);
}

function prevHeroSlide() {
  slideHeroTo(heroCurrentIndex - 1);
}

function startHeroAutoSlide() {
  stopHeroAutoSlide();
  heroSlideTimer = setInterval(nextHeroSlide, 4000);
}

function stopHeroAutoSlide() {
  if (heroSlideTimer) { clearInterval(heroSlideTimer); heroSlideTimer = null; }
}

// Arrow buttons
const heroPrevBtn = document.getElementById('hero-prev-btn');
if (heroPrevBtn) {
  heroPrevBtn.addEventListener('click', () => { prevHeroSlide(); startHeroAutoSlide(); });
}

const heroNextBtn = document.getElementById('hero-next-btn');
if (heroNextBtn) {
  heroNextBtn.addEventListener('click', () => { nextHeroSlide(); startHeroAutoSlide(); });
}

// Dots click
document.querySelectorAll('#hero-slider-dots .hero-dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.dataset.slide, 10);
    if (!isNaN(idx) && idx !== heroCurrentIndex) {
      slideHeroTo(idx);
      startHeroAutoSlide();
    }
  });
});

// Pause on hover
const heroOuter = document.getElementById('home');
if (heroOuter) {
  heroOuter.addEventListener('mouseenter', stopHeroAutoSlide);
  heroOuter.addEventListener('mouseleave', startHeroAutoSlide);
}

// Each card's Connect button — auth gate + WhatsApp
document.querySelectorAll('.hero-connect-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const botKey = btn.dataset.botKey || 'latentmail';
    const bot = BOTS_DATABASE[botKey] || BOTS_DATABASE.latentmail;
    activeSelectedBot = bot;

    const user = getCurrentUser();
    if (!user) {
      openAuthModal();
    } else {
      try {
        await fetch('/api/users/connect-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, phoneNumber: user.phoneNumber, botName: bot.name })
        });
      } catch (err) { console.error('Could not sync bot connection:', err); }
      const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(bot.waText || 'Hi, I want to activate this bot!')}`;
      window.open(waUrl, '_blank');
    }
  });
});

// Initial UI Setup & Load Dynamic Bots
updateHeaderAuthUI();
loadDynamicBots();

// Handle responsive window resize
window.addEventListener('resize', () => {
  slideHeroTo(heroCurrentIndex);
});

// Start hero card carousel
if (heroTrack) {
  slideHeroTo(0);
  startHeroAutoSlide();
}