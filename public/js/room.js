/* ─────────────────────────────────────────
   StackMate — Virtual Room
   Phase 1: Pixel room + characters + chat
───────────────────────────────────────── */

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

function showToast(msg, type = 'info') {
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${msg}`;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

if (!getToken()) window.location.href = 'auth.html';

/* ── URL params ── */
const params       = new URLSearchParams(window.location.search);
const connectionId = params.get('connectionId');
const partnerId    = params.get('partnerId');
if (!connectionId || !partnerId) window.location.href = 'dashboard.html';

const me = getUser();

/* ── Canvas setup ── */
const canvas = document.getElementById('room-canvas');
const ctx    = canvas.getContext('2d');

const TILE = 32;
const COLS = 22;
const ROWS = 16;
canvas.width  = COLS * TILE;   // 704px
canvas.height = ROWS * TILE;   // 512px

/* ── Warm color palette ── */
const C = {
  floorA:    '#c4a27a',   // warm wood tile A
  floorB:    '#b8956c',   // warm wood tile B
  floorLine: '#a07d56',   // grout lines
  wall:      '#2d1f0e',   // dark wall
  wallTop:   '#3d2b1a',   // wall highlight
  desk:      '#6B4226',   // desk body
  deskTop:   '#7d5233',   // desk surface
  deskEdge:  '#4a2d18',   // desk edge
  monitor:   '#1a1a2e',   // monitor body
  screen:    '#7dd3fc',   // screen glow (sky blue)
  screenGlow:'#bae6fd',   // screen highlight
  keyboard:  '#2a2a3a',   // keyboard
  plant:     '#2D6A4F',   // plant leaves
  plantDark: '#1a4a35',   // plant shadow
  plantPot:  '#c2622c',   // terracotta pot
  shelf:     '#5a3418',   // bookshelf
  book1:     '#c0392b',   // book colors
  book2:     '#2980b9',
  book3:     '#27ae60',
  book4:     '#f39c12',
  book5:     '#8e44ad',
  rug:       '#8B4513',   // rug base
  rugAccent: '#a0522d',   // rug accent
  window:    '#87ceeb',   // window sky
  windowGlow:'#bde3f5',   // window light
  frame:     '#4a2d18',   // window frame
  lamp:      '#d4a843',   // lamp color
  lampLight: 'rgba(255, 220, 100, 0.15)',  // lamp glow
  github:    '#e8c99a',   // github icon color
  tableTop:  '#9c6b3c',   // discussion table
  chair:     '#8B4513',
  charA:     '#6366f1',   // Player A character (indigo)
  charB:     '#10b981',   // Player B character (emerald)
  charSkin:  '#fbbf24',   // character skin
  nameTag:   'rgba(0,0,0,0.7)',
  shadow:    'rgba(0,0,0,0.25)'
};

/* ── Room positions (in tiles) ── */
const POS = {
  // Desk A (top-left)
  deskA:   { x: 1,  y: 2,  w: 5, h: 3 },
  charA:   { x: 3,  y: 4 },  // character sits in front of desk

  // Desk B (top-right)
  deskB:   { x: 16, y: 2,  w: 5, h: 3 },
  charB:   { x: 18, y: 4 },

  // Discussion table (center)
  table:   { x: 8,  y: 6,  w: 6, h: 4 },

  // Window (top center)
  window:  { x: 9,  y: 0,  w: 4, h: 2 },

  // Bookshelf (right wall)
  shelf:   { x: 19, y: 8,  w: 3, h: 5 },

  // Plants
  plantA:  { x: 0,  y: 8  },
  plantB:  { x: 21, y: 1  },
  plantC:  { x: 11, y: 13 },

  // Lamp on desk A
  lampA:   { x: 5,  y: 2  },
  lampB:   { x: 16, y: 2  },

  // GitHub icons (on each desk)
  githubA: { x: 2, y: 2  },
  githubB: { x: 19, y: 2 }
};

/* ── State ── */
let myProfile      = null;
let partnerProfile = null;
let partnerOnline  = false;
let myStatus       = 'working';
let partnerStatus  = 'offline';
let myPos          = { ...POS.charA };   // will be set after profile loads
let partnerPos     = { ...POS.charB };
let isPlayerA      = true;   // will determine based on connectionId

/* ── Draw Helpers ── */
function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, w * TILE, h * TILE);
}

function pixel(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
}

function tileRect(tx, ty, tw, th, color) {
  ctx.fillStyle = color;
  ctx.fillRect(tx, ty, tw, th);
}

/* ── Draw Floor ── */
function drawFloor() {
  for (let row = 1; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const isAlt = (row + col) % 2 === 0;
      ctx.fillStyle = isAlt ? C.floorA : C.floorB;
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      // Grout lines
      ctx.fillStyle = C.floorLine;
      ctx.fillRect(col * TILE, row * TILE, TILE, 1);
      ctx.fillRect(col * TILE, row * TILE, 1, TILE);
    }
  }
}

/* ── Draw Walls ── */
function drawWalls() {
  // Top wall
  for (let col = 0; col < COLS; col++) {
    ctx.fillStyle = C.wall;
    ctx.fillRect(col * TILE, 0, TILE, TILE);
    ctx.fillStyle = C.wallTop;
    ctx.fillRect(col * TILE, TILE - 4, TILE, 4);
  }
}

/* ── Draw Window ── */
function drawWindow() {
  const { x, y, w, h } = POS.window;
  // Frame
  ctx.fillStyle = C.frame;
  ctx.fillRect(x * TILE - 4, y * TILE - 2, w * TILE + 8, h * TILE + 6);
  // Glass
  ctx.fillStyle = C.window;
  ctx.fillRect(x * TILE, y * TILE, w * TILE, h * TILE);
  // Sky gradient
  const grad = ctx.createLinearGradient(x * TILE, 0, x * TILE, h * TILE * 2);
  grad.addColorStop(0, 'rgba(135,206,235,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = grad;
  ctx.fillRect(x * TILE, y * TILE, w * TILE, h * TILE);
  // Window divider
  ctx.fillStyle = C.frame;
  ctx.fillRect((x + w / 2) * TILE - 2, y * TILE, 4, h * TILE);
  // Light cast on floor
  ctx.fillStyle = 'rgba(255, 240, 200, 0.07)';
  ctx.beginPath();
  ctx.moveTo(x * TILE, h * TILE);
  ctx.lineTo((x + w) * TILE, h * TILE);
  ctx.lineTo((x + w + 3) * TILE, ROWS * TILE);
  ctx.lineTo((x - 3) * TILE, ROWS * TILE);
  ctx.closePath();
  ctx.fill();
}

/* ── Draw Desk ── */
function drawDesk(pos, side) {
  const { x, y, w, h } = pos;
  const px = x * TILE, py = y * TILE;
  const pw = w * TILE, ph = h * TILE;

  // Desk shadow
  ctx.fillStyle = C.shadow;
  ctx.fillRect(px + 6, py + ph, pw, 6);

  // Desk body
  ctx.fillStyle = C.desk;
  ctx.fillRect(px, py + 8, pw, ph);

  // Desk surface
  ctx.fillStyle = C.deskTop;
  ctx.fillRect(px, py, pw, 8);

  // Desk edge
  ctx.fillStyle = C.deskEdge;
  ctx.fillRect(px, py + ph - 4, pw, 4);

  // Monitor
  const monX = side === 'left' ? px + pw - 48 : px + 8;
  const monY = py - 36;
  // Monitor stand
  ctx.fillStyle = '#333';
  ctx.fillRect(monX + 18, py - 4, 12, 8);
  ctx.fillRect(monX + 8, py - 2, 32, 4);
  // Monitor body
  ctx.fillStyle = C.monitor;
  ctx.fillRect(monX, monY, 48, 36);
  // Screen
  ctx.fillStyle = C.screen;
  ctx.fillRect(monX + 3, monY + 3, 42, 27);
  // Screen content (fake code lines)
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (let i = 0; i < 5; i++) {
    const lw = (20 + Math.random() * 20) | 0;
    ctx.fillRect(monX + 5, monY + 7 + i * 5, lw, 2);
  }
  // Screen glow highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(monX + 3, monY + 3, 42, 8);

  // Keyboard
  ctx.fillStyle = C.keyboard;
  ctx.fillRect(side === 'left' ? monX - 8 : monX + 4, py + 2, 36, 6);
  // Keys
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let k = 0; k < 7; k++) {
    ctx.fillRect((side === 'left' ? monX - 6 : monX + 6) + k * 5, py + 3, 4, 4);
  }

  // Mouse
  ctx.fillStyle = '#555';
  ctx.fillRect(side === 'left' ? monX - 16 : monX + 44, py + 2, 10, 14);
  ctx.fillStyle = '#444';
  ctx.fillRect(side === 'left' ? monX - 16 : monX + 44, py + 2, 10, 5);
}

/* ── Draw Lamp ── */
function drawLamp(pos, side) {
  const lx = pos.x * TILE, ly = pos.y * TILE;
  // Base
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(lx + (side === 'left' ? 6 : 18), ly + 8 + 6, 12, 4);
  // Pole
  ctx.fillStyle = '#666';
  ctx.fillRect(lx + (side === 'left' ? 10 : 22), ly - 16 + 8, 4, 24);
  // Shade
  ctx.fillStyle = C.lamp;
  ctx.beginPath();
  ctx.moveTo(lx + (side === 'left' ? 2 : 14), ly - 16 + 8);
  ctx.lineTo(lx + (side === 'left' ? 22 : 34), ly - 16 + 8);
  ctx.lineTo(lx + (side === 'left' ? 18 : 30), ly - 4 + 8);
  ctx.lineTo(lx + (side === 'left' ? 6 : 18), ly - 4 + 8);
  ctx.closePath();
  ctx.fill();
  // Glow
  const gx = lx + (side === 'left' ? 12 : 24);
  const gy = ly + 8;
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 60);
  glow.addColorStop(0, 'rgba(255, 220, 100, 0.18)');
  glow.addColorStop(1, 'rgba(255, 220, 100, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(lx - 32, ly - 32, 96, 96);
}

/* ── Draw Plant ── */
function drawPlant(pos) {
  const px = pos.x * TILE, py = pos.y * TILE;
  // Pot
  ctx.fillStyle = C.plantPot;
  ctx.fillRect(px + 8, py + 18, 16, 14);
  ctx.fillStyle = '#a04020';
  ctx.fillRect(px + 6, py + 16, 20, 4);
  // Soil
  ctx.fillStyle = '#3d2010';
  ctx.fillRect(px + 9, py + 18, 14, 4);
  // Leaves
  ctx.fillStyle = C.plant;
  ctx.beginPath();
  ctx.arc(px + 16, py + 12, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.plantDark;
  ctx.beginPath();
  ctx.arc(px + 10, py + 14, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.plant;
  ctx.beginPath();
  ctx.arc(px + 22, py + 15, 7, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  ctx.fillStyle = '#3d9162';
  ctx.beginPath();
  ctx.arc(px + 18, py + 9, 4, 0, Math.PI * 2);
  ctx.fill();
}

/* ── Draw Bookshelf ── */
function drawShelf() {
  const { x, y, w, h } = POS.shelf;
  const px = x * TILE, py = y * TILE;
  const pw = w * TILE, ph = h * TILE;
  // Body
  ctx.fillStyle = C.shelf;
  ctx.fillRect(px, py, pw, ph);
  // Shelves
  ctx.fillStyle = '#4a2d18';
  for (let i = 1; i < 4; i++) {
    ctx.fillRect(px, py + i * (ph / 4), pw, 4);
  }
  // Books
  const books = [C.book1, C.book2, C.book3, C.book4, C.book5, C.book1, C.book3, C.book2];
  let bx = px + 4;
  let bi = 0;
  for (let row = 0; row < 3; row++) {
    bx = px + 4;
    for (let b = 0; b < 3; b++) {
      const bw = 12 + (bi % 3) * 4;
      ctx.fillStyle = books[(bi + row) % books.length];
      ctx.fillRect(bx, py + row * (ph / 4) + 4, bw, ph / 4 - 8);
      // Spine highlight
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(bx, py + row * (ph / 4) + 4, 2, ph / 4 - 8);
      bx += bw + 2;
      bi++;
    }
  }
}

/* ── Draw Discussion Table ── */
function drawTable() {
  const { x, y, w, h } = POS.table;
  const px = x * TILE, py = y * TILE;
  const pw = w * TILE, ph = h * TILE;

  // Table shadow
  ctx.fillStyle = C.shadow;
  ctx.fillRect(px + 8, py + ph, pw - 4, 8);

  // Rug under table
  ctx.fillStyle = C.rug;
  ctx.fillRect(px - TILE, py - TILE / 2, pw + TILE * 2, ph + TILE);
  // Rug pattern
  ctx.fillStyle = C.rugAccent;
  ctx.fillRect(px - TILE + 6, py - TILE / 2 + 6, pw + TILE * 2 - 12, ph + TILE - 12);
  ctx.fillStyle = C.rug;
  ctx.fillRect(px - TILE + 12, py - TILE / 2 + 12, pw + TILE * 2 - 24, ph + TILE - 24);

  // Table legs
  ctx.fillStyle = '#5a3418';
  ctx.fillRect(px + 8, py + ph - 8, 12, 16);
  ctx.fillRect(px + pw - 20, py + ph - 8, 12, 16);

  // Table surface
  ctx.fillStyle = C.tableTop;
  ctx.fillRect(px, py, pw, ph);

  // Table surface highlight
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(px, py, pw, 6);

  // Table edge
  ctx.fillStyle = '#7a4f28';
  ctx.fillRect(px, py + ph - 4, pw, 4);

  // Items on table: laptop, notebook
  // Laptop
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(px + pw / 2 - 24, py + ph / 2 - 8, 48, 32);
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(px + pw / 2 - 21, py + ph / 2 - 5, 42, 22);
  // Notebook
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(px + 12, py + 12, 24, 32);
  ctx.fillStyle = '#ddd';
  for (let l = 0; l < 5; l++) {
    ctx.fillRect(px + 14, py + 16 + l * 6, 20, 1);
  }
  // Coffee cup
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + pw - 36, py + 14, 16, 18);
  ctx.fillStyle = '#6b3a2a';
  ctx.fillRect(px + pw - 34, py + 16, 12, 8);
}

/* ── Draw GitHub Icon ── */
function drawGithubIcon(pos, hasLink) {
  const gx = pos.x * TILE + 4;
  const gy = pos.y * TILE + 4;
  const size = 20;

  // Background circle
  ctx.fillStyle = hasLink ? '#24292e' : '#3d3d3d';
  ctx.beginPath();
  ctx.arc(gx + size / 2, gy + size / 2, size / 2 + 2, 0, Math.PI * 2);
  ctx.fill();

  // GitHub cat icon (simplified pixel version)
  ctx.fillStyle = hasLink ? '#e8c99a' : '#666';
  // Head
  ctx.beginPath();
  ctx.arc(gx + size / 2, gy + size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  // Ears
  ctx.fillStyle = hasLink ? '#24292e' : '#3d3d3d';
  ctx.fillRect(gx + 2, gy + 2, 5, 5);
  ctx.fillRect(gx + size - 7, gy + 2, 5, 5);
  // Eyes
  ctx.fillStyle = hasLink ? '#24292e' : '#555';
  ctx.fillRect(gx + 5, gy + 8, 3, 3);
  ctx.fillRect(gx + size - 8, gy + 8, 3, 3);
  // Hover glow if has link
  if (hasLink) {
    ctx.strokeStyle = 'rgba(232, 201, 154, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(gx + size / 2, gy + size / 2, size / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ── Draw Character ── */
function drawCharacter(tileX, tileY, color, label, status) {
  const cx = tileX * TILE + TILE / 2;
  const cy = tileY * TILE + TILE / 2;
  const size = 18;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + size / 2 + 4, size / 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(cx - size / 2, cy - size / 2, size, size);

  // Face (skin)
  ctx.fillStyle = C.charSkin;
  ctx.fillRect(cx - size / 2 + 3, cy - size / 2 + 3, size - 6, size - 8);

  // Eyes
  ctx.fillStyle = '#333';
  ctx.fillRect(cx - 4, cy - 3, 3, 3);
  ctx.fillRect(cx + 2, cy - 3, 3, 3);

  // Status dot above head
  const statusColors = {
    working:   '#22c55e',
    available: '#3b82f6',
    away:      '#eab308',
    dnd:       '#ef4444',
    offline:   '#6b7280'
  };
  ctx.fillStyle = statusColors[status] || '#6b7280';
  ctx.beginPath();
  ctx.arc(cx + size / 2 - 2, cy - size / 2 - 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1209';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Name tag
  const tagW = ctx.measureText(label).width + 10;
  ctx.fillStyle = C.nameTag;
  ctx.beginPath();
  ctx.roundRect(cx - tagW / 2, cy - size / 2 - 20, tagW, 14, 4);
  ctx.fill();
  ctx.fillStyle = '#e8c99a';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy - size / 2 - 9);
  ctx.textAlign = 'left';
}

/* ── Draw entire room ── */
function drawRoom() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWalls();
  drawFloor();
  drawWindow();
  drawTable();
  drawDesk(POS.deskA, 'left');
  drawDesk(POS.deskB, 'right');
  drawLamp(POS.lampA, 'left');
  drawLamp(POS.lampB, 'right');
  drawPlant(POS.plantA);
  drawPlant(POS.plantB);
  drawPlant(POS.plantC);
  drawShelf();

  // GitHub icons
  drawGithubIcon(POS.githubA, !!(myProfile?.github));
  drawGithubIcon(POS.githubB, !!(partnerProfile?.github));

  // Draw desk labels
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  const nameA = myProfile?.name?.split(' ')[0] || 'You';
  const nameB = partnerProfile?.name?.split(' ')[0] || 'Partner';
  ctx.fillText(nameA + "'s desk", (POS.deskA.x + POS.deskA.w / 2) * TILE, (POS.deskA.y + POS.deskA.h + 0.5) * TILE);
  ctx.fillText(nameB + "'s desk", (POS.deskB.x + POS.deskB.w / 2) * TILE, (POS.deskB.y + POS.deskB.h + 0.5) * TILE);
  ctx.fillText('Discussion Area', (POS.table.x + POS.table.w / 2) * TILE, (POS.table.y + POS.table.h + 0.6) * TILE);
  ctx.textAlign = 'left';

  // Draw my character
  drawCharacter(
    myPos.x, myPos.y,
    myProfile?.characterColor || C.charA,
    (myProfile?.name?.split(' ')[0] || 'You'),
    myStatus
  );

  // Draw partner character if online
  if (partnerOnline) {
    drawCharacter(
      partnerPos.x, partnerPos.y,
      partnerProfile?.characterColor || C.charB,
      (partnerProfile?.name?.split(' ')[0] || 'Partner'),
      partnerStatus
    );
  }
}

/* ── Socket.io ── */
const socket = io();
socket.emit('joinRoom', connectionId);

// Broadcast my position on join
socket.on('connect', () => {
  socket.emit('roomJoin', {
    roomId: connectionId,
    userId: me?.id,
    position: myPos,
    status: myStatus
  });
});

// Partner joins
socket.on('partnerJoined', ({ position, status }) => {
  partnerOnline = true;
  partnerPos = position || { ...POS.charB };
  partnerStatus = status || 'available';
  updatePartnerCard();
  drawRoom();
  showToast(`${partnerProfile?.name?.split(' ')[0] || 'Partner'} joined the room 👋`, 'success');
});

// Partner leaves
socket.on('partnerLeft', () => {
  partnerOnline = false;
  partnerStatus = 'offline';
  updatePartnerCard();
  drawRoom();
});

// Partner position update
socket.on('partnerMoved', ({ position }) => {
  partnerPos = position;
  drawRoom();
});

// Partner status update
socket.on('partnerStatus', ({ status }) => {
  partnerStatus = status;
  updatePartnerCard();
  drawRoom();
});

// Room chat message
socket.on('newMessage', (message) => {
  appendRoomMessage(message);
});

/* ── Keyboard movement ── */
const MOVE_ZONES = [
  // My desk area (player A)
  { x: [1, 6], y: [2, 6] },
  // Discussion area
  { x: [7, 15], y: [5, 11] }
];

document.addEventListener('keydown', (e) => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) {
    e.preventDefault();
    let { x, y } = myPos;
    if (e.key === 'ArrowUp'    || e.key === 'w') y -= 1;
    if (e.key === 'ArrowDown'  || e.key === 's') y += 1;
    if (e.key === 'ArrowLeft'  || e.key === 'a') x -= 1;
    if (e.key === 'ArrowRight' || e.key === 'd') x += 1;

    // Block walls and out of bounds
    if (x < 0 || x >= COLS || y < 1 || y >= ROWS) return;

    // Block partner's private desk area
    const inPartnerDesk = isPlayerA
      ? (x >= 15 && x <= 21 && y >= 1 && y <= 5)  // Player A blocked from right desk
      : (x >= 1  && x <= 6  && y >= 1 && y <= 5); // Player B blocked from left desk

    if (!inPartnerDesk) {
      myPos = { x, y };
      drawRoom();
      socket.emit('roomMove', { roomId: connectionId, position: myPos });
    }
  }
});

/* ── Canvas click — GitHub icon ── */
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top)  * scaleY;

  // Check GitHub icon A
  const gaX = POS.githubA.x * TILE, gaY = POS.githubA.y * TILE;
  if (mx >= gaX && mx <= gaX + 28 && my >= gaY && my <= gaY + 28) {
    if (myProfile?.github) window.open(myProfile.github, '_blank');
    else showToast('Add your GitHub link in Profile settings', 'info');
    return;
  }

  // Check GitHub icon B
  const gbX = POS.githubB.x * TILE, gbY = POS.githubB.y * TILE;
  if (mx >= gbX && mx <= gbX + 28 && my >= gbY && my <= gbY + 28) {
    if (partnerProfile?.github) window.open(partnerProfile.github, '_blank');
    else showToast("Partner hasn't added their GitHub yet", 'info');
    return;
  }
});

/* ── Status ── */
function setStatus(status) {
  myStatus = status;
  const dot = document.getElementById('my-status-dot');
  const colors = { working:'#22c55e', available:'#3b82f6', away:'#eab308', dnd:'#ef4444' };
  dot.style.background = colors[status] || '#22c55e';
  socket.emit('roomStatus', { roomId: connectionId, status });
  drawRoom();
}

/* ── Partner card ── */
function updatePartnerCard() {
  const card = document.getElementById('partner-status-card');
  const statusEl = document.getElementById('partner-status-mini');
  card.style.display = 'flex';

  const labels = {
    working:   '🟢 Working',
    available: '🔵 Available',
    away:      '🟡 Away',
    dnd:       '🔴 Do Not Disturb',
    offline:   '⚫ Offline'
  };
  statusEl.textContent = labels[partnerStatus] || '⚫ Offline';
  statusEl.className   = `partner-status-mini ${partnerOnline ? partnerStatus : 'offline'}`;
}

/* ── Room Chat ── */
function sendRoomMessage() {
  const input = document.getElementById('room-message-input');
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

function appendRoomMessage(msg) {
  const container = document.getElementById('room-messages');
  const empty = container.querySelector('.room-chat-empty');
  if (empty) empty.remove();

  const senderId = msg.sender?._id || msg.sender;
  const isMine   = senderId === me?.id;
  const name     = msg.sender?.name || (isMine ? 'You' : 'Partner');
  const time     = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const div = document.createElement('div');
  div.className = `room-msg ${isMine ? 'mine' : 'theirs'}`;
  div.innerHTML = `
    <div class="room-msg-bubble">${escapeHtml(msg.text)}</div>
    <div class="room-msg-meta">${isMine ? 'You' : name} · ${time}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function toggleChat() {
  const msgs = document.getElementById('room-messages');
  const input = document.querySelector('.room-chat-input');
  const collapsed = msgs.style.display === 'none';
  msgs.style.display   = collapsed ? 'flex' : 'none';
  input.style.display  = collapsed ? 'flex' : 'none';
}

/* ── Load chat history ── */
async function loadHistory() {
  try {
    const history = await apiFetch(`/api/chat/${connectionId}`);
    history.forEach(msg => appendRoomMessage(msg));
  } catch(e) { /* silent */ }
}

/* ── Init ── */
async function init() {
  try {
    const [me2, partner] = await Promise.all([
      apiFetch('/api/profile/me'),
      apiFetch(`/api/profile/${partnerId}`)
    ]);

    myProfile      = me2;
    partnerProfile = partner;

    // Determine desk assignment: lower ID → left desk, higher ID → right desk
    isPlayerA = (me?.id || '') < (partnerId || '');
    myPos      = { ...(isPlayerA ? POS.charA : POS.charB) };
    partnerPos = { ...(isPlayerA ? POS.charB : POS.charA) };

    // Update room title
    document.getElementById('room-title').textContent =
      `${me2.name?.split(' ')[0]} & ${partner.name?.split(' ')[0]}'s Workspace`;

    // Partner card
    const initials = partner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('partner-avatar-mini').textContent = initials;
    document.getElementById('partner-name-mini').textContent   = partner.name;
    document.getElementById('partner-status-card').style.display = 'flex';

    // Draw
    drawRoom();

    // Load history
    await loadHistory();

    // Tell server I joined
    socket.emit('roomJoin', {
      roomId:   connectionId,
      userId:   me?.id,
      position: myPos,
      status:   myStatus
    });

  } catch(err) {
    showToast(err.message, 'error');
  }
}

init();
