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
      const response = await fetch('/api/admin/session', { credentials: 'include' });
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
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      showDashboard();
    } catch (error) { loginError.textContent = error.message || 'Unable to sign in.'; }
  });

  document.querySelector('#logout-button').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    window.location.reload();
  });

  // Check if already logged in, otherwise show login form
  showLogin();
  checkSession();

  return { showDashboard, checkSession };
})();