/* ── Shared utilities (same as auth.js) ── */
const API = '';
function getToken() { return localStorage.getItem('sm_token'); }
function getUser()  { return JSON.parse(localStorage.getItem('sm_user') || 'null'); }
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

/* ── Guard ── */
if (!getToken()) window.location.href = 'auth.html';
const user = getUser();

/* ── State ── */
let currentStep = 1;
const totalSteps = 5;
const state = {
  role: 'student',
  skills: [],
  learning: [],
  shortTermGoal: 'hackathon',
  longTermGoal: 'job',
  workStyle: 'sync',
  hoursPerWeek: 5,
  projectInterests: []
};

const stepLabels = ['Role', 'Academic', 'Skills', 'Goals', 'Work Style'];

/* ── Progress Steps ── */
function renderProgress() {
  const container = document.getElementById('progress-steps');
  container.innerHTML = '';
  for (let i = 1; i <= totalSteps; i++) {
    const div = document.createElement('div');
    div.className = 'progress-step' + (i < currentStep ? ' done' : i === currentStep ? ' active' : '');
    div.innerHTML = `
      <div class="step-circle">${i < currentStep ? '✓' : i}</div>
      <div class="step-label">${stepLabels[i-1]}</div>
    `;
    container.appendChild(div);
    if (i < totalSteps) {
      const conn = document.createElement('div');
      conn.className = 'step-connector' + (i < currentStep ? ' done' : '');
      container.appendChild(conn);
    }
  }
}
renderProgress();

/* ── Step navigation ── */
function nextStep() {
  if (!validateStep(currentStep)) return;
  if (currentStep >= totalSteps) return;
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  currentStep++;
  document.getElementById(`step-${currentStep}`).classList.add('active');
  renderProgress();
}
function prevStep() {
  if (currentStep <= 1) return;
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  currentStep--;
  document.getElementById(`step-${currentStep}`).classList.add('active');
  renderProgress();
}
function validateStep(step) {
  if (step === 2) {
    if (!document.getElementById('program').value.trim()) {
      alert('Please enter your program/major.'); return false;
    }
  }
  if (step === 3) {
    if (state.skills.length === 0 && state.learning.length === 0) {
      alert('Please add at least one skill or something you\'re learning.'); return false;
    }
  }
  return true;
}

/* ── Role selection ── */
function selectRole(el) {
  document.querySelectorAll('#role-options .option-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.role = el.dataset.value;
  const uniGroup = document.getElementById('university-group');
  const yearGroup = document.getElementById('year-group');
  if (uniGroup) uniGroup.style.display = state.role === 'professional' ? 'none' : '';
  if (yearGroup) yearGroup.style.display = state.role === 'professional' ? 'none' : '';
}

/* ── Goal selection ── */
function selectGoal(el, type) {
  const container = type === 'short' ? 'short-term-options' : 'long-term-options';
  document.querySelectorAll(`#${container} .goal-option`).forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  if (type === 'short') state.shortTermGoal = el.dataset.value;
  else state.longTermGoal = el.dataset.value;
}

/* ── Work style ── */
function selectWorkStyle(el) {
  document.querySelectorAll('.style-options .option-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.workStyle = el.dataset.value;
}

/* ── Hours slider ── */
function updateHours(val) {
  state.hoursPerWeek = parseInt(val);
  document.getElementById('hours-display').textContent = `${val} hrs/week`;
}

/* ── Project interests ── */
function toggleInterest(el) {
  el.classList.toggle('selected');
  const val = el.dataset.value;
  if (el.classList.contains('selected')) {
    if (!state.projectInterests.includes(val)) state.projectInterests.push(val);
  } else {
    state.projectInterests = state.projectInterests.filter(i => i !== val);
  }
}

/* ── Tag inputs ── */
function handleTagInput(e, field) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/,$/, '');
    if (val && !state[field].includes(val)) {
      state[field].push(val);
      addTagChip(field, val);
    }
    e.target.value = '';
  }
  if (e.key === 'Backspace' && !e.target.value && state[field].length) {
    const removed = state[field].pop();
    const container = document.getElementById(`${field}-container`);
    const chips = container.querySelectorAll('.tag-chip');
    if (chips.length) chips[chips.length - 1].remove();
  }
}
function addTagChip(field, val) {
  const container = document.getElementById(`${field}-container`);
  const input = document.getElementById(`${field}-input`);
  const chip = document.createElement('div');
  chip.className = 'tag-chip';
  chip.innerHTML = `${val} <button onclick="removeTag('${field}','${val}',this.parentElement)">×</button>`;
  container.insertBefore(chip, input);
}
function removeTag(field, val, chipEl) {
  state[field] = state[field].filter(s => s !== val);
  chipEl.remove();
}

/* ── Submit ── */
async function submitOnboarding() {
  const submitError = document.getElementById('submit-error');
  submitError.style.display = 'none';
  if (state.projectInterests.length === 0) {
    submitError.textContent = 'Please select at least one project interest.';
    submitError.style.display = 'block';
    return;
  }

  const btn = document.getElementById('finish-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  const body = {
    role:            state.role,
    university:      document.getElementById('university')?.value.trim() || '',
    program:         document.getElementById('program').value.trim(),
    year:            parseInt(document.getElementById('year').value),
    skills:          state.skills,
    learning:        state.learning,
    shortTermGoal:   state.shortTermGoal,
    longTermGoal:    state.longTermGoal,
    hoursPerWeek:    state.hoursPerWeek,
    workStyle:       state.workStyle,
    projectInterests: state.projectInterests,
    bio:             document.getElementById('bio')?.value.trim() || ''
  };

  try {
    await apiFetch('/api/onboarding/save', { method: 'POST', body });
    // Update local user cache
    const updated = { ...getUser(), onboardingComplete: true };
    localStorage.setItem('sm_user', JSON.stringify(updated));
    window.location.href = 'dashboard.html';
  } catch (err) {
    submitError.textContent = err.message;
    submitError.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '🚀 Find My Matches';
  }
}
