/**
 * StackMate — 3D Virtual Workspace
 * 
 * A fully immersive Three.js 3D environment with 4 distinct zones:
 *   - Lounge (bottom-right) — warm hangout area, entry point
 *   - Research Lab (top-left) — desks, monitors, whiteboard
 *   - Development Room (top-right) — workstation bank, green accents
 *   - Presentation Stage (bottom-left) — stage, podium, chairs
 * 
 * Connected by a central hallway with directional signage.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ═══════════════════════════════════════════
// CONSTANTS & CONFIG
// ═══════════════════════════════════════════

const ROOM_W = 20;   // Width of each zone room
const ROOM_D = 16;   // Depth of each zone room
const HALL_W = 8;     // Hallway width
const WALL_H = 4.5;   // Wall height
const WALL_T = 0.3;   // Wall thickness
const DOOR_W = 4;     // Doorway width

// Zone centers (each room offset from origin by half-hall + half-room)
const ZONE_CX = ROOM_W / 2 + HALL_W / 2;  // 14
const ZONE_CZ = ROOM_D / 2 + HALL_W / 2;  // 12

const ZONE_CENTERS = {
  lounge: new THREE.Vector3(ZONE_CX, 0, ZONE_CZ),
  research: new THREE.Vector3(-ZONE_CX, 0, -ZONE_CZ),
  development: new THREE.Vector3(ZONE_CX, 0, -ZONE_CZ),
  presentation: new THREE.Vector3(-ZONE_CX, 0, ZONE_CZ),
  hallway: new THREE.Vector3(0, 0, 0),
};

const ZONE_NAMES = {
  lounge: 'Lounge', research: 'Research Lab',
  development: 'Development Room', presentation: 'Presentation Stage',
  hallway: 'Central Hallway',
};

const ZONE_ICONS = {
  lounge: '☕', research: '🔬',
  development: '💻', presentation: '📊',
  hallway: '🚶',
};

// Camera home positions per zone (nice viewing angle)
const ZONE_CAMERAS = {
  lounge: { pos: new THREE.Vector3(ZONE_CX + 14, 16, ZONE_CZ + 14), target: new THREE.Vector3(ZONE_CX, 0, ZONE_CZ) },
  research: { pos: new THREE.Vector3(-ZONE_CX - 14, 16, -ZONE_CZ - 14), target: new THREE.Vector3(-ZONE_CX, 0, -ZONE_CZ) },
  development: { pos: new THREE.Vector3(ZONE_CX + 14, 16, -ZONE_CZ - 14), target: new THREE.Vector3(ZONE_CX, 0, -ZONE_CZ) },
  presentation: { pos: new THREE.Vector3(-ZONE_CX - 14, 16, ZONE_CZ + 14), target: new THREE.Vector3(-ZONE_CX, 0, ZONE_CZ) },
  hallway: { pos: new THREE.Vector3(0, 30, 25), target: new THREE.Vector3(0, 0, 0) },
};


// ═══════════════════════════════════════════
// MATERIALS (Reusable across the scene)
// ═══════════════════════════════════════════

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({
  color, roughness: opts.roughness ?? 0.7, metalness: opts.metalness ?? 0.05, ...opts,
});

const M = {
  // Lounge
  loungeFloor: mat(0x8b5a2b, { roughness: 0.5, metalness: 0.05 }),
  loungeWall: mat(0xF5F0E1),
  sofa: mat(0x1e6b3a, { roughness: 0.85 }),
  sofaOrange: mat(0xd45c1a, { roughness: 0.85 }),
  rug: mat(0xeae3d2, { roughness: 0.95 }),
  coffeeTable: mat(0x4a2e15, { roughness: 0.6 }),

  // Research
  researchFloor: mat(0xD0D0D0, { roughness: 0.4 }),
  researchWall: mat(0xF0F0F0),

  // Development
  devFloor: mat(0x303030, { roughness: 0.5 }),
  devWall: mat(0x2a2a2a),
  ledStrip: mat(0x00ff88, { emissive: 0x00ff44, emissiveIntensity: 0.6 }),

  // Presentation
  presFloor: mat(0xe8d5b5, { roughness: 0.8 }),
  presWall: mat(0xe0e6ed),
  stage: mat(0xd4b585, { roughness: 0.6 }),
  screen: mat(0x111122, { emissive: 0x111133, emissiveIntensity: 0.3 }),

  // Hallway
  hallFloor: mat(0xE8E0D0, { roughness: 0.3, metalness: 0.1 }),

  // Furniture
  wood: mat(0x8b5a2b, { roughness: 0.6 }),
  darkWood: mat(0x4a3c31),
  desk: mat(0xd4c9a8, { roughness: 0.5 }),
  metal: mat(0x444444, { metalness: 0.8, roughness: 0.2 }),
  dark: mat(0x222222),
  chair: mat(0x333333),
  chairGreen: mat(0x1a4a2a),
  chairLight: mat(0xa0b0c0),
  pot: mat(0x8b4513, { roughness: 0.9 }),
  leaf: mat(0x228b22, { roughness: 0.4 }),
  white: mat(0xffffff, { roughness: 0.1 }),
  boardFrame: mat(0x888888, { metalness: 0.5 }),
  monitor: mat(0x111111),
  monitorScreen: mat(0x88ccff, { emissive: 0x113355, emissiveIntensity: 0.4 }),
  taskCard1: mat(0x3b82f6, { emissive: 0x1a4090, emissiveIntensity: 0.2 }),
  taskCard2: mat(0xf59e0b, { emissive: 0x7a4f06, emissiveIntensity: 0.2 }),
  taskCard3: mat(0x10b981, { emissive: 0x086049, emissiveIntensity: 0.2 }),
  signLounge: mat(0xffa040, { emissive: 0x804020, emissiveIntensity: 0.3 }),
  signResearch: mat(0x58a6ff, { emissive: 0x2c5380, emissiveIntensity: 0.3 }),
  signDev: mat(0x3fb950, { emissive: 0x205d28, emissiveIntensity: 0.3 }),
  signPres: mat(0xbc8cff, { emissive: 0x5e4680, emissiveIntensity: 0.3 }),

  // Espresso & Vending Station Materials
  espressoBody: mat(0xdddddd, { metalness: 0.9, roughness: 0.1 }),
  chromeMetal: mat(0xffffff, { metalness: 0.95, roughness: 0.05 }),
  coffeeBeans: mat(0x3d2314, { roughness: 0.9 }),
  vendingBody: mat(0x181c24, { roughness: 0.4 }),
  vendingGlass: mat(0xa0d8ef, { transparent: true, opacity: 0.4, roughness: 0.1 }),
  vendingNeon: mat(0xf0883e, { emissive: 0xf0883e, emissiveIntensity: 0.9 }),
  canRed: mat(0xef4444, { roughness: 0.3, metalness: 0.6 }),
  canBlue: mat(0x3b82f6, { roughness: 0.3, metalness: 0.6 }),
  canGreen: mat(0x10b981, { roughness: 0.3, metalness: 0.6 }),
  canGold: mat(0xf59e0b, { roughness: 0.3, metalness: 0.8 }),
  steamMat: mat(0xffffff, { transparent: true, opacity: 0.4, roughness: 1.0 }),
};


// ═══════════════════════════════════════════
// SCENE SETUP
// ═══════════════════════════════════════════

const canvas = document.querySelector('#scene');
const roomId = new URLSearchParams(location.search).get('roomId');
if (!roomId) location.replace('dashboard.html');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
scene.fog = new THREE.FogExp2(0x0d1117, 0.008);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
camera.position.copy(ZONE_CAMERAS.lounge.pos);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const controls = new OrbitControls(camera, canvas);
controls.target.copy(ZONE_CAMERAS.lounge.target);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2.1;
controls.update();

// ═══════════════════════════════════════════
// LIGHTING SETUP & RELAX MODE ENGINE
// ═══════════════════════════════════════════
const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
dirLight.position.set(25, 40, 25);
dirLight.castShadow = true;
scene.add(dirLight);

let relaxLampLight = null;
let isRelaxMode = false;


// ═══════════════════════════════════════════
// FURNITURE BUILDER FUNCTIONS
// ═══════════════════════════════════════════

/** Create a mesh, position it, enable shadows, add to parent */
function addMesh(parent, geo, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Office desk with a tabletop and 4 legs */
function createDesk(x, y, z, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;

  // Tabletop
  addMesh(g, new THREE.BoxGeometry(2.1, 0.1, 0.95), M.desk, 0, 0.78, 0);
  // Legs
  for (const lx of [-0.9, 0.9]) {
    for (const lz of [-0.35, 0.35]) {
      addMesh(g, new THREE.BoxGeometry(0.07, 0.75, 0.07), M.metal, lx, 0.38, lz);
    }
  }
  scene.add(g);
  return g;
}

/** Rolling office chair */
function createChair(x, y, z, rot = 0, material = M.chair) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;

  // Seat
  addMesh(g, new THREE.BoxGeometry(0.6, 0.1, 0.6), material, 0, 0.52, 0);
  // Backrest
  addMesh(g, new THREE.BoxGeometry(0.6, 0.55, 0.08), material, 0, 0.85, -0.26);
  // Stem
  addMesh(g, new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), M.metal, 0, 0.3, 0);
  // Base star (5 legs)
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const leg = addMesh(g, new THREE.BoxGeometry(0.45, 0.05, 0.05), M.metal,
      Math.cos(a) * 0.2, 0.06, Math.sin(a) * 0.2);
    leg.rotation.y = -a;
  }
  scene.add(g);
  return g;
}

/** Comfortable sofa with armrests */
function createSofa(x, y, z, rot = 0, material = M.sofa) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;

  // Seat cushion
  addMesh(g, new THREE.BoxGeometry(2.6, 0.45, 0.85), material, 0, 0.23, 0);
  // Backrest
  addMesh(g, new THREE.BoxGeometry(2.6, 0.6, 0.2), material, 0, 0.7, -0.33);
  // Armrests
  addMesh(g, new THREE.BoxGeometry(0.18, 0.45, 0.85), material, -1.3, 0.45, 0);
  addMesh(g, new THREE.BoxGeometry(0.18, 0.45, 0.85), material, 1.3, 0.45, 0);

  scene.add(g);
  return g;
}

/** Potted plant with clustered leaf spheres */
function createPlant(x, y, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);

  // Pot
  addMesh(g, new THREE.CylinderGeometry(0.28, 0.2, 0.48, 10), M.pot, 0, 0.24, 0);
  // Leaves (clustered spheres)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    addMesh(g, new THREE.SphereGeometry(0.25, 8, 6), M.leaf,
      Math.cos(a) * 0.15, 0.65 + Math.random() * 0.3, Math.sin(a) * 0.15);
  }
  scene.add(g);
  return g;
}

