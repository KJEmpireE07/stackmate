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

const ROOM_W  = 20;   // Width of each zone room
const ROOM_D  = 16;   // Depth of each zone room
const HALL_W  = 8;     // Hallway width
const WALL_H  = 4.5;   // Wall height
const WALL_T  = 0.3;   // Wall thickness
const DOOR_W  = 4;     // Doorway width

// Zone centers (each room offset from origin by half-hall + half-room)
const ZONE_CX = ROOM_W / 2 + HALL_W / 2;  // 14
const ZONE_CZ = ROOM_D / 2 + HALL_W / 2;  // 12

const ZONE_CENTERS = {
  lounge:       new THREE.Vector3( ZONE_CX, 0,  ZONE_CZ),
  research:     new THREE.Vector3(-ZONE_CX, 0, -ZONE_CZ),
  development:  new THREE.Vector3( ZONE_CX, 0, -ZONE_CZ),
  presentation: new THREE.Vector3(-ZONE_CX, 0,  ZONE_CZ),
  hallway:      new THREE.Vector3(0, 0, 0),
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
  lounge:       { pos: new THREE.Vector3(ZONE_CX + 14, 16, ZONE_CZ + 14), target: new THREE.Vector3(ZONE_CX, 0, ZONE_CZ) },
  research:     { pos: new THREE.Vector3(-ZONE_CX - 14, 16, -ZONE_CZ - 14), target: new THREE.Vector3(-ZONE_CX, 0, -ZONE_CZ) },
  development:  { pos: new THREE.Vector3(ZONE_CX + 14, 16, -ZONE_CZ - 14), target: new THREE.Vector3(ZONE_CX, 0, -ZONE_CZ) },
  presentation: { pos: new THREE.Vector3(-ZONE_CX - 14, 16, ZONE_CZ + 14), target: new THREE.Vector3(-ZONE_CX, 0, ZONE_CZ) },
  hallway:      { pos: new THREE.Vector3(0, 30, 25), target: new THREE.Vector3(0, 0, 0) },
};


// ═══════════════════════════════════════════
// MATERIALS (Reusable across the scene)
// ═══════════════════════════════════════════

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({
  color, roughness: opts.roughness ?? 0.7, metalness: opts.metalness ?? 0.05, ...opts,
});

