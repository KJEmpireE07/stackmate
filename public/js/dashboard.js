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

/* ── Logout ── */
function logout() {
  clearAuth();
  window.location.href = 'auth.html';
}

/* ── State ── */
let allMatches = [];
let activeFilter = 'all';
let pendingRequests = [];

/* ── Load Matches ── */
async function loadMatches() {
  try {
    const data = await apiFetch('/api/match/top');
    allMatches = data.matches || [];

    // Show/hide the "at limit" banner
    const banner = document.getElementById('limit-banner');
    if (banner) banner.style.display = data.atLimit ? 'flex' : 'none';

    renderMatches();
  } catch (err) {
    document.getElementById('matches-grid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">⚠️</div>
        <h3>Couldn't load matches</h3>
        <p>${err.message}</p>
      </div>`;
  }
}

/* ── Load Requests ── */
async function loadRequests() {
  try {
    pendingRequests = await apiFetch('/api/connect/requests');
    const badge = document.getElementById('notif-badge');
    if (pendingRequests.length > 0) {
      badge.style.display = 'flex';
      badge.textContent = pendingRequests.length;
    } else {
      badge.style.display = 'none';
    }
    renderRequests();
  } catch (e) { /* silent */ }
}

/* ── Load Connections ── */
async function loadConnections() {
  try {
    const connections = await apiFetch('/api/connect/all');
    renderConnections(connections);
  } catch (e) { /* silent */ }
}

/* ── Render Connections ── */
function renderConnections(connections) {
  const section = document.getElementById('connections-section');
  const grid    = document.getElementById('connections-grid');
  const count   = document.getElementById('connections-count');
  const myId    = getUser()?.id;

  if (!connections || connections.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  count.textContent = connections.length;

  grid.innerHTML = connections.map(c => {
    // Pick the partner (the other side of the connection)
    const partner = c.from._id === myId || c.from === myId ? c.to : c.from;
    const initials = partner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
    const meta = [partner.program, partner.year ? `Year ${partner.year}` : ''].filter(Boolean).join(' • ');
    return `
      <a href="partner.html?id=${partner._id}" class="connection-pill">
        <div class="avatar">${initials}</div>
        <div>
          <div class="connection-pill-name">${partner.name}</div>
          ${meta ? `<div class="connection-pill-meta">${meta}</div>` : ''}
        </div>
      </a>
    `;
  }).join('');
}

/* ── Toggle Requests Panel ── */
function toggleRequests() {
  const panel = document.getElementById('requests-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

/* ── Render Requests ── */
function renderRequests() {
  const list = document.getElementById('requests-list');
  if (!pendingRequests.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem;">No pending requests.</p>';
    return;
  }
  list.innerHTML = pendingRequests.map(req => `
    <div class="request-item" id="req-${req._id}">
      <div class="avatar">${req.from.name[0].toUpperCase()}</div>
      <div class="request-item-info">
        <div class="request-item-name">${req.from.name}</div>
        <div class="request-item-meta">${req.from.program || ''}${req.from.university ? ' • ' + req.from.university : ''}</div>
      </div>
      <div class="request-actions">
        <a href="partner.html?id=${req.from._id}" class="btn btn-outline btn-sm" target="_blank">View</a>
        <button class="btn btn-success btn-sm" onclick="respondRequest('${req._id}','accepted','${req.from._id}')">Accept</button>
        <button class="btn btn-danger btn-sm" onclick="respondRequest('${req._id}','rejected','${req.from._id}')">Decline</button>
      </div>
    </div>
  `).join('');
}

/* ── Respond to Request ── */
async function respondRequest(connectionId, status, fromId) {
  try {
    await apiFetch('/api/connect/respond', { method: 'PUT', body: { connectionId, status } });

    const itemEl = document.getElementById(`req-${connectionId}`);
    if (itemEl) {
      if (status === 'accepted') {
        // Replace with a "Connected!" confirmation row with a View Profile link
        const req = pendingRequests.find(r => r._id === connectionId);
        const name = req ? req.from.name : 'Partner';
        itemEl.innerHTML = `
          <div class="avatar" style="background:linear-gradient(135deg,#10b981,#06b6d4);">✓</div>
          <div class="request-item-info">
            <div class="request-item-name" style="color:var(--color-success);">Connected with ${name}!</div>
            <div class="request-item-meta">You can now collaborate together</div>
          </div>
          <div class="request-actions">
            <a href="partner.html?id=${fromId}" class="btn btn-primary btn-sm">View Profile →</a>
          </div>
        `;
        showToast(`You're now connected with ${name}! 🎉`, 'success');
        // Auto-remove the success row after 5 seconds
        setTimeout(() => itemEl.remove(), 5000);
        loadMatches();      // Refresh match list (connected user removed)
        loadConnections();  // Show newly connected partner
      } else {
        itemEl.remove();
        showToast('Request declined.', 'info');
      }
    }

    pendingRequests = pendingRequests.filter(r => r._id !== connectionId);
    const badge = document.getElementById('notif-badge');
    if (pendingRequests.length === 0) {
      badge.style.display = 'none';
      // Only show empty message if no accepted rows remain
      setTimeout(() => {
        const list = document.getElementById('requests-list');
        if (!list.querySelector('.request-item')) {
          list.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem;">No pending requests.</p>';
        }
      }, 5100);
    } else {
      badge.textContent = pendingRequests.length;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ── Filter ── */
function setFilter(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderMatches();
}

/* ── Render Matches ── */
function renderMatches() {
  const grid = document.getElementById('matches-grid');
  let filtered = allMatches;
  if (activeFilter !== 'all') {
    filtered = allMatches.filter(m => m.user.shortTermGoal === activeFilter);
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">🔍</div>
        <h3>No matches found</h3>
        <p>Try changing your filter, or check back as more users join!</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(m => buildMatchCard(m)).join('');

  // Animate score rings after render
  setTimeout(() => {
    document.querySelectorAll('[data-score]').forEach(el => {
      const score = parseInt(el.dataset.score);
      const circumference = 2 * Math.PI * 36;
      const offset = circumference - (score / 100) * circumference;
      el.style.strokeDasharray = circumference;
      el.style.strokeDashoffset = offset;
      el.style.stroke = score >= 70 ? '#10b981' : score >= 40 ? '#6366f1' : '#f59e0b';
    });
  }, 50);
}

function buildMatchCard(m) {
  const u = m.user;
  const score = m.matchScore;
  const circumference = 2 * Math.PI * 36;
  const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  const yearLabel = u.year ? `Year ${u.year}` : '';
  const skills = (u.skills || []).slice(0, 3).map(s => `<span class="skill-tag">${s}</span>`).join('');
  const learning = (u.learning || []).slice(0, 2).map(s => `<span class="skill-tag" style="border-color:rgba(139,92,246,0.3);color:var(--color-secondary);background:rgba(139,92,246,0.08);">${s}</span>`).join('');
  const goalLabel = { hackathon:'⚡ Hackathon', project:'🛠 Project', internship:'💼 Internship', freelance:'💰 Freelance' }[u.shortTermGoal] || u.shortTermGoal;

  const bd = m.breakdown;
  const breakdownHtml = `
    <div class="breakdown-tooltip">
      <div style="font-size:0.75rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-secondary);">Match Breakdown</div>
      ${[
        { label: 'Skills', val: bd.skills, max: 30 },
        { label: 'Goals', val: bd.goals, max: 25 },
        { label: 'Interests', val: bd.interests, max: 20 },
        { label: 'Work Style', val: bd.workStyle, max: 15 },
        { label: 'Year', val: bd.year, max: 10 }
      ].map(f => `
        <div class="breakdown-item">
          <div class="breakdown-label"><span>${f.label}</span><span>${f.val}/${f.max}</span></div>
          <div class="breakdown-bar-bg"><div class="breakdown-bar-fill" style="width:${(f.val/f.max)*100}%"></div></div>
        </div>
      `).join('')}
    </div>
  `;

  return `
    <div class="match-card">
      <div class="match-card-header">
        <div class="avatar">${initials}</div>
        <div class="match-card-info">
          <h3>${u.name}</h3>
          <div class="meta">
            ${u.program ? u.program : ''}
            ${yearLabel ? ` • ${yearLabel}` : ''}
            ${u.university ? `<br/><span style="font-size:0.75rem;color:var(--text-muted);">${u.university}</span>` : ''}
          </div>
        </div>
        <div class="score-wrap">
          <div class="score-ring-wrap">
            <svg class="score-ring" width="84" height="84" viewBox="0 0 84 84">
              <circle class="score-ring-bg" cx="42" cy="42" r="36" stroke-width="5"/>
              <circle class="score-ring-fill" cx="42" cy="42" r="36" stroke-width="5"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${circumference}"
                data-score="${score}"/>
            </svg>
            <div class="score-ring-text">
              <span class="score-ring-number">${score}</span>
              <span class="score-ring-label">match</span>
            </div>
          </div>
          ${breakdownHtml}
        </div>
      </div>

      ${u.bio ? `<p style="font-size:0.8375rem;color:var(--text-secondary);margin-bottom:0.75rem;line-height:1.5;">${u.bio}</p>` : ''}

      <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;">
        ${u.shortTermGoal ? `<span class="badge badge-primary">${goalLabel}</span>` : ''}
        ${u.workStyle === 'sync' ? '<span class="badge badge-accent">🤝 Sync</span>' :
          u.workStyle === 'async' ? '<span class="badge badge-accent">📨 Async</span>' :
          '<span class="badge badge-accent">⚡ Flexible</span>'}
        ${u.hoursPerWeek ? `<span class="badge" style="background:rgba(255,255,255,0.05);color:var(--text-muted);">⏱ ${u.hoursPerWeek}h/wk</span>` : ''}
      </div>

      ${skills ? `<div class="match-card-tags">${skills}</div>` : ''}
      ${learning ? `
        <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:0.375rem;margin-top:0.25rem;">Learning:</div>
        <div class="match-card-tags">${learning}</div>
      ` : ''}

      <div class="match-card-footer">
        <a href="partner.html?id=${u._id}" class="btn btn-ghost btn-sm">View Profile</a>
        <button class="btn btn-primary btn-sm" onclick="sendConnect('${u._id}', this)">
          Connect →
        </button>
      </div>
    </div>
  `;
}

/* ── Send Connect ── */
async function sendConnect(userId, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;"></span>';
  try {
    await apiFetch('/api/connect/request', { method: 'POST', body: { to: userId } });
    btn.textContent = '✓ Sent';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-ghost');
    showToast('Connection request sent! 🚀', 'success');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Connect →';
    showToast(err.message, 'error');
  }
}

/* ── Init ── */
loadMatches();
loadRequests();
loadConnections();
