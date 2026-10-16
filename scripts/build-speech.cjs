const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
if (process.platform !== 'win32') process.exit(0);
const framework = path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319');
const compiler = path.join(framework, 'csc.exe');
const root = path.resolve(__dirname, '..');
if (!fs.existsSync(compiler)) { console.warn('Windows speech bridge: .NET Framework compiler unavailable. API dictation remains available.'); process.exit(0); }
const result = spawnSync(compiler, ['/nologo', '/optimize+', '/target:exe', '/platform:anycpu', '/reference:' + path.join(framework, 'WPF', 'System.Speech.dll'), '/reference:' + path.join(framework, 'System.Web.Extensions.dll'), '/out:' + path.join(root, 'desktop', 'Lu.Speech.exe'), path.join(root, 'desktop', 'SpeechBridge.cs')], { stdio: 'inherit', windowsHide: true });
if (result.status) process.exit(result.status);
const hook = spawnSync(compiler, ['/nologo', '/optimize+', '/target:exe', '/platform:anycpu', '/reference:' + path.join(framework, 'System.Web.Extensions.dll'), '/out:' + path.join(root, 'desktop', 'Lu.Hook.exe'), path.join(root, 'desktop', 'AgentHook.cs')], { stdio: 'inherit', windowsHide: true });
process.exit(hook.status || 0);
