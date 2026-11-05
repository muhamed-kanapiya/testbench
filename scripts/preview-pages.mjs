import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../out');
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '/testbench';
const port = Number(process.env.PORT || 3212);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.txt': 'text/plain', '.woff2': 'font/woff2' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (pathname === base && base) { res.writeHead(308, { Location: base + '/' }); res.end(); return; }
    if (base && !pathname.startsWith(base + '/')) throw new Error('Outside demo path');
    let file = path.resolve(root, '.' + pathname.slice(base.length));
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Outside output directory');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); console.log('404', req.url); }
}).listen(port, '127.0.0.1', () => console.log(`Demo preview: http://127.0.0.1:${port}${base}/`));