/** Bookshelf with shelves and side panels */
function createShelf(x, y, z, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;

  // Side panels
  addMesh(g, new THREE.BoxGeometry(0.08, 2.8, 0.7), M.darkWood, -1.2, 1.4, 0);
  addMesh(g, new THREE.BoxGeometry(0.08, 2.8, 0.7), M.darkWood, 1.2, 1.4, 0);
  // Shelves (4 levels)
  for (let i = 0; i < 4; i++) {
    addMesh(g, new THREE.BoxGeometry(2.4, 0.06, 0.7), M.darkWood, 0, 0.4 + i * 0.7, 0);
  }
  // Some "books" (colored blocks on shelves)
  const bookColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad];
  for (let s = 0; s < 3; s++) {
    const shelfY = 0.43 + s * 0.7;
    for (let b = 0; b < 4; b++) {
      const bx = -0.7 + b * 0.45 + (Math.random() - 0.5) * 0.1;
      const bh = 0.3 + Math.random() * 0.25;
      addMesh(g, new THREE.BoxGeometry(0.12, bh, 0.4),
        mat(bookColors[(s * 4 + b) % bookColors.length]),
        bx, shelfY + bh / 2, 0);
    }
  }
  scene.add(g);
  return g;
}

/** Desktop monitor with glowing screen */
function createMonitor(x, y, z, rot = 0, scale = 1, mode = 'none') {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;
  g.scale.setScalar(scale);

  // Screen bezel
  addMesh(g, new THREE.BoxGeometry(0.85, 0.55, 0.04), M.monitor, 0, 0.32, 0);
  // Glowing display
  addMesh(g, new THREE.PlaneGeometry(0.78, 0.48), M.monitorScreen, 0, 0.32, 0.021);

  if (mode === 'youtube') {
    const ytRed = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const ytWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Red play button background
    addMesh(g, new THREE.PlaneGeometry(0.4, 0.28), ytRed, 0, 0.32, 0.022);

    // White play triangle
    const shape = new THREE.Shape();
    shape.moveTo(-0.04, 0.06);
    shape.lineTo(0.08, 0);
    shape.lineTo(-0.04, -0.06);
    shape.lineTo(-0.04, 0.06);
    const tri = new THREE.Mesh(new THREE.ShapeGeometry(shape), ytWhite);
    tri.position.set(0, 0.32, 0.023);
    g.add(tri);

    g.traverse(child => {
      if (child.isMesh) {
        child.userData.clickableUrl = 'https://www.youtube.com/';
      }
    });
  } else if (mode === 'chatgpt') {
    const cgGreen = new THREE.MeshBasicMaterial({ color: 0x10a37f });
    const cgWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Green background
    addMesh(g, new THREE.PlaneGeometry(0.3, 0.3), cgGreen, 0, 0.32, 0.022);

    // Simple white ring logo approx
    addMesh(g, new THREE.RingGeometry(0.04, 0.09, 16), cgWhite, 0, 0.32, 0.023);

    g.traverse(child => {
      if (child.isMesh) {
        child.userData.clickableUrl = 'https://chatgpt.com/';
      }
    });
  }
  // Stand neck

  scene.add(g);
  return g;
}

/** Large whiteboard mounted on wall */
function createWhiteboard(x, y, z, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;

  // Frame
  addMesh(g, new THREE.BoxGeometry(4.2, 2.2, 0.1), M.boardFrame, 0, 2.2, 0);
  // White surface
  addMesh(g, new THREE.PlaneGeometry(3.9, 1.9), M.white, 0, 2.2, 0.06);

  scene.add(g);
  return g;
}

/** Podium / lectern for presentations */
function createPodium(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);

  // Main body (tapered)
  addMesh(g, new THREE.BoxGeometry(0.9, 1.2, 0.65), M.darkWood, 0, 0.6, 0);
  // Angled top surface
  addMesh(g, new THREE.BoxGeometry(1.0, 0.06, 0.7), M.darkWood, 0, 1.22, 0);

  scene.add(g);
  return g;
}

/** Flat colored floor panel */
function createFloor(material, w, d, x, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.001, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

/** Wall segment */
function createWall(material, w, d, x, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), material);
  mesh.position.set(x, WALL_H / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}


// ═══════════════════════════════════════════
// BUILD THE WORLD
// ═══════════════════════════════════════════

function buildFloors() {
  // Zone floors
  createFloor(M.loungeFloor, ROOM_W, ROOM_D, ZONE_CX, ZONE_CZ);
  createFloor(M.researchFloor, ROOM_W, ROOM_D, -ZONE_CX, -ZONE_CZ);
  createFloor(M.devFloor, ROOM_W, ROOM_D, ZONE_CX, -ZONE_CZ);
  createFloor(M.presFloor, ROOM_W, ROOM_D, -ZONE_CX, ZONE_CZ);

  // Hallway (cross shape)
  createFloor(M.hallFloor, ROOM_W * 2 + HALL_W, HALL_W, 0, 0);  // Horizontal
  createFloor(M.hallFloor, HALL_W, ROOM_D * 2 + HALL_W, 0, 0);  // Vertical
}

function buildWalls() {
  const hw = HALL_W / 2;
  const outerX = ROOM_W + hw;
  const outerZ = ROOM_D + hw;

  // ── Lounge (bottom-right): cream walls ──
  createWall(M.loungeWall, ROOM_W, WALL_T, ZONE_CX, outerZ);                    // South
  createWall(M.loungeWall, WALL_T, ROOM_D, outerX, ZONE_CZ);                    // East
  // Inner walls with door gaps
  createWall(M.loungeWall, (ROOM_W - DOOR_W) / 2, WALL_T, hw + (ROOM_W - DOOR_W) / 4, hw);  // North-left
  createWall(M.loungeWall, (ROOM_W - DOOR_W) / 2, WALL_T, outerX - (ROOM_W - DOOR_W) / 4, hw); // North-right
  createWall(M.loungeWall, WALL_T, (ROOM_D - DOOR_W) / 2, hw, hw + (ROOM_D - DOOR_W) / 4);  // West-top
  createWall(M.loungeWall, WALL_T, (ROOM_D - DOOR_W) / 2, hw, outerZ - (ROOM_D - DOOR_W) / 4); // West-bottom

  // ── Research (top-left): white walls ──
  createWall(M.researchWall, ROOM_W, WALL_T, -ZONE_CX, -outerZ);               // North
  createWall(M.researchWall, WALL_T, ROOM_D, -outerX, -ZONE_CZ);               // West
  createWall(M.researchWall, (ROOM_W - DOOR_W) / 2, WALL_T, -hw - (ROOM_W - DOOR_W) / 4, -hw);
  createWall(M.researchWall, (ROOM_W - DOOR_W) / 2, WALL_T, -outerX + (ROOM_W - DOOR_W) / 4, -hw);
  createWall(M.researchWall, WALL_T, (ROOM_D - DOOR_W) / 2, -hw, -hw - (ROOM_D - DOOR_W) / 4);
  createWall(M.researchWall, WALL_T, (ROOM_D - DOOR_W) / 2, -hw, -outerZ + (ROOM_D - DOOR_W) / 4);

  // ── Development (top-right): dark charcoal walls ──
  createWall(M.devWall, ROOM_W, WALL_T, ZONE_CX, -outerZ);                     // North
  createWall(M.devWall, WALL_T, ROOM_D, outerX, -ZONE_CZ);                     // East
  createWall(M.devWall, (ROOM_W - DOOR_W) / 2, WALL_T, hw + (ROOM_W - DOOR_W) / 4, -hw);
  createWall(M.devWall, (ROOM_W - DOOR_W) / 2, WALL_T, outerX - (ROOM_W - DOOR_W) / 4, -hw);
  createWall(M.devWall, WALL_T, (ROOM_D - DOOR_W) / 2, hw, -hw - (ROOM_D - DOOR_W) / 4);
  createWall(M.devWall, WALL_T, (ROOM_D - DOOR_W) / 2, hw, -outerZ + (ROOM_D - DOOR_W) / 4);

  // ── Presentation (bottom-left): navy walls ──
  createWall(M.presWall, ROOM_W, WALL_T, -ZONE_CX, outerZ);                    // South
  createWall(M.presWall, WALL_T, ROOM_D, -outerX, ZONE_CZ);                    // West
  createWall(M.presWall, (ROOM_W - DOOR_W) / 2, WALL_T, -hw - (ROOM_W - DOOR_W) / 4, hw);
  createWall(M.presWall, (ROOM_W - DOOR_W) / 2, WALL_T, -outerX + (ROOM_W - DOOR_W) / 4, hw);
  createWall(M.presWall, WALL_T, (ROOM_D - DOOR_W) / 2, -hw, hw + (ROOM_D - DOOR_W) / 4);
  createWall(M.presWall, WALL_T, (ROOM_D - DOOR_W) / 2, -hw, outerZ - (ROOM_D - DOOR_W) / 4);
}


// ═══════════════════════════════════════════
// POPULATE ZONES
// ═══════════════════════════════════════════

let steamParticles = [];

// ═══════════════════════════════════════════
// 3D TV DYNAMIC BEAT VISUALIZER CANVAS
// ═══════════════════════════════════════════

const tvCanvas = document.createElement('canvas');
tvCanvas.width = 512;
tvCanvas.height = 288;
const tvCtx = tvCanvas.getContext('2d');

const tvCanvasTexture = new THREE.CanvasTexture(tvCanvas);
const tvMaterial = new THREE.MeshStandardMaterial({
  map: tvCanvasTexture,
  emissiveMap: tvCanvasTexture,
  emissive: 0xffffff,
  emissiveIntensity: 0.65,
  roughness: 0.2
});

let tvBeatPhase = 0;
let tvBeatParticles = [];
for (let i = 0; i < 18; i++) {
  tvBeatParticles.push({
    x: Math.random() * 512,
    y: Math.random() * 288,
    speedY: 0.4 + Math.random() * 1.6,
    symbol: ['🎵', '🎶', '⚡', '✨', '☕'][Math.floor(Math.random() * 5)],
    alpha: 0.3 + Math.random() * 0.7
  });
}

