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

    // Setup Workspace Engine
    setupWorkspaceFloor();

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
    // Initiate WebRTC mesh connections to everyone currently in the room
    if (typeof initiateCallsToAll === 'function') {
      initiateCallsToAll(workspaceUsers);
    }
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

  socket.on('workspaceUserMoved', (payload) => {
    // payload: { socketId, userId, x, y, currentZone }
    const user = workspaceUsers.find(u => u.userId === payload.userId);
    if (user && user.socketId !== socket.id) {
      user.x = payload.x;
      user.y = payload.y;
      user.currentZone = payload.currentZone;
      
      // We don't re-render the whole array for movement to avoid destroying CSS transitions.
      // Instead, we just find the DOM element and update its inline style directly!
      // To do this, we need to map avatars to userIds. But wait, renderWorkspaceAvatars rewrites innerHTML.
      // For now, renderWorkspaceAvatars is fast enough, but CSS transitions require the element to persist.
      // If we re-render innerHTML, CSS transitions break.
      renderWorkspaceAvatars();
      if (typeof applyProximityAudio === 'function') applyProximityAudio();
    }
  });

  socket.on('workspaceUserLeft', ({ socketId, userId }) => {
    // Filter by userId to guarantee all possible ghost sockets for this user are purged locally
    workspaceUsers = workspaceUsers.filter(u => u.userId !== userId);
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

/* ── Spatial 2D Workspace Logic ── */

function setupWorkspaceFloor() {
  const floor = document.getElementById('office-floor');
  if (!floor) return;
  
  floor.addEventListener('click', (e) => {
    // Ensure we don't trigger if they clicked an interactive piece of furniture or another avatar
    if (e.target.closest('.furniture') || e.target.closest('.workspace-avatar')) {
      // For now, let clicks pass through to floor, or handle object interaction later
    }
    
    const rect = floor.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width;
    let y = (e.clientY - rect.top) / rect.height;
    
    // Clamp coordinates to stay within the floor
    x = Math.max(0.02, Math.min(0.98, x));
    y = Math.max(0.02, Math.min(0.98, y));
    
    walkTo(x, y);
  });
}

function walkTo(x, y) {
  // Determine zone from coords
  const newZone = getZoneFromCoords(x, y);
  
  if (newZone !== currentZone) {
    currentZone = newZone;
    socket.emit('updateZone', { zone: newZone });
    showZoneNotification(newZone);
    
    // Update proximity audio for new zone
    if (typeof applyProximityAudio === 'function') applyProximityAudio();
  }
  
  socket.emit('updatePosition', { x, y });
  
  // Update local state
  const myState = workspaceUsers.find(u => u.socketId === socket.id);
  if (myState) {
    myState.x = x;
    myState.y = y;
    myState.currentZone = newZone;
  }
  
  renderWorkspaceAvatars();
}

function getZoneFromCoords(x, y) {
  if (x < 0.5 && y < 0.5) return 'research';
  if (x >= 0.5 && y < 0.5) return 'development';
  if (x < 0.5 && y >= 0.5) return 'presentation';
  return 'lounge';
}

function showZoneNotification(zone) {
  const notif = document.getElementById('zone-notification');
  if (!notif) return;
  
  const titles = {
    'research': 'Joined Audio: Research Lab',
    'development': 'Joined Audio: Development Area',
    'presentation': 'Joined Audio: Presentation Stage',
    'lounge': 'Joined Audio: The Lounge'
  };
  
  notif.innerText = titles[zone] || 'Joined Audio Zone';
  notif.classList.add('show');
  setTimeout(() => notif.classList.remove('show'), 3000);
}

function renderWorkspaceAvatars() {
  const container = document.getElementById('avatars-layer');
  if (!container) return;
  
  // Deduplicate all workspaceUsers globally by userId
  const uniqueUsersMap = new Map();
  workspaceUsers.forEach(u => {
    if (!uniqueUsersMap.has(u.userId)) {
      uniqueUsersMap.set(u.userId, u);
    } else {
      const existing = uniqueUsersMap.get(u.userId);
      if (u.socketId === socket.id) {
        uniqueUsersMap.set(u.userId, u);
      } else if (u.lastActive > existing.lastActive) {
        uniqueUsersMap.set(u.userId, u);
      }
    }
  });
  
  const uniqueUsers = Array.from(uniqueUsersMap.values());
  
  // Keep track of which avatars we processed to remove stale ones
  const processedUserIds = new Set();
  
  uniqueUsers.forEach(u => {
    processedUserIds.add(u.userId);
    let avatarEl = document.getElementById(`avatar-${u.userId}`);
    
    const leftPercent = (u.x !== undefined ? u.x : 0.5) * 100;
    const topPercent = (u.y !== undefined ? u.y : 0.5) * 100;
    
    if (!avatarEl) {
      // Create new avatar DOM element
      avatarEl = document.createElement('div');
      avatarEl.id = `avatar-${u.userId}`;
      avatarEl.className = 'workspace-avatar';
      
      const memberData = roomData.members.find(m => m._id === u.userId);
      const name = memberData ? memberData.name : 'Unknown';
      const initials = name.charAt(0).toUpperCase();
      const isMe = u.userId === currentUser._id;
      
      let indicatorClass = 'presence-indicator';
      if (u.presence === 'Away') indicatorClass += ' away';
      if (u.presence === 'Busy') indicatorClass += ' busy';
      
      avatarEl.title = name;
      avatarEl.innerHTML = `
        <div class="avatar-transform-wrapper">
          <div class="avatar-circle ${isMe ? 'is-me' : ''}">
            ${initials}
            <div id="presence-${u.userId}" class="${indicatorClass}"></div>
          </div>
          <div class="avatar-name">${isMe ? 'You' : name.split(' ')[0]}</div>
        </div>
      `;
      container.appendChild(avatarEl);
    } else {
      // Update existing DOM element presence
      const indicatorClass = 'presence-indicator' + (u.presence === 'Away' ? ' away' : (u.presence === 'Busy' ? ' busy' : ''));
      const indicatorEl = document.getElementById(`presence-${u.userId}`);
      if (indicatorEl) indicatorEl.className = indicatorClass;
    }
    
    // Update coordinates using transform for smooth CSS transitions
    // Since workspace-avatar is position absolute, we can just update left/top. 
    // Wait, transition on left/top is expensive. We can just use left/top in the CSS and let it transition, 
    // or set left/top to 0 and use transform: translate(x, y). 
    // Since our CSS uses left/top for positioning and has `transition: left 0.6s, top 0.6s` (I should update CSS if I didn't). 
    // Let's just update left and top inline. 
    avatarEl.style.left = `${leftPercent}%`;
    avatarEl.style.top = `${topPercent}%`;
  });
  
  // Remove stale avatars
  Array.from(container.children).forEach(child => {
    const userId = child.id.replace('avatar-', '');
    if (!processedUserIds.has(userId)) {
      child.remove();
    }
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

/* ── Media Controls ── */
async function handleMicToggle() {
  const btn = document.getElementById('btn-toggle-mic');
  const isEnabled = await toggleLocalMedia('audio');
  if (isEnabled) {
    btn.classList.add('active');
    btn.innerHTML = '<span class="icon">🎤</span> Mute';
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<span class="icon">🎤</span> Unmute';
  }
}

async function handleCameraToggle() {
  const btn = document.getElementById('btn-toggle-camera');
  const isEnabled = await toggleLocalMedia('video');
  if (isEnabled) {
    btn.classList.add('active');
    btn.innerHTML = '<span class="icon">📷</span> Turn off Camera';
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<span class="icon">📷</span> Turn on Camera';
  }
}

// Ensure instant cleanup when the user leaves the page (Back button, refresh, close tab)
window.addEventListener('beforeunload', () => {
  if (socket) {
    socket.emit('leaveWorkspace');
    socket.disconnect();
  }
});

// Members Drawer Toggle
let isDrawerOpen = false;
function toggleMembersDrawer() {
  const drawer = document.getElementById('members-drawer');
  isDrawerOpen = !isDrawerOpen;
  drawer.classList.toggle('open', isDrawerOpen);
}

init();
