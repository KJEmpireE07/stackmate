/* ── Shared utility ── */
const API = '';

function getToken()  { return localStorage.getItem('sm_token'); }
function getUser()   { return JSON.parse(localStorage.getItem('sm_user') || 'null'); }
function saveAuth(token, user) {
  localStorage.setItem('sm_token', token);
  localStorage.setItem('sm_user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('sm_token');
  localStorage.removeItem('sm_user');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

/* ── Auth page logic ── */
function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('panel-login').classList.toggle('active', tab === 'login');
  document.getElementById('panel-register').classList.toggle('active', tab === 'register');
  hideError();
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}
function hideError() {
  const el = document.getElementById('auth-error');
  if (el) el.classList.remove('visible');
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
}

function updateStrength(value) {
  const bar = document.getElementById('strength-bar');
  if (!bar) return;
  let str = 0;
  if (value.length >= 8)  str += 25;
  if (/[A-Z]/.test(value)) str += 25;
  if (/[0-9]/.test(value)) str += 25;
  if (/[^A-Za-z0-9]/.test(value)) str += 25;
  bar.style.width = str + '%';
  bar.style.background = str <= 25 ? '#ef4444' : str <= 50 ? '#f59e0b' : str <= 75 ? '#06b6d4' : '#10b981';
}

async function handleLogin() {
  hideError();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showError('Please fill in all fields.');

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Logging in...';

  try {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
    saveAuth(data.token, data.user);
    window.location.href = data.user.onboardingComplete ? 'dashboard.html' : 'onboarding.html';
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = 'Log In';
  }
}

async function handleRegister() {
  hideError();
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!name || !email || !password) return showError('Please fill in all fields.');
  if (password.length < 8) return showError('Password must be at least 8 characters.');

  const btn = document.getElementById('register-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating account...';

  try {
    const data = await apiFetch('/api/auth/register', { method: 'POST', body: { name, email, password } });
    saveAuth(data.token, data.user);
    window.location.href = 'onboarding.html';
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

// Auto-redirect if already logged in
if (getToken()) {
  const user = getUser();
  window.location.href = user?.onboardingComplete ? 'dashboard.html' : 'onboarding.html';
}

// Check URL param to start on register tab
if (new URLSearchParams(window.location.search).get('mode') === 'register') {
  switchTab('register');
}
