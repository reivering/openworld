const { randomUUID } = require('node:crypto');
const names = ['Moss', 'Clover', 'Sol', 'Pip', 'Wren', 'Ember', 'Fern', 'Ash', 'River', 'Juniper'];
const between = (min, max) => min + Math.random() * (max - min);
const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const choose = items => items[Math.floor(Math.random() * items.length)];
const RECIPES = [
  { name: 'fire', points: 18, needs: [], description: 'Learned to control fire' },
  { name: 'stone tools', points: 28, needs: ['fire'], description: 'Shaped the first tools' },
  { name: 'farming', points: 45, needs: ['stone tools'], description: 'Learned to grow food' },
  { name: 'village', points: 70, needs: ['farming'], description: 'Founded a village' },
  { name: 'metalworking', points: 100, needs: ['village'], description: 'Learned to work metal' }
];
function createWorld() {
  const world = { id: randomUUID(), day: 1, agents: [], trees: [], water: [], animals: [], structures: [], events: [], knowledge: [], research: 0, births: 0, deaths: 0, running: false, busy: false, error: null, startedAt: null, lastRoundSeconds: null };
  for (let i = 0; i < 10; i++) world.agents.push({ id: randomUUID(), name: names[i], x: between(-17, 17), z: between(-17, 17), energy: 100, thirst: 100, food: 1, wood: 0, stone: 0, age: 0, generation: 1, memory: [], alive: true, action: 'arriving' });
  for (let i = 0; i < 85; i++) world.trees.push({ id: randomUUID(), x: between(-44, 44), z: between(-44, 44), wood: 4 });
  for (let i = 0; i < 15; i++) world.animals.push({ id: randomUUID(), x: between(-40, 40), z: between(-40, 40), food: 3 });
  world.water = [{ x: -25, z: -18, radius: 12 }, { x: 29, z: 23, radius: 10 }];
  record(world, 'Ten agents entered the world.');
  return world;
}
function record(world, text, agent) { world.events.unshift({ day: world.day, elapsedSeconds: world.startedAt ? Math.floor((Date.now() - Date.parse(world.startedAt)) / 1000) : 0, text, agent: agent || null }); world.events.length = Math.min(world.events.length, 30); }
function observation(world, agent) {
  const closest = list => list.map(item => ({ ...item, distance: Math.round(near(agent, item)) })).sort((a,b) => a.distance - b.distance).slice(0, 3).map(({id, x, z, distance}) => ({id, x: Math.round(x), z: Math.round(z), distance}));
  return { day: world.day, self: { name: agent.name, energy: agent.energy, thirst: agent.thirst, food: agent.food, wood: agent.wood, age: agent.age, generation: agent.generation }, nearby: { trees: closest(world.trees.filter(t => t.wood > 0)), animals: closest(world.animals.filter(a => a.food > 0)), water: closest(world.water), shelters: closest(world.structures.filter(s => s.type === 'shelter')) }, world: { discoveries: world.knowledge, research: world.research, population: world.agents.length }, memory: agent.memory.slice(-5) };
}
const ACTIONS = ['gather', 'drink', 'hunt', 'build', 'research', 'rest', 'share'];
function applyDecision(world, agent, decision) {
  if (!world.agents.includes(agent)) return;
  const action = ACTIONS.includes(decision?.action) ? decision.action : 'rest';
  const target = action === 'gather' ? world.trees.find(t => t.wood > 0 && near(agent,t) < 25) : action === 'hunt' ? world.animals.find(a => a.food > 0 && near(agent,a) < 25) : null;
  agent.action = action;
  agent.age++; agent.energy -= 9; agent.thirst -= 11;
  if (action === 'gather' && target) { agent.x = target.x; agent.z = target.z; target.wood--; agent.wood += world.knowledge.includes('stone tools') ? 3 : 2; record(world, `${agent.name} gathered wood.`, agent.name); }
  if (action === 'drink') { const water = world.water.find(w => near(agent,w) < 30); if (water) { agent.x = water.x + 4; agent.z = water.z + 4; agent.thirst = 100; record(world, `${agent.name} found water.`, agent.name); } }
  if (action === 'hunt' && target) { agent.x = target.x; agent.z = target.z; target.food--; agent.food += world.knowledge.includes('stone tools') ? 3 : 2; record(world, `${agent.name} hunted an animal.`, agent.name); }
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
  if (world.day % 4 === 0 && world.animals.filter(a => a.food > 0).length < 25) world.animals.push({ id: randomUUID(), x: between(-40,40), z: between(-40,40), food: 3 });
  if (world.day % 3 === 0) for (const tree of world.trees) tree.wood = Math.min(4, tree.wood + 1);
  if (!world.agents.length) { world.running = false; record(world, 'The population has gone extinct.'); }
}
module.exports = { createWorld, observation, applyDecision, advance, ACTIONS };
