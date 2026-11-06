import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $ = id => document.getElementById(id);
const canvas = $('world');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#c7dfc4'); scene.fog = new THREE.Fog('#c7dfc4', 600, 1000);
const camera = new THREE.PerspectiveCamera(45, 1, .1, 1200); camera.position.set(320, 280, 320);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.maxPolarAngle = Math.PI/2.15; controls.minDistance = 10; controls.maxDistance = 900; controls.target.set(0,0,0);
controls.mouseButtons = {LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
controls.touches = {ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
scene.add(new THREE.HemisphereLight('#f5f4df', '#7f9d7b', 2.2));
const sun = new THREE.DirectionalLight('#fff0cc', 2.4); sun.position.set(-90,160,70); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left = sun.shadow.camera.bottom = -180; sun.shadow.camera.right = sun.shadow.camera.top = 180; scene.add(sun);
const material = color => new THREE.MeshStandardMaterial({color, roughness:1});
const grass = [material('#83ad78'),material('#91ae7e')], rock = new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}), pass = material('#b6a783'), trunk = material('#775b43'), leaves = [material('#467858'),material('#5a8d61'),material('#6b9666')], blue = new THREE.MeshStandardMaterial({color:'#67aac0',roughness:.28,transparent:true,opacity:.88}), animalMats = {deer:material('#c89a6e'),boar:material('#765f52'),rabbit:material('#e1d5be')}, agentMats = [material('#d98560'),material('#e1b77e'),material('#a96954'),material('#dba079')], roof = material('#bd835d'), walls = material('#e3c697'), pants = material('#4d6255'), hair = material('#4b3b31'), berryLeaves=material('#47744f'), berries=material('#a8464a'), flame=material('#ef9b45');
const mineralColors={stone:'#858b87',flint:'#565d5b',clay:'#a86f57',sand:'#d7bd84',salt:'#e6e5d8',limestone:'#b6b6a4',copper:'#b27751',tin:'#9aa8a6',iron:'#5d6168',coal:'#393b3d'};
const mineralMats=Object.fromEntries(Object.entries(mineralColors).map(([type,color]) => [type,material(color)]));
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
const treeGeo = new THREE.ConeGeometry(1.8,5,7), trunkGeo = new THREE.CylinderGeometry(.32,.4,2.4,6), animalGeo = new THREE.SphereGeometry(1,8,6), animalHeadGeo = new THREE.SphereGeometry(.5,8,6), animalLegGeo = new THREE.CylinderGeometry(.13,.15,.9,5), animalEarGeo=new THREE.ConeGeometry(.22,.6,5), mineralGeo=new THREE.DodecahedronGeometry(1,0), bushGeo=new THREE.IcosahedronGeometry(1,0), torsoGeo=new THREE.BoxGeometry(1.15,1.45,.7), armGeo=new THREE.CylinderGeometry(.19,.22,1.3,6), legGeo=new THREE.CylinderGeometry(.24,.27,1.3,6), agentHeadGeo = new THREE.SphereGeometry(.55,10,8), hairGeo=new THREE.SphereGeometry(.57,10,8,0,Math.PI*2,0,Math.PI/2), waterGeo = new THREE.CircleGeometry(1,48), shoreGeo = new THREE.RingGeometry(1,1.14,48), shelterGeo = new THREE.BoxGeometry(4,2.6,4), roofGeo = new THREE.ConeGeometry(3.4,2.2,4), skin = material('#f0d2ae'), shore = material('#a9caa1');
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
  if (followId) {
    const agent=w.agents.find(a=>a.id===followId);
    if (agent) { const shift=new THREE.Vector3(agent.x,2,agent.z).sub(controls.target);camera.position.add(shift);controls.target.add(shift); }
    else { followId=null; $('view-life').textContent='View life'; }
  }
  dynamic.traverse(object => { if (object.isInstancedMesh) object.dispose(); if (object.userData.terrain) object.geometry.dispose(); });
  scene.remove(dynamic); dynamic = new THREE.Group(); scene.add(dynamic);
  for (const peak of w.mountains||[]) mountainTerrain(peak);
  for (const lake of w.water) { const water = mesh(waterGeo,blue,lake.x,.025,lake.z); water.scale.set(lake.radius,lake.radius,1); water.rotation.x=-Math.PI/2; water.castShadow=false; const edge=mesh(shoreGeo,shore,lake.x,.012,lake.z); edge.scale.set(lake.radius,lake.radius,1); edge.rotation.x=-Math.PI/2; edge.castShadow=false; }
  const trees = w.trees.filter(t => t.wood > 0);
  instances(trunkGeo, trunk, trees.map(t => [t.x,1.1,t.z]));
  for (let color=0; color<3; color++) instances(treeGeo, leaves[color], trees.flatMap((t,i) => i%3===color ? [[t.x,3.5+(i%4)*.5,t.z,1,1+(i%3)*.12,1]] : []));
  const plants=(w.plants||[]).filter(p => p.berries>0);
  instances(bushGeo,berryLeaves,plants.map(p => [p.x,.75,p.z,1.2,.8,1.2]));
  instances(bushGeo,berries,plants.map(p => [p.x+.55,1.1,p.z+.35,.23,.23,.23]));
  for (const [type,mat] of Object.entries(mineralMats)) instances(mineralGeo,mat,(w.deposits||[]).filter(d => d.type===type && d.amount>0).map(d => [d.x,.7,d.z,1.3,.8,1.1]));
  const animals = w.animals.filter(a => a.food > 0);
  for (const [species,mat] of Object.entries(animalMats)) {
    const herd=animals.filter(a => (a.species||'deer')===species), size=species==='rabbit'?.6:species==='boar'?1.15:1;
    instances(animalGeo,mat,herd.map(a => [a.x,1.1*size,a.z,1.3*size,.75*size,.75*size]));
    instances(animalHeadGeo,mat,herd.map(a => [a.x+.9*size,1.45*size,a.z,size,size,size]));
    for (const dx of [-.7,.7]) for (const dz of [-.35,.35]) instances(animalLegGeo,mat,herd.map(a => [a.x+dx*size,.45*size,a.z+dz*size,size,size,size]));
    for (const dz of [-.3,.3]) instances(animalEarGeo,mat,herd.map(a => [a.x+1.05*size,2.05*size,a.z+dz*size,size,species==='rabbit'?size*1.8:size,size]));
    instances(animalLegGeo,mat,herd.map(a => [a.x-1.4*size,1.15*size,a.z,.65*size,1.1*size,.65*size]));
  }
  for (const s of w.structures) {
    if (s.type==='firepit') { mesh(mineralGeo,mineralMats.stone,s.x,.35,s.z).scale.set(1.4,.4,1.4); mesh(treeGeo,flame,s.x,1,s.z).scale.set(.45,.45,.45); }
    else { mesh(shelterGeo,walls,s.x,1.3,s.z); const r=mesh(roofGeo,roof,s.x,3.5,s.z); r.rotation.y=Math.PI/4; }
  }
  for (const [i,a] of w.agents.entries()) {
    const part=(geo,mat,x,y,z) => { const m=mesh(geo,mat,x,y,z); m.userData.agent=a; return m; };
    part(torsoGeo,agentMats[i%4],a.x,2.15,a.z);
    for (const dx of [-.38,.38]) part(legGeo,pants,a.x+dx,.7,a.z);
    for (const dx of [-.78,.78]) part(armGeo,agentMats[i%4],a.x+dx,2.1,a.z);
    part(agentHeadGeo,skin,a.x,3.3,a.z); part(hairGeo,hair,a.x,3.3,a.z);
  }
  $('day').textContent=`DAY ${String(w.day).padStart(3,'0')}`; $('elapsed').textContent=`${w.startedAt ? Math.floor((Date.now()-Date.parse(w.startedAt))/60000) : 0}M ELAPSED`; $('weather').textContent=({clear:'CLEAR SKIES',rain:'RAIN',cold:'COLD'}[w.weather]||'CLEAR SKIES'); $('population').textContent=String(w.agents.length).padStart(2,'0'); $('shelters').textContent=String(w.structures.filter(s => s.type==='shelter').length).padStart(2,'0'); $('generation').textContent=String(w.knowledge.length).padStart(2,'0'); document.querySelector('.resident-count').textContent=`${w.agents.length} LIVES`;
  $('events').replaceChildren(...w.events.slice(0,5).map(e=>{const row=document.createElement('div');row.className='event';const dot=document.createElement('i'), text=document.createElement('div'), stamp=document.createElement('small');text.textContent=e.text;stamp.textContent=`DAY ${String(e.day).padStart(3,'0')} · ${Math.floor((e.elapsedSeconds||0)/60)}M REAL TIME`;text.append(stamp);row.append(dot,text);return row;}));
  $('round-status').textContent=w.error ? `ERROR: ${w.error}` : w.busy ? 'AGENTS ARE DECIDING…' : w.running ? `ROUND COMPLETE · ${w.lastRoundSeconds||0}S` : w.day===1 ? 'READY FOR FIRST ROUND' : `PAUSED · ${w.knowledge.join(', ')||'NO DISCOVERIES YET'}`;
  $('admin-toggle').textContent=w.running?'Pause agents':'Start agents';
  $('status').textContent=w.running?'WORLD IS RUNNING':'WORLD IS PAUSED';
  document.querySelector('.live-status').classList.toggle('is-running',w.running);
  document.querySelector('.map-label').classList.toggle('is-running',w.running);
  $('map-view-label').textContent=w.running?'LIVE WORLD VIEW':'PAUSED WORLD VIEW';
  renderResidents(w);
}
let world=null,followId=null,selectedId=null,residentSide='all';
function selectAgent(agent,follow=false){
  selectedId=agent.id;
  if(follow){followId=agent.id;camera.position.set(agent.x+17,14,agent.z+17);controls.target.set(agent.x,2,agent.z);controls.update();$('view-life').textContent='Whole world';}
  const strong=document.createElement('strong'),small=document.createElement('small');
  strong.textContent=`${agent.name} · generation ${agent.generation}`;
  small.textContent=`Health ${agent.health} · Energy ${agent.energy} · Water ${agent.thirst} · Hunger ${agent.hunger} · Warmth ${agent.warmth}. ${agent.action}. ${agent.lastThought||'No decisions yet.'}`;
  $('agent-inspect').replaceChildren(strong,small);
  document.querySelectorAll('.resident').forEach(button=>button.classList.toggle('selected',button.dataset.id===agent.id));
}
function renderResidents(w){
  const agents=w.agents.filter(a=>residentSide==='all'||(a.x<0?'west':'east')===residentSide);
  const list=$('agent-list'),scroll=list.scrollTop;
  list.replaceChildren(...agents.map((agent,i)=>{
    const button=document.createElement('button'),avatar=document.createElement('span'),text=document.createElement('span'),name=document.createElement('strong'),activity=document.createElement('small'),side=document.createElement('em');
    button.type='button';button.className='resident';button.dataset.id=agent.id;button.classList.toggle('selected',agent.id===selectedId);button.setAttribute('aria-label',`Follow ${agent.name}`);
    avatar.className='resident-avatar';avatar.textContent=agent.name[0];avatar.style.setProperty('--avatar-hue',String((i*47+agent.name.length*23)%360));
    name.textContent=agent.name;activity.textContent=agent.action||'Standing around';text.append(name,activity);
    side.textContent=agent.x<0?'West':'East';side.className=agent.x<0?'west':'east';button.append(avatar,text,side);
    button.onclick=()=>{selectAgent(agent,true);renderResidents(world);};return button;
  }));
  list.scrollTop=scroll;
  if(!agents.length)list.textContent='No agents on this side yet.';
  const selected=w.agents.find(a=>a.id===selectedId);if(selected)selectAgent(selected);else if(selectedId){selectedId=null;$('agent-inspect').textContent='That resident is no longer in the world.';}
}
async function request(url,options={}){const method=options.method||(url==='/api/state'||url==='/api/admin'?'GET':'POST'),init={method,credentials:'same-origin'};if(options.body){init.headers={'Content-Type':'application/json'};init.body=JSON.stringify(options.body);}const res=await fetch(url,init);const data=await res.json();if(!res.ok){const error=new Error(data.error||'Request failed');error.status=res.status;throw error;}return data;}
async function refresh(){try{const next=await request('/api/state');if(!world||world.day!==next.day||world.id!==next.id||world.running!==next.running||world.busy!==next.busy||world.error!==next.error){world=next;setWorld(world);}else world=next;}catch(err){$('round-status').textContent=err.message;}}
$('view-life').onclick=()=>{const a=world?.agents[0];if (!a) return;if(followId){followId=null;camera.position.set(320,280,320);controls.target.set(0,0,0);controls.update();$('view-life').textContent='View life';}else selectAgent(a,true);};
let adminConfigured=false,adminAuthenticated=false;
function setAdminState(authenticated){adminAuthenticated=authenticated;$('admin-login').hidden=authenticated;$('admin-tools').hidden=!authenticated;adminDialog.setAttribute('aria-labelledby',authenticated?'admin-tools-title':'admin-title');$('admin-access').textContent=authenticated?'Admin controls':'Admin login';if(world)$('admin-toggle').textContent=world.running?'Pause agents':'Start agents';if(authenticated)$('admin-toggle').focus();else if(adminDialog.open&&adminConfigured)$('admin-password').focus();}
async function checkAdmin(){try{const status=await request('/api/admin');adminConfigured=status.configured;$('admin-setup').hidden=adminConfigured;$('admin-login-form').querySelector('input').disabled=!adminConfigured;$('admin-login-form').querySelector('button').disabled=!adminConfigured;setAdminState(status.authenticated);}catch(err){$('admin-error').textContent=err.message;$('admin-error').hidden=false;}}
const adminDialog=$('admin-dialog');
$('admin-access').onclick=()=>{adminDialog.showModal();checkAdmin().then(()=>{if(!adminAuthenticated&&adminConfigured)$('admin-password').focus();});};
$('admin-close').onclick=()=>adminDialog.close();
$('admin-login-form').onsubmit=async event=>{event.preventDefault();const error=$('admin-error'),submit=event.currentTarget.querySelector('button');error.hidden=true;submit.disabled=true;try{await request('/api/login',{body:{password:$('admin-password').value}});event.currentTarget.reset();setAdminState(true);}catch(err){error.textContent=err.message;error.hidden=false;}finally{submit.disabled=!adminConfigured;}};
$('admin-logout').onclick=async()=>{try{await request('/api/logout');setAdminState(false);}catch(err){$('admin-error').textContent=err.message;$('admin-error').hidden=false;}};
$('admin-toggle').onclick=async()=>{try{world=await request(world?.running?'/api/pause':'/api/start');setWorld(world);}catch(err){$('round-status').textContent=err.message;if(err.status===401)setAdminState(false);}};
$('admin-reset').onclick=async()=>{if(!confirm('Start a new world? The current world will be erased.'))return;try{world=await request('/api/reset');setWorld(world);}catch(err){$('round-status').textContent=err.message;if(err.status===401)setAdminState(false);}};
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(dynamic.children).find(h=>h.object.userData.agent);if(hit)selectAgent(hit.object.userData.agent,true);});
document.querySelectorAll('.resident-filters button').forEach(button=>button.onclick=()=>{residentSide=button.dataset.side;document.querySelectorAll('.resident-filters button').forEach(item=>item.classList.toggle('active',item===button));if(world)renderResidents(world);});
const dialog=$('controls-dialog');
function showHelp(){document.querySelector('[data-help="'+(matchMedia('(pointer:coarse)').matches?'phone':'computer')+'"]')?.click();dialog.showModal();}
$('show-controls').onclick=showHelp;
$('start-exploring').onclick=()=>{dialog.close();try{localStorage.setItem('world-controls-seen','1');}catch{}};
document.querySelectorAll('.help-tabs button').forEach(button=>button.onclick=()=>{document.querySelectorAll('.help-tabs button').forEach(item=>item.classList.toggle('active',item===button));$('computer-help').hidden=button.dataset.help!=='computer';$('phone-help').hidden=button.dataset.help!=='phone';});
const keys=new Set(),yAxis=new THREE.Vector3(0,1,0),move=new THREE.Vector3(),forward=new THREE.Vector3();
window.addEventListener('keydown',event=>{if(event.key==='?'&&!dialog.open&&!adminDialog.open){event.preventDefault();showHelp();return;}if(dialog.open||adminDialog.open||/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName))return;const key=event.key.toLowerCase();if('wasdqetgrf'.includes(key)||key.startsWith('arrow')){keys.add(key);event.preventDefault();}if(event.key==='Shift')keys.add('shift');});
window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
canvas.addEventListener('wheel',event=>{if(event.ctrlKey||event.deltaMode!==0||Math.max(Math.abs(event.deltaX),Math.abs(event.deltaY))>=35)return;event.preventDefault();event.stopImmediatePropagation();const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(yAxis,-event.deltaX*.003);const spherical=new THREE.Spherical().setFromVector3(offset);spherical.phi=THREE.MathUtils.clamp(spherical.phi+event.deltaY*.003,.12,Math.PI/2.15);offset.setFromSpherical(spherical);camera.position.copy(controls.target).add(offset);},{capture:true,passive:false});
let lastFrame=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;const width=canvas.clientWidth,height=canvas.clientHeight;if(canvas.width!==Math.round(width*renderer.getPixelRatio())||canvas.height!==Math.round(height*renderer.getPixelRatio())){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}if(keys.size&&!dialog.open&&!adminDialog.open){const rate=dt*(keys.has('shift')?130:55);forward.copy(controls.target).sub(camera.position).setY(0).normalize();const right=new THREE.Vector3(-forward.z,0,forward.x);move.set(0,0,0);if(keys.has('w')||keys.has('arrowup'))move.add(forward);if(keys.has('s')||keys.has('arrowdown'))move.sub(forward);if(keys.has('d')||keys.has('arrowright'))move.add(right);if(keys.has('a')||keys.has('arrowleft'))move.sub(right);if(move.lengthSq()){move.normalize().multiplyScalar(rate);camera.position.add(move);controls.target.add(move);followId=null;}if(keys.has('q')||keys.has('e'))camera.position.sub(controls.target).applyAxisAngle(yAxis,(keys.has('q')?1:-1)*dt).add(controls.target);if(keys.has('t')||keys.has('g')){const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));spherical.phi=THREE.MathUtils.clamp(spherical.phi+(keys.has('t')?1:-1)*dt,.12,Math.PI/2.15);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));}if(keys.has('r')||keys.has('f')){const offset=camera.position.clone().sub(controls.target),distance=THREE.MathUtils.clamp(offset.length()*(keys.has('r')?1-dt:1+dt),10,900);camera.position.copy(controls.target).add(offset.setLength(distance));}}controls.update();renderer.render(scene,camera);}requestAnimationFrame(animate);refresh();setInterval(refresh,2000);
