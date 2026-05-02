/* ── Shared ── */
const API = '';
function getToken() { return localStorage.getItem('sm_token'); }
function getUser()  { return JSON.parse(localStorage.getItem('sm_user') || 'null'); }
function clearAuth(){ localStorage.removeItem('sm_token'); localStorage.removeItem('sm_user'); }
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
  if (!res.ok) throw new Error(data.message || 'Error');
  return data;
}

/* ── Guard ── */
if (!getToken()) window.location.href = 'auth.html';

/* ── Toast ── */
function showToast(msg, type = 'info') {
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icon}</span> ${msg}`;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function logout() { clearAuth(); window.location.href = 'auth.html'; }

/* ── State ── */
let profileData = null;

const goalLabels = { hackathon:'⚡ Hackathon', project:'🛠 Side Project', internship:'💼 Internship Prep', freelance:'💰 Freelancing', startup:'🚀 Startup', job:'🏢 Get a Job', research:'🔬 Research/PhD' };
const styleLabels = { sync: '🤝 Sync (live calls)', async: '📨 Async (own pace)', both: '⚡ Flexible' };
const yearLabels = { 1:'1st Year', 2:'2nd Year', 3:'3rd Year', 4:'4th Year', 5:'5th Year+' };

/* ── Load Profile ── */
async function loadProfile() {
  try {
    profileData = await apiFetch('/api/profile/me');
    renderProfile();
    document.getElementById('profile-loading').style.display = 'none';
    document.getElementById('profile-content').style.display = 'block';
  } catch (err) {
    document.getElementById('profile-loading').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`;
  }
}

function renderProfile() {
  const u = profileData;
  const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('p-avatar').textContent = initials;
  document.getElementById('p-name').textContent = u.name;
  document.getElementById('p-role').textContent = (u.role === 'student' ? '🎓 Student' : '💼 Professional') + (u.program ? ` • ${u.program}` : '');
  document.getElementById('p-bio').textContent = u.bio || 'No bio yet. Click Edit Profile to add one.';
  document.getElementById('p-program').textContent = u.program || '—';
  document.getElementById('p-year').textContent = yearLabels[u.year] || '—';
  document.getElementById('p-university').textContent = u.university || '—';
  document.getElementById('p-short-goal').textContent = goalLabels[u.shortTermGoal] || u.shortTermGoal || '—';
  document.getElementById('p-long-goal').textContent = goalLabels[u.longTermGoal] || u.longTermGoal || '—';
  document.getElementById('p-hours').textContent = u.hoursPerWeek ? `${u.hoursPerWeek} hrs/week` : '—';
  document.getElementById('p-style').textContent = styleLabels[u.workStyle] || u.workStyle || '—';

  // Badges
  const badges = document.getElementById('p-badges');
  badges.innerHTML = '';
  if (u.shortTermGoal) badges.innerHTML += `<span class="badge badge-primary">${goalLabels[u.shortTermGoal] || u.shortTermGoal}</span>`;
  if (u.workStyle) badges.innerHTML += `<span class="badge badge-accent">${styleLabels[u.workStyle] || u.workStyle}</span>`;
  if (u.hoursPerWeek) badges.innerHTML += `<span class="badge" style="background:rgba(255,255,255,0.05);color:var(--text-muted);">⏱ ${u.hoursPerWeek}h/wk</span>`;

  // Skills
  const renderTags = (containerId, arr, color) => {
    const el = document.getElementById(containerId);
    el.innerHTML = arr && arr.length
      ? arr.map(s => `<span class="skill-tag" ${color ? `style="border-color:rgba(139,92,246,0.3);color:var(--color-secondary);background:rgba(139,92,246,0.08);"` : ''}>${s}</span>`).join('')
      : '<span style="color:var(--text-muted);font-size:0.875rem;">None added yet</span>';
  };
  renderTags('p-skills', u.skills);
  renderTags('p-learning', u.learning, true);
  renderTags('p-interests', (u.projectInterests || []).map(i => `${i}`));
}

/* ── Edit Modal ── */
function openEditModal() {
  const u = profileData;
  document.getElementById('edit-name').value = u.name || '';
  document.getElementById('edit-program').value = u.program || '';
  document.getElementById('edit-year').value = u.year || 1;
  document.getElementById('edit-university').value = u.university || '';
  document.getElementById('edit-hours').value = u.hoursPerWeek || '';
  document.getElementById('edit-bio').value = u.bio || '';
  document.getElementById('edit-error').classList.remove('visible');
  document.getElementById('edit-modal').style.display = 'flex';
}
function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}
function handleOverlayClick(e) {
  if (e.target === document.getElementById('edit-modal')) closeEditModal();
}

async function saveProfile() {
  const btn = document.getElementById('save-btn');
  const errEl = document.getElementById('edit-error');
  errEl.classList.remove('visible');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  const updates = {
    name:        document.getElementById('edit-name').value.trim(),
    program:     document.getElementById('edit-program').value.trim(),
    year:        parseInt(document.getElementById('edit-year').value),
    university:  document.getElementById('edit-university').value.trim(),
    hoursPerWeek: parseInt(document.getElementById('edit-hours').value) || profileData.hoursPerWeek,
    bio:         document.getElementById('edit-bio').value.trim()
  };
  if (!updates.name) { errEl.textContent = 'Name is required.'; errEl.classList.add('visible'); btn.disabled=false; btn.textContent='Save Changes'; return; }

  try {
    profileData = await apiFetch('/api/profile/update', { method: 'PUT', body: updates });
    // Also update local name cache
    const u = getUser();
    localStorage.setItem('sm_user', JSON.stringify({ ...u, name: profileData.name }));
    renderProfile();
    closeEditModal();
    showToast('Profile updated! ✨', 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

/* ── Init ── */
loadProfile();
