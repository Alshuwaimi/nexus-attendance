/**
 * ============================================================================
 * AUTH — login form handling, session persistence, role-based UI gating.
 * ============================================================================
 */
const Auth = (function () {
  let currentUser = null;

  function getUser() { return currentUser; }
  function isAdmin() { return currentUser && currentUser.role === 'admin'; }

  function restoreSession() {
    const raw = localStorage.getItem('nexus_user');
    const token = Api.getToken();
    if (raw && token) {
      try { currentUser = JSON.parse(raw); return true; } catch (e) { return false; }
    }
    return false;
  }

  async function login(username, password) {
    const data = await Api.call('login', { username: username, password: password });
    currentUser = data.user;
    Api.setToken(data.token);
    localStorage.setItem('nexus_user', JSON.stringify(currentUser));
    return currentUser;
  }

  function logout() {
    currentUser = null;
    Api.setToken(null);
    localStorage.removeItem('nexus_user');
    document.getElementById('appShell').classList.remove('active');
    document.getElementById('loginScreen').style.display = 'flex';
  }

  function forceLogout(message) {
    logout();
    if (message) UI.toast(message, 'warn');
  }

  function applyRoleGating() {
    const admin = isAdmin();
    document.querySelectorAll('.admin-only').forEach(function (el) {
      el.style.display = admin ? '' : 'none';
    });
  }

  function initLoginForm() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const errBox = document.getElementById('loginError');
      errBox.style.display = 'none';
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      const btn = document.getElementById('loginSubmitBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جارٍ الدخول...';
      try {
        await login(username, password);
        App.enterApp();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-arrow-left-to-bracket"></i> دخول';
      }
    });
  }

  return { getUser, isAdmin, restoreSession, login, logout, forceLogout, applyRoleGating, initLoginForm };
})();
