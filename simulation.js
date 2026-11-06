const { randomUUID } = require('node:crypto');
const names = ['Moss', 'Clover', 'Sol', 'Pip', 'Wren', 'Ember', 'Fern', 'Ash', 'River', 'Juniper'];
const between = (min, max) => min + Math.random() * (max - min);
const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const WORLD_SIZE = 350;
const mountains = [
  [-120,-115,45],[-65,20,42],[-130,115,46],
  [120,-120,47],[65,45,49],[130,118,43]
].map(([x,z,height]) => ({x,z,height,radius:30}));
const riverX = z => 3*Math.sin(z/22)+2*Math.sin(z/53);
const river = Array.from({length:36},(_,i) => { const z=-170+i*10; return [-1,1].map(bank => ({x:riverX(z)+bank*13,z})); }).flat();
const inRiver = ({x,z}, margin=0) => Math.abs(x-riverX(z)) < 12+margin && Math.abs(z)>6;
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
function expandWorld(world) {
  if (!world.size || world.size < WORLD_SIZE) {
    world.size = WORLD_SIZE;
    for (let i = 0; i < 765; i++) world.trees.push({ id: randomUUID(), ...outerPosition(), wood: 4 });
    for (let i = 0; i < 135; i++) world.animals.push({ id: randomUUID(), ...outerPosition(), food: 3 });
    for (let i = 0; i < 18; i++) world.water.push({ ...outerPosition(12), radius: between(8, 12) });
  }
  if (world.terrainVersion !== 3) {
    world.mountains = mountains;
    world.river = river;
    for (const item of [...world.agents, ...world.trees, ...world.animals, ...world.structures]) clearTerrain(item);
    for (const lake of world.water) clearTerrain(lake, lake.radius);
    world.terrainVersion = 3;
  }
  return world;
}
const RECIPES = [
  { name: 'fire', points: 18, needs: [], description: 'Learned to control fire' },
  { name: 'stone tools', points: 28, needs: ['fire'], description: 'Shaped the first tools' },
  { name: 'farming', points: 45, needs: ['stone tools'], description: 'Learned to grow food' },
  { name: 'village', points: 70, needs: ['farming'], description: 'Founded a village' },
  { name: 'metalworking', points: 100, needs: ['village'], description: 'Learned to work metal' }
];
function createWorld() {
  const world = { id: randomUUID(), day: 1, agents: [], trees: [], water: [], animals: [], structures: [], events: [], knowledge: [], research: 0, births: 0, deaths: 0, running: false, busy: false, error: null, startedAt: null, lastRoundSeconds: null };
  for (let i = 0; i < 10; i++) world.agents.push({ id: randomUUID(), name: names[i], x: (i < 5 ? -1 : 1) * between(28, 45), z: between(-17, 17), energy: 100, thirst: 100, food: 1, wood: 0, stone: 0, age: 0, generation: 1, memory: [], alive: true, action: 'arriving' });
  for (let i = 0; i < 85; i++) { const tree = { id: randomUUID(), x: between(-44, 44), z: between(-44, 44), wood: 4 }; clearTerrain(tree); world.trees.push(tree); }
  for (let i = 0; i < 15; i++) { const animal = { id: randomUUID(), x: between(-40, 40), z: between(-40, 40), food: 3 }; clearTerrain(animal); world.animals.push(animal); }
  world.water = [{ x: -25, z: -18, radius: 12 }, { x: 29, z: 23, radius: 10 }];
  expandWorld(world);
  record(world, 'Ten agents entered the world.');
  return world;
}
function record(world, text, agent) { world.events.unshift({ day: world.day, elapsedSeconds: world.startedAt ? Math.floor((Date.now() - Date.parse(world.startedAt)) / 1000) : 0, text, agent: agent || null }); world.events.length = Math.min(world.events.length, 30); }
function observation(world, agent) {
  const closest = list => list.map(item => ({ ...item, distance: Math.round(travelDistance(agent, item)) })).sort((a,b) => a.distance - b.distance).slice(0, 3).map(({id, x, z, distance}) => ({id, x: Math.round(x), z: Math.round(z), distance}));
  return { day: world.day, self: { name: agent.name, energy: agent.energy, thirst: agent.thirst, food: agent.food, wood: agent.wood, age: agent.age, generation: agent.generation }, nearby: { trees: closest(world.trees.filter(t => t.wood > 0)), animals: closest(world.animals.filter(a => a.food > 0)), water: closest([...world.water,...world.river]), shelters: closest(world.structures.filter(s => s.type === 'shelter')) }, world: { size: world.size, terrain: 'Mountains are scattered across both sides of a river. Cross at the bridge at z=0.', discoveries: world.knowledge, research: world.research, population: world.agents.length }, memory: agent.memory.slice(-5) };
}
const ACTIONS = ['gather', 'drink', 'hunt', 'build', 'research', 'rest', 'share'];
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
  const target = action === 'gather' ? nearest(world.trees.filter(t => t.wood > 0)) : action === 'hunt' ? nearest(world.animals.filter(a => a.food > 0)) : null;
  agent.action = action;
  agent.age++; agent.energy -= 9; agent.thirst -= 11;
  if (action === 'gather' && approach(world, agent, target, 20)) { target.wood--; agent.wood += world.knowledge.includes('stone tools') ? 3 : 2; record(world, `${agent.name} gathered wood.`, agent.name); }
  if (action === 'drink' && approach(world, agent, nearest([...world.water,...world.river]), 12)) { agent.thirst = 100; record(world, `${agent.name} found water.`, agent.name); }
  if (action === 'hunt' && approach(world, agent, target, 20)) { target.food--; agent.food += world.knowledge.includes('stone tools') ? 3 : 2; record(world, `${agent.name} hunted an animal.`, agent.name); }
  if (action === 'build' && agent.wood >= 4) { agent.wood -= 4; world.structures.push({ id: randomUUID(), type: 'shelter', x: agent.x, z: agent.z, builder: agent.name }); record(world, `${agent.name} built a shelter.`, agent.name); }
  if (action === 'research') { world.research += 4 + (world.knowledge.includes('fire') ? 2 : 0); record(world, `${agent.name} studied the world.`, agent.name); }
  if (action === 'rest') { agent.energy = Math.min(100, agent.energy + (world.structures.some(s => near(agent,s) < 10) ? 28 : 17)); }
  if (action === 'share' && agent.food > 1) { const other = world.agents.filter(a => a !== agent).sort((a,b) => a.food - b.food)[0]; if (other) { agent.food--; other.food++; record(world, `${agent.name} shared food with ${other.name}.`, agent.name); } }
  if (agent.food > 0 && agent.energy < 75) { agent.food--; agent.energy = Math.min(100, agent.energy + (world.knowledge.includes('fire') ? 28 : 22)); }
  if (agent.thirst <= 0 || agent.energy <= 0 || agent.age > 90) { world.agents.splice(world.agents.indexOf(agent), 1); world.deaths++; record(world, `${agent.name} died on day ${world.day}.`, agent.name); }
  else if (agent.energy > 70 && agent.thirst > 70 && agent.food > 1 && agent.age > 8 && world.agents.length < 20 && Math.random() < .035) { agent.food--; world.births++; const child = { id: randomUUID(), name: `${agent.name} ${world.births + 1}`, x: agent.x+1, z: agent.z+1, energy: 85, thirst: 85, food: 1, wood: 0, stone: 0, age: 0, generation: agent.generation + 1, memory: [`${agent.name} taught me: ${world.knowledge.join(', ') || 'survive'}`], alive: true, action: 'born' }; world.agents.push(child); record(world, `${child.name} was born into generation ${child.generation}.`, child.name); }
  const thought = typeof decision?.reason === 'string' ? decision.reason.slice(0, 180) : '';
  agent.memory.push(`Day ${world.day}: ${action}${thought ? ` — ${thought}` : ''}`); agent.memory.length = Math.min(agent.memory.length, 8);
}
function advance(world, decisions) {
  const living = [...world.agents];
  for (const agent of living) applyDecision(world, agent, decisions[agent.id]);
  for (const recipe of RECIPES) if (!world.knowledge.includes(recipe.name) && recipe.needs.every(n => world.knowledge.includes(n)) && world.research >= recipe.points) { world.research -= recipe.points; world.knowledge.push(recipe.name); record(world, recipe.description); break; }
  world.day++;
  if (world.day % 4 === 0 && world.animals.filter(a => a.food > 0).length < 150) world.animals.push({ id: randomUUID(), ...outerPosition(), food: 3 });
  if (world.day % 3 === 0) for (const tree of world.trees) tree.wood = Math.min(4, tree.wood + 1);
  if (!world.agents.length) { world.running = false; record(world, 'The population has gone extinct.'); }
}
module.exports = { createWorld, expandWorld, observation, applyDecision, advance, ACTIONS, WORLD_SIZE };
