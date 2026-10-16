export type Page = 'home' | 'chat' | 'notes' | 'dictation' | 'focus' | 'agents' | 'settings';
export type SettingsPage = 'general' | 'appearance' | 'pills' | 'providers' | 'voice' | 'voiceAssistant' | 'notetaker' | 'agents' | 'integrations' | 'shortcuts' | 'dictionary' | 'snippets' | 'styles' | 'privacy' | 'about';
export type ProviderKind = 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'custom';
export interface Provider { id: string; name: string; kind: ProviderKind; model: string; baseUrl: string; }
export interface Note { id: string; title: string; body: string; updatedAt: number; pinned: boolean; tags: string[]; kind: 'note' | 'meeting'; }
export interface Message { id: string; role: 'user' | 'assistant'; text: string; at: number; error?: boolean; }
export interface Conversation { id: string; title: string; messages: Message[]; updatedAt: number; }
export interface DictionaryEntry { id: string; word: string; replacement: string; }
export interface Settings {
  name: string; theme: 'dark' | 'light' | 'system'; accent: string; buddy: 'cloud' | 'comet' | 'sprout' | 'headphones';
  alwaysOnTop: boolean; startOnLogin: boolean; launchExpanded: boolean; clock24: boolean; showSeconds: boolean;
  timezone: string; quiet: boolean; reducedMotion: boolean; autoCollapse: number;
  activePills: string[]; providerId: string; systemPrompt: string; dictationEngine: 'windows' | 'api';
  speechProvider: string; speechModel: string; speechEndpoint: string; speechLanguage: string;
  dictationStyle: 'natural' | 'clean'; retainAudio: boolean;
  focusMinutes: number; breakMinutes: number; shortcut: string; dictationShortcut: string;
  historyDays: number;
  readReplies: boolean;
  pillColors: Record<string, string>;
}
export interface DictationEntry { id: string; text: string; at: number; seconds: number; }
export interface AppState { version: 1; settings: Settings; notes: Note[]; conversations: Conversation[]; providers: Provider[]; dictionary: DictionaryEntry[]; snippets: DictionaryEntry[]; dictationHistory: DictationEntry[]; focusHistory: { at: number; minutes: number }[]; }
export const PILL_CATALOG = [
  { id: 'chat', label: 'Chat', icon: 'chat', color: '#b6a2ff', description: 'A conversation, always close.' },
  { id: 'notes', label: 'Notes', icon: 'note', color: '#ffcd82', description: 'Catch a thought before it goes.' },
  { id: 'dictation', label: 'Dictation', icon: 'mic', color: '#8bdac6', description: 'Your words, a little more effortless.' },
  { id: 'focus', label: 'Focus', icon: 'focus', color: '#9dbfff', description: 'Make a little room to concentrate.' },
  { id: 'agents', label: 'Agents', icon: 'terminal', color: '#f4a8b9', description: 'A place for the things working for you.' },
] as const;
export const DEFAULT_SETTINGS: Settings = {
  name: '', theme: 'dark', accent: 'orange', buddy: 'cloud', alwaysOnTop: true, startOnLogin: false,
  launchExpanded: false, clock24: false, showSeconds: false, timezone: '', quiet: false, reducedMotion: false,
  autoCollapse: 0, activePills: ['chat', 'dictation', 'notes'], providerId: 'ollama',
  systemPrompt: 'You are Lu, a warm, thoughtful desktop companion. Be clear, useful, and concise. You can help with writing, learning, planning and everyday questions. Be honest about your capabilities: this chat cannot operate desktop apps or access files unless their contents are provided.',
  dictationEngine: 'windows', speechProvider: 'groq', speechModel: 'whisper-large-v3-turbo', speechEndpoint: '', speechLanguage: '',
  dictationStyle: 'natural', retainAudio: false, focusMinutes: 25, breakMinutes: 5,
  shortcut: 'CommandOrControl+Shift+Space', dictationShortcut: 'CommandOrControl+Shift+D',
  historyDays: 30,
  readReplies: false,
  pillColors: {},
};
export function newId() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
export function createDefaultState(): AppState {
  return { version: 1, settings: structuredClone(DEFAULT_SETTINGS), notes: [], conversations: [], dictionary: [], snippets: [], dictationHistory: [], focusHistory: [], providers: [
    { id: 'ollama', name: 'Ollama', kind: 'ollama', model: '', baseUrl: 'http://127.0.0.1:11434/v1' },
    { id: 'openai', name: 'OpenAI', kind: 'openai', model: '', baseUrl: 'https://api.openai.com/v1' },
    { id: 'anthropic', name: 'Anthropic', kind: 'anthropic', model: '', baseUrl: 'https://api.anthropic.com/v1' },
    { id: 'gemini', name: 'Google Gemini', kind: 'gemini', model: '', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' },
    { id: 'groq', name: 'Groq', kind: 'groq', model: '', baseUrl: 'https://api.groq.com/openai/v1' },
    { id: 'custom', name: 'Custom / LM Studio', kind: 'custom', model: '', baseUrl: 'http://127.0.0.1:1234/v1' },
  ] };
}
export function hydrateState(raw: unknown): AppState {
  const base = createDefaultState();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<AppState>;
  const settings: Partial<Settings> = data.settings && typeof data.settings === 'object' ? data.settings : {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = settings[key];
    if (typeof value === typeof DEFAULT_SETTINGS[key] && !Array.isArray(value)) (base.settings as unknown as Record<string, unknown>)[key] = value;
  }
  if (Array.isArray(settings.activePills)) base.settings.activePills = settings.activePills;
  base.settings.activePills = Array.isArray(base.settings.activePills) ? [...new Set(base.settings.activePills.filter(id => PILL_CATALOG.some(p => p.id === id)))].slice(0, 5) : DEFAULT_SETTINGS.activePills;
  if (!['dark', 'light', 'system'].includes(base.settings.theme)) base.settings.theme = 'dark';
  if (!['cloud', 'comet', 'sprout', 'headphones'].includes(base.settings.buddy)) base.settings.buddy = 'cloud';
  if (!['orange', 'lavender', 'mint', 'peach', 'blue', 'rose'].includes(base.settings.accent)) base.settings.accent = 'orange';
  base.settings.pillColors = Object.fromEntries(PILL_CATALOG.map(p => [p.id, data.settings?.pillColors?.[p.id]]).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && /^#[0-9a-f]{6}$/i.test(entry[1])));
  if (!['windows', 'api'].includes(base.settings.dictationEngine)) base.settings.dictationEngine = 'windows';
  if (!['natural', 'clean'].includes(base.settings.dictationStyle)) base.settings.dictationStyle = 'natural';
  base.settings.autoCollapse = clamp(Number(base.settings.autoCollapse), 0, 3600, 0);
  try { new Intl.DateTimeFormat(undefined, { timeZone: base.settings.timezone || undefined }); } catch { base.settings.timezone = ''; }
  base.settings.focusMinutes = clamp(Number(base.settings.focusMinutes), 1, 180, 25);
  base.settings.breakMinutes = clamp(Number(base.settings.breakMinutes), 1, 60, 5);
  for (const key of ['notes', 'conversations', 'dictionary', 'snippets', 'dictationHistory', 'focusHistory'] as const) {
    if (Array.isArray(data[key])) (base[key] as unknown[]) = data[key]!.filter(item => item && typeof item === 'object').slice(-1000);
  }
  const safeId = (id: unknown) => typeof id === 'string' && /^[\w-]{1,100}$/.test(id) ? id : newId();
  const timestamp = (at: unknown) => typeof at === 'number' && Number.isFinite(at) && Math.abs(at) <= 8.64e15 ? at : Date.now();
  base.settings.name = base.settings.name.slice(0, 60);
  base.settings.systemPrompt = base.settings.systemPrompt.slice(0, 10000);
  base.notes = base.notes.filter(n => typeof n.id === 'string' && typeof n.body === 'string').map(n => ({ ...n, id: safeId(n.id), title: typeof n.title === 'string' ? n.title : '', updatedAt: timestamp(n.updatedAt), pinned: n.pinned === true, tags: Array.isArray(n.tags) ? n.tags.filter(t => typeof t === 'string') : [], kind: n.kind === 'meeting' ? 'meeting' : 'note' }));
  base.conversations = base.conversations.filter(c => typeof c.id === 'string' && Array.isArray(c.messages)).map(c => ({ ...c, id: safeId(c.id), title: typeof c.title === 'string' ? c.title : 'A conversation with Lu', updatedAt: timestamp(c.updatedAt), messages: c.messages.filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string').map(m => ({ ...m, id: safeId(m.id) })) }));
  base.dictionary = base.dictionary.filter(d => typeof d.id === 'string' && typeof d.word === 'string' && typeof d.replacement === 'string');
  base.snippets = base.snippets.filter(d => typeof d.id === 'string' && typeof d.word === 'string' && typeof d.replacement === 'string');
  base.settings.historyDays = [0, 7, 30, 365].includes(base.settings.historyDays) ? base.settings.historyDays : 30;
  base.dictationHistory = base.dictationHistory.filter(d => typeof d.id === 'string' && typeof d.text === 'string' && Number.isFinite(d.at) && d.at <= Date.now() + 86400000 && Number.isFinite(d.seconds) && d.seconds > 0 && base.settings.historyDays > 0 && d.at >= Date.now() - base.settings.historyDays * 86400000).map(d => ({ ...d, id: safeId(d.id) }));
  base.focusHistory = base.focusHistory.filter(h => Number.isFinite(h.at) && Number.isFinite(h.minutes) && h.minutes > 0 && h.minutes <= 180);
  if (Array.isArray(data.providers)) base.providers = base.providers.map(p => { const incoming = data.providers!.find(x => x && x.id === p.id); return { ...p, model: typeof incoming?.model === 'string' ? incoming.model : p.model, baseUrl: typeof incoming?.baseUrl === 'string' ? incoming.baseUrl : p.baseUrl }; });
  if (!base.providers.some(p => p.id === base.settings.providerId)) base.settings.providerId = 'ollama';
  return base;
}
export function clamp(value: number, min: number, max: number, fallback: number) { return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback; }
export function escapeHtml(value: unknown) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }
export function noteTitle(note: Pick<Note, 'title' | 'body'>) { return note.title.trim() || note.body.split('\n').find(l => l.trim())?.replace(/^#+\s*/, '').slice(0, 60) || 'Untitled note'; }
export function wordCount(text: string) { return text.trim() ? text.trim().split(/\s+/u).length : 0; }
export function sortedNotes(notes: Note[], query = '') { const q = query.toLocaleLowerCase().trim(); return notes.filter(n => !q || `${n.title} ${n.body} ${n.tags.join(' ')}`.toLocaleLowerCase().includes(q)).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt); }
export function formatDuration(seconds: number) { const n = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }
export function applyDictionary(text: string, entries: DictionaryEntry[]) {
  return [...entries].filter(e => e.word.trim()).sort((a, b) => b.word.length - a.word.length).reduce((result, entry) => {
    const pattern = entry.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return result.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`, 'giu'), () => entry.replacement || entry.word);
  }, text);
}
export function todayFocus(history: AppState['focusHistory'], now = new Date()) { return history.filter(h => new Date(h.at).toDateString() === now.toDateString()).reduce((n, h) => n + h.minutes, 0); }
