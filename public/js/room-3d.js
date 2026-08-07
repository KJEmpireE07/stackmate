import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ── DOM & Params ──────────────────────────────── */
const canvas  = document.querySelector('#scene');
const roomId  = new URLSearchParams(location.search).get('roomId');
const loading = document.querySelector('#loading');
const error   = document.querySelector('#error');
if (!roomId) location.replace('dashboard.html');

/* ── Scene ─────────────────────────────────────── */
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1e2a24');
scene.fog = new THREE.Fog('#1e2a24', 32, 70);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 120);
const HOME = new THREE.Vector3(26, 28, 30);
camera.position.copy(HOME);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, canvas);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 14, maxDistance: 50, maxPolarAngle: Math.PI / 2.08 });
controls.target.set(0, 0, 0);
controls.update();

/* ── Materials ─────────────────────────────────── */
const mt = (c, r = 0.72) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.04 });
const M = {
  floor: mt('#b9db85'), floorB: mt('#a8cc76'), wall: mt('#c6b85a'), iwall: mt('#c8b7af'),
  wood: mt('#754c1d'), deskTop: mt('#d4c9a8'), dark: mt('#2a2a2a'), metal: mt('#888', 0.4),
  chair: mt('#41454b'), green: mt('#18955d'), teal: mt('#1a6b5a'), pot: mt('#276445'), leaf: mt('#1c6d3a'),
  deck: mt('#a96d36'), white: mt('#e5e6e1'), orange: mt('#df6420'), yellow: mt('#d6a323'),
  pink: mt('#bd2e66'), red: mt('#c0392b'), blue: mt('#2980b9'), screen: mt('#1a1a2e', 0.3),
  grass: mt('#6db33f'), signBg: mt('#1a3a2a'), signTxt: mt('#fff'),
  fl1: mt('#e74c3c'), fl2: mt('#f39c12'), fl3: mt('#9b59b6'),
  glass: new THREE.MeshPhysicalMaterial({ color: '#88ccaa', roughness: 0.1, transparent: true, opacity: 0.35 }),
};

/* ── Helpers ────────────────────────────────────── */
function bx(g,x,y,z,w,h,d,m){ const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o; }
function cy(g,x,y,z,r,h,m,s=10){ const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,s),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o; }
function sp(g,x,y,z,r,m){ const o=new THREE.Mesh(new THREE.SphereGeometry(r,6,6),m);o.position.set(x,y,z);g.add(o);return o; }
function grp(x=0,z=0,ry=0){ const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);return g; }
function sbox(x,y,z,w,h,d,m){ const g=new THREE.Group();scene.add(g);bx(g,x,y,z,w,h,d,m);return g; }

/* ═══════════════════════════════════════════════════
   BUILDER FUNCTIONS
   ═══════════════════════════════════════════════════ */

function officeChair(x,z,ry=0,col=M.chair){
  const g=grp(x,z,ry);
  bx(g,0,.52,0,.55,.1,.5,col); bx(g,0,.9,.22,.55,.6,.08,col);
  cy(g,0,.28,0,.06,.45,M.dark);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;bx(g,Math.cos(a)*.3,.05,Math.sin(a)*.3,.48,.04,.05,M.dark).rotation.y=-a; cy(g,Math.cos(a)*.32,.03,Math.sin(a)*.32,.03,.04,M.dark);}
  return g;
}

function simpleChair(x,z,ry=0,col=M.chair){
  const g=grp(x,z,ry);
  bx(g,0,.45,0,.42,.06,.42,col); bx(g,0,.78,.18,.42,.56,.05,col);
  for(const lx of[-.17,.17])for(const lz of[-.17,.17])bx(g,lx,.21,lz,.04,.42,.04,M.dark);
  return g;
}

function workDesk(x,z,ry=0){
  const g=grp(x,z,ry);
  bx(g,0,.75,0,1.8,.08,.85,M.deskTop);
  for(const lx of[-.8,.8])for(const lz of[-.35,.35])bx(g,lx,.37,lz,.06,.7,.06,M.wood);
  bx(g,0,.62,.15,.55,.03,.25,M.dark);
  return g;
}

