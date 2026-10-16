import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createContext, runInContext } from 'node:vm';
import { createRequire } from 'node:module';
import { readFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function harness() {
  const testRoot = join(root, '.lu-test-data'); await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(join(testRoot, 'bridge-')), handlers = new Map<string, Function>(), writes: string[] = [];
  const electron = {
    app: { isPackaged: false, setName() {}, setPath() {}, getPath: () => directory, getVersion: () => '0.1.0-test', requestSingleInstanceLock: () => true, on() {}, whenReady: () => new Promise(() => {}) },
    protocol: { registerSchemesAsPrivileged() {} }, ipcMain: { handle: (name: string, fn: Function) => handlers.set(name, fn) },
    safeStorage: { isEncryptionAvailable: () => true, encryptString: (text: string) => Buffer.from(text.split('').reverse().join('')), decryptString: (bytes: Buffer) => bytes.toString().split('').reverse().join('') },
    clipboard: { writeText: (text: string) => writes.push(text) },
    globalShortcut: { unregisterAll() {}, register: () => true },
    screen: { getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1366, height: 728 } }), getCursorScreenPoint: () => ({ x: 100, y: 100 }), getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 1366, height: 728 } }) },
  };
  const context = createContext({ require: (name: string) => name === 'electron' ? electron : name.startsWith('./') ? require(join(root, 'desktop', name)) : require(name), __dirname: join(root, 'desktop'), process: { env: { LU_DATA_DIR: directory }, platform: 'win32', argv: [] }, console, Buffer, URL, Response, TextDecoder, AbortController, AbortSignal, FormData, Blob, Uint8Array, fetch, setTimeout, clearTimeout });
  runInContext(await readFile(join(root, 'desktop/main.cjs'), 'utf8'), context);
  runInContext('registerIPC()', context);
  return { directory, handlers, writes, context, run: (code: string) => runInContext(code, context), call: (name: string, ...args: unknown[]) => handlers.get('lu:' + name)!({ senderFrame: { url: 'lu://app/' } }, ...args), dispose: async () => { await runInContext('saveChain', context); assert.ok(directory.startsWith(join(testRoot, 'bridge-'))); await rm(directory, { recursive: true, force: true }); } };
}
test('every preload request has a native handler, and arbitrary origins are refused', async () => {
  const h = await harness(); try {
    const source = await readFile(join(root, 'desktop/preload.cjs'), 'utf8');
    for (const match of source.matchAll(/call\('([^']+)'/g)) assert.ok(h.handlers.has('lu:' + match[1]), `Missing native handler: ${match[1]}`);
    await assert.rejects(h.handlers.get('lu:load')!({ senderFrame: { url: 'https://example.com' } }), /Untrusted/);
    await h.call('copy', 'A little thought'); assert.deepEqual(h.writes, ['A little thought']);
  } finally { await h.dispose(); }
});
test('notes persist atomically while API credentials stay separate and encrypted', async () => {
  const h = await harness(); try {
    const state = { version: 1, notes: [{ id: 'one', body: 'A note' }], conversations: [] };
    await h.call('save', state); assert.deepEqual(JSON.parse(await readFile(join(h.directory, 'state.json'), 'utf8')), state);
    await h.call('secret-set', 'openai', 'test-key-only');
    const disk = await readFile(join(h.directory, 'credentials.json'), 'utf8'); assert.ok(!disk.includes('test-key-only'));
    const loaded = await h.call('load'); assert.deepEqual(Array.from(loaded.credentials), ['openai']); assert.ok(!JSON.stringify(loaded).includes('test-key-only'));
    await h.call('secret-remove', 'openai'); assert.equal((await h.call('load')).credentials.length, 0);
    await assert.rejects(h.call('secret-set', 'arbitrary-file', 'key'), /Unknown/);
    await assert.rejects(h.call('save', { version: 20, notes: [], conversations: [] }), /Invalid/);
  } finally { await h.dispose(); }
});
test('a left-aligned island returns to its anchor after the larger workspace is clamped to the screen', async () => {
  const h = await harness(); try {
    let bounds = { x: 20, y: 14, width: 380, height: 72 };
    h.context.testWindow = { getBounds: () => bounds, setBounds: (next: typeof bounds) => bounds = next, setFocusable() {}, setIgnoreMouseEvents() {} };
    h.run('win = testWindow; islandPosition = { centerX: 210, y: 14 }; setMode("workspace", false)');
    assert.equal(bounds.x, 0); assert.equal(bounds.height, 728);
    h.run('setMode("compact", false)'); assert.equal(bounds.x, 20); assert.equal(bounds.y, 14); assert.equal(bounds.width, 380);
    await h.run('recenter("right")'); assert.equal(bounds.x, 1366 - 380 - 20);
    const position = JSON.parse(await readFile(join(h.directory, 'position.json'), 'utf8')); assert.equal(position.centerX, 1366 - 190 - 20);
  } finally { await h.dispose(); }
});
test('recordings cross the native boundary as compact binary data and reach the chosen transcription endpoint', async () => {
  const h = await harness(); try {
    let requestedUrl = '', body: FormData | null = null;
    h.context.fetch = async (url: string, options: RequestInit) => { requestedUrl = url; body = options.body as FormData; return Response.json({ text: 'A little thought.' }); };
    const text = await h.call('transcribe', { data: new Uint8Array([1, 2, 3, 4]), mime: 'audio/webm', provider: 'custom', model: 'parakeet', endpoint: 'http://127.0.0.1:8000/v1', language: 'en' });
    assert.equal(text, 'A little thought.'); assert.equal(requestedUrl, 'http://127.0.0.1:8000/v1/audio/transcriptions');
    assert.equal(body!.get('model'), 'parakeet'); assert.deepEqual([...new Uint8Array(await (body!.get('file') as File).arrayBuffer())], [1, 2, 3, 4]);
    await assert.rejects(h.call('transcribe', { data: { length: 4 } }), /Recording/);
  } finally { await h.dispose(); }
});
