const fs = require('node:fs/promises');
const path = require('node:path');
const { hookConfig } = require('./agents.cjs');

function agentSetup({ home, executable, descriptor }) {
  const config = agent => hookConfig(agent, executable, descriptor);
  const target = agent => path.join(home, agent === 'claude' ? '.claude' : '.codex', agent === 'claude' ? 'settings.json' : 'hooks.json');
  const ours = hook => typeof hook?.command === 'string' && ['claude', 'codex'].some(agent => hook.command === config(agent).hooks.SessionStart[0].hooks[0].command);
  async function read(agent) {
    try {
      const raw = await fs.readFile(target(agent), 'utf8'); const value = JSON.parse(raw.replace(/^\uFEFF/, ''));
      if (!value || typeof value !== 'object' || Array.isArray(value) || (value.hooks && (typeof value.hooks !== 'object' || Array.isArray(value.hooks)))) throw new Error('Invalid configuration.');
      return { raw, value };
    } catch (error) { if (error.code === 'ENOENT') return { raw: null, value: {} }; throw new Error('The existing agent configuration could not be read safely. Fix it in the agent before connecting Lu.'); }
  }
  async function preview(agent) {
    const generated = config(agent), existing = await read(agent);
    return { agent, target: target(agent), config: JSON.stringify(generated, null, 2), installed: Object.values(existing.value.hooks || {}).some(groups => Array.isArray(groups) && groups.some(group => Array.isArray(group.hooks) && group.hooks.some(ours))) };
  }
  async function update(agent, install) {
    const generated = config(agent), existing = await read(agent), merged = { ...existing.value, hooks: { ...existing.value.hooks } };
    for (const [name, groups] of Object.entries(merged.hooks)) {
      if (!Array.isArray(groups)) throw new Error('An existing hook group is invalid. Lu left it untouched.');
      merged.hooks[name] = groups.flatMap(group => {
        if (!Array.isArray(group.hooks)) throw new Error('An existing hook is invalid. Lu left it untouched.');
        const hooks = group.hooks.filter(hook => !ours(hook)); return hooks.length ? [{ ...group, hooks }] : [];
      });
      if (!merged.hooks[name].length) delete merged.hooks[name];
    }
    if (install) for (const [name, groups] of Object.entries(generated.hooks)) merged.hooks[name] = [...(merged.hooks[name] || []), ...groups];
    const file = target(agent); await fs.mkdir(path.dirname(file), { recursive: true });
    let backup = '';
    if (existing.raw !== null) { backup = file + '.lu-backup-' + Date.now(); await fs.writeFile(backup, existing.raw, { mode: 0o600, flag: 'wx' }); }
    // Refuse to overwrite an agent config changed since we read it.
    const latest = await fs.readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (latest !== existing.raw) throw new Error('The agent settings changed while connecting. Try again.');
    const temporary = file + '.lu-tmp'; await fs.writeFile(temporary, JSON.stringify(merged, null, 2) + '\n', { mode: 0o600 }); await fs.rename(temporary, file);
    return { ...await preview(agent), backup };
  }
  return { preview, update };
}
module.exports = { agentSetup };