function execDesk(x,z,ry=0){
  const g=grp(x,z,ry);
  bx(g,0,.78,0,2.2,.1,1,M.wood); bx(g,-.7,.38,-.2,.6,.7,.5,M.wood); bx(g,.7,.38,-.2,.6,.7,.5,M.wood); bx(g,0,.38,-.47,2.2,.7,.06,M.wood);
  return g;
}

function monitorObj(x,y,z,ry=0){
  const g=grp(x,0,z); g.position.y=y; g.rotation.y=ry;
  bx(g,0,.35,0,.74,.49,.02,M.dark); bx(g,0,.35,0.01,.7,.45,.015,M.screen);
  bx(g,0,.08,.04,.06,.16,.06,M.metal); bx(g,0,.01,.06,.3,.02,.18,M.metal);
  return g;
}

function laptopObj(x,y,z,ry=0){
  const g=grp(x,0,z); g.position.y=y; g.rotation.y=ry;
  bx(g,0,.015,0,.4,.025,.28,M.dark);
  const s=bx(g,0,.2,-.14,.38,.26,.015,M.screen); s.rotation.x=-.3;
  return g;
}

function filingCab(x,z,ry=0){
  const g=grp(x,z,ry);
  bx(g,0,.55,0,.5,1.05,.45,M.metal);
  for(let i=0;i<3;i++) bx(g,0,.25+i*.32,.24,.15,.02,.02,M.dark);
  return g;
}

function officeCab(x,z,ry=0){
  const g=grp(x,z,ry);
  bx(g,0,.7,0,.7,1.35,.45,M.white); bx(g,0,.7,.24,.01,1.2,.01,M.dark); bx(g,.05,.7,.24,.08,.02,.02,M.metal);
  return g;
}

function storageCab(x,z,ry=0){
  const g=grp(x,z,ry);
  bx(g,0,.5,0,.6,.95,.4,M.white); bx(g,-.08,.5,.22,.04,.12,.02,M.metal); bx(g,.08,.5,.22,.04,.12,.02,M.metal);
  return g;
}

function shelf(x,z,ry=0){
  const g=grp(x,z,ry);
  bx(g,0,1.1,0,.65,2.15,.3,M.wood);
  for(let y=.25;y<2.1;y+=.45) bx(g,0,y,.02,.6,.04,.26,M.wood);
  const bc=[M.red,M.blue,M.green,M.orange,M.yellow,M.dark];
  for(let y=.4;y<1.9;y+=.45){let px=-.22;for(let b=0;b<4;b++){const w=.07+Math.random()*.05,h=.22+Math.random()*.12;bx(g,px+w/2,y+h/2,.03,w,h,.18,bc[(y*10+b)%6|0]);px+=w+.02;}}
  return g;
}

function confTable(x,z,ry=0){
  const g=grp(x,z,ry);
  const t=bx(g,0,.76,0,3,.06,1.2,M.glass); t.castShadow=false;
  bx(g,0,.73,0,2.8,.03,1,M.metal);
  for(const lx of[-1.2,1.2])for(const lz of[-.4,.4]) cy(g,lx,.37,lz,.04,.72,M.metal);
  return g;
}

function roundTbl(x,z){
  const g=grp(x,z);
  cy(g,0,.74,0,.65,.06,M.wood,16); cy(g,0,.37,0,.08,.7,M.metal); cy(g,0,.03,0,.35,.06,M.metal,16);
  return g;
}

function execMtgTbl(x,z,ry=0){
  const g=grp(x,z,ry);
  bx(g,0,.76,0,2.8,.08,1.1,M.wood);
  for(const lx of[-1.1,1.1])for(const lz of[-.4,.4]) bx(g,lx,.37,lz,.12,.7,.12,M.wood);
  return g;
}

