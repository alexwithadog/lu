const { contextBridge, ipcRenderer } = require('electron');
const call = (name, ...args) => ipcRenderer.invoke('lu:' + name, ...args);
const listen = (channel, callback) => { const handler = (_event, data) => callback(data); ipcRenderer.on(channel, handler); return () => ipcRenderer.removeListener(channel, handler); };
contextBridge.exposeInMainWorld('lu', Object.freeze({
  load: () => call('load'), save: state => call('save', state), windowMode: mode => call('mode', mode), windowAction: (action, value) => call('window', action, value),
  preferences: settings => call('preferences', settings), secretSet: (id, value) => call('secret-set', id, value), secretRemove: id => call('secret-remove', id),
  models: provider => call('models', provider), chat: input => call('chat', input), cancel: id => call('cancel', id),
  exportFile: input => call('export', input), importData: () => call('import'), readAttachment: () => call('attachment'), copy: text => call('copy', text), notify: (title, body) => call('notify', title, body), openUrl: url => call('open-url', url),
  speechStart: language => call('speech-start', language), speechStop: () => call('speech-stop'), transcribe: input => call('transcribe', input), saveRecording: (data, name) => call('recording', data, name),
  onStream: callback => listen('lu:stream', callback), onAction: callback => listen('lu:action', callback), onSpeech: callback => listen('lu:speech', callback), onContext: callback => listen('lu:context', callback),
  agents: () => call('agents'), agentToggle: enabled => call('agent-toggle', enabled), agentReply: (id, decision, answers) => call('agent-reply', id, decision, answers), agentClear: () => call('agent-clear'), agentSetup: agent => call('agent-setup', agent), agentInstall: (agent, install) => call('agent-install', agent, install), onAgents: callback => listen('lu:agents', callback),
}));
