import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const roomId = new URLSearchParams(location.search).get('roomId');
const loading = document.querySelector('#loading');
const error = document.querySelector('#error');
if (!roomId) location.replace('dashboard.html');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#25302c');
scene.fog = new THREE.Fog('#25302c', 25, 56);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 100);
const home = new THREE.Vector3(18, 21, 23); camera.position.copy(home);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
const controls = new OrbitControls(camera, canvas); controls.target.set(0, 0, 0); controls.enableDamping = true; controls.minDistance = 14; controls.maxDistance = 36; controls.maxPolarAngle = Math.PI / 2.08; controls.update();
const mat = (color, roughness=.72) => new THREE.MeshStandardMaterial({ color, roughness, metalness: .04 });
const M = { floor:mat('#b9db85'), wall:mat('#cfc47b'), partition:mat('#c8b7af'), wood:mat('#754c1d'), desk:mat('#d4c9a8'), dark:mat('#2a2a2a'), chair:mat('#41454b'), green:mat('#18955d'), pot:mat('#276445'), leaf:mat('#1c6d3a'), deck:mat('#a96d36'), white:mat('#e5e6e1'), orange:mat('#df6420'), yellow:mat('#d6a323'), pink:mat('#bd2e66') };
function mesh(geo, material, x=0,y=0,z=0){ const o=new THREE.Mesh(geo,material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);return o; }
function box(x,y,z,w,h,d,m){ return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z); }
function cyl(x,y,z,r,h,m){ return mesh(new THREE.CylinderGeometry(r,r,h,10),m,x,y,z); }
function group(){ const g=new THREE.Group();scene.add(g);return g; }
function addBox(g,x,y,z,w,h,d,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
function addCyl(g,x,y,z,r,h,m){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
function desk(x,z,rot=0){const g=group();g.position.set(x,0,z);g.rotation.y=rot;addBox(g,0,.75,0,2.05,.12,.92,M.desk);for(const a of[-.86,.86])for(const b of[-.3,.3])addBox(g,a,.37,b,.08,.72,.08,M.desk);addBox(g,0,1.27,-.14,.82,.52,.06,M.dark);addBox(g,0,.98,-.14,.08,.32,.08,M.dark);addBox(g,0,.82,.12,.65,.04,.28,M.dark);}
function chair(x,z,rot=0,color=M.chair){const g=group();g.position.set(x,0,z);g.rotation.y=rot;addBox(g,0,.55,0,.62,.12,.58,color);addBox(g,0,.93,.22,.62,.66,.12,color);addCyl(g,0,.29,0,.07,.5,M.dark);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;addBox(g,Math.cos(a)*.34,.05,Math.sin(a)*.34,.55,.06,.06,M.dark).rotation.y=-a;} }
function office(x,z,rot=0){desk(x,z,rot);chair(x+Math.sin(rot)*.95,z+Math.cos(rot)*.95,rot+Math.PI);}
function plant(x,z,s=1){const g=group();g.position.set(x,0,z);cyl(0,.22,0,.26*s,.44*s,M.pot);for(let i=0;i<6;i++){const a=i*Math.PI/3;const leaf=addBox(g,Math.cos(a)*.18*s,.7*s,Math.sin(a)*.18*s,.16*s,.75*s,.09*s,M.leaf);leaf.rotation.z=Math.cos(a)*.55;leaf.rotation.x=Math.sin(a)*.45;} }
function shelf(x,z,rot=0){const g=group();g.position.set(x,0,z);g.rotation.y=rot;addBox(g,0,1.35,0,.6,2.7,.28,M.wood);for(let y=.35;y<2.6;y+=.55)addBox(g,0,y,.17,.58,.06,.12,M.dark);}
function board(x,z,rot=0){const g=group();g.position.set(x,0,z);g.rotation.y=rot;addBox(g,0,1.45,0,2.2,1.5,.08,M.white);for(const a of[-.85,.85])addBox(g,a,.62,0,.06,1.2,.06,M.chair);addBox(g,0,.08,0,1.6,.06,.6,M.chair);}
function sofa(x,z,rot=0){const g=group();g.position.set(x,0,z);g.rotation.y=rot;addBox(g,0,.48,0,2.7,.55,.78,M.green);addBox(g,0,.95,.28,2.7,.6,.18,M.green);addBox(g,-1.25,.7,0,.18,.8,.78,M.green);addBox(g,1.25,.7,0,.18,.8,.78,M.green);}
function partition(x,z,w,rot=0){const g=group();g.position.set(x,0,z);g.rotation.y=rot;addBox(g,0,1.1,0,w,2.2,.14,M.partition);}
function build(){
  mesh(new THREE.PlaneGeometry(24,20),M.floor,0,0,0).rotation.x=-Math.PI/2;
  // open-front room shell
  box(0,2,-9.8,24,4,.28,M.wall);box(-11.8,2,0,.28,4,20,M.wall);box(11.8,2,0,.28,4,20,M.wall);box(0,.2,9.65,24,.4,.35,M.wall);
  // workstation bank and storage
  for(let r=0;r<3;r++)for(let c=0;c<3;c++)office(6.4+c*1.8,-4.8+r*2.05,Math.PI/2);
  partition(5.1,-4.7,6,Math.PI/2); shelf(9.7,4.9);shelf(10.3,4.9); box(8.9,1.1,5.6,.75,2.2,.7,M.white); box(8,1.1,5.6,.75,2.2,.7,M.white);
  // lecture deck, board and audience
  box(5,.04,6.6,5.9,.08,4.1,M.deck);board(9,6.6,Math.PI/2);for(let r=0;r<4;r++)for(let c=0;c<4;c++)chair(3.4+c*1.05,4.5+r*1.05,0,M.chair);plant(2.2,8.4);plant(7.7,8.3);
  // central layout dividers and equipment
  partition(-1.8,1.7,7,0);partition(-.2,-1.1,4.2,Math.PI/2);box(-.6,1.05,-.2,.65,2.1,.75,M.white);box(.25,1.05,-.2,.65,2.1,.75,M.white);const scooter=group();scooter.position.set(-.9,0,1.2);addBox(scooter,0,.75,0,.09,1.5,.09,M.pink);addBox(scooter,.18,.06,0,.65,.12,.09,M.pink);addCyl(scooter,.38,.11,0,.16,.1,M.pink);addCyl(scooter,-.2,.11,0,.16,.1,M.pink);
  // lounge and meeting zone
  sofa(-6.8,-5.6,Math.PI/2);box(-4.4,.76,-6.6,2,.14,1.15,M.wood);for(const [x,z] of[[-5.5,-6.6],[-3.3,-6.6],[-4.4,-5.6],[-4.4,-7.6]])chair(x,z,0,x===-5.5?M.orange:M.yellow);plant(-9.6,-7.8);plant(-8.5,-8);board(-10,1.5,Math.PI/2);
  // executive desk and informal seating
  office(-7.5,4.7,0);office(-7.5,7.2,0);box(-5.2,.78,6.1,2,.14,1.15,M.wood);chair(-6.4,6.1,0,M.dark);chair(-4,6.1,0,M.dark);plant(-9.5,3.3);plant(-1.7,8.3);shelf(-9.6,7.5);shelf(1.5,-8.5);plant(9.9,-8.1);plant(10,1.8);
  // small standing work table
  box(-4.7,.86,-.2,1.6,.12,.8,M.wood);chair(-5.7,.5,0);chair(-3.7,.5,Math.PI);plant(-3.3,1.7);
}
build();
scene.add(new THREE.HemisphereLight('#edf7d4','#3a4d36',2.2));const sun=new THREE.DirectionalLight('#fff4d0',3);sun.position.set(-8,16,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);} animate();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);document.querySelector('#reset-camera').onclick=()=>{camera.position.copy(home);controls.target.set(0,0,0);controls.update();};
async function api(url){const token=localStorage.getItem('sm_token');const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});const data=await res.json();if(!res.ok)throw new Error(data.message||'Could not load room');return data;}
try{const room=await api(`/api/rooms/${roomId}`);document.querySelector('#room-name').textContent=room.name;document.querySelector('#room-meta').textContent=`${room.category} · ${room.members.length} members`;document.querySelector('#chat-link').href=`room-chat.html?roomId=${roomId}`;}catch(e){error.textContent=e.message;error.hidden=false;}finally{loading.remove();}
