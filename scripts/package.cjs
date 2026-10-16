const fs = require('node:fs/promises');
const path = require('node:path');
const { packager } = require('@electron/packager');
const root = path.resolve(__dirname, '..');
const stage = path.join(root, '.lu-package');
async function main() {
  // Stage only runtime files so research, source clones, keys, and caches cannot ship.
  if (path.dirname(stage) !== root || path.basename(stage) !== '.lu-package') throw new Error('Invalid packaging directory.');
  const executable = path.join(root, 'release', 'Lu-win32-x64', 'Lu.exe');
  try { const probe = await fs.open(executable, 'r+'); await probe.close(); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('Quit Lu from its tray menu before packaging, so the running application is preserved.'); }
  await fs.rm(stage, { recursive: true, force: true });
  await fs.mkdir(stage, { recursive: true });
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  await fs.writeFile(path.join(stage, 'package.json'), JSON.stringify({ name: manifest.name, productName: 'Lu', version: manifest.version, main: manifest.main, author: manifest.author, description: manifest.description, license: manifest.license }));
  for (const folder of ['dist', 'assets']) await fs.cp(path.join(root, folder), path.join(stage, folder), { recursive: true });
  await fs.mkdir(path.join(stage, 'desktop'));
  for (const file of ['main.cjs', 'preload.cjs', 'provider.cjs', 'agents.cjs', 'agent-setup.cjs', 'Lu.Hook.exe', 'Lu.Speech.exe']) {
    try { await fs.copyFile(path.join(root, 'desktop', file), path.join(stage, 'desktop', file)); } catch (error) { if (file !== 'Lu.Speech.exe') throw error; }
  }
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) await fs.copyFile(path.join(root, file), path.join(stage, file));
  const electronVersion = require('electron/package.json').version;
  const cache = path.join(root, '.pnpm-store', 'electron'); let electronZipDir;
  for (const entry of await fs.readdir(cache, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(cache, entry.name);
    try { await fs.access(path.join(directory, `electron-v${electronVersion}-win32-x64.zip`)); electronZipDir = directory; break; } catch {}
  }
  const output = await packager({ dir: stage, name: 'Lu', platform: 'win32', arch: 'x64', electronVersion, electronZipDir, asar: false, icon: path.join(root, 'assets', 'lu.ico'), download: { cacheRoot: cache }, out: path.join(root, 'release'), overwrite: true, prune: false, appVersion: manifest.version, appCopyright: 'Lu contributors', win32metadata: { CompanyName: 'Lu', FileDescription: 'Lu desktop companion', ProductName: 'Lu', InternalName: 'Lu' } });
  const packagedRoot = path.join(output[0], 'resources', 'app');
  for (const file of ['package.json', 'desktop/main.cjs', 'desktop/preload.cjs', 'desktop/provider.cjs', 'dist/index.html', 'assets/lu.png', 'THIRD_PARTY_NOTICES.md']) await fs.access(path.join(packagedRoot, file));
  const files = await fs.readdir(packagedRoot);
  if (files.some(file => /^(?:coucou|research|node_modules|\.lu-data|\.env)/.test(file))) throw new Error('Unexpected development data in the release.');
  console.log('Lu is ready: ' + path.join(output[0], 'Lu.exe'));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
