const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { timingSafeEqual } = require('node:crypto');
const { createWorld, expandWorld, advance, WORLD_SIZE } = require('./simulation');
const { decide } = require('./agent');
const dataDir = path.join(__dirname, 'data');
const saveFile = path.join(dataDir, 'world.json');
const files = {
  '/': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/world.js': ['world.js', 'text/javascript'],
  '/vendor/three.module.js': ['node_modules/three/build/three.module.js', 'text/javascript'],
  '/vendor/three.core.js': ['node_modules/three/build/three.core.js', 'text/javascript'],
  '/vendor/OrbitControls.js': ['node_modules/three/examples/jsm/controls/OrbitControls.js', 'text/javascript']
};
let world;
let migrated = false;
try { world = JSON.parse(fs.readFileSync(saveFile, 'utf8')); world.running = false; world.busy = false; world.error = null; migrated = !world.size || world.size < WORLD_SIZE || !world.mountains; expandWorld(world); } catch { world = createWorld(); }
function save() { fs.mkdirSync(dataDir, {recursive:true}); const tmp = `${saveFile}.tmp`; fs.writeFileSync(tmp, JSON.stringify(world)); fs.renameSync(tmp, saveFile); }
if (migrated) save();
function state() { return { ...world, agents: world.agents.map(({memory, ...agent}) => ({...agent, lastThought: memory.at(-1) || ''})) }; }
function json(res, code, value) { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'}); res.end(JSON.stringify(value)); }
function auth(req, res) {
  if (!process.env.WORLD_PASSWORD) return true;
  const expected = Buffer.from(`world:${process.env.WORLD_PASSWORD}`).toString('base64');
  const received = req.headers.authorization?.replace(/^Basic /, '') || '';
  const a = Buffer.from(received), b = Buffer.from(expected);
  if (a.length === b.length && timingSafeEqual(a,b)) return true;
  res.writeHead(401, {'WWW-Authenticate':'Basic realm="Little World"'}); res.end('Sign in required'); return false;
}
async function runRound() {
  while (world.running && world.agents.length) {
    const current = world; current.busy = true; current.error = null;
    const began = Date.now();
    try {
      const agents = [...current.agents], decisions = {};
      let index = 0;
      async function worker() { while (index < agents.length) { const agent = agents[index++]; decisions[agent.id] = await decide(current, agent); } }
      await Promise.all([worker(), worker()]);
      if (current !== world || !current.running) break;
      advance(current, decisions); current.lastRoundSeconds = Math.round((Date.now() - began) / 1000); save();
    } catch (err) { if (current === world) { current.error = String(err.message || err).slice(0, 300); current.running = false; save(); } break; }
    finally { current.busy = false; }
  }
}
const server = http.createServer((req, res) => {
  if (!auth(req,res)) return;
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/state' && req.method === 'GET') return json(res, 200, state());
  if (url.pathname === '/api/start' && req.method === 'POST') {
    if (!process.env.WORLD_PASSWORD) return json(res, 403, {error:'Set WORLD_PASSWORD before enabling Codex agents.'});
    if (!world.running) { world.running = true; world.startedAt ||= new Date().toISOString(); save(); runRound(); }
    return json(res, 200, state());
  }
  if (url.pathname === '/api/pause' && req.method === 'POST') { world.running = false; save(); return json(res, 200, state()); }
  if (url.pathname === '/api/reset' && req.method === 'POST') { world.running = false; world = createWorld(); save(); return json(res, 200, state()); }
  const file = files[url.pathname];
  if (req.method !== 'GET' || !file) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(__dirname, file[0]), (err, data) => {
    if (err) { res.writeHead(500); return res.end('Unable to load file'); }
    res.writeHead(200, {'Content-Type':`${file[1]}; charset=utf-8`, 'X-Content-Type-Options':'nosniff'}); res.end(data);
  });
});
if (require.main === module) { const port = Number(process.env.PORT || 3010); const host = process.env.WORLD_PASSWORD ? '0.0.0.0' : '127.0.0.1'; server.listen(port, host, () => console.log(`Little World listening on ${host}:${port}`)); }
module.exports = { server };