const M = {
  // Lounge
  loungeFloor:  mat(0x8B6914, { roughness: 0.85 }),
  loungeWall:   mat(0xF5F0E1),
  sofa:         mat(0x1e6b3a, { roughness: 0.85 }),
  sofaOrange:   mat(0xd45c1a, { roughness: 0.85 }),
  rug:          mat(0x8b2252, { roughness: 0.95 }),
  coffeeTable:  mat(0x4a2e15, { roughness: 0.6 }),

  // Research
  researchFloor: mat(0xD0D0D0, { roughness: 0.4 }),
  researchWall:  mat(0xF0F0F0),
  
  // Development
  devFloor:  mat(0x303030, { roughness: 0.5 }),
  devWall:   mat(0x2a2a2a),
  ledStrip:  mat(0x00ff88, { emissive: 0x00ff44, emissiveIntensity: 0.6 }),
  
  // Presentation
  presFloor: mat(0xe8d5b5, { roughness: 0.8 }),
  presWall:  mat(0xe0e6ed),
  stage:     mat(0xd4b585, { roughness: 0.6 }),
  screen:    mat(0x111122, { emissive: 0x111133, emissiveIntensity: 0.3 }),

  // Hallway
  hallFloor: mat(0xE8E0D0, { roughness: 0.3, metalness: 0.1 }),

  // Furniture
  wood:     mat(0x8b5a2b, { roughness: 0.6 }),
  darkWood: mat(0x4a3c31),
  desk:     mat(0xd4c9a8, { roughness: 0.5 }),
  metal:    mat(0x444444, { metalness: 0.8, roughness: 0.2 }),
  dark:     mat(0x222222),
  chair:    mat(0x333333),
  chairGreen: mat(0x1a4a2a),
  chairLight: mat(0xa0b0c0),
  pot:      mat(0x8b4513, { roughness: 0.9 }),
  leaf:     mat(0x228b22, { roughness: 0.4 }),
  white:    mat(0xffffff, { roughness: 0.1 }),
  boardFrame: mat(0x888888, { metalness: 0.5 }),
  monitor:  mat(0x111111),
  monitorScreen: mat(0x88ccff, { emissive: 0x113355, emissiveIntensity: 0.4 }),
  taskCard1: mat(0x3b82f6, { emissive: 0x1a4090, emissiveIntensity: 0.2 }),
  taskCard2: mat(0xf59e0b, { emissive: 0x7a4f06, emissiveIntensity: 0.2 }),
  taskCard3: mat(0x10b981, { emissive: 0x086049, emissiveIntensity: 0.2 }),
  signLounge:  mat(0xffa040, { emissive: 0x804020, emissiveIntensity: 0.3 }),
  signResearch: mat(0x58a6ff, { emissive: 0x2c5380, emissiveIntensity: 0.3 }),
  signDev:      mat(0x3fb950, { emissive: 0x205d28, emissiveIntensity: 0.3 }),
  signPres:     mat(0xbc8cff, { emissive: 0x5e4680, emissiveIntensity: 0.3 }),
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
  createFloor(M.loungeFloor,  ROOM_W, ROOM_D,  ZONE_CX,  ZONE_CZ);
  createFloor(M.researchFloor, ROOM_W, ROOM_D, -ZONE_CX, -ZONE_CZ);
  createFloor(M.devFloor,     ROOM_W, ROOM_D,  ZONE_CX, -ZONE_CZ);
  createFloor(M.presFloor,    ROOM_W, ROOM_D, -ZONE_CX,  ZONE_CZ);

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

function populateLounge() {
  const cx = ZONE_CX, cz = ZONE_CZ;

  // Two sofas facing each other
  createSofa(cx, 0, cz - 2.5, 0, M.sofa);
  createSofa(cx, 0, cz + 2.5, Math.PI, M.sofaOrange);

  // Coffee table between sofas
  const table = addMesh(scene, new THREE.BoxGeometry(2.2, 0.12, 1.0), M.coffeeTable, cx, 0.38, cz);
  // Table legs
  for (const lx of [-0.9, 0.9]) {
    for (const lz of [-0.35, 0.35]) {
      addMesh(scene, new THREE.BoxGeometry(0.06, 0.36, 0.06), M.metal, cx + lx, 0.18, cz + lz);
    }
  }

  // Rug under furniture
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), M.rug);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(cx, 0.005, cz);
  scene.add(rug);

  // Plants in corners
  createPlant(cx - 8.5, 0, cz - 6.5, 1.4);
  createPlant(cx + 8.5, 0, cz + 6.5, 1.2);
  createPlant(cx + 8.5, 0, cz - 6.5, 1.0);

  // Wall-mounted TV (dark rectangle on south wall)
  const outerZ = ROOM_D + HALL_W / 2;
  addMesh(scene, new THREE.BoxGeometry(4, 2.2, 0.12), M.monitor, cx, 2.5, outerZ - 0.2);
  addMesh(scene, new THREE.PlaneGeometry(3.7, 2.0), M.monitorScreen, cx, 2.5, outerZ - 0.13);

  // Extra single chair
  createChair(cx + 5, 0, cz, -Math.PI / 2, M.sofaOrange);

  // Warm point light
  const warmLight = new THREE.PointLight(0xffa040, 2.0, 28, 1.5);
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
  addMesh(scene, new THREE.BoxGeometry(1.2, 0.8, 0.02), M.taskCard2, cx,     3.0, northZ + 0.26);
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
  if (x > hw && z > hw)   return 'lounge';
  if (x < -hw && z < -hw) return 'research';
  if (x > hw && z < -hw)  return 'development';
  if (x < -hw && z > hw)  return 'presentation';

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
}

// Expose teleportToZone globally for HTML onclick handlers
window.teleportToZone = teleportToZone;


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

// 3D Object Click handler (Raycaster)
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

canvas.addEventListener('click', (event) => {
  pointer.x = (event.clientX / innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  for (let i = 0; i < intersects.length; i++) {
    const url = intersects[i].object.userData.clickableUrl;
    if (url) {
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

initAPI();
