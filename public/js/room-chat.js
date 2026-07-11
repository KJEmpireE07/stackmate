const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');

if (!roomId) {
  window.location.href = 'dashboard.html';
}

let socket;
let currentUser = null;
let roomData = null;

// Workspace State
let workspaceUsers = [];
let currentZone = 'lounge';

// Helper: Show toast notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return alert(message);
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Custom API Fetch Wrapper
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('sm_token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) window.location.href = 'index.html';
    throw new Error(data.message || 'API request failed');
  }
  return data;
}

// Initialization
async function init() {
  try {
    currentUser = await apiFetch('/api/profile/me');
    roomData = await apiFetch(`/api/rooms/${roomId}`);
    
    // Update Header UI
    document.getElementById('room-name').innerText = roomData.name;
    document.getElementById('room-category').innerText = roomData.category;
    document.getElementById('room-member-count').innerText = `${roomData.members.length} members`;

    // Populate Members Drawer
    const membersList = document.getElementById('members-list');
    membersList.innerHTML = roomData.members.map(m => `
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <div style="width:36px; height:36px; border-radius:50%; background:#111; color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.875rem;">
          ${m.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style="font-weight:600; font-size:0.9375rem;">${m.name} ${m._id === currentUser._id ? '(You)' : ''}</div>
          <div style="font-size:0.75rem; color:#666;">${m.program || 'Student'}</div>
        </div>
      </div>
    `).join('');

    // Load Messages
    const messages = await apiFetch(`/api/chat/${roomId}`); // Existing chat endpoint uses connectionId
    const chatContainer = document.getElementById('chat-container');
    chatContainer.innerHTML = '';
    
    if (messages.length === 0) {
      chatContainer.innerHTML = '<div style="text-align:center; color:#999; margin-top:2rem;">Start the conversation!</div>';
    } else {
      messages.forEach(msg => appendMessage(msg));
    }
    scrollToBottom();

    // Setup Socket
    setupSocket();
  } catch (err) {
    showToast(err.message, 'error');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
  }
}

function setupSocket() {
  socket = io({ auth: { token: localStorage.getItem('sm_token') } });
  
  socket.emit('joinRoom', roomId);
  socket.emit('joinWorkspace', { roomId, userId: currentUser._id });

  // Workspace Socket Events
  socket.on('workspaceState', (users) => {
    workspaceUsers = users;
    // Add current user to local state
    workspaceUsers.push({
      socketId: socket.id,
      userId: currentUser._id,
      currentZone: currentZone,
      presence: 'Online'
    });
    renderWorkspaceAvatars();
    updateZoneHighlight();
  });

  socket.on('workspaceUserJoined', (state) => {
    if (state.socketId !== socket.id) {
      workspaceUsers.push(state);
      renderWorkspaceAvatars();
    }
  });

  socket.on('workspaceUserUpdated', (state) => {
    const idx = workspaceUsers.findIndex(u => u.socketId === state.socketId);
    if (idx !== -1) {
      workspaceUsers[idx] = state;
      renderWorkspaceAvatars();
    }
  });

  socket.on('workspaceUserLeft', ({ socketId }) => {
    workspaceUsers = workspaceUsers.filter(u => u.socketId !== socketId);
    renderWorkspaceAvatars();
  });

  socket.on('newMessage', (msg) => {
    // Remove "Start the conversation" text if present
    const emptyText = document.querySelector('#chat-container div[style*="text-align:center"]');
    if (emptyText) emptyText.remove();
    
    appendMessage(msg);
    scrollToBottom();
  });
}

function appendMessage(msg) {
  const container = document.getElementById('chat-container');
  const isMine = msg.sender._id === currentUser._id || msg.sender === currentUser._id;
  
  // Find sender name
  let senderName = 'Someone';
  if (isMine) {
    senderName = 'You';
  } else {
    const member = roomData.members.find(m => m._id === (msg.sender._id || msg.sender));
    if (member) senderName = member.name;
    else if (msg.sender.name) senderName = msg.sender.name;
  }

  const div = document.createElement('div');
  div.className = `message ${isMine ? 'sent' : 'received'}`;
  
  div.innerHTML = `
    ${!isMine ? `<div class="message-sender">${senderName}</div>` : ''}
    <div class="message-bubble">${escapeHTML(msg.text)}</div>
  `;
  container.appendChild(div);
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

function scrollToBottom() {
  const container = document.getElementById('chat-container');
  container.scrollTop = container.scrollHeight;
}

// Event Listeners
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Init
init();

/* ── Workspace Logic ── */

function joinZone(zoneId) {
  currentZone = zoneId;
  socket.emit('updateZone', { zone: zoneId });
  
  // Update local state
  const myState = workspaceUsers.find(u => u.socketId === socket.id);
  if (myState) myState.currentZone = zoneId;
  
  renderWorkspaceAvatars();
  updateZoneHighlight();
}

function updateZoneHighlight() {
  document.querySelectorAll('.zone-card').forEach(card => card.classList.remove('active-zone'));
  const activeCard = document.getElementById(`zone-${currentZone}`);
  if (activeCard) activeCard.classList.add('active-zone');
}

function renderWorkspaceAvatars() {
  const zones = ['research', 'development', 'presentation', 'lounge'];
  
  zones.forEach(zone => {
    const container = document.getElementById(`avatars-${zone}`);
    if (!container) return;
    
    // Filter users in this zone
    const usersInZone = workspaceUsers.filter(u => u.currentZone === zone);
    
    container.innerHTML = usersInZone.map(u => {
      // Find user data from roomData.members to get name
      const memberData = roomData.members.find(m => m._id === u.userId);
      const name = memberData ? memberData.name : 'Unknown';
      const initials = name.charAt(0).toUpperCase();
      const isMe = u.socketId === socket.id;
      
      let indicatorClass = 'presence-indicator';
      if (u.presence === 'Away') indicatorClass += ' away';
      if (u.presence === 'Busy') indicatorClass += ' busy';
      
      return `
        <div class="workspace-avatar" title="${name}">
          <div class="avatar-circle">
            ${initials}
            <div class="${indicatorClass}"></div>
          </div>
          <div class="avatar-name">${isMe ? 'You' : name.split(' ')[0]}</div>
        </div>
      `;
    }).join('');
  });
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text) return;

  socket.emit('sendMessage', {
    roomId,
    senderId: currentUser._id,
    text
  });

  input.value = '';
  input.focus();
}

// Members Drawer Toggle
let isDrawerOpen = false;
function toggleMembersDrawer() {
  const drawer = document.getElementById('members-drawer');
  isDrawerOpen = !isDrawerOpen;
  drawer.classList.toggle('open', isDrawerOpen);
}

init();
