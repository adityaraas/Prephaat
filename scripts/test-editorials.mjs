import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { editorialId, isEditorialUrl, parseArticle, parseListing, plainText } from '../editorial-source.ts';
import { validateAnalysis } from '../editorials.ts';

const catalog = JSON.parse(readFileSync('public/data/editorials.json', 'utf8'));
const pack = JSON.parse(readFileSync('public/data/editorial-analysis.json', 'utf8'));
assert.equal(new Set(catalog.items.map(item => item.id)).size, catalog.items.length);
assert.equal(new Set(catalog.items.map(item => item.url)).size, catalog.items.length);
for (const item of catalog.items) {
  assert(isEditorialUrl(item.url), item.url);
  assert.equal(item.id, editorialId(item.url));
  assert(item.published >= catalog.range.start && item.published <= catalog.range.end);
  assert(item.title.length > 4 && !item.title.includes('\ufffd'));
}
for (const report of catalog.coverage) assert.equal(report.count, catalog.items.filter(item => item.source === report.source).length);
assert.equal(catalog.coverage.find(report => report.source === 'The Hindu').reachedStart, false);
assert(!isEditorialUrl('https://indianexpress.com.evil.example/article/opinion/editorials/topic-123/'));
assert(!isEditorialUrl('https://username:password@indianexpress.com/article/opinion/editorials/topic-123/'));
assert(!isEditorialUrl('https://www.thehindu.com/news/national/article123.ece'));
assert.equal(plainText('<p>Rights &amp; duties &#x2014; explained</p><script>bad()</script>'), 'Rights & duties — explained');
const link = 'https://indianexpress.com/article/opinion/editorials/example-title-123456/';
const listing = parseListing(`<span class="opinion-date">Oct 3, 2026</span><h4 class="o-opin-article__title"><a href="${link}">Example &amp; title</a></h4>`, 'The Indian Express');
assert.equal(listing[0].published, '2026-10-03');
assert.equal(listing[0].title, 'Example & title');
const body = parseArticle('<meta itemprop="datePublished" content="2026-10-03T00:20:00+05:30"><div itemprop="articleBody"><p>First paragraph.</p><p>Second paragraph.</p></div>');
assert.equal(body.body, 'First paragraph.\n\nSecond paragraph.');
assert.equal(body.published, '2026-10-03');
const restricted = parseArticle('<script type="application/ld+json">{"@type":"NewsArticle","isAccessibleForFree":false,"articleBody":"Teaser only"}</script>');
assert.equal(restricted.accessible, false);
for (const [id, note] of Object.entries(pack)) {
  validateAnalysis(note);
  const item = catalog.items.find(item => item.id === id);
  assert(item);
  assert.equal(note.sourceUrl, item.url);
  assert.equal(note.sourcePublished, item.published);
}
assert.throws(() => validateAnalysis({ ...Object.values(pack)[0], question: { marks: 15, wordLimit: 150 } }));

// Exercise the real UI module without network, accounts, or production writes.
const nodes = new Map();
const listeners = {};
const host = { dataset: {}, innerHTML: '', scrollIntoView() {},
  querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, { innerHTML: '', textContent: '', value: '', scrollIntoView() {} }); return nodes.get(selector); },
  addEventListener(name, callback) { listeners[name] = callback; },
};
const storage = new Map();
const location = { hash: '#editorials' };
const calls = [];
const context = vm.createContext({
  window: { location }, history: { replaceState(_, __, hash) { location.hash = hash; } },
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  AbortSignal, URLSearchParams, console,
  fetch: async (url, options) => {
    calls.push({ url, options });
    if (url === '/data/editorials.json') return { ok: true, json: async () => catalog };
    if (url === '/data/editorial-analysis.json') return { ok: true, json: async () => pack };
    if (url === '/api/editorials') return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
    const id = url.match(/\/([a-f0-9]{20})\/analysis/)?.[1];
    return pack[id] ? { ok: true, json: async () => ({ analysis: pack[id] }) } : { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
  },
});
vm.runInContext(readFileSync('public/editorials.js', 'utf8') + '\nglobalThis.desk = EditorialDesk;', context);
await context.desk.mount(host);
assert.match(host.innerHTML, /partial archive/);
assert.equal((host.querySelector('#ed-list').innerHTML.match(/class="ed-card"/g) || []).length, 18);
listeners.change({ target: { id: 'ed-source', value: 'The Hindu' } });
assert.match(host.querySelector('#ed-count').textContent, /^133 editorials/);
listeners.input({ target: { id: 'ed-search', value: 'this-query-has-no-match' } });
assert.match(host.querySelector('#ed-list').innerHTML, /No editorials match/);
listeners.input({ target: { id: 'ed-search', value: '' } });
const id = Object.keys(pack)[0];
location.hash = '#editorials/' + id;
await context.desk.mount(host);
const noteHtml = host.querySelector('#ed-note').innerHTML;
for (const section of ['ed-context', 'ed-concepts', 'ed-syllabus', 'ed-perspectives', 'ed-balance', 'ed-prelims', 'ed-question']) assert(noteHtml.includes(`id="${section}"`));
assert.match(noteHtml, /Original practice question/);
assert(!calls.some(call => call.url.startsWith('/api/')), 'Catalog and prepared notes must work even when new API routes return 404');
listeners.input({ target: { id: 'ed-answer', value: 'A balanced practice answer.' } });
assert.equal(storage.get(`editorial-answer-${id}`), 'A balanced practice answer.');
assert.match(host.querySelector('#ed-word-count').textContent, /4 words/);
const count = calls.length;
await context.desk.mount(host);
assert.equal(calls.length, count, 'Already loaded notes should not call the model again');
location.hash = '#editorials/' + catalog.items.find(item => !pack[item.id]).id;
await context.desk.mount(host);
assert.match(host.querySelector('#ed-note').innerHTML, /This study note is not available yet/);
assert.match(host.querySelector('#ed-note').innerHTML, /Read the original editorial/);
location.hash = '#editorials/' + '0'.repeat(20);
await context.desk.mount(host);
assert.match(host.innerHTML, /Beyond the headline/);

// A temporary static-file failure must not poison every subsequent retry.
let preparedAttempts = 0;
const retryContext = vm.createContext({
  window: { location }, history: { replaceState(_, __, hash) { location.hash = hash; } },
  localStorage: { getItem: () => null, setItem() {} }, AbortSignal,
  fetch: async url => {
    if (url === '/data/editorials.json') return { ok: true, json: async () => catalog };
    if (url === '/data/editorial-analysis.json') {
      preparedAttempts++;
      return preparedAttempts === 1 ? { ok: false, status: 503 } : { ok: true, json: async () => pack };
    }
    return { ok: false, status: 502, json: async () => { throw new SyntaxError('HTML proxy response'); } };
  },
});
vm.runInContext(readFileSync('public/editorials.js', 'utf8') + '\nglobalThis.desk = EditorialDesk;', retryContext);
location.hash = '#editorials/' + id;
await retryContext.desk.mount(host);
assert.match(host.querySelector('#ed-note').innerHTML, /Could not load this study note/);
assert(!host.querySelector('#ed-note').innerHTML.includes('HTML proxy response'));
await retryContext.desk.mount(host);
assert.equal(preparedAttempts, 2);
assert.match(host.querySelector('#ed-note').innerHTML, /Original practice question/);
console.log(`PASS: ${catalog.items.length} dated source links; ${Object.keys(pack).length} valid study notes; extraction, access restrictions, filters, detail sections, practice drafts, caching and failure states.`);
