const AdminAuth = (() => {
  const loginView = document.querySelector('#login-view');
  const dashboardView = document.querySelector('#dashboard-view');
  const loginForm = document.querySelector('#login-form');
  const loginError = document.querySelector('#login-error');

  async function checkSession() {
    const response = await fetch('/api/admin/session');
    if (response.ok) showDashboard();
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    window.dispatchEvent(new Event('admin-ready'));
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    const body = Object.fromEntries(new FormData(loginForm));
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      showDashboard();
    } catch (error) { loginError.textContent = error.message || 'Unable to sign in.'; }
  });

  document.querySelector('#logout-button').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.reload();
  });
  // Auto show dashboard directly for preview/development
  showDashboard();
  return { showDashboard };
})();