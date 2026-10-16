const http = require('node:http');
const { randomBytes, randomUUID, timingSafeEqual } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const EVENTS = new Set(['SessionStart', 'SessionEnd', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop', 'Notification', 'Interrupt']);
const text = (value, max = 500) => typeof value === 'string' ? value.slice(0, max) : '';
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const shortPath = value => text(value, 2000).split(/[\\/]/).filter(Boolean).pop() || 'Untitled workspace';

// Only Lu's isolated renderer can resolve a request. The HTTP side accepts hook
// events but has no route for approvals. Requests and tool input stay in memory.
function createAgentBridge({ onChange = () => {}, onAttention = () => {}, timeoutMs = 115000, clickDelayMs = 650 } = {}) {
  const sessions = new Map(), pending = new Map();
  let server, token = '', enabled = false, port = 0, descriptor = '';
  function snapshot() {
    return { enabled, port, sessions: [...sessions.values()].sort((a, b) => b.updatedAt - a.updatedAt), requests: [...pending.values()].map(p => p.view) };
  }
  function changed() { onChange(snapshot()); }
  function finish(id, output = {}, label = 'Answer in agent') {
    const item = pending.get(id); if (!item) return false;
    pending.delete(id); clearTimeout(item.timer);
    const session = sessions.get(item.view.sessionId);
    if (session) { session.status = [...pending.values()].some(p => p.view.sessionId === session.id) ? 'waiting' : 'idle'; session.detail = label; session.updatedAt = Date.now(); }
    item.resolve(output); changed(); return true;
  }
  function accept(packet) {
    if (!enabled || !object(packet) || !['claude', 'codex'].includes(packet.agent) || !object(packet.event)) throw new Error('Invalid agent event.');
    const { agent, event } = packet, name = event.hook_event_name;
    const waiting = name === 'PermissionRequest' || (agent === 'claude' && name === 'PreToolUse' && event.tool_name === 'AskUserQuestion');
    if ((!EVENTS.has(name) && !waiting) || (agent === 'codex' && name === 'Notification')) throw new Error('Unsupported event.');
    if (typeof event.session_id !== 'string' || !event.session_id.length || event.session_id.length > 200) throw new Error('Missing session id.');
    const sessionId = agent + ':' + event.session_id, now = Date.now();
    let session = sessions.get(sessionId);
    if (!session) {
      if (sessions.size >= 50) { const removable = [...sessions.values()].find(s => ![...pending.values()].some(p => p.view.sessionId === s.id)); if (!removable) throw new Error('Too many sessions.'); sessions.delete(removable.id); }
      session = { id: sessionId, agent, project: shortPath(event.cwd), cwd: text(event.cwd, 2000), status: 'idle', detail: 'Connected', updatedAt: now, events: [] }; sessions.set(sessionId, session);
    }
    session.updatedAt = now;
    session.events.push({ name, tool: text(event.tool_name, 120), at: now }); session.events = session.events.slice(-16);
    if (name === 'SessionEnd' || name === 'Interrupt') for (const [id, item] of pending) if (item.view.sessionId === sessionId) finish(id, {}, name === 'Interrupt' ? 'Interrupted in agent' : 'Session ended');
    if (!waiting) {
      if (![...pending.values()].some(p => p.view.sessionId === sessionId)) session.status = name === 'SessionEnd' ? 'ended' : ['Stop', 'Interrupt', 'Notification'].includes(name) ? 'idle' : name === 'SessionStart' ? 'idle' : 'working';
      session.detail = name === 'Stop' ? 'Turn complete' : name === 'Notification' ? text(event.message, 250) || 'Needs attention in agent' : name === 'SessionEnd' ? 'Session ended' : event.tool_name ? text(event.tool_name, 120) : name === 'UserPromptSubmit' ? 'Working on your request' : name === 'SessionStart' ? 'Session connected' : name;
      changed(); return { output: {} };
    }
    if (pending.size >= 10 || !object(event.tool_input)) throw new Error('Request unavailable.');
    const input = event.tool_input;
    const questions = agent === 'claude' && event.tool_name === 'AskUserQuestion' ? input.questions : null;
    if (agent === 'claude' && event.tool_name === 'AskUserQuestion' && (!Array.isArray(questions) || questions.length < 1 || questions.length > 4 || questions.some(q => !object(q) || typeof q.question !== 'string' || !q.question.length || q.question.length > 2000 || !Array.isArray(q.options) || q.options.length > 8 || q.options.some(o => !object(o) || typeof o.label !== 'string' || o.label.length > 300)) || new Set(questions.map(q => q.question)).size !== questions.length)) throw new Error('Unsupported questions.');
    // Keep the exact bounded input visible. Never approve a truncated command.
    const details = JSON.stringify(input, null, 2); if (details.length > 50000) throw new Error('Request is too large to review in Lu.');
    const id = randomUUID(), view = { id, sessionId, agent, project: session.project, cwd: session.cwd, tool: text(event.tool_name, 200), title: questions ? 'A question for you' : 'Permission requested', description: text(input.description, 2000), details, questions: questions || [], createdAt: now, expiresAt: now + timeoutMs };
    let resolve; const result = new Promise(done => { resolve = done; });
    const item = { view, input, name, resolve, timer: setTimeout(() => finish(id, {}, 'Request timed out · answer in agent'), timeoutMs) };
    pending.set(id, item); session.status = 'waiting'; session.detail = questions ? 'Waiting for your answer' : 'Waiting for permission';
    changed(); onAttention(view); return { id, result };
  }
  function reply(id, decision, answers) {
    const item = pending.get(id); if (!item) throw new Error('This request has ended. Answer in the agent if it is still waiting.');
    if (Date.now() - item.view.createdAt < clickDelayMs) throw new Error('Take a moment to review this request.');
    if (Date.now() >= item.view.expiresAt) { finish(id); throw new Error('This request expired.'); }
    if (!['allow', 'deny', 'fallback', 'answers'].includes(decision)) throw new Error('Invalid response.');
    if (decision === 'fallback') return finish(id);
    let output;
    if (item.view.questions.length) {
      if (decision !== 'answers' || !object(answers) || Object.keys(answers).length !== item.view.questions.length || item.view.questions.some(q => typeof answers[q.question] !== 'string' || !answers[q.question].trim() || answers[q.question].length > 4000)) throw new Error('Answer each question, or continue in the agent.');
      const updatedInput = { ...item.input, answers };
      output = item.name === 'PreToolUse' ? { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', updatedInput } } : { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow', updatedInput } } };
    } else {
      if (decision === 'answers') throw new Error('This request needs a permission decision.');
      output = { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: decision === 'allow' ? { behavior: 'allow' } : { behavior: 'deny', message: 'Declined by the user in Lu.' } } };
    }
    return finish(id, output, decision === 'deny' ? 'Declined in Lu' : decision === 'answers' ? 'Answer sent from Lu' : 'Allowed once in Lu');
  }
  async function route(req, res) {
    res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store');
    const respond = (code, body) => { if (!res.destroyed) { res.writeHead(code); res.end(JSON.stringify(body)); } };
    const supplied = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, '')), expected = Buffer.from(token);
    if (req.headers.origin || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return respond(403, {});
    if (req.method !== 'POST' || req.url !== '/v1/events') return respond(404, {});
    if (!String(req.headers['content-type']).startsWith('application/json')) return respond(415, {});
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 131072) { respond(413, {}); req.destroy(); return; } chunks.push(chunk); }
      const accepted = accept(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      if (accepted.result) { res.once('close', () => finish(accepted.id, {}, 'Connection closed · answer in agent')); respond(200, await accepted.result); }
      else respond(200, accepted.output);
    } catch { respond(400, {}); }
  }
  async function start(directory) {
    if (server) return snapshot();
    token = randomBytes(32).toString('hex'); descriptor = path.join(directory, 'agent-bridge.json');
    server = http.createServer((req, res) => { void route(req, res); }); server.requestTimeout = 10000; server.headersTimeout = 10000;
    try {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      port = server.address().port; enabled = true;
      await fs.mkdir(directory, { recursive: true });
      const temp = descriptor + '.tmp'; await fs.writeFile(temp, JSON.stringify({ port, token }), { mode: 0o600 }); await fs.rename(temp, descriptor);
      changed(); return snapshot();
    } catch (error) { await stop(); throw error; }
  }
  async function stop() {
    enabled = false; for (const id of [...pending.keys()]) finish(id, {}, 'Lu disconnected · answer in agent');
    for (const session of sessions.values()) { session.status = 'ended'; session.detail = 'Lu disconnected'; }
    if (server) {
      const closing = server; server = null;
      await new Promise(resolve => { const timer = setTimeout(() => { closing.closeAllConnections(); }, 1500); timer.unref(); closing.close(() => { clearTimeout(timer); resolve(); }); });
    }
    port = 0; token = ''; if (descriptor) await fs.rm(descriptor, { force: true }); changed(); return snapshot();
  }
  return { start, stop, snapshot, reply, clear() { for (const [id] of sessions) if (![...pending.values()].some(p => p.view.sessionId === id)) sessions.delete(id); changed(); } };
}

function hookConfig(agent, executable, descriptor) {
  if (!['claude', 'codex'].includes(agent)) throw new Error('Unknown agent.');
  const quote = value => { const p = path.resolve(value).replaceAll('\\', '/'); if (/["`$%\r\n]/.test(p)) throw new Error('Move Lu to a path without shell special characters before connecting agents.'); return '"' + p + '"'; };
  const command = `${agent === 'claude' ? '& ' : ''}${quote(executable)} --agent ${agent} --bridge ${quote(descriptor)}`;
  const names = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PermissionRequest', 'PostToolUse', 'Stop', 'SessionEnd', ...(agent === 'claude' ? ['Notification'] : ['Interrupt'])];
  return { hooks: Object.fromEntries(names.map(name => [name, [{ hooks: [{ type: 'command', ...(agent === 'claude' ? { shell: 'powershell' } : {}), command, timeout: ['PermissionRequest', 'PreToolUse'].includes(name) ? 125 : 5, ...(agent === 'codex' && name === 'PermissionRequest' ? { statusMessage: 'Waiting for your response in Lu' } : {}) }] }]])) };
}
module.exports = { createAgentBridge, hookConfig };
