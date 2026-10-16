import type { AppState, Provider } from './model';
import { emptyAgents, type AgentSnapshot, type AgentSetup } from './agents';
export interface StreamEvent { id: string; delta?: string; done?: boolean; error?: string; }
export interface NativeAPI {
  load(): Promise<{ state: unknown; credentials: string[]; version: string; speech: { id: string; name: string }[]; shortcuts: { shortcut: boolean; dictationShortcut: boolean } }>;
  save(state: AppState): Promise<void>;
  windowMode(mode: 'compact' | 'expanded' | 'workspace'): Promise<void>;
  windowAction(action: 'hide' | 'quit' | 'quit-ready' | 'restart' | 'recenter' | 'alwaysOnTop' | 'pointer', value?: unknown): Promise<void>;
  preferences(settings: AppState['settings']): Promise<{ shortcut: boolean; dictationShortcut: boolean }>;
  secretSet(id: string, value: string): Promise<void>;
  secretRemove(id: string): Promise<void>;
  models(provider: Provider): Promise<string[]>;
  chat(input: { id: string; provider: Provider; system: string; messages: { role: string; content: string }[] }): Promise<void>;
  cancel(id: string): Promise<void>;
  exportFile(input: { suggestedName: string; content: string; type?: string }): Promise<boolean>;
  importData(): Promise<unknown>;
  readAttachment(): Promise<{ name: string; text: string } | null>;
  copy(text: string): Promise<void>;
  notify(title: string, body: string): Promise<void>;
  openUrl(url: string): Promise<void>;
  speechStart(language: string): Promise<void>;
  speechStop(): Promise<void>;
  transcribe(input: { data: Uint8Array; mime: string; provider: string; model: string; endpoint: string; language: string }): Promise<string>;
  saveRecording(data: Uint8Array, name: string): Promise<boolean>;
  onStream(callback: (event: StreamEvent) => void): () => void;
  onAction(callback: (action: string) => void): () => void;
  onSpeech(callback: (event: { text?: string; error?: string; stopped?: boolean }) => void): () => void;
  onContext(callback: (text: string) => void): () => void;
  agents(): Promise<AgentSnapshot>;
  agentToggle(enabled: boolean): Promise<AgentSnapshot>;
  agentReply(id: string, decision: string, answers?: Record<string, string>): Promise<void>;
  agentClear(): Promise<void>;
  agentSetup(agent: string): Promise<AgentSetup>;
  agentInstall(agent: string, install: boolean): Promise<AgentSetup>;
  onAgents(callback: (event: AgentSnapshot) => void): () => void;
}
declare global { interface Window { lu?: NativeAPI; } }
export const isDesktop = !!window.lu;
const storageKey = 'lu-preview-state-v1';
export const api: NativeAPI = window.lu ?? {
  async load() { let state: unknown = null; try { state = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { /* invalid preview state uses defaults */ } return { state, credentials: [], version: '0.2.0 · preview', speech: [], shortcuts: { shortcut: true, dictationShortcut: true } }; },
  async save(state) { localStorage.setItem(storageKey, JSON.stringify(state)); },
  async windowMode() {}, async windowAction() {}, async preferences() { return { shortcut: true, dictationShortcut: true }; },
  async secretSet() { throw new Error('API keys are saved in the desktop app. Open Lu to connect a provider.'); }, async secretRemove() {},
  async models() { throw new Error('Connect providers in the Lu desktop app.'); },
  async chat() { throw new Error('Open the Lu desktop app to connect an AI provider.'); }, async cancel() {},
  async exportFile({ suggestedName, content, type }) { const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([content], { type: type || 'text/plain' })); a.href = url; a.download = suggestedName; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return true; },
  async importData() { return new Promise(resolve => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.onchange = async () => { const file = input.files?.[0]; resolve(file ? JSON.parse(await file.text()) : null); }; input.oncancel = () => resolve(null); input.click(); }); },
  async readAttachment() { return null; }, async copy(text) { await navigator.clipboard.writeText(text); }, async notify() {}, async openUrl(url) { window.open(url, '_blank', 'noopener,noreferrer'); },
  async speechStart() { throw new Error('Windows dictation is available in the desktop app.'); }, async speechStop() {},
  async transcribe() { throw new Error('Transcription providers are available in the desktop app.'); }, async saveRecording() { return false; },
  onStream() { return () => {}; }, onAction() { return () => {}; }, onSpeech() { return () => {}; }, onContext() { return () => {}; },
  async agents() { return emptyAgents(); }, async agentToggle() { throw new Error('Agent connections are available in the Lu desktop app.'); }, async agentReply() {}, async agentClear() {}, async agentSetup() { throw new Error('Open the Lu desktop app to connect your agents.'); }, async agentInstall() { throw new Error('Open the Lu desktop app to connect your agents.'); }, onAgents() { return () => {}; },
};