function update3DTVCanvas() {
  tvBeatPhase += 0.05;

  // Background Gradient
  const grad = tvCtx.createLinearGradient(0, 0, 512, 288);
  if (typeof isTvPlaying !== 'undefined' && isTvPlaying) {
    grad.addColorStop(0, '#0d0221');
    grad.addColorStop(0.5, '#190a38');
    grad.addColorStop(1, '#050c1a');
  } else {
    grad.addColorStop(0, '#0c1017');
    grad.addColorStop(1, '#161b22');
  }
  tvCtx.fillStyle = grad;
  tvCtx.fillRect(0, 0, 512, 288);

  if (typeof isTvPlaying !== 'undefined' && isTvPlaying) {
    // 1. Draw glowing soundwave beat equalizer bars
    const bars = 24;
    const barWidth = 14;
    const gap = 6;
    const startX = (512 - (bars * (barWidth + gap))) / 2;

    for (let i = 0; i < bars; i++) {
      const height = Math.abs(Math.sin(tvBeatPhase * 1.8 + i * 0.4) * Math.cos(tvBeatPhase * 0.8 + i * 0.2)) * 140 + 20;
      const x = startX + i * (barWidth + gap);
      const y = 220 - height;

      const barGrad = tvCtx.createLinearGradient(0, y, 0, 220);
      barGrad.addColorStop(0, '#bc8cff');
      barGrad.addColorStop(0.5, '#f0883e');
      barGrad.addColorStop(1, '#3fb950');

      tvCtx.fillStyle = barGrad;
      tvCtx.shadowColor = '#bc8cff';
      tvCtx.shadowBlur = 10;
      tvCtx.fillRect(x, y, barWidth, height);
    }
    tvCtx.shadowBlur = 0;

    // 2. Draw Floating Beat Musical Notes (🎵 🎶 ⚡ ✨)
    tvCtx.font = '16px sans-serif';
    tvBeatParticles.forEach(p => {
      p.y -= p.speedY;
      if (p.y < -20) {
        p.y = 300;
        p.x = Math.random() * 512;
      }
      tvCtx.globalAlpha = Math.abs(Math.sin(tvBeatPhase + p.x)) * p.alpha;
      tvCtx.fillText(p.symbol, p.x, p.y);
    });
    tvCtx.globalAlpha = 1.0;

    // 3. Draw Track Title Header on 3D TV Screen
    tvCtx.fillStyle = 'rgba(255,255,255,0.95)';
    tvCtx.font = 'bold 20px "Space Grotesk", sans-serif';
    tvCtx.textAlign = 'center';
    const titleText = (typeof currentTvTrack !== 'undefined' && currentTvTrack.title) ? currentTvTrack.title : 'LOUNGE BEATS';
    tvCtx.fillText('🎶 ' + titleText, 256, 44);

    tvCtx.fillStyle = '#bc8cff';
    tvCtx.font = '13px "Inter", sans-serif';
    tvCtx.fillText('🔴 LIVE ROOM JUKEBOX • SYNCED', 256, 68);
  } else {
    // Standby TV Screen
    tvCtx.fillStyle = 'rgba(255,255,255,0.5)';
    tvCtx.font = 'bold 22px "Space Grotesk", sans-serif';
    tvCtx.textAlign = 'center';
    tvCtx.fillText('📺 LOUNGE TV & JUKEBOX', 256, 130);

    tvCtx.fillStyle = '#8b949e';
    tvCtx.font = '13px "Inter", sans-serif';
    tvCtx.fillText('Click TV to Select Music & Play Beats', 256, 160);
  }

  tvCanvasTexture.needsUpdate = true;
}