function diningTbl(x,z,ry=0){
  const g=grp(x,z,ry);
  bx(g,0,.76,0,1.6,.08,.9,M.wood);
  for(const lx of[-.65,.65])for(const lz of[-.35,.35]) bx(g,lx,.37,lz,.06,.7,.06,M.wood);
  return g;
}

function coffeeTbl(x,z){
  const g=grp(x,z);
  bx(g,0,.42,0,1,.06,.6,M.wood);
  for(const lx of[-.4,.4])for(const lz of[-.22,.22]) bx(g,lx,.2,lz,.05,.38,.05,M.dark);
  return g;
}

function sofaObj(x,z,ry=0){
  const g=grp(x,z,ry);
  bx(g,0,.42,0,2.4,.45,.75,M.green); bx(g,0,.85,.28,2.4,.55,.16,M.green);
  bx(g,-1.1,.6,0,.16,.65,.75,M.green); bx(g,1.1,.6,0,.16,.65,.75,M.green);
  return g;
}

function loungeChairObj(x,z,ry=0,col=M.orange){
  const g=grp(x,z,ry);
  bx(g,0,.38,0,.65,.38,.6,col); bx(g,0,.72,.22,.65,.5,.12,col);
  for(const lx of[-.25,.25])for(const lz of[-.2,.2]) bx(g,lx,.1,lz,.05,.2,.05,M.wood);
  return g;
}

function presBoard(x,z,ry=0){
  const g=grp(x,z,ry);
  bx(g,0,1.5,0,2.2,1.4,.06,M.white); bx(g,0,1.5,-.035,2.28,1.48,.01,M.dark);
  bx(g,-.9,.65,0,.05,1.25,.05,M.dark); bx(g,.9,.65,0,.05,1.25,.05,M.dark);
  bx(g,0,.08,0,1.5,.05,.4,M.dark);
  return g;
}

function plantObj(x,z,s=1){
  const g=grp(x,z);
  cy(g,0,.18*s,0,.22*s,.35*s,M.pot,8);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const l=bx(g,Math.cos(a)*.15*s,.6*s,Math.sin(a)*.15*s,.12*s,.55*s,.06*s,M.leaf);l.rotation.z=Math.cos(a)*.5;l.rotation.x=Math.sin(a)*.4;}
  return g;
}

function tallPlantObj(x,z){
  const g=grp(x,z);
  cy(g,0,.25,0,.28,.48,M.pot,8); cy(g,0,.8,0,.06,.8,M.wood,6);
  for(let i=0;i<10;i++){const a=i*Math.PI*2/10,r=.15+Math.random()*.1;const l=bx(g,Math.cos(a)*r,1.2+Math.random()*.3,Math.sin(a)*r,.15,.6,.08,M.leaf);l.rotation.z=Math.cos(a)*.6;l.rotation.x=Math.sin(a)*.5;}
  return g;
}

function smallPlantObj(x,y,z){
  const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
  cy(g,0,.04,0,.05,.07,M.pot,6);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;bx(g,Math.cos(a)*.03,.12,Math.sin(a)*.03,.04,.12,.02,M.leaf);}
  return g;
}

function flowerArr(x,y,z){
  const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
  cy(g,0,.06,0,.06,.12,M.white,8);
  const fc=[M.fl1,M.fl2,M.fl3,M.yellow];
  for(let i=0;i<6;i++){const a=i*Math.PI/3;sp(g,Math.cos(a)*.04,.15+Math.random()*.05,Math.sin(a)*.04,.025,fc[i%4]);}
  for(let i=0;i<4;i++){const a=i*Math.PI/2;bx(g,Math.cos(a)*.02,.1,Math.sin(a)*.02,.01,.12,.01,M.leaf);}
  return g;
}

function grassPatch(x,z,w,d){
  const g=grp(x,z);
  bx(g,0,.02,0,w,.04,d,M.grass);
  for(let i=0;i<8;i++) bx(g,(Math.random()-.5)*w*.8,.1,(Math.random()-.5)*d*.8,.04,.14,.04,M.leaf);
  return g;
}

