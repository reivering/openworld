import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $ = id => document.getElementById(id);
const canvas = $('world');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#c7dfc4'); scene.fog = new THREE.Fog('#c7dfc4', 600, 1000);
const camera = new THREE.PerspectiveCamera(45, 1, .1, 1200); camera.position.set(375, 335, 375);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.maxPolarAngle = Math.PI/2.15; controls.minDistance = 20; controls.maxDistance = 900; controls.target.set(0,0,0);
scene.add(new THREE.HemisphereLight('#f5f4df', '#7f9d7b', 2.2));
const sun = new THREE.DirectionalLight('#fff0cc', 2.4); sun.position.set(-90,160,70); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left = sun.shadow.camera.bottom = -180; sun.shadow.camera.right = sun.shadow.camera.top = 180; scene.add(sun);
const material = color => new THREE.MeshStandardMaterial({color, roughness:1});
const grass = [material('#83ad78'),material('#91ae7e')], rock = new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}), pass = material('#b6a783'), trunk = material('#775b43'), leaves = [material('#467858'),material('#5a8d61'),material('#6b9666')], blue = new THREE.MeshStandardMaterial({color:'#67aac0',roughness:.28,transparent:true,opacity:.88}), animalMat = material('#c89a6e'), agentMats = [material('#d98560'),material('#e1b77e'),material('#a96954'),material('#dba079')], roof = material('#bd835d'), walls = material('#e3c697');
for (const [i,x] of [-87.5,87.5].entries()) { const ground = new THREE.Mesh(new THREE.PlaneGeometry(175,350), grass[i]); ground.rotation.x = -Math.PI/2; ground.position.x=x; ground.receiveShadow = true; scene.add(ground); }
const riverX = z => 3*Math.sin(z/22)+2*Math.sin(z/53);
function riverStrip(width, y, mat) {
  const geometry=new THREE.PlaneGeometry(width,350,1,140);
  geometry.rotateX(-Math.PI/2);
  const positions=geometry.getAttribute('position');
  for (let i=0; i<positions.count; i++) positions.setX(i,positions.getX(i)+riverX(positions.getZ(i)));
  geometry.computeVertexNormals();
  const strip=new THREE.Mesh(geometry,mat); strip.position.y=y; strip.receiveShadow=true; scene.add(strip);
}
riverStrip(23,.012,pass);
riverStrip(16,.025,blue);
const bridge = new THREE.Mesh(new THREE.BoxGeometry(34,.8,10),material('#9d805c')); bridge.position.y=.55; bridge.castShadow=true; bridge.receiveShadow=true; scene.add(bridge);
let dynamic = new THREE.Group(); scene.add(dynamic);
const treeGeo = new THREE.ConeGeometry(1.8,5,7), trunkGeo = new THREE.CylinderGeometry(.32,.4,2.4,6), animalGeo = new THREE.SphereGeometry(1,8,6), animalHeadGeo = new THREE.SphereGeometry(.5,8,6), animalLegGeo = new THREE.CylinderGeometry(.13,.15,.9,5), agentGeo = new THREE.CapsuleGeometry(.65,1.3,4,8), agentHeadGeo = new THREE.SphereGeometry(.55,10,8), waterGeo = new THREE.CircleGeometry(1,48), shoreGeo = new THREE.RingGeometry(1,1.14,48), shelterGeo = new THREE.BoxGeometry(4,2.6,4), roofGeo = new THREE.ConeGeometry(3.4,2.2,4), skin = material('#f0d2ae'), shore = material('#a9caa1');
function mesh(geo, mat, x,y,z, group=dynamic) { const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; group.add(m); return m; }
function instances(geo, mat, entries) {
  if (!entries.length) return;
  const batch = new THREE.InstancedMesh(geo, mat, entries.length);
  const dummy = new THREE.Object3D();
  entries.forEach(([x,y,z,sx=1,sy=1,sz=1], i) => { dummy.position.set(x,y,z); dummy.scale.set(sx,sy,sz); dummy.updateMatrix(); batch.setMatrixAt(i,dummy.matrix); });
  batch.instanceMatrix.needsUpdate = true;
  dynamic.add(batch);
}
function mountainTerrain(peak) {
  const geometry = new THREE.PlaneGeometry(64,64,40,40);
  geometry.rotateX(-Math.PI/2);
  geometry.translate(peak.x,0,peak.z);
  const positions=geometry.getAttribute('position'), colors=[];
  const meadow=new THREE.Color('#71886b'), stone=new THREE.Color('#696e69'), bright=new THREE.Color('#a3a49a'), ice=new THREE.Color('#e8e8dd');
  for (let i=0; i<positions.count; i++) {
    const x=positions.getX(i), z=positions.getZ(i);
    const dx=x-peak.x, dz=z-peak.z;
    const footprint=Math.max(0,1-(dx*dx+dz*dz)/(peak.radius*peak.radius));
    const rugged=1+.11*Math.sin(z*.37+x*.51)+.07*Math.sin(z*.91-x*.34);
    const height=peak.height*Math.pow(footprint,1.35)*rugged;
    positions.setY(i,height);
    const color=height>34 ? bright.clone().lerp(ice,Math.min(1,(height-34)/10)) : height>8 ? stone.clone().lerp(bright,Math.min(1,(height-8)/32)) : meadow.clone().lerp(stone,height/8);
    colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  const terrain=mesh(geometry,rock,0,0,0); terrain.userData.terrain=true;
}
function setWorld(w) {
  dynamic.traverse(object => { if (object.isInstancedMesh) object.dispose(); if (object.userData.terrain) object.geometry.dispose(); });
  scene.remove(dynamic); dynamic = new THREE.Group(); scene.add(dynamic);
  for (const peak of w.mountains||[]) mountainTerrain(peak);
  for (const lake of w.water) { const water = mesh(waterGeo,blue,lake.x,.025,lake.z); water.scale.set(lake.radius,lake.radius,1); water.rotation.x=-Math.PI/2; water.castShadow=false; const edge=mesh(shoreGeo,shore,lake.x,.012,lake.z); edge.scale.set(lake.radius,lake.radius,1); edge.rotation.x=-Math.PI/2; edge.castShadow=false; }
  const trees = w.trees.filter(t => t.wood > 0);
  instances(trunkGeo, trunk, trees.map(t => [t.x,1.1,t.z]));
  for (let color=0; color<3; color++) instances(treeGeo, leaves[color], trees.flatMap((t,i) => i%3===color ? [[t.x,3.5+(i%4)*.5,t.z,1,1+(i%3)*.12,1]] : []));
  const animals = w.animals.filter(a => a.food > 0);
  instances(animalGeo,animalMat,animals.map(a => [a.x,1.1,a.z,1.3,.75,.75]));
  instances(animalHeadGeo,animalMat,animals.map(a => [a.x+.9,1.45,a.z]));
  for (const dx of [-.7,.7]) for (const dz of [-.35,.35]) instances(animalLegGeo,animalMat,animals.map(a => [a.x+dx,.45,a.z+dz]));
  for (const s of w.structures) { mesh(shelterGeo,walls,s.x,1.3,s.z); const r=mesh(roofGeo,roof,s.x,3.5,s.z); r.rotation.y=Math.PI/4; }
  for (const [i,a] of w.agents.entries()) { const person=mesh(agentGeo,agentMats[i%4],a.x,1.5,a.z); person.userData.agent=a; mesh(agentHeadGeo,skin,a.x,3,a.z).userData.agent=a; }
  $('day').textContent=`DAY ${String(w.day).padStart(3,'0')}`; $('elapsed').textContent=`${w.startedAt ? Math.floor((Date.now()-Date.parse(w.startedAt))/60000) : 0}M ELAPSED`; $('population').textContent=String(w.agents.length).padStart(2,'0'); $('shelters').textContent=String(w.structures.length).padStart(2,'0'); $('generation').textContent=String(w.knowledge.length).padStart(2,'0');
  $('events').replaceChildren(...w.events.slice(0,5).map(e=>{const row=document.createElement('div');row.className='event';const dot=document.createElement('i'), text=document.createElement('div'), stamp=document.createElement('small');text.textContent=e.text;stamp.textContent=`DAY ${String(e.day).padStart(3,'0')} · ${Math.floor((e.elapsedSeconds||0)/60)}M REAL TIME`;text.append(stamp);row.append(dot,text);return row;}));
  $('round-status').textContent=w.error ? `ERROR: ${w.error}` : w.busy ? 'AGENTS ARE DECIDING…' : w.running ? `ROUND COMPLETE · ${w.lastRoundSeconds||0}S` : w.day===1 ? 'READY FOR FIRST ROUND' : `PAUSED · ${w.knowledge.join(', ')||'NO DISCOVERIES YET'}`;
  $('toggle').innerHTML=w.running?'Ⅱ <span>Pause agents</span>':'▶ <span>Start agents</span>';
  $('status').textContent=w.running?'AGENTS ARE RUNNING':'WORLD IS PAUSED';
}
let world=null;
async function request(url){const res=await fetch(url,{method:url==='/api/state'?'GET':'POST'});const data=await res.json();if(!res.ok)throw new Error(data.error||'Request failed');return data;}
async function refresh(){try{const next=await request('/api/state');if(!world||world.day!==next.day||world.id!==next.id||world.running!==next.running||world.busy!==next.busy||world.error!==next.error){world=next;setWorld(world);}else world=next;}catch(err){$('round-status').textContent=err.message;}}
$('toggle').onclick=async()=>{try{world=await request(world?.running?'/api/pause':'/api/start');setWorld(world);}catch(err){$('round-status').textContent=err.message;}};
$('reset').onclick=async()=>{if(!confirm('Start a new world? The current world will be erased.'))return;try{world=await request('/api/reset');setWorld(world);}catch(err){$('round-status').textContent=err.message;}};
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(dynamic.children).find(h=>h.object.userData.agent);if(hit){const a=hit.object.userData.agent;$('agent-inspect').replaceChildren();const strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=`${a.name} · generation ${a.generation}`;small.textContent=`Energy ${a.energy} · Water ${a.thirst} · ${a.action}. ${a.lastThought||'No decisions yet.'}`;$('agent-inspect').append(strong,small);}});
function animate(){requestAnimationFrame(animate);const width=canvas.clientWidth,height=canvas.clientHeight;if(canvas.width!==Math.round(width*renderer.getPixelRatio())||canvas.height!==Math.round(height*renderer.getPixelRatio())){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}controls.update();renderer.render(scene,camera);}animate();refresh();setInterval(refresh,2000);
