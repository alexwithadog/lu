import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// A read-only preview of the upstream design reference, without installing
// dependencies, starting the native app, or connecting to an AI provider.
const source = new URL('../coucou/design/prototype/notch-buddy.html', import.meta.url);
const html = await readFile(source);
const server = createServer((request, response) => {
  if (request.method !== 'GET' || !['/', '/notch-buddy.html'].includes(request.url)) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(html);
});
server.listen(4178, '127.0.0.1', () => {
  process.stdout.write('Coucou design reference: http://127.0.0.1:4178\n');
});