function populateLounge() {
  const cx = ZONE_CX, cz = ZONE_CZ;

  // Two sofas facing each other
  createSofa(cx - 2, 0, cz - 2.5, 0, M.sofa);
  createSofa(cx - 2, 0, cz + 2.5, Math.PI, M.sofaOrange);

  // Coffee table between sofas
  const table = addMesh(scene, new THREE.BoxGeometry(2.2, 0.12, 1.0), M.coffeeTable, cx - 2, 0.38, cz);
  for (const lx of [-0.9, 0.9]) {
    for (const lz of [-0.35, 0.35]) {
      addMesh(scene, new THREE.BoxGeometry(0.06, 0.36, 0.06), M.metal, cx - 2 + lx, 0.18, cz + lz);
    }
  }

  // HD Aesthetic Woven Boho Rug Texture
  const rugCanvas = document.createElement('canvas');
  rugCanvas.width = 512; rugCanvas.height = 512;
  const rctx = rugCanvas.getContext('2d');

  // Pastel Terracotta & Sunset Aqua Teal Coastal Rug Texture
  rctx.fillStyle = '#f7ede2';
  rctx.fillRect(0, 0, 512, 512);

  // Woven Fabric Cross-Hatch Texture
  rctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
  for (let i = 0; i < 512; i += 4) {
    rctx.fillRect(i, 0, 2, 512);
    rctx.fillRect(0, i, 512, 2);
  }

  // Coral Terracotta & Aqua Teal Dual Border
  rctx.strokeStyle = '#e76f51';
  rctx.lineWidth = 14;
  rctx.strokeRect(20, 20, 472, 472);

  rctx.strokeStyle = '#2a9d8f';
  rctx.lineWidth = 6;
  rctx.strokeRect(38, 38, 436, 436);

  // Geometric Coastal Chevron & Diamond Pattern
  rctx.strokeStyle = '#264653';
  rctx.lineWidth = 3.5;
  for (let offset = -512; offset < 512; offset += 64) {
    rctx.beginPath();
    rctx.moveTo(offset, 0);
    rctx.lineTo(offset + 512, 512);
    rctx.stroke();

    rctx.beginPath();
    rctx.moveTo(offset + 512, 0);
    rctx.lineTo(offset, 512);
    rctx.stroke();
  }

  // Sunset Gold Center Circular Accent
  rctx.fillStyle = 'rgba(231, 111, 81, 0.2)';
  rctx.beginPath();
  rctx.arc(256, 256, 110, 0, Math.PI * 2);
  rctx.fill();

  rctx.strokeStyle = '#e9c46a';
  rctx.lineWidth = 4;
  rctx.beginPath();
  rctx.arc(256, 256, 90, 0, Math.PI * 2);
  rctx.stroke();

  const rugTexture = new THREE.CanvasTexture(rugCanvas);
  const aestheticRugMat = mat(0xffffff, { map: rugTexture, roughness: 0.9 });

  // Rug under sofa lounge furniture
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5), aestheticRugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(cx - 2, 0.005, cz);
  scene.add(rug);

  // Plants in corners
  createPlant(cx - 8.5, 0, cz - 6.5, 1.4);
  createPlant(cx + 8.5, 0, cz + 6.5, 1.2);
  createPlant(cx + 8.5, 0, cz - 6.5, 1.0);

  // Wall-mounted Interactive TV (South wall)
  const outerZ = ROOM_D + HALL_W / 2;
  const tvX = cx - 2;
  const tvBezel = addMesh(scene, new THREE.BoxGeometry(4.2, 2.4, 0.12), M.monitor, tvX, 2.5, outerZ - 0.2);
  const tvScreenMesh = addMesh(scene, new THREE.PlaneGeometry(3.9, 2.2), tvMaterial, tvX, 2.5, outerZ - 0.13);
  tvBezel.userData = { interact: 'tv', label: '📺 Lounge TV & Synchronized Jukebox' };
  tvScreenMesh.userData = { interact: 'tv', label: '📺 Lounge TV & Synchronized Jukebox' };

  // ═══════════════════════════════════════════
  // TWO VERTICAL TOWER SPEAKERS (On Each Side of TV)
  // ═══════════════════════════════════════════
  for (const sideX of [-2.6, 2.6]) {
    const towerX = tvX + sideX;

    // Tall Vertical Speaker Cabinet Frame
    const towerBox = addMesh(scene, new THREE.BoxGeometry(0.5, 3.2, 0.4), M.dark, towerX, 1.8, outerZ - 0.25);
    const towerGrille = addMesh(scene, new THREE.BoxGeometry(0.44, 3.0, 0.05), M.metal, towerX, 1.8, outerZ - 0.04);
    towerBox.userData = { interact: 'tv', label: '🔊 Vertical Sound Tower & Synchronized Jukebox' };
    towerGrille.userData = { interact: 'tv', label: '🔊 Vertical Sound Tower & Synchronized Jukebox' };

    // 3 Stacked Woofer Drivers on each vertical tower
    for (const wy of [0.8, 1.8, 2.7]) {
      const driver = addMesh(scene, new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16), M.monitor, towerX, wy, outerZ - 0.01);
      driver.rotation.x = Math.PI / 2;
      driver.userData = { interact: 'tv', label: '🔊 Vertical Sound Tower & Synchronized Jukebox' };
    }

    // Heavy Metal Base Stand
    addMesh(scene, new THREE.BoxGeometry(0.7, 0.08, 0.5), M.chromeMetal, towerX, 0.16, outerZ - 0.25);

    // LED Trim Accent on top
    const ledCap = addMesh(scene, new THREE.BoxGeometry(0.46, 0.06, 0.36), M.ledStrip, towerX, 3.42, outerZ - 0.25);
    ledCap.userData = { interact: 'tv', label: '🔊 Vertical Sound Tower & Synchronized Jukebox' };
  }

  // ═══════════════════════════════════════════
  // INTERACTIVE MOOD FLOOR LAMP (Left Side of TV)
  // ═══════════════════════════════════════════
  const lampX = tvX - 6.5, lampZ = outerZ - 0.5;

  // Heavy Brass/Chrome Base Plate
  const lampBase = addMesh(scene, new THREE.CylinderGeometry(0.38, 0.42, 0.08, 16), M.chromeMetal, lampX, 0.04, lampZ);

  // Metallic Pole Stem
  const lampStem = addMesh(scene, new THREE.CylinderGeometry(0.035, 0.035, 2.3, 12), M.chromeMetal, lampX, 1.2, lampZ);

  // Warm Emissive Fabric Lampshade
  const shadeMat = mat(0xfffaea, { emissive: 0xffaa44, emissiveIntensity: 0.8, roughness: 0.4 });
  const lampShade = addMesh(scene, new THREE.CylinderGeometry(0.28, 0.48, 0.65, 16), shadeMat, lampX, 2.35, lampZ);

  // Inner Light Source for Relax Mode
  relaxLampLight = new THREE.PointLight(0xffaa44, 2.2, 12);
  relaxLampLight.position.set(lampX, 2.35, lampZ);
  scene.add(relaxLampLight);

  // Tag all parts for interactive click & tooltip
  lampBase.userData = { interact: 'lamp', label: '💡 Mood Floor Lamp — Click for Relax Mode' };
  lampStem.userData = { interact: 'lamp', label: '💡 Mood Floor Lamp — Click for Relax Mode' };
  lampShade.userData = { interact: 'lamp', label: '💡 Mood Floor Lamp — Click for Relax Mode' };

  // ═══════════════════════════════════════════
  // PLAYABLE BILLIARDS / POOL TABLE (Close to Coffee Machine, Rotated 90° Vertical)
  // ═══════════════════════════════════════════
  const poolX = cx + 4.3, poolZ = cz - 2.5;

  // Outer Mahogany Wooden Rail & Frame (Rotated 90° Vertical: Width 2.2 along X, Length 4.0 along Z)
  const poolFrame = addMesh(scene, new THREE.BoxGeometry(2.2, 0.45, 4.0), M.darkWood, poolX, 0.72, poolZ);
  poolFrame.userData = { interact: 'billiards', label: '🎱 Playable Billiards Table — Click to Play 8-Ball' };

  // Green Felt Playing Surface
  const feltMat = mat(0x0a6b32, { roughness: 0.8 });
  const feltMesh = addMesh(scene, new THREE.BoxGeometry(1.8, 0.06, 3.6), feltMat, poolX, 0.95, poolZ);
  feltMesh.userData = { interact: 'billiards', label: '🎱 Playable Billiards Table — Click to Play 8-Ball' };

  // 6 Pocket Holes (Vertical Z-Alignment)
  const pocketMat = mat(0x111111);
  const pocketPos = [
    [-0.85, -1.7], [0, -1.75], [0.85, -1.7],
    [-0.85, 1.7], [0, 1.75], [0.85, 1.7]
  ];
  pocketPos.forEach(([px, pz]) => {
    addMesh(scene, new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), pocketMat, poolX + px, 0.97, poolZ + pz);
  });

  // Table Legs
  for (const lx of [-0.85, 0.85]) {
    for (const lz of [-1.7, 1.7]) {
      addMesh(scene, new THREE.CylinderGeometry(0.12, 0.09, 0.7, 12), M.darkWood, poolX + lx, 0.35, poolZ + lz);
    }
  }

  // Billiard Balls Rack (White Cue ball + Colored balls along vertical Z-axis)
  const ballColors = [0xffffff, 0xffd700, 0x0000ff, 0xff0000, 0x4b0082, 0xff8c00, 0x008000, 0x800000, 0x111111];
  // Cue Ball
  addMesh(scene, new THREE.SphereGeometry(0.06, 12, 12), mat(0xffffff, { roughness: 0.1 }), poolX, 1.01, poolZ - 1.0);
  // Triangle Rack of Balls
  let ballIdx = 1;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c <= r; c++) {
      const bz = poolZ + 0.6 + r * 0.11;
      const bx = poolX + (c - r / 2) * 0.12;
      const bColor = ballColors[ballIdx % ballColors.length];
      addMesh(scene, new THREE.SphereGeometry(0.06, 12, 12), mat(bColor, { roughness: 0.2 }), bx, 1.01, bz);
      ballIdx++;
    }
  }

  // Wooden Cue Stick Leaning on Table Side (Along X-side)
  const cueStick = addMesh(scene, new THREE.CylinderGeometry(0.015, 0.03, 3.2, 8), M.wood, poolX + 1.05, 1.0, poolZ);
  cueStick.rotation.x = Math.PI / 2;

  // Overhead Brass Hanging Billiards Lamp with Dual Spotlights (Vertical alignment)
  addMesh(scene, new THREE.BoxGeometry(0.4, 0.15, 2.4), M.dark, poolX, 2.6, poolZ);
  const poolLight = new THREE.PointLight(0xffeaad, 2.0, 12);
  poolLight.position.set(poolX, 2.4, poolZ);
  scene.add(poolLight);

  // ═══════════════════════════════════════════
  // BARISTA COFFEE STATION (Flush along East Wall)
  // ═══════════════════════════════════════════
  const wallX = ROOM_W + HALL_W / 2; // East wall boundary (21.5)
  const barX = wallX - 0.65, barZ = cz - 2.5;

  // Counter cabinet base & Marble top (aligned along wall Z-axis)
  addMesh(scene, new THREE.BoxGeometry(1.2, 0.88, 3.6), M.darkWood, barX, 0.44, barZ);
  addMesh(scene, new THREE.BoxGeometry(1.3, 0.08, 3.8), M.white, barX, 0.92, barZ);

  // Commercial Espresso Machine (Facing West into Lounge)
  const espressoBody = addMesh(scene, new THREE.BoxGeometry(0.8, 0.75, 1.4), M.espressoBody, barX - 0.1, 1.34, barZ);
  espressoBody.userData = { interact: 'coffee', label: '☕ Barista Espresso Station' };

  // Chrome accents & Grouping
  const chromeFace = addMesh(scene, new THREE.BoxGeometry(0.82, 0.35, 1.3), M.chromeMetal, barX - 0.1, 1.38, barZ);
  chromeFace.userData = { interact: 'coffee', label: '☕ Barista Espresso Station' };

  // Coffee Bean Hopper
  const hopper = addMesh(scene, new THREE.CylinderGeometry(0.2, 0.15, 0.4, 12), M.coffeeBeans, barX - 0.1, 1.88, barZ - 0.4);
  hopper.userData = { interact: 'coffee', label: '☕ Barista Espresso Station' };

  // Twin Portafilters (spouts facing West)
  for (const spoutZ of [-0.25, 0.25]) {
    addMesh(scene, new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), M.chromeMetal, barX - 0.45, 1.06, barZ + spoutZ);
    // Ceramic Coffee Mugs under spouts
    addMesh(scene, new THREE.CylinderGeometry(0.08, 0.07, 0.14, 12), M.white, barX - 0.45, 0.98, barZ + spoutZ);
  }

  // Steam particle emitter initialization over coffee spout
  for (let i = 0; i < 12; i++) {
    const steamGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 8, 8);
    const steamMesh = new THREE.Mesh(steamGeo, M.steamMat.clone());
    steamMesh.position.set(barX - 0.45, 1.15 + Math.random() * 0.6, barZ + (Math.random() - 0.5) * 0.4);
    steamMesh.userData = { baseOpacity: 0.35, speedY: 0.008 + Math.random() * 0.006 };
    scene.add(steamMesh);
    steamParticles.push(steamMesh);
  }

  // ═══════════════════════════════════════════
  // AESTHETIC PAINTING (On East Wall beside Coffee Machine)
  // ═══════════════════════════════════════════
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 512;
  pCanvas.height = 384;
  const pCtx = pCanvas.getContext('2d');

  // Sunset aesthetic gradient
  const pGrad = pCtx.createLinearGradient(0, 0, 0, 384);
  pGrad.addColorStop(0, '#0d0b26');
  pGrad.addColorStop(0.4, '#3a1c5b');
  pGrad.addColorStop(0.7, '#f0883e');
  pGrad.addColorStop(1, '#ffc107');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 512, 384);

  // Aesthetic Sun / Moon
  pCtx.fillStyle = 'rgba(255, 240, 220, 0.9)';
  pCtx.beginPath();
  pCtx.arc(256, 170, 75, 0, Math.PI * 2);
  pCtx.fill();

  // Mountain Silhouettes
  pCtx.fillStyle = '#160a29';
  pCtx.beginPath();
  pCtx.moveTo(0, 384);
  pCtx.lineTo(140, 240);
  pCtx.lineTo(260, 320);
  pCtx.lineTo(400, 210);
  pCtx.lineTo(512, 384);
  pCtx.closePath();
  pCtx.fill();

  // Foreground Waves
  pCtx.fillStyle = '#0a0414';
  pCtx.beginPath();
  pCtx.moveTo(0, 384);
  pCtx.lineTo(190, 290);
  pCtx.lineTo(340, 340);
  pCtx.lineTo(512, 280);
  pCtx.lineTo(512, 384);
  pCtx.closePath();
  pCtx.fill();

  // Aesthetic Stars
  pCtx.fillStyle = '#ffffff';
  for (let s = 0; s < 30; s++) {
    const sx = (Math.sin(s * 99) * 0.5 + 0.5) * 512;
    const sy = (Math.cos(s * 33) * 0.5 + 0.5) * 160;
    pCtx.fillRect(sx, sy, 2, 2);
  }

  // Inspiring quote text
  pCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  pCtx.font = 'bold 22px "Space Grotesk", sans-serif';
  pCtx.textAlign = 'center';
  pCtx.fillText('CODE • BREW • INSPIRE', 256, 360);

  const pTexture = new THREE.CanvasTexture(pCanvas);
  const pMaterial = new THREE.MeshStandardMaterial({
    map: pTexture,
    roughness: 0.35
  });

  // Dark Wood Frame mounted on East wall above coffee station
  const frameX = wallX - 0.08, frameZ = barZ;
  addMesh(scene, new THREE.BoxGeometry(0.12, 2.4, 3.2), M.darkWood, frameX, 2.7, frameZ);
  const paintingMesh = addMesh(scene, new THREE.PlaneGeometry(3.0, 2.2), pMaterial, frameX - 0.07, 2.7, frameZ);
  paintingMesh.rotation.y = -Math.PI / 2;
  paintingMesh.userData = { interact: 'painting', label: '🖼️ Aesthetic Art — "Code • Brew • Inspire"' };

  // Picture Light Spotlight illuminating painting
  const artLight = new THREE.PointLight(0xffb86c, 1.8, 10);
  artLight.position.set(frameX - 0.6, 3.8, frameZ);
  scene.add(artLight);

  // ═══════════════════════════════════════════
  // SNACK & ENERGY VENDING MACHINE (Flush along East Wall)
  // ═══════════════════════════════════════════
  const vendX = wallX - 0.6, vendZ = cz + 3.5;

  // Main chassis (Back against East Wall, facing West)
  const vendMain = addMesh(scene, new THREE.BoxGeometry(1.1, 3.2, 1.6), M.vendingBody, vendX, 1.6, vendZ);
  vendMain.userData = { interact: 'vending', label: '🥤 Snack & Energy Vending Machine' };

  // Glass Front Window (West facing)
  const vendGlass = addMesh(scene, new THREE.BoxGeometry(0.05, 2.0, 1.3), M.vendingGlass, vendX - 0.54, 1.8, vendZ);
  vendGlass.userData = { interact: 'vending', label: '🥤 Snack & Energy Vending Machine' };

  // Glowing Neon Header Sign
  addMesh(scene, new THREE.BoxGeometry(0.08, 0.3, 1.4), M.vendingNeon, vendX - 0.54, 3.0, vendZ);

  // Internal Shelves & Colored Drink Cans
  const canMats = [M.canRed, M.canBlue, M.canGreen, M.canGold];
  for (let s = 0; s < 3; s++) {
    const shelfY = 1.1 + s * 0.6;
    addMesh(scene, new THREE.BoxGeometry(0.8, 0.04, 1.3), M.metal, vendX, shelfY, vendZ);
    for (let c = 0; c < 5; c++) {
      const canZ = vendZ - 0.48 + c * 0.24;
      const canMat = canMats[(s + c) % canMats.length];
      addMesh(scene, new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10), canMat, vendX - 0.1, shelfY + 0.12, canZ);
    }
  }

  // Coin slot / Keypad panel
  addMesh(scene, new THREE.BoxGeometry(0.05, 0.8, 0.3), M.dark, vendX - 0.54, 1.4, vendZ + 0.55);
  addMesh(scene, new THREE.BoxGeometry(0.06, 0.08, 0.12), M.vendingNeon, vendX - 0.54, 1.6, vendZ + 0.55);

  // Dispenser Tray Opening
  addMesh(scene, new THREE.BoxGeometry(0.2, 0.4, 1.1), M.dark, vendX - 0.48, 0.35, vendZ);

  // Warm Lounge point light
  const warmLight = new THREE.PointLight(0xffa040, 2.2, 28, 1.5);
  warmLight.position.set(cx, 3.8, cz);
  warmLight.castShadow = true;
  scene.add(warmLight);
}