function scooterObj(x,z,ry=0){
  const g=grp(x,z,ry);
  bx(g,0,.75,0,.06,1.4,.06,M.pink); bx(g,0,1.42,0,.5,.04,.06,M.pink);
  bx(g,.18,.1,0,.6,.06,.15,M.dark);
  cy(g,-.02,.1,0,.1,.06,M.dark); cy(g,.45,.1,0,.1,.06,M.dark);
  return g;
}

function deskLampObj(x,y,z){
  const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
  cy(g,0,.02,0,.07,.03,M.dark,8); bx(g,.04,.2,0,.025,.35,.025,M.metal);
  const u=bx(g,.12,.38,0,.025,.2,.025,M.metal);u.rotation.z=-.5;
  cy(g,.18,.42,0,.08,.06,M.yellow,8);
  return g;
}

function waterCoolerObj(x,z){
  const g=grp(x,z);
  bx(g,0,.5,0,.35,.95,.32,M.white); cy(g,0,1.15,0,.1,.35,M.blue);
  bx(g,0,.45,.18,.12,.08,.04,M.metal); bx(g,0,.22,.18,.18,.02,.1,M.metal);
  return g;
}

function trashBinObj(x,z){
  const g=grp(x,z);
  cy(g,0,.2,0,.14,.38,M.dark,8); cy(g,0,.4,0,.15,.02,M.metal,8);
  return g;
}

function wineGlassObj(x,y,z){
  const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
  cy(g,0,.005,0,.025,.008,M.glass,8); cy(g,0,.04,0,.006,.06,M.glass,6); cy(g,0,.08,0,.022,.04,M.glass,8);
  return g;
}

function signObj(x,y,z,w,h,ry=0){
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;scene.add(g);
  bx(g,0,0,0,w,h,.06,M.signBg); bx(g,0,0,.035,w*.85,h*.7,.01,M.signTxt);
  return g;
}

function paperTrayObj(x,y,z){
  const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
  bx(g,0,.01,0,.3,.015,.22,M.metal); bx(g,0,.03,0,.28,.02,.2,M.white); bx(g,0,.06,.1,.3,.08,.01,M.metal);
  return g;
}

/* ═══════════════════════════════════════════════════
   BUILD — 170+ objects placed by zone
   ═══════════════════════════════════════════════════ */
