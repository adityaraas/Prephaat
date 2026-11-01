import { readFile, writeFile } from 'node:fs/promises';
const directory = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, directory), 'utf8');
const records = new Map();
for (const file of ['monthly-current-affairs.json', 'current-affairs-latest.json']) {
  const archive = JSON.parse(await read('public/data/' + file));
  for (const month of archive.months) for (const item of month.items) records.set(item.id, item);
}
let images = {};
try { images = JSON.parse(await read('public/data/current-affairs-images.json')); } catch {}
const queue = [...records.values()].filter(item => !images[item.id]);
let checked = 0, unavailable = 0;
function decode(value) { return value.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"'); }
async function collect(item) {
  let html;
  const prid = new URL(item.url).searchParams.get('PRID');
  if (prid) { try { html = await read('.cache/current-affairs-sources/' + prid + '.html'); } catch {} }
  if (!html) {
    const response = await fetch(item.url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' } });
    if (!response.ok) throw Error(String(response.status));
    html = await response.text();
  }
  let src;
  if (prid) {
    src = [...html.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi)].map(match => decode(match[1])).find(value => /static\.pib\.gov\.in\/WriteReadData\/userfiles\//i.test(value));
  } else {
    for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
      if (!/(?:property|name)=["'](?:og:image|twitter:image)["']/i.test(tag)) continue;
      src = tag.match(/content=["']([^"']+)["']/i)?.[1];
      if (src) { src = decode(src); break; }
    }
  }
  if (!src) return;
  const url = new URL(src, item.url);
  if (url.protocol !== 'https:' || /logo|placeholder|default|emblem|branding|advert/i.test(url.pathname)) return;
  if (/indianexpress\.com$/i.test(url.hostname)) { url.searchParams.set('w', '360'); url.searchParams.set('quality', '70'); }
  images[item.id] = { src: url.href, alt: 'Image accompanying: ' + item.title, source: item.source, sourceUrl: item.url };
}
await Promise.all(Array.from({ length: 10 }, async () => {
  while (queue.length) {
    const item = queue.shift();
    try { await collect(item); } catch { unavailable++; /* A missing photo never blocks a news story. */ }
    checked++;
    if (checked % 40 === 0) console.log('Checked ' + checked + ' articles; found ' + Object.keys(images).length + ' images.');
  }
}));
await writeFile(new URL('public/data/current-affairs-images.json', directory), JSON.stringify(images, null, 2) + '\n');
console.log('Saved ' + Object.keys(images).length + ' article-specific source images.');
if (unavailable) console.log(unavailable + ' source pages were unavailable; their stories remain readable without pictures.');
