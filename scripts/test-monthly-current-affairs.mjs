import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const archive = JSON.parse(readFileSync('public/data/monthly-current-affairs.json', 'utf8'));
const all = archive.months.flatMap(month => month.items);
const first = new Date(archive.range.end + 'T00:00:00Z'); first.setUTCMonth(first.getUTCMonth() - 18);
assert.equal(archive.range.start, first.toISOString().slice(0, 10));
assert.equal(archive.months.length, 19, 'An exact 18-month window includes two partial calendar months');
assert.equal(new Set(all.map(item => item.id)).size, all.length);
for (const [index, month] of archive.months.entries()) {
  assert(month.items.length >= 4, `${month.id} needs substantive current affairs coverage`);
  assert.equal(month.partial, index === 0 || index === archive.months.length - 1);
  if (index) { const prior = new Date(archive.months[index - 1].id + '-01T00:00:00Z'); prior.setUTCMonth(prior.getUTCMonth() - 1); assert.equal(month.id, prior.toISOString().slice(0, 7)); }
  for (const item of month.items) {
    assert(item.published.startsWith(month.id));
    assert(item.published >= archive.range.start && item.published <= archive.range.end);
    const source = new URL(item.url); assert.equal(source.protocol, 'https:'); assert.equal(source.hostname, 'indianexpress.com');
    assert(item.title.length > 10 && !/Subscriber Only/.test(item.title));
    assert(item.whyInNews.split(/\s+/).length >= 8);
    assert.equal(item.summary.length, 10);
    assert.equal(new Set(item.summary.map(line => line.toLowerCase())).size, 10);
    assert(item.summary.every(line => line.split(/\s+/).length >= 6 && !/^\d+[.)]/.test(line)));
    assert([item.whyInNews, ...item.summary].join(' ').split(/\s+/).length <= 200);
    assert(item.syllabus.length > 0);
    for (const link of item.syllabus) { assert(['GS I', 'GS II', 'GS III', 'GS IV', 'Prelims', 'Essay'].includes(link.paper), link.paper); assert(link.topic && link.relevance.length > 40); }
  }
}
assert(!JSON.stringify(archive).includes('\ufffd'));
const source = readFileSync('public/home.js', 'utf8');
const home = readFileSync('public/home.html', 'utf8');
assert(!source.includes('fetch("/api/current-affairs")'));
assert(!home.includes('id="paper-method"') && !home.includes('id="source-filters"'));
assert(home.includes('/current-affairs.js?v=') && home.includes('id="monthly-current-affairs"'));
const nodes = new Map();
const handlers = {};
const buttons = archive.months.map(month => ({ dataset: { caMonth: month.id }, setAttribute() {} }));
const host = { dataset: {}, innerHTML: '',
  querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, { innerHTML: '', textContent: '', focus() {}, scrollIntoView() {} }); return nodes.get(selector); },
  querySelectorAll() { return buttons; }, addEventListener(event, handler) { handlers[event] = handler; },
};
const location = { hash: '#current' }; let fetches = 0;
const context = vm.createContext({ window: { location }, history: { replaceState(_, __, hash) { location.hash = hash; } }, AbortSignal,
  fetch: async () => { fetches++; return { ok: true, json: async () => archive }; },
});
vm.runInContext(readFileSync('public/current-affairs.js', 'utf8') + '\nglobalThis.monthly = MonthlyCurrentAffairs;', context);
await context.monthly.mount(host);
assert.match(host.innerHTML, /Last 18 months/);
assert.match(host.querySelector('#ca-stories').innerHTML, /Read the brief/);
const oldest = archive.months.at(-1);
handlers.click({ target: { closest: selector => selector === '[data-ca-month]' ? { dataset: { caMonth: oldest.id } } : null } });
assert.match(host.querySelector('#ca-stories').innerHTML, new RegExp(oldest.items[0].id));
assert.equal(location.hash, '#current/' + oldest.id);
handlers.input({ target: { id: 'ca-search', value: 'a-query-that-does-not-match-any-topic' } });
assert.match(host.querySelector('#ca-stories').innerHTML, /No issues match/);
context.monthly.openItem(all[0].id);
const brief=host.querySelector('#ca-stories').innerHTML;
assert.match(brief,/What happened\?/);assert.match(brief,/Key takeaways/);assert.match(brief,/Why in news\?/);
assert(brief.indexOf('What happened?')<brief.indexOf('Key takeaways'));
assert(brief.indexOf('Key takeaways')<brief.indexOf('Why it matters for the exam'));
assert.match(brief,/<details class="ca-full-notes"><summary>Go deeper/);
assert.equal((brief.match(/<li>/g)||[]).length,10);
assert.equal(location.hash,`#current/${all[0].published.slice(0,7)}/${all[0].id}`);
handlers.click({target:{closest:selector=>selector==='#ca-back'?{}:null}});
assert.match(host.querySelector('#ca-stories').innerHTML,/ca-card-grid/);
handlers.click({target:{closest:selector=>selector==='[data-ca-open]'?{dataset:{caOpen:all[0].id}}:null}});
assert.match(host.querySelector('#ca-stories').innerHTML,/QUICK CURRENT AFFAIRS BRIEF/);
await context.monthly.mount(host);
assert.match(host.querySelector('#ca-stories').innerHTML,/QUICK CURRENT AFFAIRS BRIEF/);
handlers.change({target:{id:'ca-all-months',checked:true}});
assert.match(host.querySelector('#ca-month-title').textContent,/Across the archive/);
const selectedPaper=all[0].syllabus[0].paper;
handlers.change({target:{id:'ca-paper',value:selectedPaper}});
assert.equal(host.querySelector('#ca-count').textContent,`${all.filter(item=>item.syllabus.some(link=>link.paper===selectedPaper)).length} selected UPSC issues`);
assert.equal(context.monthly.getSearchItems().length, all.length);
assert.equal(fetches, 1, 'Month changes and opening a story should not depend on live APIs or model calls');
console.log(`PASS: ${all.length} sourced issues across ${archive.months.length} contiguous month buckets; brief-first detail, retained 10-point notes, card opening, back navigation, month switching, search, deep links and static loading.`);
