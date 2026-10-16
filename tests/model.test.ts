import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDictionary, hydrateState, createDefaultState, sortedNotes, noteTitle, wordCount, formatDuration, todayFocus, escapeHtml } from '../src/model.ts';

test('a new workspace has no invented history or connections', () => {
  const state = createDefaultState();
  assert.equal(state.notes.length + state.conversations.length + state.focusHistory.length, 0);
  assert.equal(state.providers.every(p => !p.model), true);
  assert.deepEqual(state.settings.activePills, ['chat', 'dictation', 'notes']);
});
test('backup hydration rejects malformed values while retaining good notes', () => {
  const state = hydrateState({ settings: { theme: 'invalid', focusMinutes: -50, activePills: ['chat', 'chat', 'unknown'], timezone: 'invalid', name: { x: 1 } }, notes: [null, { id: 'a', body: 'My thought', updatedAt: 'invalid' }, { id: 'b', body: 42 }], dictionary: [{ id: 'bad', word: 42 }], conversations: [{ id: 'one', messages: [null, { role: 'system', text: 'discard' }, { role: 'assistant', text: 'Hello' }] }] });
  assert.equal(state.settings.theme, 'dark'); assert.equal(state.settings.name, ''); assert.equal(state.settings.timezone, '');
  assert.equal(state.settings.focusMinutes, 1); assert.deepEqual(state.settings.activePills, ['chat']);
  assert.equal(state.notes.length, 1); assert.equal(state.notes[0].title, ''); assert.ok(Number.isFinite(state.notes[0].updatedAt));
  assert.equal(state.dictionary.length, 0); assert.equal(state.conversations[0].messages.length, 1);
});
test('dictionary respects whole words, punctuation, Unicode, and literal special characters', () => {
  const entries = [{ id: '1', word: 'lu', replacement: 'Lu' }, { id: '2', word: 'c++', replacement: 'C plus plus' }, { id: '3', word: 'école', replacement: 'school' }];
  assert.equal(applyDictionary('lu! Blue flute. c++ & ÉCOLE; écolettes.', entries), 'Lu! Blue flute. C plus plus & school; écolettes.');
});
test('notes sort pinned first and search titles, bodies and tags without modifying storage order', () => {
  const state = createDefaultState(); state.notes = [{ id: '1', title: '', body: '# A first thought', tags: ['ideas'], pinned: false, updatedAt: 20, kind: 'note' }, { id: '2', title: 'Pinned', body: 'old', tags: [], pinned: true, updatedAt: 1, kind: 'note' }];
  assert.deepEqual(sortedNotes(state.notes).map(n => n.id), ['2', '1']); assert.equal(state.notes[0].id, '1');
  assert.equal(sortedNotes(state.notes, 'IDEAS')[0].id, '1'); assert.equal(noteTitle(state.notes[0]), 'A first thought');
  assert.equal(wordCount('  a\n little\tthought '), 3); assert.equal(wordCount(''), 0);
});
test('duration stays legible at the end of a real session, and focus history uses local days', () => {
  assert.equal(formatDuration(0), '00:00'); assert.equal(formatDuration(-3), '00:00'); assert.equal(formatDuration(60.1), '01:01');
  const today = new Date(2026, 9, 15, 9), yesterday = new Date(2026, 9, 14, 23);
  assert.equal(todayFocus([{ at: today.getTime(), minutes: 25 }, { at: yesterday.getTime(), minutes: 60 }], today), 25);
});
test('notes and provider text are escaped before HTML rendering', () => {
  assert.equal(escapeHtml('<script>"&\'</script>'), '&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
});
test('history retention and snippets survive a backup without invalid timestamps or selectors', () => {
  const now = Date.now();
  const state = hydrateState({ settings: { historyDays: 7 }, snippets: [{ id: 'intro', word: 'my intro', replacement: 'Hello, I’m Lu.\nHere to help.' }], dictationHistory: [{ id: 'new', text: 'Today', at: now, seconds: 10 }, { id: 'old', text: 'Last month', at: now - 30 * 86400000, seconds: 20 }], notes: [{ id: 'unsafe"]', body: 'Keep the text', updatedAt: 1e50 }] });
  assert.equal(state.snippets.length, 1); assert.equal(state.dictationHistory.length, 1);
  assert.equal(state.notes[0].body, 'Keep the text'); assert.match(state.notes[0].id, /^[\w-]+$/); assert.ok(Number.isFinite(new Date(state.notes[0].updatedAt).getTime()));
  assert.equal(applyDictionary('say my intro now', state.snippets), 'say Hello, I’m Lu.\nHere to help. now');
  assert.equal(hydrateState({ ...state, settings: { ...state.settings, historyDays: 0 } }).dictationHistory.length, 0);
});
