// Isolated browser tests for Lu's frontend. This uses a fresh, headless browser;
// it does not attach to or inspect the user's Windows desktop or browser profile.
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const playwright = process.env.LU_PLAYWRIGHT_PATH ? require(process.env.LU_PLAYWRIGHT_PATH) : require('playwright');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
async function main() {
  const server = http.createServer(async (request, response) => {
    try { const pathname = new URL(request.url, 'http://localhost').pathname; const file = path.resolve(root, 'dist', '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname))); if (!file.startsWith(path.join(root, 'dist') + path.sep)) { response.writeHead(403).end(); return; } response.setHeader('content-type', mime[path.extname(file)] || 'application/octet-stream'); response.end(await fs.readFile(file)); } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath: process.env.LU_CHROME_PATH || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1100, height: 760 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url); await page.locator('.hub-hero').waitFor();
    await fs.mkdir(path.join(root, 'docs', 'screenshots'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'docs', 'screenshots', 'lu-home.png'), omitBackground: true });
    await page.locator('.nav-item[data-page="chat"]').click(); await page.locator('#chat-input').fill('A test thought');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await page.locator('.provider-tabs').waitFor(); assert.ok((await page.locator('#toast').textContent()).includes('Connect a provider'));
    await page.locator('.nav-item[data-page="notes"]').click(); await page.getByRole('button', { name: 'New note', exact: true }).click();
    await page.locator('[data-field="note-title"]').fill('Lu test thought'); await page.locator('[data-field="note-body"]').fill('A note that stays with me.\nOne thought at a time.');
    await page.waitForTimeout(450); await page.reload(); await page.locator('.hub-hero').waitFor();
    await page.locator('.nav-item[data-page="notes"]').click(); assert.equal(await page.locator('[data-field="note-title"]').inputValue(), 'Lu test thought'); assert.ok((await page.locator('[data-field="note-body"]').inputValue()).includes('stays with me'));
    await page.getByRole('button', { name: 'Pin note', exact: true }).click(); await page.locator('.note-item svg').waitFor();
    await page.screenshot({ path: path.join(root, 'docs', 'screenshots', 'lu-notes.png'), omitBackground: true });
    await page.locator('.nav-item[data-page="focus"]').click(); await page.locator('[data-action="focus-preset"][data-minutes="15"]').click();
    await page.locator('[data-action="focus-toggle"]').click(); await page.waitForFunction(() => document.querySelector('[data-focus-time]')?.textContent !== '15:00', null, { timeout: 4000 });
    await page.locator('[data-action="focus-toggle"]').click(); const paused = await page.locator('[data-focus-time]').textContent(); await page.waitForTimeout(1100); assert.equal(await page.locator('[data-focus-time]').textContent(), paused);
    await page.getByRole('button', { name: 'Timer settings', exact: true }).click(); await page.locator('#focus-options input[name="focus"]').fill('32'); await page.locator('#focus-options button[type="submit"]').click(); assert.equal(await page.locator('[data-focus-time]').textContent(), '32:00');
    await page.locator('.nav-item[data-tab="general"]').click(); await page.locator('.hub-sidebar [data-tab="dictionary"]').click();
    await page.locator('#dictionary-form input[name="word"]').fill('el you'); await page.locator('#dictionary-form input[name="replacement"]').fill('Lu'); await page.locator('#dictionary-form button[type="submit"]').click(); assert.equal(await page.locator('.dictionary-entry').count(), 1);
    await page.locator('.hub-sidebar [data-tab="snippets"]').click(); await page.locator('#snippet-form input[name="word"]').fill('my intro'); await page.locator('#snippet-form textarea').fill('Hello, I’m Lu.\nA little help, close by.'); await page.locator('#snippet-form button[type="submit"]').click(); assert.equal(await page.locator('.snippet-card').count(), 1);
    await page.locator('.hub-sidebar [data-tab="styles"]').click(); await page.locator('[data-style="clean"]').click(); assert.equal(await page.locator('.style-card.selected h3').textContent(), 'Natural');
    await page.locator('.hub-sidebar [data-tab="appearance"]').click(); await page.locator('[data-theme="light"]').click(); assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.waitForFunction(() => !document.querySelector('#toast')?.classList.contains('visible')); await page.screenshot({ path: path.join(root, 'docs', 'screenshots', 'lu-appearance.png'), omitBackground: true });
    await page.locator('[data-theme="dark"]').click(); await page.locator('[data-buddy="sprout"]').click(); assert.equal(await page.locator('.buddy-choice.selected strong').textContent(), 'A little growth');
    await page.locator('.nav-item[data-page="chat"]').click(); await page.screenshot({ path: path.join(root, 'docs', 'screenshots', 'lu-chat.png'), omitBackground: true });
    await page.keyboard.press('Control+k'); await page.locator('#palette-input').fill('Focus'); await page.keyboard.press('Enter'); await page.locator('.focus-page').waitFor();
    await page.getByRole('button', { name: 'Minimize to island', exact: true }).first().click(); await page.locator('.lu-root.compact').waitFor();
    await page.setViewportSize({ width: 380, height: 72 }); await page.screenshot({ path: path.join(root, 'docs', 'screenshots', 'lu-island.png'), omitBackground: true });
    await page.getByRole('button', { name: 'Open Lu', exact: true }).click(); await page.setViewportSize({ width: 660, height: 390 }); await page.getByRole('button', { name: 'Overview', exact: true }).click(); await page.locator('.quick-overview').waitFor(); await page.screenshot({ path: path.join(root, 'docs', 'screenshots', 'lu-quick-panel.png'), omitBackground: true });
    await page.locator('.quick-pills [data-page="notes"]').click(); await page.locator('[data-field="quick-note"]').fill('A note from the little island.'); await page.locator('[data-action="quick-save-note"]').click(); assert.equal(await page.locator('.quick-recent button').count(), 2);
    for (let cycle = 0; cycle < 3; cycle++) { await page.getByRole('button', { name: 'Minimize to island', exact: true }).first().click(); await page.locator('.lu-root.compact').waitFor(); await page.getByRole('button', { name: 'Open Lu', exact: true }).click(); await page.locator('.quick-note').waitFor(); assert.equal(await page.locator('.lu-root.collapsing').count(), 0); }
    await page.getByRole('button', { name: 'Open Lu workspace', exact: true }).first().click(); await page.setViewportSize({ width: 1100, height: 760 });
    await page.locator('.nav-item[data-page="home"]').click(); await page.screenshot({ path: path.join(root, 'docs', 'screenshots', 'lu-workspace.png'), omitBackground: true });
    await page.locator('[data-action="stats-period"][data-period="week"]').click();
    await page.locator('.nav-item[data-page="agents"]').click(); await page.locator('.agent-inbox-empty').waitFor(); assert.equal(await page.locator('.agent-request').count(), 0);
    // Native bridge fixtures are confined to this fresh browser context. They
    // neither install hooks nor connect to a running coding agent.
    const agentContext = await browser.newContext({ viewport: { width: 660, height: 390 }, reducedMotion: 'reduce' });
    await agentContext.addInitScript(() => {
      const now = Date.now();
      window.testReplies = []; window.testInstalls = [];
      let listener = () => {};
      let snapshot = { enabled: true, port: 0, sessions: [{ id: 'codex:test', agent: 'codex', project: 'Lu · test fixture', cwd: 'C:/Test/Lu', status: 'waiting', detail: 'Waiting for permission', updatedAt: now, events: [{ name: 'PermissionRequest', tool: 'Bash', at: now }] }], requests: [
        { id: 'test-permission', sessionId: 'codex:test', agent: 'codex', project: 'Lu · test fixture', cwd: 'C:/Test/Lu', tool: 'Bash', title: 'Permission requested', description: 'A simulated request for UI verification', details: JSON.stringify({ command: 'echo test-only <script>fixture</script>' }), questions: [], createdAt: now, expiresAt: now + 115000 },
        { id: 'test-question', sessionId: 'claude:test', agent: 'claude', project: 'Lu · test fixture', cwd: 'C:/Test/Lu', tool: 'AskUserQuestion', title: 'A question for you', description: '', details: '{"questions": "test fixture"}', questions: [{ question: 'Which layout should Lu use?', options: [{ label: 'Island', description: 'A small companion' }, { label: 'Panel', description: 'More room' }] }], createdAt: now, expiresAt: now + 115000 },
      ] };
      window.lu = {
        load: async () => ({ state: null, credentials: [], version: 'UI test', speech: [], shortcuts: { shortcut: true, dictationShortcut: true } }),
        save: async () => {}, windowMode: async () => {}, windowAction: async () => {}, preferences: async () => ({ shortcut: true, dictationShortcut: true }),
        onAction: () => () => {}, onStream: () => () => {}, onSpeech: () => () => {}, onContext: () => () => {}, onAgents: callback => { listener = callback; return () => {}; },
        agents: async () => snapshot, agentToggle: async enabled => { snapshot.enabled = enabled; listener(snapshot); return snapshot; },
        agentReply: async (id, decision, answers) => { window.testReplies.push({ id, decision, answers }); snapshot = { ...snapshot, requests: snapshot.requests.filter(r => r.id !== id) }; listener(snapshot); },
        agentClear: async () => {}, agentSetup: async agent => ({ agent, target: 'C:/Test/.codex/hooks.json', config: '{"hooks":"test preview only"}', installed: false }),
        agentInstall: async (agent, install) => { window.testInstalls.push({ agent, install }); return { agent, target: 'test', config: '{}', installed: install }; },
        speechStop: async () => {}, copy: async () => {},
      };
    });
    const agentPage = await agentContext.newPage(); agentPage.on('pageerror', error => errors.push(error.message));
    await agentPage.goto(url); await agentPage.locator('.agent-alert').waitFor(); await agentPage.getByRole('button', { name: 'Open Lu', exact: true }).click(); await agentPage.locator('.quick-agents').waitFor();
    assert.ok((await agentPage.locator('.agent-request pre').textContent()).includes('<script>fixture</script>')); assert.equal(await agentPage.locator('.agent-request script').count(), 0);
    await agentPage.screenshot({ path: path.join(root, 'docs', 'screenshots', 'lu-agent-request-test.png'), omitBackground: true });
    await agentPage.getByRole('button', { name: 'Allow once', exact: true }).click(); await agentPage.locator('#agent-answer-form').waitFor();
    await agentPage.locator('[value="Island"]').check(); await agentPage.locator('[data-agent-answer="0"]').fill('A customizable island, please.');
    await agentPage.getByRole('button', { name: 'Send answer', exact: false }).click(); await agentPage.locator('.agent-inbox-empty').waitFor();
    const replies = await agentPage.evaluate(() => window.testReplies); assert.equal(replies[0].decision, 'allow'); assert.equal(replies[1].answers['Which layout should Lu use?'], 'A customizable island, please.');
    await agentPage.getByRole('button', { name: 'Open Lu workspace', exact: true }).first().click(); await agentPage.setViewportSize({ width: 1100, height: 760 });
    await agentPage.getByRole('button', { name: 'Set up Codex', exact: true }).click(); await agentPage.locator('.agent-setup').waitFor(); assert.deepEqual(await agentPage.evaluate(() => window.testInstalls), []);
    await agentPage.getByRole('button', { name: 'Connect Codex', exact: true }).click(); assert.deepEqual(await agentPage.evaluate(() => window.testInstalls), [{ agent: 'codex', install: true }]);
    await agentContext.close();
    assert.deepEqual(errors, []); console.log('Lu frontend checks passed: notes, focus, settings, repeated island transitions, Statistics, request inbox, answers, and connection preview.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
