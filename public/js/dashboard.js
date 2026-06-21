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

/* ── Remove Connection ── */
async function removeConnection(connectionId) {
  if (!confirm('Remove this connection? This frees up a slot but cannot be undone.')) return;
  try {
    await apiFetch(`/api/connect/${connectionId}`, { method: 'DELETE' });
    showToast('Connection removed.', 'info');
    loadConnections();
    loadMatches(); // refresh so they appear again
  } catch (err) {
    showToast(err.message, 'error');
  }
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
  count.textContent = `${connections.length}/3`;

  grid.innerHTML = connections.map(c => {
    const partner = c.from._id === myId || c.from === myId ? c.to : c.from;
    const initials = partner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
    const meta = [partner.program, partner.year ? `Year ${partner.year}` : ''].filter(Boolean).join(' • ');
    return `
      <div class="connection-pill" style="position:relative;">
        <a href="chat.html?connectionId=${c._id}&partnerId=${partner._id}" style="display:flex;align-items:center;gap:0.75rem;flex:1;text-decoration:none;">
          <div class="avatar">${initials}</div>
          <div>
            <div class="connection-pill-name">${partner.name}</div>
            ${meta ? `<div class="connection-pill-meta">${meta} • 💬 Chat</div>` : '<div class="connection-pill-meta">💬 Chat</div>'}
          </div>
        </a>
        <button onclick="removeConnection('${c._id}')" title="Remove connection"
          style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1rem;padding:0.25rem 0.5rem;border-radius:6px;"
          onmouseenter="this.style.color='#ef4444'" onmouseleave="this.style.color='var(--text-muted)'">✕</button>
      </div>
    `;
  }).join('');
}

/* ── Toggle Requests Panel ── */
function toggleRequests() {
  const panel = document.getElementById('requests-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'block') loadSentRequests();
}

/* ── Load Sent Requests ── */
async function loadSentRequests() {
  try {
    const sent = await apiFetch('/api/connect/sent');
    renderSentRequests(sent);
  } catch (e) { /* silent */ }
}

/* ── Render Sent Requests ── */
function renderSentRequests(sent) {
  let el = document.getElementById('sent-requests-section');
  if (!el) return;
  if (!sent || sent.length === 0) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  document.getElementById('sent-list').innerHTML = sent.map(s => `
    <div class="request-item" id="sent-${s._id}">
      <div class="avatar">${s.to.name[0].toUpperCase()}</div>
      <div class="request-item-info">
        <div class="request-item-name">${s.to.name}</div>
        <div class="request-item-meta">${s.to.program || ''}${s.to.university ? ' • ' + s.to.university : ''} • ⏳ Pending</div>
      </div>
      <div class="request-actions">
        <button class="btn btn-ghost btn-sm" onclick="cancelRequest('${s._id}')">Cancel</button>
      </div>
    </div>
  `).join('');
}

/* ── Cancel Sent Request ── */
async function cancelRequest(connectionId) {
  try {
    await apiFetch(`/api/connect/cancel/${connectionId}`, { method: 'DELETE' });
    document.getElementById(`sent-${connectionId}`)?.remove();
    showToast('Request cancelled.', 'info');
    loadMatches(); // they reappear in matches
  } catch (err) {
    showToast(err.message, 'error');
  }
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
    const isAtLimit = document.getElementById('limit-banner')?.style.display !== 'none';
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">🔍</div>
        <h3>${isAtLimit ? 'No new connections available' : 'No matches found'}</h3>
        <p>${
          isAtLimit
            ? 'You have 3 connections. Remove one to discover new partners.'
            : activeFilter !== 'all'
              ? 'No one with that goal yet — try a different filter or check back later.'
              : 'No other students found yet. Invite a friend to join StackMate!'
        }</p>
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
    btn.dataset.sent = 'true';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-ghost');
    btn.onclick = null; // prevent double send
    showToast('Connection request sent! 🚀', 'success');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Connect →';
    showToast(err.message, 'error');
  }
}

/* ── Init ── */
async function init() {
  await loadMatches();
  await loadRequests();
  await loadConnections();

  // Mark cards where request already sent
  try {
    const sent = await apiFetch('/api/connect/sent');
    sent.forEach(s => {
      const btn = document.querySelector(`button[onclick*="sendConnect('${s.to._id || s.to}']"]`);
      if (btn) {
        btn.textContent = '✓ Sent';
        btn.disabled = true;
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-ghost');
      }
    });
  } catch(e) { /* silent */ }
}

init();
