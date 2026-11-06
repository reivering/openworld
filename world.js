import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $ = id => document.getElementById(id);
const canvas = $('world');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#c7dfc4'); scene.fog = new THREE.Fog('#c7dfc4', 95, 170);
const camera = new THREE.PerspectiveCamera(45, 1, .1, 250); camera.position.set(62, 60, 64);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.maxPolarAngle = Math.PI/2.15; controls.minDistance = 30; controls.maxDistance = 130; controls.target.set(0,0,0);
scene.add(new THREE.HemisphereLight('#f5f4df', '#7f9d7b', 2.2));
const sun = new THREE.DirectionalLight('#fff0cc', 2.4); sun.position.set(-30,55,20); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left = sun.shadow.camera.bottom = -65; sun.shadow.camera.right = sun.shadow.camera.top = 65; scene.add(sun);
const material = color => new THREE.MeshStandardMaterial({color, roughness:1});
const grass = material('#83ad78'), trunk = material('#775b43'), leaves = [material('#467858'),material('#5a8d61'),material('#6b9666')], blue = new THREE.MeshStandardMaterial({color:'#67aac0',roughness:.28,transparent:true,opacity:.88}), animalMat = material('#c89a6e'), agentMats = [material('#d98560'),material('#e1b77e'),material('#a96954'),material('#dba079')], roof = material('#bd835d'), walls = material('#e3c697');
const ground = new THREE.Mesh(new THREE.PlaneGeometry(110,110), grass); ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);
let dynamic = new THREE.Group(); scene.add(dynamic);
const treeGeo = new THREE.ConeGeometry(1.8,5,7), trunkGeo = new THREE.CylinderGeometry(.32,.4,2.4,6), animalGeo = new THREE.SphereGeometry(1,8,6), animalHeadGeo = new THREE.SphereGeometry(.5,8,6), animalLegGeo = new THREE.CylinderGeometry(.13,.15,.9,5), agentGeo = new THREE.CapsuleGeometry(.65,1.3,4,8), agentHeadGeo = new THREE.SphereGeometry(.55,10,8), waterGeo = new THREE.CircleGeometry(1,48), shoreGeo = new THREE.RingGeometry(1,1.14,48), shelterGeo = new THREE.BoxGeometry(4,2.6,4), roofGeo = new THREE.ConeGeometry(3.4,2.2,4), skin = material('#f0d2ae'), shore = material('#a9caa1');
function mesh(geo, mat, x,y,z, group=dynamic) { const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; group.add(m); return m; }
function setWorld(w) {
  scene.remove(dynamic); dynamic = new THREE.Group(); scene.add(dynamic);
  for (const lake of w.water) { const water = mesh(waterGeo,blue,lake.x,.025,lake.z); water.scale.set(lake.radius,lake.radius,1); water.rotation.x=-Math.PI/2; water.castShadow=false; const edge=mesh(shoreGeo,shore,lake.x,.012,lake.z); edge.scale.set(lake.radius,lake.radius,1); edge.rotation.x=-Math.PI/2; edge.castShadow=false; }
  for (const [i,t] of w.trees.entries()) if (t.wood>0) { const h=3.5+(i%4)*.5; mesh(trunkGeo,trunk,t.x,1.1,t.z); const crown=mesh(treeGeo,leaves[i%leaves.length],t.x,h,t.z); crown.scale.set(1,1+(i%3)*.12,1); }
  for (const [i,a] of w.animals.entries()) if (a.food>0) { const body=mesh(animalGeo,animalMat,a.x,1.1,a.z); body.scale.set(1.3,.75,.75); mesh(animalHeadGeo,animalMat,a.x+.9,1.45,a.z); for(const dx of [-.7,.7]) for(const dz of [-.35,.35]) {const leg=mesh(animalLegGeo,animalMat,a.x+dx,.45,a.z+dz);leg.castShadow=false;} }
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