function populateResearchLab() {
  const cx = -ZONE_CX, cz = -ZONE_CZ;

  // 4 desks with monitors in 2x2 grid
  const deskPositions = [
    { x: cx - 4, z: cz - 3, rot: 0 },
    { x: cx + 4, z: cz - 3, rot: 0 },
    { x: cx - 4, z: cz + 3, rot: Math.PI },
    { x: cx + 4, z: cz + 3, rot: Math.PI },
  ];
  deskPositions.forEach((d, idx) => {
    createDesk(d.x, 0, d.z, d.rot);
    createChair(d.x, 0, d.z + (d.rot === 0 ? 1.2 : -1.2), d.rot + Math.PI);

    let mode = 'none';
    if (idx === 1) mode = 'youtube';
    else if (idx === 2) mode = 'chatgpt';

    createMonitor(d.x, 0.83, d.z + (d.rot === 0 ? -0.25 : 0.25), Math.PI, 1.3, mode);
  });

  // Large whiteboard on north wall
  const northZ = -(ROOM_D + HALL_W / 2);
  createWhiteboard(cx, 0, northZ + 0.2, 0);

  // Bookshelves on west wall
  const westX = -(ROOM_W + HALL_W / 2);
  createShelf(westX + 1.5, 0, cz - 3, Math.PI / 2);
  createShelf(westX + 1.5, 0, cz + 3, Math.PI / 2);

  // Globe decoration on a desk
  addMesh(scene, new THREE.SphereGeometry(0.25, 16, 12),
    mat(0x3388cc, { metalness: 0.3 }), cx + 4.6, 1.15, cz - 3);

  // Plants
  createPlant(cx + 8.5, 0, cz + 6.5, 1.3);

  // Cool blue-white lighting
  const coolLight = new THREE.PointLight(0xc0d8ff, 1.5, 28, 1.5);
  coolLight.position.set(cx, 3.8, cz);
  coolLight.castShadow = true;
  scene.add(coolLight);
}

function populateDevelopmentRoom() {
  const cx = ZONE_CX, cz = -ZONE_CZ;

  // 6 workstations: 2 rows of 3
  for (let col = -1; col <= 1; col++) {
    // Front row
    createDesk(cx + col * 3.2, 0, cz - 2.5, 0);
    createChair(cx + col * 3.2, 0, cz - 1.3, Math.PI, M.chairGreen);
    createMonitor(cx + col * 3.2, 0.83, cz - 2.75, 0);

    // Back row
    createDesk(cx + col * 3.2, 0, cz + 2.5, Math.PI);
    createChair(cx + col * 3.2, 0, cz + 1.3, 0, M.chairGreen);
    createMonitor(cx + col * 3.2, 0.83, cz + 2.75, Math.PI);
  }

  // Task board on the north wall (colored cards)
  const northZ = -(ROOM_D + HALL_W / 2);
  addMesh(scene, new THREE.BoxGeometry(5, 3, 0.08), M.dark, cx, 2.5, northZ + 0.2);
  // Task cards
  addMesh(scene, new THREE.BoxGeometry(1.2, 0.8, 0.02), M.taskCard1, cx - 1.5, 3.0, northZ + 0.26);
  addMesh(scene, new THREE.BoxGeometry(1.2, 0.8, 0.02), M.taskCard2, cx, 3.0, northZ + 0.26);
  addMesh(scene, new THREE.BoxGeometry(1.2, 0.8, 0.02), M.taskCard3, cx + 1.5, 3.0, northZ + 0.26);
  addMesh(scene, new THREE.BoxGeometry(1.2, 0.8, 0.02), M.taskCard1, cx - 1.5, 2.0, northZ + 0.26);
  addMesh(scene, new THREE.BoxGeometry(1.2, 0.8, 0.02), M.taskCard3, cx + 1.5, 2.0, northZ + 0.26);

  // LED strips along ceiling edges (emissive thin boxes)
  const outerX = ROOM_W + HALL_W / 2;
  addMesh(scene, new THREE.BoxGeometry(ROOM_W, 0.08, 0.08), M.ledStrip, cx, WALL_H - 0.1, northZ + 0.3);
  addMesh(scene, new THREE.BoxGeometry(ROOM_W, 0.08, 0.08), M.ledStrip, cx, WALL_H - 0.1, -HALL_W / 2 - 0.3);
  addMesh(scene, new THREE.BoxGeometry(0.08, 0.08, ROOM_D), M.ledStrip, outerX - 0.3, WALL_H - 0.1, cz);
  addMesh(scene, new THREE.BoxGeometry(0.08, 0.08, ROOM_D), M.ledStrip, HALL_W / 2 + 0.3, WALL_H - 0.1, cz);

  // Standing desk in corner
  const standingDesk = addMesh(scene, new THREE.BoxGeometry(1.4, 0.08, 0.7), M.desk, cx + 8, 1.1, cz - 6);
  addMesh(scene, new THREE.BoxGeometry(0.06, 1.1, 0.06), M.metal, cx + 7.4, 0.55, cz - 5.7);
  addMesh(scene, new THREE.BoxGeometry(0.06, 1.1, 0.06), M.metal, cx + 8.6, 0.55, cz - 5.7);
  addMesh(scene, new THREE.BoxGeometry(0.06, 1.1, 0.06), M.metal, cx + 7.4, 0.55, cz - 6.3);
  addMesh(scene, new THREE.BoxGeometry(0.06, 1.1, 0.06), M.metal, cx + 8.6, 0.55, cz - 6.3);

  // Plant
  createPlant(cx - 8.5, 0, cz + 6, 1.1);

  // Green-tinted lighting
  const greenLight = new THREE.PointLight(0x80ffa0, 1.0, 28, 1.5);
  greenLight.position.set(cx, 3.8, cz);
  greenLight.castShadow = true;
  scene.add(greenLight);
}

function populatePresentationStage() {
  const cx = -ZONE_CX, cz = ZONE_CZ;
  const outerZ = ROOM_D + HALL_W / 2;

  // Elevated stage platform
  const stageMesh = addMesh(scene, new THREE.BoxGeometry(ROOM_W - 2, 0.35, 6),
    M.stage, cx, 0.175, cz + 4);

  // Podium on stage (right side)
  createPodium(cx + 5, 0.35, cz + 4);

  // Large projection screen on south wall
  addMesh(scene, new THREE.BoxGeometry(10, 0.2, 0.15), M.boardFrame, cx, 4.2, outerZ - 0.15);  // Frame top
  addMesh(scene, new THREE.BoxGeometry(10, 5.5, 0.1), M.dark, cx, 2.75, outerZ - 0.15);        // Screen backing
  addMesh(scene, new THREE.PlaneGeometry(9.5, 5.2), M.screen, cx, 2.75, outerZ - 0.19);         // Glowing screen

  // 3 rows × 4 columns of audience chairs
  for (let row = 0; row < 3; row++) {
    for (let col = -1.5; col <= 1.5; col++) {
      createChair(cx + col * 2.8, 0, cz - 2 - row * 2, 0, M.chairLight);
    }
  }

  // Plants flanking the stage
  createPlant(cx - 8.5, 0, cz + 6.5, 1.5);
  createPlant(cx + 8.5, 0, cz + 6.5, 1.5);

  // Dramatic spotlight on stage
  const spotlight = new THREE.SpotLight(0xffffff, 3.0);
  spotlight.position.set(cx, WALL_H - 0.5, cz - 2);
  spotlight.target.position.set(cx, 0.5, cz + 5);
  spotlight.angle = Math.PI / 5;
  spotlight.penumbra = 0.6;
  spotlight.decay = 1.5;
  spotlight.castShadow = true;
  spotlight.shadow.mapSize.set(1024, 1024);
  scene.add(spotlight);
  scene.add(spotlight.target);

  // Ambient fill for the room
  const fillLight = new THREE.PointLight(0xcceeff, 0.6, 25);
  fillLight.position.set(cx, 3, cz - 4);
  scene.add(fillLight);
}

function populateHallway() {
  // Directional signs (glowing colored blocks pointing to each zone)
  const signGeo = new THREE.BoxGeometry(2, 0.6, 0.15);

  // Sign pointing to Lounge (bottom-right)
  addMesh(scene, signGeo, M.signLounge, 3, 2.5, 1.5).rotation.y = -Math.PI / 4;
  // Sign pointing to Research (top-left)
  addMesh(scene, signGeo, M.signResearch, -3, 2.5, -1.5).rotation.y = Math.PI * 3 / 4;
  // Sign pointing to Dev (top-right)
  addMesh(scene, signGeo, M.signDev, 3, 2.5, -1.5).rotation.y = -Math.PI * 3 / 4;
  // Sign pointing to Presentation (bottom-left)
  addMesh(scene, signGeo, M.signPres, -3, 2.5, 1.5).rotation.y = Math.PI / 4;

  // A central marker pillar
  addMesh(scene, new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8),
    mat(0x58a6ff, { emissive: 0x1a3a66, emissiveIntensity: 0.5 }), 0, 0.25, 0);

  // Plants at hallway intersections
  createPlant(HALL_W / 2 - 0.5, 0, HALL_W / 2 - 0.5, 0.8);
  createPlant(-HALL_W / 2 + 0.5, 0, -HALL_W / 2 + 0.5, 0.8);
  createPlant(HALL_W / 2 - 0.5, 0, -HALL_W / 2 + 0.5, 0.8);
  createPlant(-HALL_W / 2 + 0.5, 0, HALL_W / 2 - 0.5, 0.8);
}


