const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { timingSafeEqual, randomBytes, createHash } = require('node:crypto');
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
const adminSessions = new Map(), loginAttempts = new Map();
const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;
let migrated = false;
try { world = JSON.parse(fs.readFileSync(saveFile, 'utf8')); world.running = false; world.busy = false; world.error = null; migrated = !world.size || world.size < WORLD_SIZE || world.terrainVersion !== 4 || !world.ecologyVersion; expandWorld(world); } catch { world = createWorld(); }
function save() { fs.mkdirSync(dataDir, {recursive:true}); const tmp = `${saveFile}.tmp`; fs.writeFileSync(tmp, JSON.stringify(world)); fs.renameSync(tmp, saveFile); }
if (migrated) save();
function state() { return { ...world, agents: world.agents.map(({memory, ...agent}) => ({...agent, lastThought: memory.at(-1) || ''})) }; }
function json(res, code, value) { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'}); res.end(JSON.stringify(value)); }
function adminConfigured() { return typeof process.env.WORLD_PASSWORD === 'string' && process.env.WORLD_PASSWORD.length >= 16; }
function secureRequest(req) { return req.socket.encrypted || process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-proto']?.split(',')[0].trim() === 'https'; }
function sameOrigin(req) {
  try { return !!req.headers.origin && new URL(req.headers.origin).origin === `${secureRequest(req) ? 'https' : 'http'}://${req.headers.host}`; }
  catch { return false; }
}
function sessionToken(req) {
  for (const part of (req.headers.cookie || '').split(';')) { const [name, ...value] = part.trim().split('='); if (name === 'world_admin') return value.join('='); }
  return '';
}
function isAdmin(req) {
  const token = sessionToken(req), expires = adminSessions.get(token);
  if (!expires) return false;
  if (expires <= Date.now()) { adminSessions.delete(token); return false; }
  return true;
}
function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  json(res, 401, {error:'Sign in as admin to manage the simulation.'});
  return false;
}
function adminCookie(req, token, maxAge) {
  return `world_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureRequest(req) ? '; Secure' : ''}`;
}
function login(req, res) {
  if (!adminConfigured()) return json(res, 503, {error:'Set a WORLD_PASSWORD of at least 16 characters on the server.'});
  const ip = (process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';
  if (!loginAttempts.has(ip) && loginAttempts.size >= 500) loginAttempts.delete(loginAttempts.keys().next().value);
  const attempt = loginAttempts.get(ip);
  if (attempt?.blockedUntil > Date.now()) return json(res, 429, {error:'Too many attempts. Try again later.'});
  let body = '', size = 0, tooLarge = false;
  req.on('data', chunk => { size += chunk.length; if (size > 4096) tooLarge = true; else if (!tooLarge) body += chunk.toString('utf8'); });
  req.on('end', () => {
    if (tooLarge) return json(res, 413, {error:'Request is too large.'});
    let password;
    try { password = JSON.parse(body).password; } catch {}
    const received = Buffer.from(typeof password === 'string' ? password : ''), expected = process.env.WORLD_PASSWORD;
    const valid = received.length > 0 && timingSafeEqual(createHash('sha256').update(received).digest(), createHash('sha256').update(expected).digest());
    if (!valid) {
      const current = loginAttempts.get(ip) || {failures:0, blockedUntil:0};
      current.failures++;
      if (current.failures >= 5) { current.failures = 0; current.blockedUntil = Date.now() + 15 * 60 * 1000; }
      loginAttempts.set(ip, current);
      return json(res, 401, {error:'Password not recognized.'});
    }
    loginAttempts.delete(ip);
    for (const [key, expires] of adminSessions) if (expires <= Date.now()) adminSessions.delete(key);
    if (adminSessions.size >= 8) adminSessions.delete(adminSessions.keys().next().value);
    const token = randomBytes(32).toString('base64url');
    adminSessions.set(token, Date.now() + ADMIN_SESSION_MS);
    res.setHeader('Set-Cookie', adminCookie(req, token, ADMIN_SESSION_MS / 1000));
    return json(res, 200, {authenticated:true});
  });
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
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname.startsWith('/api/') && !sameOrigin(req)) return json(res, 403, {error:'Request origin could not be verified.'});
  if (url.pathname === '/api/admin' && req.method === 'GET') return json(res, 200, {configured:adminConfigured(), authenticated:isAdmin(req)});
  if (url.pathname === '/api/login' && req.method === 'POST') return login(req, res);
  if (url.pathname === '/api/logout' && req.method === 'POST') {
    adminSessions.delete(sessionToken(req)); res.setHeader('Set-Cookie', adminCookie(req, '', 0)); return json(res, 200, {authenticated:false});
  }
  if (url.pathname === '/api/state' && req.method === 'GET') return json(res, 200, state());
  if (url.pathname === '/api/start' && req.method === 'POST') {
    if (!adminConfigured()) return json(res, 503, {error:'Set a WORLD_PASSWORD of at least 16 characters on the server.'});
    if (!requireAdmin(req,res)) return;
    if (!world.running) { world.running = true; world.startedAt ||= new Date().toISOString(); save(); runRound(); }
    return json(res, 200, state());
  }
  if (url.pathname === '/api/pause' && req.method === 'POST') { if (!requireAdmin(req,res)) return; world.running = false; save(); return json(res, 200, state()); }
  if (url.pathname === '/api/reset' && req.method === 'POST') { if (!requireAdmin(req,res)) return; world.running = false; world = createWorld(); save(); return json(res, 200, state()); }
  const file = files[url.pathname];
  if (req.method !== 'GET' || !file) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(__dirname, file[0]), (err, data) => {
    if (err) { res.writeHead(500); return res.end('Unable to load file'); }
    res.writeHead(200, {'Content-Type':`${file[1]}; charset=utf-8`, 'X-Content-Type-Options':'nosniff'}); res.end(data);
  });
});
if (require.main === module) { const port = Number(process.env.PORT || 3010); const host = process.env.HOST || (process.env.WORLD_PASSWORD ? '0.0.0.0' : '127.0.0.1'); server.listen(port, host, () => console.log(`Little World listening on ${host}:${port}`)); }
module.exports = { server };
