const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createWorld, observation, advance} = require('./simulation');
test('ten agents inhabit a world with trees, water and animals', () => {
  const world = createWorld();
  assert.equal(world.agents.length, 10);
  assert.ok(world.trees.length > 0 && world.water.length > 0 && world.animals.length > 0);
  assert.equal(observation(world, world.agents[0]).self.name, world.agents[0].name);
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