// ═══════════════════════════════════════════
// LIGHTING
// ═══════════════════════════════════════════

function setupLighting() {
  // Hemisphere (sky + ground ambient fill)
  const hemi = new THREE.HemisphereLight(0xeef5ff, 0x3a4d36, 1.5);
  scene.add(hemi);

  // Directional sun (casts shadows)
  const sun = new THREE.DirectionalLight(0xfff4d0, 2.2);
  sun.position.set(-15, 28, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  // Subtle ambient fill
  const ambient = new THREE.AmbientLight(0x404060, 0.4);
  scene.add(ambient);
}


// ═══════════════════════════════════════════
// ZONE DETECTION
// ═══════════════════════════════════════════

function getCurrentZone(position) {
  const { x, z } = position;
  const hw = HALL_W / 2;

  // If inside any of the 4 quadrant rooms
  if (x > hw && z > hw) return 'lounge';
  if (x < -hw && z < -hw) return 'research';
  if (x > hw && z < -hw) return 'development';
  if (x < -hw && z > hw) return 'presentation';

  // Otherwise, in the central hallway
  return 'hallway';
}


// ═══════════════════════════════════════════
// ZONE TELEPORTATION & HUD
// ═══════════════════════════════════════════

let lastZone = 'lounge';

function teleportToZone(zoneName) {
  const cam = ZONE_CAMERAS[zoneName];
  if (!cam) return;

  // Smooth camera transition
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos = cam.pos.clone();
  const endTarget = cam.target.clone();

  let progress = 0;
  const duration = 1200; // ms
  const startTime = performance.now();

  function animateTransition() {
    progress = Math.min(1, (performance.now() - startTime) / duration);
    // Ease out cubic
    const t = 1 - Math.pow(1 - progress, 3);

    camera.position.lerpVectors(startPos, endPos, t);
    controls.target.lerpVectors(startTarget, endTarget, t);
    controls.update();

    if (progress < 1) {
      requestAnimationFrame(animateTransition);
    }
  }
  animateTransition();

  // Update HUD immediately
  updateZoneHUD(zoneName);
}

function updateZoneHUD(zone) {
  if (zone === lastZone) return;
  lastZone = zone;

  // Update zone indicator
  const nameEl = document.querySelector('#current-zone');
  const iconEl = document.querySelector('#zone-icon');
  if (nameEl) nameEl.textContent = ZONE_NAMES[zone];
  if (iconEl) iconEl.textContent = ZONE_ICONS[zone];

  // Update minimap active state
  document.querySelectorAll('.minimap-zone').forEach(el => el.classList.remove('active'));
  const activeMap = document.querySelector(`#minimap-${zone}`);
  if (activeMap) activeMap.classList.add('active');

  // Update zone nav buttons
  document.querySelectorAll('.zone-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.zone === zone);
  });

  // Update Lounge Audio Isolation Badge Status
  const audioStatusEl = document.querySelector('#lounge-audio-status');
  const audioTextEl = document.querySelector('#audio-status-text');
  if (audioStatusEl && audioTextEl) {
    const isLounge = zone === 'lounge';
    audioStatusEl.classList.toggle('muted', !isLounge);
    audioTextEl.textContent = isLounge ? '🔊 Lounge Audio Active' : '🔇 Audio Muted (Outside Lounge)';
  }

  // TV Audio Privacy Control (Mute when outside Lounge)
  if (typeof ytPlayer !== 'undefined' && ytPlayer && typeof ytPlayer.mute === 'function') {
    if (zone === 'lounge') {
      ytPlayer.unMute();
    } else {
      ytPlayer.mute();
    }
  }
}

// Expose teleportToZone globally for HTML onclick handlers
window.teleportToZone = teleportToZone;


// ═══════════════════════════════════════════
// LOUNGE SPATIAL AUDIO & SOUND SYNTHESIS
// ═══════════════════════════════════════════

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// CRITICAL REQUIREMENT: Sound created in the lounge area is ONLY allowed for people present in that section!
function isLoungeAudioAllowed() {
  return lastZone === 'lounge';
}

function playCoffeeBrewSound() {
  if (!isLoungeAudioAllowed()) return; // Sound restricted to Lounge area!

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.Q.setValueAtTime(3.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start(now);

    const steamNoise = ctx.createBufferSource();
    steamNoise.buffer = buffer;
    const steamFilter = ctx.createBiquadFilter();
    steamFilter.type = 'highpass';
    steamFilter.frequency.setValueAtTime(1200, now);

    const steamGain = ctx.createGain();
    steamGain.gain.setValueAtTime(0.01, now + 0.5);
    steamGain.gain.linearRampToValueAtTime(0.12, now + 1.2);
    steamGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    steamNoise.connect(steamFilter);
    steamFilter.connect(steamGain);
    steamGain.connect(ctx.destination);

    steamNoise.start(now + 0.5);
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

function playVendingSound() {
  if (!isLoungeAudioAllowed()) return; // Sound restricted to Lounge area!

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);

    setTimeout(() => {
      if (!isLoungeAudioAllowed()) return;
      const coinOsc = ctx.createOscillator();
      coinOsc.type = 'sine';
      coinOsc.frequency.setValueAtTime(1800, ctx.currentTime);
      coinOsc.frequency.setValueAtTime(2400, ctx.currentTime + 0.05);

      const coinGain = ctx.createGain();
      coinGain.gain.setValueAtTime(0.2, ctx.currentTime);
      coinGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      coinOsc.connect(coinGain);
      coinGain.connect(ctx.destination);
      coinOsc.start(ctx.currentTime);
      coinOsc.stop(ctx.currentTime + 0.2);
    }, 200);
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

function playDrinkBoostSound() {
  if (!isLoungeAudioAllowed()) return; // Sound restricted to Lounge area!

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  } catch (e) {
    console.warn('Web Audio error:', e);
  }
}

function triggerSteamBurst() {
  steamParticles.forEach(p => {
    p.position.y = 1.1 + Math.random() * 0.2;
    p.material.opacity = 0.6;
    p.userData.speedY = 0.015 + Math.random() * 0.01;
  });
}


// ═══════════════════════════════════════════
// LOUNGE INTERACTIVE MODAL & MENU
// ═══════════════════════════════════════════

const LOUNGE_STATIONS = {
  coffee: {
    badge: '☕ ESPRESSO & BARISTA STATION',
    title: 'Lounge Barista Menu',
    desc: 'Brew artisan coffee and matcha for maximum coding alertness. Isolated lounge audio.',
    items: [
      { id: 'espresso', icon: '☕', name: 'Double Espresso', desc: '+80% Caffeine Focus', time: 2000, boost: '+80% Focus Alertness' },
      { id: 'latte', icon: '🧊☕', name: 'Iced Lofi Latte', desc: '+65% Chill Productivity', time: 2500, boost: '+65% Smooth Productivity' },
      { id: 'matcha', icon: '🍵', name: 'Matcha Brain Focus', desc: '+90% Deep Concentration', time: 2200, boost: '+90% Clean Brain Energy' },
      { id: 'cyber', icon: '✨☕', name: 'Cyber Cappuccino', desc: '+100% Hackathon Stamina', time: 2800, boost: '+100% Code Stamina' },
    ]
  },
  vending: {
    badge: '🥤 SNACK & ENERGY VENDING',
    title: 'Lounge Snack Machine',
    desc: 'Grab quick energy drinks and syntax snacks to fuel your brain during study sprints.',
    items: [
      { id: 'energy', icon: '⚡', name: 'Code Crunch Energy', desc: '+100% Sprint Speed', time: 1800, boost: '+100% Bug Fixing Energy' },
      { id: 'soda', icon: '🥤', name: 'Debugger Sparkle', desc: '+75% Bug Spotting', time: 1600, boost: '+75% Debugging Speed' },
      { id: 'protein', icon: '🍫', name: 'Syntax Protein Bar', desc: '+50% Endurance', time: 1400, boost: '+50% Endurance Fuel' },
      { id: 'donut', icon: '🍩', name: 'Binary Glazed Donut', desc: '+40% Sweet Happiness', time: 1200, boost: '+40% Happiness' },
    ]
  }
};

let currentStationType = 'coffee';

function openLoungeModal(stationType) {
  if (stationType === 'tv') {
    openLoungeTVModal();
    return;
  }
  if (stationType === 'painting') {
    showLoungeToast('🖼️', 'Code • Brew • Inspire', 'Surround yourself with creativity, cozy vibes & focus.');
    return;
  }
  if (stationType === 'billiards') {
    openLoungeBilliardsModal();
    return;
  }
  if (stationType === 'lamp') {
    isRelaxMode = !isRelaxMode;
    showLoungeToast(
      isRelaxMode ? '🌙' : '💡',
      isRelaxMode ? 'Relax Mode Activated' : 'Normal Lighting Restored',
      isRelaxMode ? 'Ambient lights slowly dimming into a cozy warm twilight atmosphere...' : 'Full lounge ambient lighting restored.'
    );
    return;
  }

  currentStationType = stationType;
  const config = LOUNGE_STATIONS[stationType] || LOUNGE_STATIONS.coffee;

  const badgeEl = document.querySelector('#lounge-station-badge');
  const titleEl = document.querySelector('#lounge-station-title');
  const descEl = document.querySelector('#lounge-station-desc');
  if (badgeEl) badgeEl.textContent = config.badge;
  if (titleEl) titleEl.textContent = config.title;
  if (descEl) descEl.textContent = config.desc;

  const grid = document.querySelector('#lounge-menu-grid');
  if (grid) {
    grid.innerHTML = config.items.map(item => `
      <div class="lounge-item-card" onclick="prepareLoungeItem('${item.id}')">
        <div class="lounge-item-icon">${item.icon}</div>
        <div class="lounge-item-name">${item.name}</div>
        <div class="lounge-item-desc">${item.desc}</div>
        <button class="lounge-item-btn">${stationType === 'coffee' ? 'Brew Item' : 'Dispense'}</button>
      </div>
    `).join('');
  }

  const brewPanel = document.querySelector('#lounge-brewing-panel');
  const modalEl = document.querySelector('#lounge-modal');
  if (brewPanel) brewPanel.hidden = true;
  if (modalEl) modalEl.hidden = false;
}

function closeLoungeModal() {
  const modalEl = document.querySelector('#lounge-modal');
  if (modalEl) modalEl.hidden = true;
}

document.querySelector('#lounge-modal-close')?.addEventListener('click', closeLoungeModal);
document.querySelector('#lounge-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'lounge-modal') closeLoungeModal();
});

