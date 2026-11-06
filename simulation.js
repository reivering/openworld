const { randomUUID } = require('node:crypto');
const names = ['Moss', 'Clover', 'Sol', 'Pip', 'Wren', 'Ember', 'Fern', 'Ash', 'Rays', 'Juniper'];
const between = (min, max) => min + Math.random() * (max - min);
const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const WORLD_SIZE = 350;
const MINERALS = ['stone','flint','clay','sand','salt','limestone','copper','tin','iron','coal'];
const mountains = [
  [-65,20,42],[-130,115,46],
  [65,45,49],[130,118,43]
].map(([x,z,height]) => ({x,z,height,radius:30}));
const riverX = z => 3*Math.sin(z/22)+2*Math.sin(z/53);
const river = Array.from({length:36},(_,i) => { const z=-170+i*10; return [-1,1].map(bank => ({x:riverX(z)+bank*13,z})); }).flat();
const inRiver = ({x,z}, margin=0) => Math.abs(x-riverX(z)) < 12+margin;
const side = x => x < 0 ? -1 : 1;
const travelDistance = (a, b) => side(a.x) === side(b.x) ? near(a,b) : near(a,{x:side(a.x)*20,z:0}) + 40 + near({x:side(b.x)*20,z:0},b);
function clearTerrain(item, margin = 0) {
  if (inRiver(item, margin)) item.x = riverX(item.z)+side(item.x)*(14+margin);
  for (const mountain of mountains) if (near(item,mountain) < mountain.radius+margin) item.x = mountain.x + side(item.x-mountain.x)*(mountain.radius+margin+2);
}
function outerPosition(clearance = 0) {
  let x, z;
  do { x = between(-160, 160); z = between(-160, 160); } while ((Math.abs(x) < 55 && Math.abs(z) < 55) || inRiver({x,z},clearance) || mountains.some(m => near({x,z},m) < m.radius+clearance));
  return { x, z };
}
function resourcePosition(i, lakes) {
  let item;
  do {
    item=i>=30 ? outerPosition() : {x:between(-55,55),z:between(-55,55)};
    clearTerrain(item);
  } while (lakes.some(lake => near(item,lake)<lake.radius+3));
  return item;
}
function expandWorld(world) {
  if (!world.size || world.size < WORLD_SIZE) {
    world.size = WORLD_SIZE;
    for (let i = 0; i < 765; i++) world.trees.push({ id: randomUUID(), ...outerPosition(), wood: 4 });
    for (let i = 0; i < 135; i++) world.animals.push({ id: randomUUID(), ...outerPosition(), species:['deer','boar','rabbit'][i%3], food: 3 });
    for (let i = 0; i < 18; i++) { const radius=between(8,12); let position; do { position=outerPosition(12); } while (world.agents.some(agent => near(agent,position)<radius+3)); world.water.push({...position,radius}); }
  }
  if (world.terrainVersion !== 4) {
    world.mountains = mountains;
    world.river = river;
    for (const item of [...world.agents, ...world.trees, ...world.animals, ...world.structures]) clearTerrain(item);
    for (const lake of world.water) { clearTerrain(lake, lake.radius); while (world.agents.some(agent => near(agent,lake)<lake.radius+3)) Object.assign(lake,outerPosition(lake.radius)); }
    world.terrainVersion = 4;
  }
  if (!world.ecologyVersion) {
    world.plants = Array.from({length:120},(_,i) => ({id:randomUUID(),...resourcePosition(i,world.water),berries:3}));
    world.deposits = MINERALS.flatMap(type => Array.from({length:10},(_,i) => ({id:randomUUID(),type,...resourcePosition(i < 3 ? i : 30,world.water),amount:8})));
    world.harvested ||= {};
    world.weather ||= 'clear';
    for (const agent of world.agents) {
      agent.hunger ??= 100; agent.warmth ??= 100; agent.health ??= 100; agent.minerals ||= {}; agent.minerals.stone ??= agent.stone || 0;
    }
    world.animals.forEach((animal,i) => { animal.species ||= ['deer','boar','rabbit'][i%3]; });
    world.ecologyVersion = 1;
  }
  return world;
}
const RECIPES = [
  { name: 'fire', points: 18, needs: [], materials: {}, description: 'Learned to control fire' },
  { name: 'stone tools', points: 28, needs: ['fire'], materials: {stone:2,flint:1}, description: 'Shaped the first tools' },
  { name: 'farming', points: 45, needs: ['stone tools'], materials: {clay:2}, description: 'Learned to grow food' },
  { name: 'village', points: 70, needs: ['farming'], materials: {limestone:2}, description: 'Founded a village' },
  { name: 'metalworking', points: 100, needs: ['village'], materials: {copper:2,iron:2,coal:1}, description: 'Learned to work metal' }
];
function createWorld() {
  const world = { id: randomUUID(), day: 1, agents: [], trees: [], water: [], animals: [], structures: [], events: [], knowledge: [], research: 0, births: 0, deaths: 0, running: false, busy: false, error: null, startedAt: null, lastRoundSeconds: null };
  world.water = [{ x: -25, z: -18, radius: 12 }, { x: 29, z: 23, radius: 10 }];
  for (let i = 0; i < 10; i++) {
    let x,z;
    do { x=(i<5?-1:1)*between(28,55); z=between(-17,17); } while (world.water.some(lake => near({x,z},lake)<lake.radius+3) || mountains.some(m => near({x,z},m)<m.radius+3));
    world.agents.push({ id: randomUUID(), name: names[i], x, z, energy: 100, thirst: 100, food: 1, wood: 0, stone: 0, age: 0, generation: 1, memory: [], alive: true, action: 'arriving' });
  }
  for (let i = 0; i < 85; i++) { const tree = { id: randomUUID(), x: between(-44, 44), z: between(-44, 44), wood: 4 }; clearTerrain(tree); world.trees.push(tree); }
  for (let i = 0; i < 15; i++) { const animal = { id: randomUUID(), x: between(-40, 40), z: between(-40, 40), species:['deer','boar','rabbit'][i%3], food: 3 }; clearTerrain(animal); world.animals.push(animal); }
  expandWorld(world);
  record(world, 'Ten agents entered the world.');
  return world;
}
function record(world, text, agent) { world.events.unshift({ day: world.day, elapsedSeconds: world.startedAt ? Math.floor((Date.now() - Date.parse(world.startedAt)) / 1000) : 0, text, agent: agent || null }); world.events.length = Math.min(world.events.length, 30); }
function observation(world, agent) {
  const closest = list => list.map(item => ({ ...item, distance: Math.round(travelDistance(agent, item)) })).sort((a,b) => a.distance - b.distance).slice(0, 5).map(({id, x, z, type, distance}) => ({id, x: Math.round(x), z: Math.round(z), ...(type && {type}), distance}));
  return { day: world.day, self: { name: agent.name, energy: agent.energy, thirst: agent.thirst, hunger: agent.hunger, warmth: agent.warmth, health: agent.health, food: agent.food, wood: agent.wood, minerals: agent.minerals, age: agent.age, generation: agent.generation }, nearby: { trees: closest(world.trees.filter(t => t.wood > 0)), berries: closest(world.plants.filter(p => p.berries > 0)), animals: closest(world.animals.filter(a => a.food > 0)), minerals: closest(world.deposits.filter(d => d.amount > 0)), water: closest([...world.water,...world.river]), shelters: closest(world.structures.filter(s => s.type === 'shelter')) }, world: { size: world.size, weather: world.weather, terrain: 'Mountains are scattered across both sides of a river. Cross at the bridge at z=0.', discoveries: world.knowledge, research: world.research, researchNeeded: RECIPES.find(r => !world.knowledge.includes(r.name))?.materials || {}, harvested: world.harvested, research: world.research, population: world.agents.length }, memory: agent.memory.slice(-5) };
}
const ACTIONS = ['gather', 'forage', 'mine', 'drink', 'hunt', 'build', 'craft', 'research', 'rest', 'share'];
function approach(world, agent, target, reach) {
  if (!target) return false;
  const crossing = side(agent.x) !== side(target.x);
  if (!crossing && near(agent, target) <= reach) { agent.x = target.x; agent.z = target.z; return true; }
  const exiting = Math.abs(agent.x) < 20 && Math.abs(agent.z) < 18 && Math.abs(target.z) > 18;
  let waypoint = crossing ? (Math.abs(agent.z) > 1 && Math.abs(agent.x) > 18 ? {x:side(agent.x)*20,z:0} : {x:side(target.x)*20,z:0}) : exiting ? {x:side(target.x)*20,z:0} : Math.abs(agent.x)<25 && Math.abs(agent.z-target.z)>20 ? {x:side(target.x)*22,z:target.z} : target;
  for (const mountain of world.mountains) {
    const dx=waypoint.x-agent.x, dz=waypoint.z-agent.z, length=dx*dx+dz*dz;
    if (!length) break;
    const t=Math.max(0,Math.min(1,((mountain.x-agent.x)*dx+(mountain.z-agent.z)*dz)/length));
    const px=agent.x+dx*t-mountain.x, pz=agent.z+dz*t-mountain.z;
    if (t>0 && t<1 && Math.hypot(px,pz)<mountain.radius+3) {
      const normal=Math.hypot(px,pz);
      waypoint={x:mountain.x+(normal ? px/normal : -dz/Math.sqrt(length))*(mountain.radius+28),z:mountain.z+(normal ? pz/normal : dx/Math.sqrt(length))*(mountain.radius+28)};
      break;
    }
  }
  const distance = near(agent, waypoint);
  if (distance) {
    const step = Math.min(20, distance);
    agent.x += (waypoint.x - agent.x) / distance * step;
    agent.z += (waypoint.z - agent.z) / distance * step;
  }
  return false;
}
function applyDecision(world, agent, decision) {
  if (!world.agents.includes(agent)) return;
  const action = ACTIONS.includes(decision?.action) ? decision.action : 'rest';
  const nearest = list => list.reduce((best, item) => !best || travelDistance(agent, item) < travelDistance(agent, best) ? item : best, null);
  const target = action === 'gather' ? nearest(world.trees.filter(t => t.wood > 0)) : action === 'forage' ? nearest(world.plants.filter(p => p.berries > 0)) : action === 'mine' ? nearest(world.deposits.filter(d => d.amount > 0 && (!decision?.resource || d.type === decision.resource))) : action === 'hunt' ? nearest(world.animals.filter(a => a.food > 0)) : null;
  agent.action = action;
  agent.age++; agent.energy -= 9; agent.thirst -= 11; agent.hunger -= 9; agent.warmth -= world.weather === 'cold' ? 12 : world.weather === 'rain' ? 7 : 3;
  if (action === 'gather' && approach(world, agent, target, 20)) { target.wood--; agent.wood += world.knowledge.includes('stone tools') ? 3 : 2; record(world, `${agent.name} gathered wood.`, agent.name); }
  if (action === 'forage' && approach(world, agent, target, 12)) { target.berries--; agent.food += 2; record(world, `${agent.name} foraged berries.`, agent.name); }
  if (action === 'mine' && approach(world, agent, target, 12)) { const yieldAmount=Math.min(target.amount,world.knowledge.includes('metalworking')?2:1); target.amount-=yieldAmount; agent.minerals[target.type] = (agent.minerals[target.type]||0)+yieldAmount; world.harvested[target.type] = (world.harvested[target.type]||0)+yieldAmount; if (target.type === 'stone') agent.stone+=yieldAmount; record(world, `${agent.name} mined ${target.type}.`, agent.name); }
  if (action === 'drink' && approach(world, agent, nearest([...world.water,...world.river]), 12)) { agent.thirst = 100; record(world, `${agent.name} found water.`, agent.name); }
  if (action === 'hunt' && approach(world, agent, target, 20)) { target.food--; agent.food += world.knowledge.includes('stone tools') ? 3 : 2; record(world, `${agent.name} hunted an animal.`, agent.name); }
  if (action === 'build' && agent.wood >= (world.knowledge.includes('village')?3:4)) { agent.wood -= (world.knowledge.includes('village')?3:4); world.structures.push({ id: randomUUID(), type: 'shelter', x: agent.x, z: agent.z, builder: agent.name }); record(world, `${agent.name} built a shelter.`, agent.name); }
  if (action === 'craft' && world.knowledge.includes('fire') && agent.wood >= 2 && (agent.minerals.stone||0) >= 2) { agent.wood -= 2; agent.minerals.stone -= 2; agent.stone -= 2; world.structures.push({ id: randomUUID(), type: 'firepit', x: agent.x, z: agent.z, builder: agent.name }); record(world, `${agent.name} built a firepit.`, agent.name); }
  if (action === 'research') { world.research += 4 + (world.knowledge.includes('fire') ? 2 : 0); record(world, `${agent.name} studied the world.`, agent.name); }
  if (action === 'rest') { agent.energy = Math.min(100, agent.energy + (world.structures.some(s => near(agent,s) < 10) ? 28 : 17)); }
  if (action === 'share' && agent.food > 1) { const other = world.agents.filter(a => a !== agent).sort((a,b) => a.food - b.food)[0]; if (other) { agent.food--; other.food++; record(world, `${agent.name} shared food with ${other.name}.`, agent.name); } }
  if (agent.food > 0 && agent.hunger < 65) { agent.food--; agent.hunger = Math.min(100, agent.hunger + 45); agent.energy = Math.min(100, agent.energy + 12); }
  if (world.structures.some(s => near(agent,s) < 10 && (s.type === 'shelter' || s.type === 'firepit'))) agent.warmth = Math.min(100,agent.warmth+15);
  if (agent.hunger <= 0 || agent.thirst <= 0 || agent.warmth <= 0 || agent.energy <= 0) agent.health -= 20;
  else agent.health = Math.min(100,agent.health+2);
  if (agent.health <= 0 || agent.age > 90) { world.agents.splice(world.agents.indexOf(agent), 1); world.deaths++; record(world, `${agent.name} died on day ${world.day}.`, agent.name); }
  else if (agent.energy > 70 && agent.thirst > 70 && agent.hunger > 70 && agent.health > 70 && agent.food > 1 && agent.age > 8 && world.agents.length < 20 && Math.random() < .035) { agent.food--; world.births++; const child = { id: randomUUID(), name: `${agent.name} ${world.births + 1}`, x: agent.x+1, z: agent.z+1, energy: 85, thirst: 85, hunger:85, warmth:85, health:85, food: 1, wood: 0, stone: 0, minerals:{}, age: 0, generation: agent.generation + 1, memory: [`${agent.name} taught me: ${world.knowledge.join(', ') || 'survive'}`], alive: true, action: 'born' }; world.agents.push(child); record(world, `${child.name} was born into generation ${child.generation}.`, child.name); }
  const thought = typeof decision?.reason === 'string' ? decision.reason.slice(0, 180) : '';
  agent.memory.push(`Day ${world.day}: ${action}${thought ? ` — ${thought}` : ''}`); agent.memory.length = Math.min(agent.memory.length, 8);
}
function advance(world, decisions) {
  const living = [...world.agents];
  for (const agent of living) applyDecision(world, agent, decisions[agent.id]);
  for (const recipe of RECIPES) if (!world.knowledge.includes(recipe.name) && recipe.needs.every(n => world.knowledge.includes(n)) && Object.entries(recipe.materials).every(([type,count]) => (world.harvested[type]||0) >= count) && world.research >= recipe.points) { world.research -= recipe.points; world.knowledge.push(recipe.name); record(world, recipe.description); break; }
  world.day++;
  world.weather = ['clear','rain','cold'][Math.floor((world.day-1)/4)%3];
  if (world.day % 4 === 0 && world.animals.filter(a => a.food > 0).length < 150) world.animals.push({ id: randomUUID(), ...outerPosition(), species:['deer','boar','rabbit'][world.day%3], food: 3 });
  if (world.day % 3 === 0) for (const tree of world.trees) tree.wood = Math.min(4, tree.wood + 1);
  if (world.day % (world.knowledge.includes('farming')?2:4) === 0) for (const plant of world.plants) plant.berries = Math.min(3, plant.berries+1);
  if (!world.agents.length) { world.running = false; record(world, 'The population has gone extinct.'); }
}
module.exports = { createWorld, expandWorld, observation, applyDecision, advance, ACTIONS, WORLD_SIZE };
