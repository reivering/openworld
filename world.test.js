const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createWorld, expandWorld, observation, applyDecision, advance, WORLD_SIZE} = require('./simulation');
test('ten agents inhabit a world with trees, water and animals', () => {
  const world = createWorld();
  assert.equal(world.agents.length, 10);
  assert.equal(world.size, WORLD_SIZE);
  assert.equal(world.trees.length, 850);
  assert.equal(world.water.length, 20);
  assert.equal(world.animals.length, 150);
  assert.equal(world.mountains.length, 4);
  assert.equal(world.river.length, 72);
  assert.equal(world.plants.length, 120);
  assert.equal(world.deposits.length, 100);
  for (const resource of [...world.plants,...world.deposits]) assert.ok(world.water.every(lake => Math.hypot(resource.x-lake.x,resource.z-lake.z)>lake.radius));
  assert.equal(world.agents[0].health, 100);
  assert.equal(world.agents.filter(a => a.x < 0).length, 5);
  assert.equal(world.agents.filter(a => a.x > 0).length, 5);
  for (const agent of world.agents) {
    assert.ok(world.water.every(lake => Math.hypot(agent.x-lake.x,agent.z-lake.z)>lake.radius));
    assert.ok(world.mountains.every(m => Math.hypot(agent.x-m.x,agent.z-m.z)>m.radius));
  }
  assert.ok(world.trees.some(t => Math.abs(t.x) > 55 || Math.abs(t.z) > 55));
  assert.equal(observation(world, world.agents[0]).self.name, world.agents[0].name);
});
test('saved small worlds expand once without losing their history', () => {
  const world = createWorld(), id = world.id, agent = world.agents[0];
  world.size = 110; world.trees.length = 85; world.animals.length = 15; world.water.length = 2;
  world.knowledge.push('fire');
  expandWorld(world); expandWorld(world);
  assert.equal(world.id, id);
  assert.equal(world.agents[0], agent);
  assert.deepEqual(world.knowledge, ['fire']);
  assert.equal(world.trees.length, 850);
  assert.equal(world.animals.length, 150);
  assert.equal(world.water.length, 20);
});
test('existing worlds gain scattered mountains and a river without moving history twice', () => {
  const world = createWorld(), agent = world.agents[0];
  delete world.terrainVersion;
  delete world.mountains;
  delete world.river;
  agent.x = -3; agent.z = 100;
  world.trees[0].x = -65; world.trees[0].z = 20;
  expandWorld(world);
  const moved = world.trees[0].x;
  expandWorld(world);
  assert.equal(world.agents[0], agent);
  assert.ok(agent.x < -12);
  assert.ok(Math.abs(moved+65) > 30);
  assert.equal(world.trees[0].x, moved);
  assert.equal(world.mountains.length, 4);
  assert.equal(world.river.length, 72);
  assert.equal(world.terrainVersion, 4);
});
test('saved worlds gain survival needs and resources once', () => {
  const world=createWorld(), agent=world.agents[0];
  delete world.ecologyVersion; delete world.plants; delete world.deposits; delete world.harvested;
  delete agent.hunger; delete agent.warmth; delete agent.health; delete agent.minerals;
  world.knowledge.push('fire');
  expandWorld(world);
  const plants=world.plants, deposits=world.deposits;
  expandWorld(world);
  assert.equal(world.agents[0],agent);
  assert.deepEqual(world.knowledge,['fire']);
  assert.equal(agent.health,100);
  assert.equal(world.plants,plants);
  assert.equal(world.deposits,deposits);
});
test('agents cross the river at the bridge', () => {
  const world = createWorld(), agent = world.agents[0];
  agent.x = -45; agent.z = 90; agent.energy = 1000; agent.thirst = 1000;
  world.trees = [{id:'east-tree', x:45, z:90, wood:4}];
  let enteredPass = false;
  for (let i=0; i<20 && !agent.wood; i++) {
    applyDecision(world, agent, {action:'gather'});
    if (Math.abs(agent.x) < 20) {
      assert.ok(Math.abs(agent.z) < 18);
      enteredPass = true;
    }
  }
  assert.ok(enteredPass);
  assert.ok(agent.x > 0);
  assert.equal(agent.wood, 2);
});
test('agents can drink from the river', () => {
  const world=createWorld(), agent=world.agents[0];
  agent.x=-16; agent.z=100; agent.thirst=20;
  world.water=[];
  applyDecision(world,agent,{action:'drink'});
  assert.equal(agent.thirst,100);
});
test('foraging and mining produce food and minerals', () => {
  const world=createWorld(), agent=world.agents[0];
  const plant=world.plants[0], deposit=world.deposits.find(d => d.type==='stone');
  agent.x=plant.x; agent.z=plant.z;
  applyDecision(world,agent,{action:'forage'});
  assert.equal(agent.food,3);
  assert.equal(plant.berries,2);
  agent.x=deposit.x; agent.z=deposit.z;
  applyDecision(world,agent,{action:'mine',resource:'stone'});
  assert.equal(agent.minerals.stone,1);
  assert.equal(world.harvested.stone,1);
  world.knowledge.push('metalworking');
  applyDecision(world,agent,{action:'mine',resource:'stone'});
  assert.equal(agent.minerals.stone,3);
  assert.equal(world.harvested.stone,3);
});
test('later discoveries require harvested materials', () => {
  const world=createWorld();
  world.knowledge.push('fire'); world.research=100;
  const choices=Object.fromEntries(world.agents.map(a => [a.id,{action:'rest'}]));
  advance(world,choices);
  assert.ok(!world.knowledge.includes('stone tools'));
  world.harvested.stone=2; world.harvested.flint=1;
  advance(world,choices);
  assert.ok(world.knowledge.includes('stone tools'));
});
test('a firepit consumes materials and restores warmth nearby', () => {
  const world=createWorld(), agent=world.agents[0];
  world.knowledge.push('fire'); agent.wood=2; agent.stone=2; agent.minerals.stone=2; agent.warmth=20;
  applyDecision(world,agent,{action:'craft'});
  assert.equal(world.structures[0].type,'firepit');
  assert.equal(agent.minerals.stone,0);
  assert.ok(agent.warmth>20);
});
test('agents travel around mountain slopes', () => {
  const world=createWorld(), agent=world.agents[0], mountain=world.mountains[0];
  agent.x=mountain.x-45; agent.z=mountain.z; agent.energy=1000; agent.thirst=1000;
  world.trees=[{id:'far-tree',x:mountain.x+45,z:mountain.z,wood:4}];
  for (let i=0; i<20 && !agent.wood; i++) {
    applyDecision(world,agent,{action:'gather'});
    assert.ok(Math.hypot(agent.x-mountain.x,agent.z-mountain.z) >= mountain.radius);
  }
  assert.equal(agent.wood,2);
});
test('agents can travel toward distant resources', () => {
  const world = createWorld(), agent = world.agents[0];
  agent.x = 0; agent.z = 0; agent.food = 5;
  world.trees = [{id:'far-tree', x:100, z:0, wood:4}];
  applyDecision(world, agent, {action:'gather'});
  assert.equal(agent.x, 20);
  assert.equal(agent.wood, 0);
  for (let i=0; i<4; i++) applyDecision(world, agent, {action:'gather'});
  assert.equal(agent.wood, 2);
  assert.equal(world.trees[0].wood, 3);
});
test('agent choices change shared world state and discoveries unlock in order', () => {
  const world = createWorld();
  const builder = world.agents[0]; builder.wood = 4;
  const decisions = Object.fromEntries(world.agents.map(a => [a.id, {action:'research', reason:'experiment'}]));
  decisions[builder.id] = {action:'build', reason:'shelter'};
  advance(world, decisions);
  assert.equal(world.structures.length, 1);
  assert.ok(world.knowledge.includes('fire'));
  assert.equal(world.day, 2);
  assert.ok(builder.memory[0].includes('build'));
});
test('a world can go extinct', () => {
  const world = createWorld();
  for (const agent of world.agents) agent.thirst = 0;
  world.running=true;
  for (let i=0;i<6 && world.agents.length;i++) advance(world, Object.fromEntries(world.agents.map(a => [a.id, {action:'rest'}])));
  assert.equal(world.agents.length, 0);
  assert.equal(world.running, false);
});