// ═══════════════════════════════════════════
// LOUNGE TV & SYNCHRONIZED JUKEBOX PLAYER
// ═══════════════════════════════════════════

let ytPlayer = null;
let isTvPlaying = false;
let currentTvTrack = {
  ytId: 'jfKfPfyJRdk',
  title: 'Lofi Study Beats 24/7',
  desc: 'Relaxing Beats to Study & Code To'
};

function initYouTubePlayer() {
  if (window.YT && window.YT.Player) {
    createYTPlayer();
  } else {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = createYTPlayer;
  }
}

function createYTPlayer() {
  if (ytPlayer) return;
  ytPlayer = new YT.Player('tv-youtube-player', {
    height: '100%',
    width: '100%',
    videoId: currentTvTrack.ytId,
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0
    },
    events: {
      onReady: (event) => {
        if (!isLoungeAudioAllowed()) {
          event.target.mute();
        }
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.PLAYING) {
          updateTvUIState(true);
        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
          updateTvUIState(false);
        }
      }
    }
  });
}

function updateTvUIState(playing) {
  isTvPlaying = playing;
  const eq = document.querySelector('#tv-equalizer');
  const toggleBtn = document.querySelector('#tv-toggle-play');
  if (eq) eq.classList.toggle('paused', !playing);
  if (toggleBtn) toggleBtn.textContent = playing ? '⏸️ Pause' : '▶️ Play';
}

function playTvTrack(track, broadcast = true) {
  currentTvTrack = track;
  const titleEl = document.querySelector('#tv-current-title');
  const channelEl = document.querySelector('#tv-current-channel');
  if (titleEl) titleEl.textContent = track.title;
  if (channelEl) channelEl.textContent = track.desc;

  document.querySelectorAll('.tv-station-card').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.yt === track.ytId);
  });

  const iframeBox = document.querySelector('#tv-player-container');
  if (iframeBox) iframeBox.classList.add('active');

  if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
    ytPlayer.loadVideoById(track.ytId);
    if (!isLoungeAudioAllowed()) {
      ytPlayer.mute();
    } else {
      ytPlayer.unMute();
    }
  } else {
    initYouTubePlayer();
  }

  updateTvUIState(true);

  if (broadcast && window.socket && roomId) {
    window.socket.emit('loungePlayMusic', {
      roomId,
      track,
      isPlaying: true,
      timestamp: Date.now()
    });
  }
}

function stopTvTrack(broadcast = true) {
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    ytPlayer.pauseVideo();
  }
  updateTvUIState(false);

  if (broadcast && window.socket && roomId) {
    window.socket.emit('loungeStopMusic', { roomId });
  }
}

function openLoungeTVModal() {
  document.querySelector('#lounge-tv-modal').hidden = false;
  if (!ytPlayer) {
    initYouTubePlayer();
  }
}

function closeLoungeTVModal() {
  document.querySelector('#lounge-tv-modal').hidden = true;
}

// Preset Station Buttons
document.querySelectorAll('.tv-station-card').forEach(card => {
  card.addEventListener('click', () => {
    const track = {
      ytId: card.dataset.yt,
      title: card.dataset.title,
      desc: card.dataset.desc
    };
    playTvTrack(track, true);
  });
});

// Custom YouTube Link Button
document.querySelector('#tv-yt-btn')?.addEventListener('click', () => {
  const input = document.querySelector('#tv-yt-input');
  const url = input?.value.trim();
  if (!url) return;

  const ytIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytIdMatch && ytIdMatch[1]) {
    const track = {
      ytId: ytIdMatch[1],
      title: 'Custom YouTube Stream',
      desc: url
    };
    playTvTrack(track, true);
    input.value = '';
  } else {
    alert('Please enter a valid YouTube video/music URL');
  }
});

// Play / Pause Toggle
document.querySelector('#tv-toggle-play')?.addEventListener('click', () => {
  if (isTvPlaying) {
    stopTvTrack(true);
  } else {
    playTvTrack(currentTvTrack, true);
  }
});

// Volume Slider
document.querySelector('#tv-volume-slider')?.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
    ytPlayer.setVolume(val);
  }
});

// TV Modal Close Handlers
document.querySelector('#lounge-tv-modal-close')?.addEventListener('click', closeLoungeTVModal);
document.querySelector('#lounge-tv-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'lounge-tv-modal') closeLoungeTVModal();
});


// ═══════════════════════════════════════════
// PLAYABLE BILLIARDS 8-BALL MINI-GAME ENGINE
// ═══════════════════════════════════════════

function playCueStrikeSound() {
  if (!isLoungeAudioAllowed()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) { }
}

function playBallClackSound() {
  if (!isLoungeAudioAllowed()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) { }
}

function playPocketDropSound() {
  if (!isLoungeAudioAllowed()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) { }
}

let bCanvas, bCtx;
let bBalls = [];
let bCueBall = null;
let bIsCharging = false;
let bChargePower = 0;
let bAimAngle = 0;
let bMousePos = { x: 0, y: 0 };
let bPocketedCount = 0;
let bAnimationId = null;

const B_RADIUS = 10;
const B_POCKETS = [
  { x: 22, y: 22 }, { x: 280, y: 16 }, { x: 538, y: 22 },
  { x: 22, y: 278 }, { x: 280, y: 284 }, { x: 538, y: 278 }
];

function initBilliardsGame() {
  bCanvas = document.querySelector('#billiards-canvas');
  if (!bCanvas) return;
  bCtx = bCanvas.getContext('2d');

  resetBilliardsGame();

  bCanvas.onmousemove = (e) => {
    const rect = bCanvas.getBoundingClientRect();
    bMousePos.x = e.clientX - rect.left;
    bMousePos.y = e.clientY - rect.top;
    if (bCueBall) {
      bAimAngle = Math.atan2(bMousePos.y - bCueBall.y, bMousePos.x - bCueBall.x);
    }
  };

  bCanvas.onmousedown = () => {
    if (!bCueBall || isBilliardsMoving()) return;
    bIsCharging = true;
    bChargePower = 0;
  };

  bCanvas.onmouseup = () => {
    if (bIsCharging && bCueBall) {
      bIsCharging = false;
      const speed = Math.max(3, (bChargePower / 100) * 18);
      bCueBall.vx = Math.cos(bAimAngle) * speed;
      bCueBall.vy = Math.sin(bAimAngle) * speed;
      playCueStrikeSound();
      bChargePower = 0;
    }
  };

  document.querySelector('#billiards-reset-btn')?.addEventListener('click', resetBilliardsGame);
}

function resetBilliardsGame() {
  bPocketedCount = 0;
  updatePoolScoreText();
  bBalls = [];

  // Cue Ball
  bCueBall = { x: 140, y: 150, vx: 0, vy: 0, color: '#ffffff', isCue: true };
  bBalls.push(bCueBall);

  // Triangle Rack of Target Balls
  const colors = ['#ffd700', '#0000ff', '#ff0000', '#4b0082', '#ff8c00', '#008000', '#111111'];
  let idx = 0;
  const startX = 380;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c <= r; c++) {
      bBalls.push({
        x: startX + r * 19,
        y: 150 + (c - r / 2) * 21,
        vx: 0,
        vy: 0,
        color: colors[idx % colors.length],
        isCue: false
      });
      idx++;
    }
  }

  if (bAnimationId) cancelAnimationFrame(bAnimationId);
  runBilliardsLoop();
}

function isBilliardsMoving() {
  return bBalls.some(b => Math.hypot(b.vx, b.vy) > 0.1);
}

function updatePoolScoreText() {
  const el = document.querySelector('#pool-score-text');
  if (el) el.textContent = `Balls Pocketed: ${bPocketedCount} / 7`;
}

