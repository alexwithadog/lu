import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { endpoint, readTextStream } = createRequire(import.meta.url)('../desktop/provider.cjs');
function response(text: string, contentType = 'text/event-stream', byteSize = 1) { const bytes = new TextEncoder().encode(text); return new Response(new ReadableStream({ start(controller) { for (let offset = 0; offset < bytes.length; offset += byteSize) controller.enqueue(bytes.slice(offset, offset + byteSize)); controller.close(); } }), { headers: { 'content-type': contentType } }); }
test('endpoints permit private local servers while requiring HTTPS elsewhere', () => {
  assert.equal(endpoint('http://127.0.0.1:11434/v1/'), 'http://127.0.0.1:11434/v1');
  assert.equal(endpoint('https://api.example.com/v1'), 'https://api.example.com/v1');
  for (const url of ['http://example.com/v1', 'file:///etc/passwd', 'https://key:secret@example.com/v1', 'https://example.com/v1?key=secret']) assert.throws(() => endpoint(url));
});
test('streaming retains emoji and accented characters split across byte boundaries, including the last line', async () => {
  let result = ''; await readTextStream(response('data: {"choices":[{"delta":{"content":"Bonjour, 🪴 é"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"Lu"}}]}'), false, (t: string) => result += t);
  assert.equal(result, 'Bonjour, 🪴 éLu');
});
test('Anthropic text deltas and non-streaming compatible servers are supported', async () => {
  let result = ''; await readTextStream(response('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello Lu"}}\n\n'), true, (t: string) => result += t); assert.equal(result, 'Hello Lu');
  result = ''; await readTextStream(response('{"choices":[{"message":{"content":"Local hello"}}]}', 'application/json', 8), false, (t: string) => result += t); assert.equal(result, 'Local hello');
});
test('empty, malformed and provider-error streams surface actionable failures', async () => {
  await assert.rejects(readTextStream(response('data: [DONE]\n\n'), false, () => {}), /no text/);
  await assert.rejects(readTextStream(response('data: broken\n'), false, () => {}), /unreadable/);
  await assert.rejects(readTextStream(response('data: {"error":{"message":"quota reached"}}\n'), false, () => {}), /quota reached/);
});
