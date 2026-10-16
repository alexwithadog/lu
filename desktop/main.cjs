const { app, BrowserWindow, ipcMain, protocol, net, nativeImage, Tray, Menu, globalShortcut, screen, safeStorage, dialog, clipboard, shell, Notification } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const { endpoint, readTextStream } = require('./provider.cjs');
const { createAgentBridge } = require('./agents.cjs');
const { agentSetup } = require('./agent-setup.cjs');
const root = path.resolve(__dirname, '..');
const dataDir = process.env.LU_DATA_DIR || (app.isPackaged ? path.join(app.getPath('appData'), 'Lu') : path.join(root, '.lu-data'));
app.setName('Lu');
app.setPath('userData', dataDir);
protocol.registerSchemesAsPrivileged([{ scheme: 'lu', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
let win, tray, currentMode = 'compact', state = {}, secretStore = {}, speechProcess = null, speechLanguages = [];
let quitting = false, quitRequested = false, saveChain = Promise.resolve(), positionTimer, isIgnoring = false, islandPosition = null, programmaticBounds = null;
const requests = new Map();
const dimensions = { compact: [380, 72], expanded: [660, 390], workspace: [1100, 760] };
const trusted = url => url?.startsWith('lu://app/') || (process.env.LU_DEV_URL && url?.startsWith(process.env.LU_DEV_URL));
const send = (channel, payload) => { if (win && !win.isDestroyed()) win.webContents.send(channel, payload); };
const agents = createAgentBridge({
  onChange: value => send('lu:agents', value),
  onAttention: request => {
    // Reveal the request without moving keyboard focus away from the user's app.
    if (!win || state.settings?.quiet) return;
    if (currentMode === 'compact') { setMode('expanded', false); win.showInactive(); send('lu:action', 'agent-attention'); }
    if (Notification.isSupported()) { const notification = new Notification({ title: `${request.agent === 'claude' ? 'Claude' : 'Codex'} needs you`, body: `${request.project} · ${request.title}`, silent: true, icon: path.join(root, 'assets', 'lu.png') }); notification.on('click', () => show('agents')); notification.show(); }
  },
});
const agentConnections = agentSetup({ home: require('node:os').homedir(), executable: path.join(__dirname, 'Lu.Hook.exe'), descriptor: path.join(dataDir, 'agent-bridge.json') });
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(path.join(dataDir, file), 'utf8')); } catch { return fallback; } }
async function writeJson(file, value) {
  const text = JSON.stringify(value, null, 2);
  saveChain = saveChain.catch(() => {}).then(async () => {
    await fs.mkdir(dataDir, { recursive: true });
    const target = path.join(dataDir, file), temp = target + '.tmp';
    await fs.writeFile(temp, text, { mode: 0o600 });
    await fs.rename(temp, target);
  });
  await saveChain;
}
function handle(name, fn) { ipcMain.handle('lu:' + name, async (event, ...args) => { if (!trusted(event.senderFrame?.url)) throw new Error('Untrusted request'); return fn(...args); }); }
function string(value, max = 50000) { if (typeof value !== 'string' || value.length > max) throw new Error('Invalid text'); return value; }
function key(id) {
  const encrypted = secretStore[id];
  if (!encrypted) return '';
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows credential encryption is unavailable.');
  try { return safeStorage.decryptString(Buffer.from(encrypted, 'base64')); } catch { throw new Error('This saved key cannot be decrypted. Please save it again.'); }
}
function validateProvider(provider) {
  if (!provider || !['ollama', 'openai', 'anthropic', 'gemini', 'groq', 'custom'].includes(provider.kind)) throw new Error('Choose a provider.');
  if (!['ollama', 'openai', 'anthropic', 'gemini', 'groq', 'custom'].includes(provider.id)) throw new Error('Unknown provider.');
  return { ...provider, model: string(provider.model || '', 200), baseUrl: endpoint(provider.baseUrl) };
}
function keepOnScreen(bounds) {
  const display = screen.getDisplayMatching(bounds), area = display.workArea;
  const width = Math.min(bounds.width, area.width), height = Math.min(bounds.height, area.height);
  return { width, height, x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - width)), y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - height)) };
}
function setMode(mode, focus = true) {
  if (!dimensions[mode] || !win) return;
  const old = win.getBounds(), [width, height] = dimensions[mode];
  if (!islandPosition) islandPosition = { centerX: old.x + old.width / 2, y: old.y };
  const next = keepOnScreen({ x: Math.round(islandPosition.centerX - width / 2), y: islandPosition.y, width, height });
  currentMode = mode;
  win.setFocusable(mode !== 'compact');
  programmaticBounds = next;
  win.setBounds(next);
  win.setIgnoreMouseEvents(false); isIgnoring = false;
  if (focus && mode !== 'compact') { win.show(); win.focus(); }
}
function show(action = 'toggle') {
  if (!win) return;
  if (action === 'toggle') {
    const expand = currentMode === 'compact' || !win.isVisible();
    win.showInactive();
    if (expand) setMode('expanded');
    send('lu:action', expand ? 'expand' : 'collapse');
  } else { win.showInactive(); setMode('expanded'); send('lu:action', action); }
}
function savePosition() { if (islandPosition) return writeJson('position.json', islandPosition).catch(() => {}); }
function recenter(position = 'center', persist = true) {
  if (!win) return;
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const half = dimensions.compact[0] / 2;
  islandPosition = { centerX: position === 'left' ? area.x + half + 20 : position === 'right' ? area.x + area.width - half - 20 : Math.round(area.x + area.width / 2), y: area.y + 14 };
  setMode(currentMode, false);
  if (persist) return savePosition();
}
function requestQuit(restart = false) {
  if (quitRequested) return;
  quitRequested = true;
  if (restart) app.relaunch();
  send('lu:action', 'before-quit');
  setTimeout(() => { quitting = true; app.quit(); }, 5000).unref();
}
function applyPreferences(settings = {}) {
  win?.setAlwaysOnTop(settings.alwaysOnTop !== false, 'floating');
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: settings.startOnLogin === true });
  globalShortcut.unregisterAll();
  const register = (accelerator, action) => { try { return globalShortcut.register(string(accelerator, 100), action); } catch { return false; } };
  return { shortcut: register(settings.shortcut || 'CommandOrControl+Shift+Space', () => show()), dictationShortcut: register(settings.dictationShortcut || 'CommandOrControl+Shift+D', () => show('dictation-toggle')) };
}
function buildTray() {
  const image = nativeImage.createFromPath(path.join(root, 'assets', 'tray.png'));
  if (image.isEmpty()) return;
  tray = new Tray(image); tray.setToolTip('Lu · Your little desktop companion');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Lu', click: () => show('expand') },
    { label: 'New note', click: () => show('new-note') },
    { label: 'Dictation', click: () => show('dictation') },
    { type: 'separator' }, { label: 'Move to this screen', click: () => recenter() },
    { label: 'Settings', click: () => show('settings') }, { type: 'separator' },
    { label: 'Quit Lu', click: () => requestQuit() },
  ]));
  tray.on('click', () => show());
}
async function availableSpeech() {
  if (process.platform !== 'win32') return [];
  return new Promise(resolve => {
    const child = spawn(path.join(__dirname, 'Lu.Speech.exe'), ['--list'], { windowsHide: true });
    let output = ''; const timer = setTimeout(() => { child.kill(); resolve([]); }, 8000);
    child.stdout.on('data', data => output += data); child.on('error', () => { clearTimeout(timer); resolve([]); });
    child.on('exit', () => { clearTimeout(timer); try { const parsed = JSON.parse(output.trim()); resolve(Array.isArray(parsed) ? parsed : parsed ? [parsed] : []); } catch { resolve([]); } });
  });
}
function stopSpeech() { if (speechProcess) { speechProcess.kill(); speechProcess = null; } }
async function startSpeech(language) {
  if (speechProcess) throw new Error('Dictation is already listening.');
  if (process.platform !== 'win32') throw new Error('Windows speech is available on Windows. Connect a transcription API on other platforms.');
  if (!speechLanguages.length) throw new Error('No Windows speech language is installed. Choose an API engine in Voice settings.');
  const child = spawn(path.join(__dirname, 'Lu.Speech.exe'), [string(language || speechLanguages[0].id, 30)], { windowsHide: true });
  speechProcess = child;
  let buffer = '';
  child.stdout.on('data', data => { buffer += data.toString(); let end; while ((end = buffer.indexOf('\n')) >= 0) { const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1); try { send('lu:speech', JSON.parse(line)); } catch {} } });
  child.stderr.on('data', () => {});
  child.on('error', () => send('lu:speech', { error: 'Windows dictation could not start.' }));
  child.on('exit', () => { if (speechProcess === child) speechProcess = null; send('lu:speech', { stopped: true }); });
}
async function fetchChecked(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error' });
  if (!response.ok) {
    let message = `Provider returned ${response.status}.`;
    try { const body = await response.json(); message = body.error?.message || body.message || message; } catch {}
    throw new Error(String(message).slice(0, 500));
  }
  return response;
}
async function listModels(input) {
  const p = validateProvider(input), apiKey = key(p.id);
  const headers = p.kind === 'anthropic' ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } : apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  if (!apiKey && !['ollama', 'custom'].includes(p.kind)) throw new Error('Save your API key first.');
  const response = await fetchChecked(p.baseUrl + '/models', { headers, signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  return (body.data || body.models || []).map(item => item.id || item.name).filter(x => typeof x === 'string').sort().slice(0, 500);
}
async function runChat(input) {
  const p = validateProvider(input.provider), id = string(input.id, 100), apiKey = key(p.id);
  if (!p.model.trim()) throw new Error('Choose a model in AI providers.');
  if (!apiKey && !['ollama', 'custom'].includes(p.kind)) throw new Error('Add an API key in Settings → AI providers.');
  if (!Array.isArray(input.messages) || input.messages.length > 100) throw new Error('Invalid conversation.');
  const messages = input.messages.map(m => { if (!['user', 'assistant'].includes(m.role)) throw new Error('Invalid message.'); return { role: m.role, content: string(m.content, 100000) }; });
  const system = string(input.system || '', 10000), controller = new AbortController();
  if (requests.has(id)) throw new Error('This request is already running.');
  requests.set(id, controller);
  const timer = setTimeout(() => controller.abort(), 180000);
  try {
    const anthropic = p.kind === 'anthropic';
    const headers = { 'content-type': 'application/json', ...(anthropic ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } : apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) };
    const body = anthropic ? { model: p.model, max_tokens: 4096, system, messages, stream: true } : { model: p.model, messages: [{ role: 'system', content: system }, ...messages], stream: true };
    const response = await fetchChecked(p.baseUrl + (anthropic ? '/messages' : '/chat/completions'), { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
    await readTextStream(response, anthropic, delta => send('lu:stream', { id, delta }));
    send('lu:stream', { id, done: true });
  } catch (error) { send('lu:stream', { id, error: controller.signal.aborted ? 'Stopped.' : error.message, done: true }); }
  finally { clearTimeout(timer); requests.delete(id); }
}
function registerIPC() {
  handle('agents', () => agents.snapshot());
  handle('agent-toggle', async enabled => { if (typeof enabled !== 'boolean') throw new Error('Invalid setting.'); const result = enabled ? await agents.start(dataDir) : await agents.stop(); await writeJson('agent-preferences.json', { enabled }); return result; });
  handle('agent-reply', (id, decision, answers) => agents.reply(string(id, 100), decision, answers));
  handle('agent-clear', () => agents.clear());
  handle('agent-setup', agent => agentConnections.preview(string(agent, 20)));
  handle('agent-install', async (agent, install) => { if (typeof install !== 'boolean') throw new Error('Invalid setting.'); await fs.access(path.join(__dirname, 'Lu.Hook.exe')); return agentConnections.update(string(agent, 20), install); });
  handle('load', () => ({ state, credentials: Object.keys(secretStore), version: app.getVersion(), speech: speechLanguages, shortcuts: applyPreferences(state.settings) }));
  handle('save', async value => { const json = JSON.stringify(value); if (json.length > 6_000_000 || value?.version !== 1 || !Array.isArray(value.notes) || !Array.isArray(value.conversations)) throw new Error('Invalid Lu data.'); state = value; await writeJson('state.json', value); });
  handle('mode', mode => setMode(mode));
  handle('window', (action, value) => {
    if (action === 'hide') win.hide();
    else if (action === 'quit') requestQuit();
    else if (action === 'restart') requestQuit(true);
    else if (action === 'quit-ready') { quitting = true; app.quit(); }
    else if (action === 'recenter') recenter(value);
    else if (action === 'alwaysOnTop') win.setAlwaysOnTop(value === true, 'floating');
    else if (action === 'pointer') { const ignore = value === false; if (ignore !== isIgnoring) { isIgnoring = ignore; win.setIgnoreMouseEvents(ignore, { forward: true }); } }
  });
  handle('preferences', settings => applyPreferences(settings));
  handle('secret-set', async (id, value) => {
    if (!['openai', 'anthropic', 'gemini', 'groq', 'custom', 'supabase', 'github', 'notion', 'n8n', 'resend'].includes(id)) throw new Error('Unknown connection.');
    const text = string(value, 12000).trim(); if (!text) throw new Error('Enter a key.');
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable on this computer.');
    secretStore[id] = safeStorage.encryptString(text).toString('base64'); await writeJson('credentials.json', secretStore);
  });
  handle('secret-remove', async id => { if (typeof id !== 'string') throw new Error('Invalid connection.'); delete secretStore[id]; await writeJson('credentials.json', secretStore); });
  handle('models', listModels);
  handle('chat', input => { runChat(input).catch(error => send('lu:stream', { id: input.id, done: true, error: error.message })); });
  handle('cancel', id => requests.get(id)?.abort());
  handle('copy', text => clipboard.writeText(string(text, 500000)));
  handle('notify', (title, body) => { if (!state.settings?.quiet && Notification.isSupported()) { const notification = new Notification({ title: string(title, 100), body: string(body, 300), icon: path.join(root, 'assets', 'lu.png'), silent: true }); notification.on('click', () => show('focus')); notification.show(); } });
  handle('open-url', url => { const target = new URL(string(url, 2000)); if (['https:', 'http:'].includes(target.protocol)) return shell.openExternal(target.href); throw new Error('Only web links can be opened.'); });
  handle('export', async input => {
    const result = await dialog.showSaveDialog(win, { defaultPath: path.basename(string(input.suggestedName, 180)), filters: [{ name: 'Lu files', extensions: [input.suggestedName.endsWith('.json') ? 'json' : 'md', 'txt'] }] });
    if (result.canceled || !result.filePath) return false; await fs.writeFile(result.filePath, string(input.content, 6_000_000)); return true;
  });
  handle('import', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Lu backup', extensions: ['json'] }] });
    if (result.canceled) return null; const stat = await fs.stat(result.filePaths[0]); if (stat.size > 6_000_000) throw new Error('This backup is too large.'); return JSON.parse(await fs.readFile(result.filePaths[0], 'utf8'));
  });
  handle('attachment', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Text documents', extensions: ['txt', 'md', 'csv', 'json', 'ts', 'js', 'py', 'html', 'css'] }] });
    if (result.canceled) return null; const file = result.filePaths[0]; const stat = await fs.stat(file); if (stat.size > 100000) throw new Error('Choose a text file under 100 KB.'); return { name: path.basename(file), text: await fs.readFile(file, 'utf8') };
  });
  handle('speech-start', startSpeech); handle('speech-stop', stopSpeech);
  handle('transcribe', async input => {
    if (!(input.data instanceof Uint8Array) || input.data.byteLength > 25_000_000) throw new Error('Recording must be smaller than 25 MB.');
    const id = input.provider === 'groq' ? 'groq' : input.provider === 'openai' ? 'openai' : 'custom';
    const base = input.endpoint ? endpoint(input.endpoint) : id === 'groq' ? 'https://api.groq.com/openai/v1' : id === 'openai' ? 'https://api.openai.com/v1' : '';
    if (!base) throw new Error('Configure your local transcription server in Voice settings.');
    const apiKey = key(id); if (!apiKey && id !== 'custom') throw new Error('Save your transcription provider’s key in AI providers.');
    const form = new FormData(); form.append('file', new Blob([input.data], { type: string(input.mime, 100) }), 'lu-recording.webm'); form.append('model', string(input.model || 'whisper-1', 200));
    if (input.language) form.append('language', string(input.language, 20));
    const response = await fetchChecked(base + '/audio/transcriptions', { method: 'POST', headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}, body: form, signal: AbortSignal.timeout(120000) });
    const data = await response.json(); if (typeof data.text !== 'string') throw new Error('The server did not return a transcript.'); return data.text;
  });
  handle('recording', async (data, name) => {
    if (!(data instanceof Uint8Array) || data.byteLength > 100_000_000) throw new Error('Recording is too large.');
    const result = await dialog.showSaveDialog(win, { defaultPath: path.basename(string(name, 180)), filters: [{ name: 'Audio recording', extensions: ['webm'] }] });
    if (result.canceled || !result.filePath) return false; await fs.writeFile(result.filePath, Buffer.from(data)); return true;
  });
}
async function createWindow() {
  state = await readJson('state.json', {}); secretStore = await readJson('credentials.json', {});
  protocol.handle('lu', request => {
    const url = new URL(request.url); if (url.host !== 'app') return new Response('Not found', { status: 404 });
    const file = path.resolve(root, 'dist', '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(path.join(root, 'dist') + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).href);
  });
  win = new BrowserWindow({ title: 'Lu', width: 380, height: 72, frame: false, transparent: true, backgroundColor: '#00000000', resizable: false, hasShadow: false, alwaysOnTop: true, skipTaskbar: true, focusable: false, show: false, autoHideMenuBar: true, icon: path.join(root, 'assets', 'lu.png'), webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: true, spellcheck: true } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (!trusted(url)) event.preventDefault(); });
  win.webContents.session.setPermissionRequestHandler((contents, permission, callback, details) => callback(trusted(contents.getURL()) && permission === 'media' && details.mediaTypes?.length > 0 && details.mediaTypes.every(t => t === 'audio')));
  win.webContents.session.setPermissionCheckHandler((contents, permission, origin, details) => !!contents && trusted(contents.getURL()) && permission === 'media' && details.mediaType === 'audio');
  recenter('center', false);
  const position = await readJson('position.json', null);
  if (position && Number.isFinite(position.y) && (Number.isFinite(position.centerX) || Number.isFinite(position.x))) { islandPosition = { centerX: Number.isFinite(position.centerX) ? position.centerX : position.x + dimensions.compact[0] / 2, y: position.y }; setMode('compact', false); }
  win.on('moved', () => { const bounds = win.getBounds(); if (programmaticBounds && ['x', 'y', 'width', 'height'].every(key => bounds[key] === programmaticBounds[key])) return; programmaticBounds = null; const { x, y, width } = bounds; islandPosition = { centerX: x + width / 2, y }; clearTimeout(positionTimer); positionTimer = setTimeout(savePosition, 800); });
  win.on('close', event => { if (!quitting) { event.preventDefault(); win.hide(); } });
  screen.on('display-removed', () => { const [width, height] = dimensions.compact; const bounds = keepOnScreen({ x: Math.round(islandPosition.centerX - width / 2), y: islandPosition.y, width, height }); islandPosition = { centerX: bounds.x + width / 2, y: bounds.y }; setMode(currentMode, false); savePosition(); });
  win.webContents.once('did-finish-load', () => {
    win.showInactive();
    if (state.settings?.launchExpanded) { setMode('workspace'); send('lu:action', 'workspace-open'); }
    else if (process.argv.includes('--expanded')) { setMode('expanded'); send('lu:action', 'expand'); }
  });
  win.webContents.on('render-process-gone', () => { stopSpeech(); for (const controller of requests.values()) controller.abort(); });
  buildTray(); registerIPC();
  if ((await readJson('agent-preferences.json', {})).enabled) await agents.start(dataDir).catch(() => {});
  speechLanguages = await availableSpeech();
  await win.loadURL(process.env.LU_DEV_URL || 'lu://app/');
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => show('expand'));
  app.whenReady().then(createWindow).catch(error => { console.error('Lu could not start:', error.message); quitting = true; app.quit(); });
  app.on('activate', () => show('expand'));
  app.on('window-all-closed', () => {});
  app.on('before-quit', event => { if (!quitting) { event.preventDefault(); requestQuit(); return; } stopSpeech(); for (const controller of requests.values()) controller.abort(); });
  app.on('will-quit', () => { void agents.stop(); globalShortcut.unregisterAll(); tray?.destroy(); });
}
