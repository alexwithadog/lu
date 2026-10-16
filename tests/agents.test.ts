import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { createAgentBridge, hookConfig } = require('../desktop/agents.cjs');
const { agentSetup } = require('../desktop/agent-setup.cjs');
const root = resolve('.'), testRoot = join(root, '.lu-test-data');
async function directory() { await mkdir(testRoot, { recursive: true }); return mkdtemp(join(testRoot, 'agents-')); }
async function dispose(dir: string) { assert.ok(dir.startsWith(join(testRoot, 'agents-'))); await rm(dir, { recursive: true, force: true }); }
const event = (name = 'PermissionRequest', extra: object = {}) => ({ agent: 'codex', event: { session_id: 'test-session', hook_event_name: name, cwd: 'C:/Projects/Lu', tool_name: 'Bash', tool_input: { command: 'echo test-only', description: 'A harmless test fixture' }, ...extra } });
async function connected(options: object = {}) {
  const dir = await directory(), bridge = createAgentBridge({ clickDelayMs: 0, ...options }); await bridge.start(dir);
  const descriptor = JSON.parse(await readFile(join(dir, 'agent-bridge.json'), 'utf8'));
  const post = (packet: object, headers = {}) => fetch(`http://127.0.0.1:${descriptor.port}/v1/events`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + descriptor.token, ...headers }, body: JSON.stringify(packet) });
  return { dir, bridge, descriptor, post, close: async () => { await bridge.stop(); await dispose(dir); } };
}
async function waiting(bridge: any) { for (let n = 0; n < 60; n++) { if (bridge.snapshot().requests.length) return bridge.snapshot().requests[0]; await new Promise(done => setTimeout(done, 10)); } throw Error('Request did not arrive.'); }
test('the loopback bridge requires authentication, refuses browser origins, and returns only a human-selected one-time decision', async () => {
  const h = await connected(); try {
    assert.equal((await h.post(event(), { authorization: 'Bearer wrong' })).status, 403);
    assert.equal((await h.post(event(), { origin: 'https://example.com' })).status, 403);
    const response = h.post(event()), request = await waiting(h.bridge);
    assert.equal(request.project, 'Lu'); assert.equal(h.bridge.snapshot().sessions[0].status, 'waiting'); assert.ok(request.details.includes('echo test-only'));
    assert.ok(!JSON.stringify(h.bridge.snapshot()).includes(h.descriptor.token));
    h.bridge.reply(request.id, 'allow'); assert.deepEqual(await (await response).json(), { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } });
    assert.throws(() => h.bridge.reply(request.id, 'allow'), /ended/); assert.equal(h.bridge.snapshot().requests.length, 0);
  } finally { await h.close(); }
});
test('timeouts, disconnection, invalid payloads, and explicit fallback never grant permission', async () => {
  const h = await connected({ timeoutMs: 100 }); try {
    assert.equal((await h.post(event('BadEvent'))).status, 400);
    assert.deepEqual(await (await h.post(event())).json(), {});
    const response = h.post(event()); const request = await waiting(h.bridge); h.bridge.reply(request.id, 'fallback'); assert.deepEqual(await (await response).json(), {});
    const interrupted = h.post(event()); await waiting(h.bridge); await h.post(event('SessionEnd')); assert.deepEqual(await (await interrupted).json(), {});
    const stopping = h.post(event()); await waiting(h.bridge); await h.bridge.stop(); assert.deepEqual(await (await stopping).json(), {}); assert.equal(h.bridge.snapshot().requests.length, 0);
  } finally { await h.close(); }
});
test('Claude question answers echo the original input and only valid complete answers are sent', async () => {
  const h = await connected(); try {
    const input = { questions: [{ question: 'Which framework?', options: [{ label: 'Tauri' }, { label: 'Electron' }], multiSelect: false }], unchanged: 'keep this' };
    const response = h.post({ agent: 'claude', event: { session_id: 'q', hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', tool_input: input } });
    const request = await waiting(h.bridge);
    assert.throws(() => h.bridge.reply(request.id, 'allow'), /Answer each/); assert.throws(() => h.bridge.reply(request.id, 'answers', {}), /Answer each/);
    h.bridge.reply(request.id, 'answers', { 'Which framework?': 'Electron' });
    const output = await (await response).json(); assert.equal(output.hookSpecificOutput.permissionDecision, 'allow'); assert.equal(output.hookSpecificOutput.updatedInput.unchanged, 'keep this'); assert.deepEqual(output.hookSpecificOutput.updatedInput.answers, { 'Which framework?': 'Electron' });
    const invalid = await h.post({ agent: 'claude', event: { session_id: 'q', hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', tool_input: {} } }); assert.equal(invalid.status, 400);
  } finally { await h.close(); }
});
test('requests cannot be accepted immediately as the UI opens', async () => {
  const h = await connected({ clickDelayMs: 600 }); try { const response = h.post(event()); const request = await waiting(h.bridge); assert.throws(() => h.bridge.reply(request.id, 'allow'), /review/); await h.bridge.stop(); assert.deepEqual(await (await response).json(), {}); } finally { await h.close(); }
});
test('connection setup backs up existing settings, merges other hooks, is idempotent, and removes only Lu', async () => {
  const dir = await directory(); try {
    await mkdir(join(dir, '.claude')); const file = join(dir, '.claude', 'settings.json');
    const original = JSON.stringify({ model: 'keep-model', hooks: { SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: 'other-app-hook' }] }] } }); await writeFile(file, original);
    const setup = agentSetup({ home: dir, executable: join(dir, 'Lu.Hook.exe'), descriptor: join(dir, 'agent-bridge.json') });
    assert.equal((await setup.preview('claude')).installed, false);
    const installed = await setup.update('claude', true); assert.equal(installed.installed, true); assert.equal(await readFile(installed.backup, 'utf8'), original);
    await new Promise(done => setTimeout(done, 2)); await setup.update('claude', true);
    const value = JSON.parse(await readFile(file, 'utf8')); assert.equal(value.model, 'keep-model'); assert.equal(value.hooks.SessionStart.length, 2); assert.equal(value.hooks.SessionStart[0].hooks[0].command, 'other-app-hook');
    await new Promise(done => setTimeout(done, 2)); await setup.update('claude', false); assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), JSON.parse(original));
    await writeFile(file, 'malformed'); await assert.rejects(setup.update('claude', true), /safely/); assert.equal(await readFile(file, 'utf8'), 'malformed');
    assert.throws(() => hookConfig('unknown', '', ''), /Unknown/);
  } finally { await dispose(dir); }
});
test('the compiled Windows relay exchanges a real hook payload and emits the selected result on stdout', { skip: process.platform !== 'win32' }, async () => {
  const h = await connected(); try {
    const child = spawn(join(root, 'desktop', 'Lu.Hook.exe'), ['--agent', 'codex', '--bridge', join(h.dir, 'agent-bridge.json')], { windowsHide: true });
    let output = ''; child.stdout.on('data', chunk => output += chunk.toString());
    const done = new Promise((resolve, reject) => { child.on('exit', resolve); child.on('error', reject); });
    child.stdin.end(JSON.stringify(event().event)); const request = await waiting(h.bridge); h.bridge.reply(request.id, 'deny'); await done;
    assert.equal(JSON.parse(output).hookSpecificOutput.decision.behavior, 'deny');
  } finally { await h.close(); }
});
