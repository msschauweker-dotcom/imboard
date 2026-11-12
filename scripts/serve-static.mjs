// Preview the static build (`out/`) locally, like Netlify would serve it.
//   npm run build && npm run preview   →   http://localhost:4173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../out/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const port = Number(process.env.PORT) || 4173;

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  // mimic the _redirects rule for short invite links
  const short = url.pathname.match(/^\/versus\/([A-Za-z0-9]{4,8})\/?$/);
  if (short && short[1].toLowerCase() !== 'room') { res.writeHead(302, { location: `/versus/room/?code=${short[1]}` }); return res.end(); }
  let p = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!p.startsWith(normalize(root))) { res.writeHead(403); return res.end(); }
  try {
    if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
  } catch {
    p = join(root, '404.html');
  }
  try {
    const body = await readFile(p);
    res.writeHead(p.endsWith('404.html') ? 404 : 200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(port, () => console.log(`static preview on http://localhost:${port}`));
