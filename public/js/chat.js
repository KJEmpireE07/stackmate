/* ── Shared helpers ── */
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

function logout() { clearAuth(); window.location.href = 'auth.html'; }

function showToast(msg, type = 'info') {
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${msg}`;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ── Guard ── */
if (!getToken()) window.location.href = 'auth.html';

/* ── Read URL params ── */
const params      = new URLSearchParams(window.location.search);
const connectionId = params.get('connectionId');
const partnerId    = params.get('partnerId');

if (!connectionId || !partnerId) window.location.href = 'dashboard.html';

const me = getUser();

/* ── Connect to Socket.io ── */
const socket = io();

/* ── Join the chat room ── */
socket.emit('joinRoom', connectionId);

/* ── Listen for incoming messages ── */
socket.on('newMessage', (message) => {
  appendMessage(message);
  scrollToBottom();
});

/* ── Load partner info & message history ── */
async function init() {
  try {
    const [partner, history] = await Promise.all([
      apiFetch(`/api/profile/${partnerId}`),
      apiFetch(`/api/chat/${connectionId}`)
    ]);

    // Populate header
    const initials = partner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('partner-avatar').textContent = initials;
    document.getElementById('partner-name').textContent = partner.name;
    document.getElementById('partner-role').textContent =
      (partner.program || '') + (partner.year ? ` • Year ${partner.year}` : '');

    // Render history
    const container = document.getElementById('messages-container');
    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-chat">
          <div>💬</div>
          <p>No messages yet. Say hi to ${partner.name}!</p>
        </div>`;
    } else {
      container.innerHTML = '';
      history.forEach(msg => appendMessage(msg));
      scrollToBottom();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ── Append a message bubble ── */
function appendMessage(msg) {
  const container = document.getElementById('messages-container');

  // Remove empty state if present
  const empty = container.querySelector('.empty-chat');
  if (empty) empty.remove();

  const senderId = msg.sender._id || msg.sender;
  const isMine   = senderId === me?.id;
  const name     = msg.sender.name || (isMine ? 'You' : 'Partner');
  const time     = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const div = document.createElement('div');
  div.className = `message ${isMine ? 'mine' : 'theirs'}`;
  div.innerHTML = `
    <div class="message-bubble">${escapeHtml(msg.text)}</div>
    <div class="message-meta">${isMine ? 'You' : name} • ${time}</div>
  `;
  container.appendChild(div);
}

/* ── Send a message ── */
function sendMessage() {
  const input = document.getElementById('message-input');
  const text  = input.value.trim();
  if (!text) return;

  socket.emit('sendMessage', {
    roomId:   connectionId,
    senderId: me?.id,
    text
  });

  input.value = '';
  input.focus();
}

/* ── Send on Enter key ── */
function handleKey(e) {
  if (e.key === 'Enter') sendMessage();
}

/* ── Helpers ── */
function scrollToBottom() {
  const container = document.getElementById('messages-container');
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ── Start ── */
init();
