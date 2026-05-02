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

/* ── Extract partner ID ── */
const partnerId = new URLSearchParams(window.location.search).get('id');
if (!partnerId) window.location.href = 'dashboard.html';

const goalLabels = { hackathon:'⚡ Hackathon', project:'🛠 Side Project', internship:'💼 Internship Prep', freelance:'💰 Freelancing', startup:'🚀 Startup', job:'🏢 Get a Job', research:'🔬 Research/PhD' };
const styleLabels = { sync: '🤝 Sync (live calls)', async: '📨 Async (own pace)', both: '⚡ Flexible' };
const yearLabels = { 1:'1st Year', 2:'2nd Year', 3:'3rd Year', 4:'4th Year', 5:'5th Year+' };

/* ── Match score calc (client-side for display) ── */
function calcScore(me, them) {
  let score = 0;
  const bd = { skills:0, goals:0, interests:0, workStyle:0, year:0 };
  const myL  = (me.learning||[]).map(s=>s.toLowerCase());
  const thSk = (them.skills||[]).map(s=>s.toLowerCase());
  const thL  = (them.learning||[]).map(s=>s.toLowerCase());
  const mySk = (me.skills||[]).map(s=>s.toLowerCase());
  const c1 = myL.filter(s=>thSk.includes(s)).length;
  const c2 = thL.filter(s=>mySk.includes(s)).length;
  bd.skills = Math.min(30, Math.round(((c1+c2)/Math.max(myL.length+thL.length,1))*30));
  score += bd.skills;
  if (me.shortTermGoal && me.shortTermGoal === them.shortTermGoal) bd.goals += 15;
  if (me.longTermGoal  && me.longTermGoal  === them.longTermGoal)  bd.goals += 10;
  score += bd.goals;
  const mI = (me.projectInterests||[]).map(s=>s.toLowerCase());
  const tI = (them.projectInterests||[]).map(s=>s.toLowerCase());
  bd.interests = Math.min(20, Math.round((mI.filter(i=>tI.includes(i)).length/Math.max(Math.min(mI.length,tI.length),1))*20));
  score += bd.interests;
  const sm = me.workStyle===them.workStyle||me.workStyle==='both'||them.workStyle==='both';
  if(sm) bd.workStyle+=8;
  const hd = Math.abs((me.hoursPerWeek||5)-(them.hoursPerWeek||5));
  if(hd<=5) bd.workStyle+=7; else if(hd<=10) bd.workStyle+=3;
  score += bd.workStyle;
  const yd = Math.abs((me.year||1)-(them.year||1));
  bd.year = yd===0?10:yd===1?7:yd===2?3:0;
  score += bd.year;
  return { score, bd };
}

/* ── Load ── */
async function loadPartner() {
  try {
    const [partner, me] = await Promise.all([
      apiFetch(`/api/profile/${partnerId}`),
      apiFetch('/api/profile/me')
    ]);

    document.getElementById('partner-loading').style.display = 'none';
    document.getElementById('partner-content').style.display = 'block';

    // Initials
    const initials = partner.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('pp-avatar').textContent = initials;
    document.getElementById('pp-name').textContent = partner.name;
    document.getElementById('pp-role').textContent = (partner.role==='student'?'🎓 Student':'💼 Professional') + (partner.program ? ` • ${partner.program}` : '');
    document.getElementById('pp-bio').textContent = partner.bio || '';
    document.getElementById('pp-program').textContent = partner.program || '—';
    document.getElementById('pp-year').textContent = yearLabels[partner.year] || '—';
    document.getElementById('pp-university').textContent = partner.university || '—';
    document.getElementById('pp-short-goal').textContent = goalLabels[partner.shortTermGoal] || partner.shortTermGoal || '—';
    document.getElementById('pp-long-goal').textContent = goalLabels[partner.longTermGoal] || partner.longTermGoal || '—';
    document.getElementById('pp-hours').textContent = partner.hoursPerWeek ? `${partner.hoursPerWeek} hrs/week` : '—';
    document.getElementById('pp-style').textContent = styleLabels[partner.workStyle] || partner.workStyle || '—';

    // Badges
    const badges = document.getElementById('pp-badges');
    if (partner.shortTermGoal) badges.innerHTML += `<span class="badge badge-primary">${goalLabels[partner.shortTermGoal]||partner.shortTermGoal}</span>`;
    if (partner.workStyle)     badges.innerHTML += `<span class="badge badge-accent">${styleLabels[partner.workStyle]||partner.workStyle}</span>`;
    if (partner.hoursPerWeek)  badges.innerHTML += `<span class="badge" style="background:rgba(255,255,255,0.05);color:var(--text-muted);">⏱ ${partner.hoursPerWeek}h/wk</span>`;

    // Tags
    const renderTags = (id, arr, variant) => {
      const el = document.getElementById(id);
      const style = variant === 'learning' ? 'border-color:rgba(139,92,246,0.3);color:var(--color-secondary);background:rgba(139,92,246,0.08);' : '';
      el.innerHTML = arr && arr.length
        ? arr.map(s => `<span class="skill-tag" style="${style}">${s}</span>`).join('')
        : '<span style="color:var(--text-muted);font-size:0.875rem;">None listed</span>';
    };
    renderTags('pp-skills', partner.skills);
    renderTags('pp-learning', partner.learning, 'learning');
    renderTags('pp-interests', partner.projectInterests);

    // Match score
    if (me._id !== partnerId) {
      const { score, bd } = calcScore(me, partner);
      const circumference = 2 * Math.PI * 42;
      const ring = document.getElementById('pp-ring');
      const offset = circumference - (score/100) * circumference;
      document.getElementById('pp-score').textContent = score;
      setTimeout(() => {
        ring.style.strokeDashoffset = offset;
        ring.style.stroke = score>=70 ? '#10b981' : score>=40 ? '#6366f1' : '#f59e0b';
        ring.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease';
      }, 100);

      // Breakdown
      document.getElementById('breakdown-card').style.display = 'block';
      const factors = [
        { label:'Complementary Skills', val: bd.skills, max: 30 },
        { label:'Goal Alignment',       val: bd.goals,  max: 25 },
        { label:'Project Interests',    val: bd.interests, max: 20 },
        { label:'Work Style',           val: bd.workStyle, max: 15 },
        { label:'Year Proximity',       val: bd.year,   max: 10 }
      ];
      document.getElementById('pp-breakdown').innerHTML = factors.map(f => `
        <div class="breakdown-item">
          <div class="breakdown-label">
            <span>${f.label}</span>
            <span style="font-weight:700;color:var(--text-primary);">${f.val}<span style="color:var(--text-muted);font-weight:400">/${f.max}</span></span>
          </div>
          <div class="breakdown-bar-bg">
            <div class="breakdown-bar-fill" style="width:${(f.val/f.max)*100}%"></div>
          </div>
        </div>
      `).join('');
    } else {
      // It's the user themselves — hide connect button
      document.getElementById('connect-btn').style.display = 'none';
      document.getElementById('pp-score').textContent = '—';
    }
  } catch (err) {
    document.getElementById('partner-loading').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Couldn't load profile</h3>
        <p>${err.message}</p>
      </div>`;
  }
}

/* ── Connect ── */
async function sendConnect() {
  const btn = document.getElementById('connect-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Sending...';
  try {
    await apiFetch('/api/connect/request', { method: 'POST', body: { to: partnerId } });
    btn.textContent = '✓ Request Sent';
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
loadPartner();