function runBilliardsLoop() {
  bAnimationId = requestAnimationFrame(runBilliardsLoop);
  if (!bCtx) return;

  if (bIsCharging) {
    bChargePower = Math.min(100, bChargePower + 2.5);
  }

  // Update Ball Physics
  bBalls.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
    b.vx *= 0.985;
    b.vy *= 0.985;
    if (Math.hypot(b.vx, b.vy) < 0.05) {
      b.vx = 0;
      b.vy = 0;
    }

    // Cushion Bounces
    if (b.x < 24 + B_RADIUS) { b.x = 24 + B_RADIUS; b.vx *= -0.85; }
    if (b.x > 536 - B_RADIUS) { b.x = 536 - B_RADIUS; b.vx *= -0.85; }
    if (b.y < 24 + B_RADIUS) { b.y = 24 + B_RADIUS; b.vy *= -0.85; }
    if (b.y > 276 - B_RADIUS) { b.y = 276 - B_RADIUS; b.vy *= -0.85; }
  });

  // Ball Collisions
  for (let i = 0; i < bBalls.length; i++) {
    for (let j = i + 1; j < bBalls.length; j++) {
      const b1 = bBalls[i], b2 = bBalls[j];
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const dist = Math.hypot(dx, dy);
      if (dist < B_RADIUS * 2) {
        // Elastic collision response
        const angle = Math.atan2(dy, dx);
        const sin = Math.sin(angle), cos = Math.cos(angle);

        let vx1 = b1.vx * cos + b1.vy * sin;
        let vy1 = b1.vy * cos - b1.vx * sin;
        let vx2 = b2.vx * cos + b2.vy * sin;
        let vy2 = b2.vy * cos - b2.vx * sin;

        const finalVx1 = vx2;
        const finalVx2 = vx1;

        b1.vx = finalVx1 * cos - vy1 * sin;
        b1.vy = vy1 * cos + finalVx1 * sin;
        b2.vx = finalVx2 * cos - vy2 * sin;
        b2.vy = vy2 * cos + finalVx2 * sin;

        // Separate overlapping balls
        const overlap = (B_RADIUS * 2 - dist) / 2;
        b1.x -= Math.cos(angle) * overlap;
        b1.y -= Math.sin(angle) * overlap;
        b2.x += Math.cos(angle) * overlap;
        b2.y += Math.sin(angle) * overlap;

        playBallClackSound();
      }
    }
  }

  // Pocket Sinks Check
  bBalls = bBalls.filter(b => {
    const inPocket = B_POCKETS.some(p => Math.hypot(b.x - p.x, b.y - p.y) < 22);
    if (inPocket) {
      playPocketDropSound();
      if (b.isCue) {
        // Scratch: reset cue ball
        setTimeout(() => {
          bCueBall = { x: 140, y: 150, vx: 0, vy: 0, color: '#ffffff', isCue: true };
          bBalls.push(bCueBall);
        }, 300);
        return false;
      } else {
        bPocketedCount++;
        updatePoolScoreText();
        if (bPocketedCount >= 7) {
          showLoungeToast('🏆', '8-Ball Champion!', 'You pocketed all billiard balls!');
        }
        return false;
      }
    }
    return true;
  });

  // Render Table Felt
  bCtx.fillStyle = '#0f5e31';
  bCtx.fillRect(0, 0, 560, 300);

  // Cushions Border
  bCtx.strokeStyle = '#4a2e15';
  bCtx.lineWidth = 24;
  bCtx.strokeRect(12, 12, 536, 276);

  // Draw Pockets
  B_POCKETS.forEach(p => {
    bCtx.fillStyle = '#111';
    bCtx.beginPath();
    bCtx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    bCtx.fill();
  });

  // Draw Aiming Guide Line & Power Meter
  if (bCueBall && !isBilliardsMoving()) {
    bCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    bCtx.lineWidth = 1.5;
    bCtx.setLineDash([4, 4]);
    bCtx.beginPath();
    bCtx.moveTo(bCueBall.x, bCueBall.y);
    bCtx.lineTo(bCueBall.x + Math.cos(bAimAngle) * 120, bCueBall.y + Math.sin(bAimAngle) * 120);
    bCtx.stroke();
    bCtx.setLineDash([]);

    if (bIsCharging) {
      // Draw Cue Stick Pullback
      const offset = 15 + (bChargePower / 100) * 35;
      const cueX1 = bCueBall.x - Math.cos(bAimAngle) * offset;
      const cueY1 = bCueBall.y - Math.sin(bAimAngle) * offset;
      const cueX2 = cueX1 - Math.cos(bAimAngle) * 160;
      const cueY2 = cueY1 - Math.sin(bAimAngle) * 160;

      bCtx.strokeStyle = '#c8965a';
      bCtx.lineWidth = 5;
      bCtx.beginPath();
      bCtx.moveTo(cueX1, cueY1);
      bCtx.lineTo(cueX2, cueY2);
      bCtx.stroke();

      // Power Gauge Bar
      bCtx.fillStyle = `hsl(${120 - bChargePower * 1.2}, 100%, 50%)`;
      bCtx.fillRect(bCueBall.x - 25, bCueBall.y - 30, (bChargePower / 100) * 50, 6);
    }
  }

  // Draw Balls
  bBalls.forEach(b => {
    bCtx.fillStyle = b.color;
    bCtx.beginPath();
    bCtx.arc(b.x, b.y, B_RADIUS, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.strokeStyle = 'rgba(0,0,0,0.3)';
    bCtx.lineWidth = 1;
    bCtx.stroke();
  });
}

function openLoungeBilliardsModal() {
  document.querySelector('#lounge-billiards-modal').hidden = false;
  initBilliardsGame();
}

function closeLoungeBilliardsModal() {
  document.querySelector('#lounge-billiards-modal').hidden = true;
  if (bAnimationId) cancelAnimationFrame(bAnimationId);
}

document.querySelector('#lounge-billiards-close')?.addEventListener('click', closeLoungeBilliardsModal);
document.querySelector('#lounge-billiards-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'lounge-billiards-modal') closeLoungeBilliardsModal();
});

window.prepareLoungeItem = function (itemId) {
  const station = LOUNGE_STATIONS[currentStationType];
  const item = station.items.find(i => i.id === itemId);
  if (!item) return;

  const panel = document.querySelector('#lounge-brewing-panel');
  const fill = document.querySelector('#brewing-progress-fill');
  const statusText = document.querySelector('#brewing-status-text');
  const icon = document.querySelector('#brewing-icon');

  if (panel) panel.hidden = false;
  if (fill) fill.style.width = '0%';
  if (icon) icon.textContent = item.icon;
  if (statusText) statusText.textContent = currentStationType === 'coffee' ? `Brewing ${item.name}…` : `Dispensing ${item.name}…`;

  // Trigger Sound & Steam Burst if in Lounge
  if (currentStationType === 'coffee') {
    playCoffeeBrewSound();
    triggerSteamBurst();
  } else {
    playVendingSound();
  }

  const startTime = performance.now();
  const duration = item.time;

  function updateProgress() {
    const elapsed = performance.now() - startTime;
    const pct = Math.min(100, (elapsed / duration) * 100);
    if (fill) fill.style.width = `${pct}%`;

    if (pct < 100) {
      requestAnimationFrame(updateProgress);
    } else {
      if (statusText) statusText.textContent = 'Done! Enjoy your boost!';
      playDrinkBoostSound();
      showLoungeToast(item.icon, item.name, item.boost);
      setTimeout(() => {
        closeLoungeModal();
      }, 600);
    }
  }
  requestAnimationFrame(updateProgress);
};

function showLoungeToast(icon, title, desc) {
  const container = document.querySelector('#lounge-toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'lounge-toast';
  toast.innerHTML = `
    <div class="lounge-toast-icon">${icon}</div>
    <div class="lounge-toast-content">
      <strong>${title} Consumed!</strong>
      <small>${desc}</small>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}


// ═══════════════════════════════════════════
// BUILD & ANIMATE
// ═══════════════════════════════════════════

setupLighting();
buildFloors();
buildWalls();
populateLounge();
populateResearchLab();
populateDevelopmentRoom();
populatePresentationStage();
populateHallway();

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // Auto-detect zone from camera target
  const zone = getCurrentZone(controls.target);
  updateZoneHUD(zone);

  // Update dynamic 3D TV Screen beat visualizer canvas
  update3DTVCanvas();

  // Animate lounge steam particles
  steamParticles.forEach(p => {
    p.position.y += p.userData.speedY;
    p.material.opacity -= 0.006;
    if (p.material.opacity <= 0) {
      p.position.y = 1.15 + Math.random() * 0.1;
      p.material.opacity = p.userData.baseOpacity;
    }
  });

  // Smooth Relax Mode Lighting Dimming Transition (Deep Pitch-Dark Night Atmosphere)
  const targetAmb = isRelaxMode ? 0.01 : 0.65;
  const targetDir = isRelaxMode ? 0.00 : 0.85;
  const targetLamp = isRelaxMode ? 6.5 : 1.8;

  if (typeof ambientLight !== 'undefined' && ambientLight) {
    ambientLight.intensity += (targetAmb - ambientLight.intensity) * 0.04;
  }
  if (typeof dirLight !== 'undefined' && dirLight) {
    dirLight.intensity += (targetDir - dirLight.intensity) * 0.04;
  }
  if (typeof relaxLampLight !== 'undefined' && relaxLampLight) {
    relaxLampLight.intensity += (targetLamp - relaxLampLight.intensity) * 0.04;
    relaxLampLight.color.setHex(isRelaxMode ? 0xff7722 : 0xffaa44);
  }

  renderer.render(scene, camera);
}
animate();

// Resize handler
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', onResize);

// 3D Interactive Raycaster & Hover Tooltips
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const tooltipEl = document.createElement('div');
tooltipEl.style.cssText = 'position:fixed; z-index:150; padding:6px 12px; background:rgba(13,17,23,0.9); border:1px solid rgba(240,136,62,0.5); border-radius:10px; color:#fff; font-size:12px; font-weight:600; pointer-events:none; display:none; backdrop-filter:blur(10px); box-shadow:0 4px 15px rgba(0,0,0,0.4);';
document.body.appendChild(tooltipEl);

canvas.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  let hovered = false;
  for (let i = 0; i < intersects.length; i++) {
    const interact = intersects[i].object.userData.interact;
    const label = intersects[i].object.userData.label;
    if (interact) {
      canvas.style.cursor = 'pointer';
      tooltipEl.style.display = 'block';
      tooltipEl.style.left = `${event.clientX + 14}px`;
      tooltipEl.style.top = `${event.clientY + 14}px`;
      tooltipEl.textContent = label || 'Click to interact';
      hovered = true;
      break;
    }
  }
  if (!hovered) {
    canvas.style.cursor = 'default';
    tooltipEl.style.display = 'none';
  }
});

canvas.addEventListener('click', (event) => {
  pointer.x = (event.clientX / innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  for (let i = 0; i < intersects.length; i++) {
    const interact = intersects[i].object.userData.interact;
    const url = intersects[i].object.userData.clickableUrl;

    if (interact) {
      openLoungeModal(interact);
      break;
    } else if (url) {
      window.open(url, '_blank');
      break;
    }
  }
});

// Reset camera button
document.querySelector('#reset-camera').onclick = () => teleportToZone(lastZone);

// Minimap click-to-teleport
document.querySelectorAll('.minimap-zone').forEach(el => {
  el.addEventListener('click', () => {
    const zone = el.dataset.zone;
    if (zone) teleportToZone(zone);
  });
});


// ═══════════════════════════════════════════
// API INTEGRATION
// ═══════════════════════════════════════════

async function initAPI() {
  try {
    const token = localStorage.getItem('sm_token');
    if (!token || !roomId) return;

    const res = await fetch(`/api/rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Could not load room');
    const room = await res.json();

    document.querySelector('#room-name').textContent = room.name;
    document.querySelector('#room-meta').textContent = `${room.category} · ${room.members.length} members`;
    document.querySelector('#chat-link').href = `room-chat.html?roomId=${roomId}`;
  } catch (e) {
    const error = document.querySelector('#error');
    error.textContent = e.message;
    error.hidden = false;
  } finally {
    // Remove loading screen
    const loading = document.querySelector('#loading');
    if (loading) loading.remove();
  }
}

function initSocketListeners() {
  if (typeof io !== 'undefined') {
    if (!window.socket) {
      window.socket = io();
    }
    const params = new URLSearchParams(window.location.search);
    const rId = params.get('roomId') || 'lounge-main';
    window.socket.emit('roomJoin', { roomId: rId, position: { x: 0, y: 0, z: 0 } });

    window.socket.on('loungeSyncMusic', ({ track }) => {
      if (track) {
        playTvTrack(track, false);
        showLoungeToast('🎵', 'Room Music Synced', `Now playing: ${track.title}`);
      }
    });

    window.socket.on('loungeSyncStop', () => {
      stopTvTrack(false);
      showLoungeToast('⏸️', 'Music Paused', 'A member paused the Lounge TV.');
    });
  }
}

initAPI();
initSocketListeners();
