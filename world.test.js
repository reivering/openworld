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
  assert.equal(world.mountains.length, 18);
  assert.equal(world.agents.filter(a => a.x < 0).length, 5);
  assert.equal(world.agents.filter(a => a.x > 0).length, 5);
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
test('existing worlds gain mountains without moving their history or resources twice', () => {
  const world = createWorld(), agent = world.agents[0];
  delete world.mountains;
  agent.x = -3; agent.z = 100;
  world.trees[0].x = 2; world.trees[0].z = 80;
  expandWorld(world);
  const moved = world.trees[0].x;
  expandWorld(world);
  assert.equal(world.agents[0], agent);
  assert.equal(agent.x, -24);
  assert.equal(moved, 24);
  assert.equal(world.trees[0].x, moved);
  assert.equal(world.mountains.length, 18);
});
test('agents cross the mountain range through the central pass', () => {
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
  advance(world, Object.fromEntries(world.agents.map(a => [a.id, {action:'rest'}])));
  assert.equal(world.agents.length, 0);
  assert.equal(world.running, false);
});
