#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const portFlag = process.argv.indexOf('--port');
const port = Number(portFlag < 0 ? (process.env.PORT ?? 4173) : process.argv[portFlag + 1]);
const mime = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
};
const root = new URL('../', import.meta.url);
const files = new Map([
  ['/', 'web/index.html'],
  ['/web/style.css', 'web/style.css'],
  ['/web/game-ui.mjs', 'web/game-ui.mjs'],
  ['/src/game.mjs', 'src/game.mjs'],
]);

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const module = /^\/(?:web\/world[\w-]*|src\/[\w-]+)\.mjs$/.test(pathname);
  const file = files.get(pathname) ?? (module ? pathname.slice(1) : null);
  if (!file) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const data = await readFile(new URL(file, root));
    response.writeHead(200, { 'Content-Type': mime[extname(file)], 'Cache-Control': 'no-store' });
    response.end(data);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('File unavailable');
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Đảo Đèn Lồng · http://127.0.0.1:${server.address().port}`);
});