function build() {
  /* ── Floor: 25 tiles (5×5) ─── */
  const tw=6, td=4.8;
  for(let r=0;r<5;r++) for(let c=0;c<5;c++){
    const p=new THREE.Mesh(new THREE.PlaneGeometry(tw,td),(r+c)%2?M.floorB:M.floor);
    p.rotation.x=-Math.PI/2; p.position.set(-15+tw*c+tw/2,.001,-12+td*r+td/2);
    p.receiveShadow=true; scene.add(p);
  }

  /* ── Outer Walls (4) ─── */
  const wh=3.8, wt=.3;
  sbox(0,wh/2,-12,30.6,wh,wt,M.wall);  // back
  sbox(0,wh/2,12,30.6,wh,wt,M.wall);   // front
  sbox(-15,wh/2,0,wt,wh,24,M.wall);    // left
  sbox(15,wh/2,0,wt,wh,24,M.wall);     // right

  /* ── Interior Walls (6) ─── */
  const ih=2.4, it=.14;
  sbox(-5,ih/2,0,it,ih,6,M.iwall);
  sbox(-.5,ih/2,-3,9,ih,it,M.iwall);
  sbox(3,ih/2,0,it,ih,4,M.iwall);
  sbox(-.5,ih/2,3,9,ih,it,M.iwall);
  sbox(-10,ih/2,-3,10,ih,it,M.iwall);
  sbox(-5,ih/2,-7,it,ih,8,M.iwall);

  /* ── Wooden Deck (#7) ─── */
  sbox(9,.06,9.5,5.5,.12,4,M.deck);

  /* ═══ ZONE A — Executive (top-left) ═══ */
  execDesk(-11,-9);                         // #25
  officeChair(-11,-7.5,Math.PI);            // #14
  paperTrayObj(-10.2,.84,-9);               // #37
  smallPlantObj(-11.8,.84,-9.2);            // #59
  deskLampObj(-10,.84,-8.6);                // #65
  filingCab(-13.5,-9);                      // #42
  trashBinObj(-13.2,-7);                    // #67
  workDesk(-11,-5);                         // #26 mgr desk
  officeChair(-11,-3.5,Math.PI);            // #15
  monitorObj(-11,.78,-5.4);                 // #33
  shelf(-14,-5,Math.PI/2);                  // #48
  plantObj(-13.8,-3.5);                     // #52
  officeCab(-7.5,-10,Math.PI/2);            // #45
  plantObj(-14,-11);                        // #49d

  /* ═══ ZONE B — Workstation Bay (top-right) ═══ */
  for(let i=0;i<4;i++){const dx=5+i*2.4;
    workDesk(dx,-10);                       // #21a-d
    officeChair(dx,-8.5,Math.PI);           // #8a-d
    monitorObj(dx,.78,-10.4);               // #31a-d
  }
  deskLampObj(5.7,.78,-9.6);               // #63
  smallPlantObj(11.8,.78,-9.6);            // #58a
  for(let i=0;i<4;i++){const dx=5+i*2.4;
    workDesk(dx,-5.5);                      // #22a-d
    officeChair(dx,-4,Math.PI);             // #9a-d
    monitorObj(dx,.78,-5.9);                // #32a-d
  }
  deskLampObj(5.7,.78,-5.2);               // #64
  smallPlantObj(11.8,.78,-5.2);            // #58b
  filingCab(4,-9);                          // #38a
  filingCab(4,-5);                          // #38b
  filingCab(14,-3.5,-Math.PI/2);           // #39
  filingCab(14,-5,-Math.PI/2);             // #40
  plantObj(3.8,-3);                         // #50
  shelf(14,-8,-Math.PI/2);                 // #46a
  shelf(14,-6.2,-Math.PI/2);              // #46b
  shelf(14,-10,-Math.PI/2);               // #47a
  shelf(14,-11,-Math.PI/2);               // #47b
  plantObj(14,2);                           // #49c

  /* ═══ ZONE C — Lounge (bottom-left) ═══ */
  sofaObj(-11,5,Math.PI/2);                // #18
  coffeeTbl(-8.8,5);                        // #29
  loungeChairObj(-7.5,3.8,-Math.PI/6,M.orange); // #16
  loungeChairObj(-7.5,6.2,Math.PI/6,M.yellow);  // #17
  diningTbl(-8.5,8.5);                     // #28
  simpleChair(-10,8.5,Math.PI/2,M.red);   // #19
  simpleChair(-7,8.5,-Math.PI/2,M.blue);  // #20
  flowerArr(-8.5,.78,8.5);                 // #60
  wineGlassObj(-7.8,.78,8.2);             // #69a
  wineGlassObj(-9.2,.78,8.8);             // #69b
  filingCab(-14,7);                         // #41
  plantObj(-13.8,9);                        // #51
  trashBinObj(-13.5,10.5);                 // #68
  plantObj(-14,11);                         // #49a

  /* ═══ ZONE D — Lecture Hall (bottom-right) ═══ */
  presBoard(13,9,-Math.PI/2);             // #36
  tallPlantObj(6.5,11);                     // #54a
  tallPlantObj(12.5,11);                    // #54b
  plantObj(13,7);                           // #53
  for(let r=0;r<4;r++) for(let c=0;c<4;c++)
    simpleChair(5+c*1.8,3.5+r*1.5,0);     // #11 (16 audience chairs)
  plantObj(14,11);                          // #49b
  plantObj(14,2.5);                         // extra

  /* ═══ ZONE E — Conference (top-center) ═══ */
  confTable(-1,-8);                         // #23
  simpleChair(-2.5,-9.5,0,M.teal);        // #10a
  simpleChair(-1,-9.5,0,M.teal);          // #10b
  simpleChair(.5,-9.5,0,M.teal);          // #10c
  simpleChair(-2.5,-6.5,Math.PI,M.teal);  // #10d
  simpleChair(-1,-6.5,Math.PI,M.teal);    // #10e
  simpleChair(.5,-6.5,Math.PI,M.teal);    // #10f
  smallPlantObj(-1,.78,-8);                // #56
  laptopObj(.2,.78,-7.6);                  // #35
  tallPlantObj(-1,-11);                     // #55

  /* ═══ ZONE F — Exec Meeting (left-center) ═══ */
  execMtgTbl(-10,0);                        // #27
  officeChair(-12.5,0,Math.PI/2);          // #13a
  officeChair(-7.5,0,-Math.PI/2);          // #13b
  officeChair(-10,-1.5,0);                 // #13c
  officeChair(-10,1.5,Math.PI);            // #13d
  laptopObj(-10,.78,.3);                    // #34
  smallPlantObj(-10.5,.78,-.3);            // #57
  roundTbl(-7,2);                           // #24
  simpleChair(-8.2,2,Math.PI/2);           // #12a
  simpleChair(-5.8,2,-Math.PI/2);         // #12b
  simpleChair(-7,.8,0);                    // #12c
  simpleChair(-7,3.2,Math.PI);            // #12d

  /* ═══ ZONE G — Center Corridor ═══ */
  scooterObj(-1,1,Math.PI/4);              // #74
  waterCoolerObj(-3,-2);                    // #66
  officeCab(-3,0);                          // #43
  officeCab(-2,0);                          // #44
  storageCab(0,-1);                         // #30
  signObj(0,2.6,-11.85,2.5,.7);           // #70 StackMate Signboard
  signObj(-5.5,2.2,-11.85,1.5,.5);        // #71 StackMate Logo
  signObj(0,1.8,11.85,2,.5,Math.PI);      // #72 Welcome Sign

  /* ═══ Grass & Corner Plants ═══ */
  grassPatch(-14.5,11.5,2,2);             // #61a
  grassPatch(-14.5,-11.5,2,2);            // #61b
  grassPatch(-14.5,0,1.5,3);              // #62a
  grassPatch(14.5,0,1.5,3);               // #62b
  grassPatch(-7,-12.5,3,1.5);             // #62c
  grassPatch(7,-12.5,3,1.5);              // #62d
  plantObj(-14,-11);                        // #49e (if not dup)
  plantObj(14,-11);                         // #49e right
}

