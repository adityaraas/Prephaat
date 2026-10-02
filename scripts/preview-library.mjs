// Local static preview; no production database or credentials are loaded.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const base = resolve('public');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
createServer(async (req,res) => {
  const path = new URL(req.url,'http://localhost').pathname;
  const file = resolve(base, '.' + (path === '/library' || path === '/' ? '/library.html' : path));
  if (!file.startsWith(base + '\\') && !file.startsWith(base + '/')) {res.writeHead(403);res.end();return;}
  try {const content = await readFile(file);res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream'});res.end(content);} catch {res.writeHead(404);res.end();}
}).listen(3100, '127.0.0.1', () => console.log('Library preview: http://127.0.0.1:3100/library'));
