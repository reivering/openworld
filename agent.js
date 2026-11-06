const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { observation } = require('./simulation');
const schema = path.join(__dirname, 'decision.schema.json');
function decide(world, agent) {
  return new Promise((resolve, reject) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'little-world-agent-'));
    const output = path.join(dir, 'decision.json');
    const prompt = `You are ${agent.name}, an individual in a survival world. Choose ONE action for the next day. Your goals are to survive, help others, build shelters, and discover technologies. Preserve your own priorities and memories. If thirst is low, drink. Research advances the whole civilization. Gathering, hunting, and drinking move you toward the nearest resource, up to 20 units per day if it is far away. Answer only the required JSON.\n\n${JSON.stringify(observation(world, agent))}`;
    const agentEnv = Object.fromEntries(['PATH', 'HOME', 'LANG', 'SSL_CERT_FILE', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
    agentEnv.CODEX_HOME = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
    const child = spawn('codex', ['exec', '--ephemeral', '--ignore-user-config', '--ignore-rules', '--skip-git-repo-check', '--sandbox', 'read-only', '--output-schema', schema, '--output-last-message', output, '-'], { cwd: dir, stdio: ['pipe', 'ignore', 'pipe'], env: agentEnv });
    let error = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), 90000);
    child.stderr.on('data', chunk => { error = (error + chunk).slice(-2000); });
    child.on('error', err => { clearTimeout(timer); fs.rmSync(dir, {recursive:true,force:true}); reject(err); });
    child.on('close', code => { clearTimeout(timer); try { if (code !== 0) throw new Error(error || `Codex exited ${code}`); const decision = JSON.parse(fs.readFileSync(output, 'utf8')); resolve(decision); } catch (err) { reject(err); } finally { fs.rmSync(dir, {recursive:true,force:true}); } });
    child.stdin.end(prompt);
  });
}
module.exports = { decide };