build();

/* ── Lighting ──────────────────────────────────── */
scene.add(new THREE.HemisphereLight('#edf7d4','#3a4d36',2.2));
const sun = new THREE.DirectionalLight('#fff4d0',3);
sun.position.set(-10,18,10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
scene.add(sun);

/* ── Animation Loop ────────────────────────────── */
let resetAnim = false;
function animate() {
  requestAnimationFrame(animate);
  if (resetAnim) {
    camera.position.lerp(HOME, 0.06);
    controls.target.lerp(new THREE.Vector3(0,0,0), 0.06);
    if (camera.position.distanceTo(HOME) < 0.1) resetAnim = false;
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();

/* ── Resize & Reset ────────────────────────────── */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

document.querySelector('#reset-camera').onclick = () => { resetAnim = true; };

/* ── API — Load Room Data ──────────────────────── */
async function api(url) {
  const token = localStorage.getItem('sm_token');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Could not load room');
  return data;
}

try {
  const room = await api(`/api/rooms/${roomId}`);
  document.querySelector('#room-name').textContent = room.name;
  document.querySelector('#room-meta').textContent = `${room.category} · ${room.members.length} members`;
  document.querySelector('#chat-link').href = `room-chat.html?roomId=${roomId}`;
} catch (e) {
  error.textContent = e.message;
  error.hidden = false;
} finally {
  loading.remove();
}
