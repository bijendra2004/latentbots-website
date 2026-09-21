// Global helper for authenticated admin API calls
window.adminFetch = async function(url, options = {}) {
  const token = localStorage.getItem('latentmail_admin_token');
  const opts = { ...options };
  opts.credentials = 'include';
  opts.headers = { ...(opts.headers || {}) };
  if (token) {
    opts.headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, opts);
  if (res.status === 401) {
    // If unauthorized, clear saved token and show login
    localStorage.removeItem('latentmail_admin_token');
    if (typeof AdminAuth !== 'undefined' && AdminAuth.showLogin) {
      AdminAuth.showLogin();
    }
  }
  return res;
};

const AdminAuth = (() => {
  const loginView = document.querySelector('#login-view');
  const dashboardView = document.querySelector('#dashboard-view');
  const loginForm = document.querySelector('#login-form');
  const loginError = document.querySelector('#login-error');

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    window.dispatchEvent(new Event('admin-ready'));
  }

  async function checkSession() {
    try {
      const response = await window.adminFetch('/api/admin/session');
      if (response.ok) {
        showDashboard();
      } else {
        showLogin();
      }
    } catch {
      showLogin();
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    const body = Object.fromEntries(new FormData(loginForm));
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include'
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.token) {
        localStorage.setItem('latentmail_admin_token', result.token);
      }
      showDashboard();
    } catch (error) {
      loginError.textContent = error.message || 'Unable to sign in.';
    }
  });

  const logoutBtn = document.querySelector('#logout-button');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await window.adminFetch('/api/admin/logout', { method: 'POST' });
      } catch {}
      localStorage.removeItem('latentmail_admin_token');
      window.location.reload();
    });
  }

  // Check if already logged in, otherwise show login form
  showLogin();
  checkSession();

  return { showDashboard, showLogin, checkSession };
})();