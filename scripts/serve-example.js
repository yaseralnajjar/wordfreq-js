import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('examples/extension');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
createServer(async (req, res) => {
  const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
  if (!path.startsWith(root + '/')) { res.writeHead(403).end(); return; }
  try { const data = await readFile(path); res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream'); res.end(data); }
  catch { res.writeHead(404).end(); }
}).listen(4317, '127.0.0.1', () => console.log('Verification page: http://127.0.0.1:4317'));
